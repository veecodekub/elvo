/**
 * End-to-end verification for issue #2 (Create and open a Short Link).
 *
 * Requires the dev servers to be running (`bun run dev`) and the schema to be
 * applied. Creates temporary accounts, exercises validation, persistence,
 * isolation, redirects, and concurrent quota/rate limits against the running
 * API, then removes every trace of the temporary accounts.
 *
 * Run from apps/server: `bun run verify:links`
 */

import { session, user } from "@elvo/db/schema/auth";
import { links } from "@elvo/db/schema/links";
import { makeSignature } from "better-auth/crypto";
import { inArray, sql } from "drizzle-orm";

import { generateLinkCode } from "../src/links/domain";
import { createLink as createLinkService } from "../src/links/service";
import { db } from "../src/services";

const API_ORIGIN = process.env.VERIFY_API_ORIGIN ?? "http://localhost:3000";
const WEB_ORIGIN = process.env.VERIFY_WEB_ORIGIN ?? "http://localhost:3001";
const SECRET = process.env.BETTER_AUTH_SECRET ?? "";

type LinkRecord = {
	code: string;
	title: string | null;
	destination: string;
	enabled: boolean;
	shortUrl: string;
	createdAt: string;
	updatedAt: string;
};

type LinkPayload = {
	link: LinkRecord;
	quota: { used: number; limit: number; remaining: number };
};

type ListPayload = {
	links: LinkRecord[];
	quota: { used: number; limit: number; remaining: number };
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
};

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, details = "") {
	if (ok) {
		passed += 1;
		console.log(`  PASS  ${name}`);
		return;
	}
	failed += 1;
	console.log(`  FAIL  ${name}${details ? ` (${details})` : ""}`);
}

async function createActor(label: string) {
	const userId = `verify-${label}-${crypto.randomUUID()}`;
	const token = crypto.randomUUID();
	await db.insert(user).values({
		id: userId,
		name: `Verify ${label}`,
		email: `${userId}@verify.invalid`,
		emailVerified: true,
	});
	await db.insert(session).values({
		id: crypto.randomUUID(),
		token,
		userId,
		expiresAt: new Date(Date.now() + 60 * 60 * 1000),
	});
	const signature = await makeSignature(token, SECRET);
	return {
		userId,
		cookie: `better-auth.session_token=${token}.${signature}`,
	};
}

async function apiFetch(path: string, init: RequestInit = {}) {
	return fetch(`${API_ORIGIN}${path}`, { redirect: "manual", ...init });
}

async function createLink(
	cookie: string,
	body: Record<string, unknown>,
): Promise<{ status: number; payload: LinkPayload | null; error: unknown }> {
	const response = await apiFetch("/api/links", {
		method: "POST",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	let payload: LinkPayload | null = null;
	let error: unknown = null;
	try {
		const json = (await response.json()) as Record<string, unknown>;
		if (response.ok) {
			payload = json as LinkPayload;
		} else {
			error = json.error;
		}
	} catch {
		// Non-JSON response.
	}
	return { status: response.status, payload, error };
}

async function listLinks(
	cookie: string,
	params: Record<string, string> = {},
) {
	const search = new URLSearchParams(params).toString();
	const response = await apiFetch(
		`/api/links${search ? `?${search}` : ""}`,
		{ headers: { cookie } },
	);
	const json = (await response.json()) as ListPayload;
	return { status: response.status, ...json };
}

async function updateLink(
	cookie: string,
	code: string,
	body: Record<string, unknown>,
): Promise<{
	status: number;
	payload: { link: LinkRecord } | null;
	error: unknown;
}> {
	const response = await apiFetch(`/api/links/${code}`, {
		method: "PATCH",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	let payload: { link: LinkRecord } | null = null;
	let error: unknown = null;
	try {
		const json = (await response.json()) as Record<string, unknown>;
		if (response.ok) {
			payload = json as { link: LinkRecord };
		} else {
			error = json.error;
		}
	} catch {
		// Non-JSON response.
	}
	return { status: response.status, payload, error };
}

function errorCode(error: unknown): string | undefined {
	let current: unknown = error;
	for (let depth = 0; depth < 5 && current; depth += 1) {
		if (typeof current === "object" && current !== null && "code" in current) {
			const code = (current as { code?: unknown }).code;
			if (typeof code === "string") return code;
		}
		current = (current as { cause?: unknown }).cause;
	}
	return undefined;
}

async function createLinkDirect(
	ownerId: string,
	input: { destination: string; title: string | null },
	generateCode: () => string,
) {
	return createLinkService(db, ownerId, input, generateCode);
}

async function main() {
	if (!SECRET) {
		throw new Error("BETTER_AUTH_SECRET is not loaded; run from apps/server");
	}

	const actors = {
		owner: await createActor("owner"),
		other: await createActor("other"),
		rate: await createActor("rate"),
		quota: await createActor("quota"),
		manage: await createActor("manage"),
	};
	const createdCodes: string[] = [];

	try {
		console.log("\nValidation");
		const unauthorized = await apiFetch("/api/links");
		check("anonymous list is rejected", unauthorized.status === 401);

		for (const [name, body] of [
			["missing destination", {}],
			["malformed URL", { destination: "not a url" }],
			["ftp scheme", { destination: "ftp://example.com/file" }],
			["javascript scheme", { destination: "javascript:alert(1)" }],
			[
				"overlong title",
				{
					destination: "https://example.com/ok",
					title: "x".repeat(121),
				},
			],
		] as const) {
			const result = await createLink(actors.owner.cookie, body);
			const expectedCode =
				name === "overlong title" ? "INVALID_TITLE" : "INVALID_URL";
			check(
				`${name} is rejected with ${expectedCode}`,
				result.status === 400 && errorCode(result.error) === expectedCode,
				`status=${result.status} code=${errorCode(result.error)}`,
			);
		}

		console.log("\nCreation and persistence");
		const first = await createLink(actors.owner.cookie, {
			destination: "https://example.com/first",
			title: "First link",
		});
		check(
			"valid link is created",
			first.status === 201,
			`status=${first.status}`,
		);
		const firstCode = first.payload?.link.code ?? "";
		if (firstCode) createdCodes.push(firstCode);
		check(
			"link code uses the 7-character unambiguous alphabet",
			/^[23456789abcdefghjkmnpqrstuvwxyz]{7}$/.test(firstCode),
			firstCode,
		);
		check(
			"short URL uses the configured website origin",
			first.payload?.link.shortUrl === `${WEB_ORIGIN}/${firstCode}`,
			first.payload?.link.shortUrl,
		);
		check(
			"short URL does not use an illustrative domain",
			!first.payload?.link.shortUrl.includes("elvo.example") &&
				!first.payload?.link.shortUrl.includes("elvo.link"),
		);
		const second = await createLink(actors.owner.cookie, {
			destination: "https://example.com/second",
		});
		const secondCode = second.payload?.link.code ?? "";
		if (secondCode) createdCodes.push(secondCode);
		check("second link is created", second.status === 201);

		const ownerList = await listLinks(actors.owner.cookie);
		check(
			"both links are persisted newest first",
			ownerList.status === 200 &&
				ownerList.links[0]?.code === secondCode &&
				ownerList.links[1]?.code === firstCode,
			ownerList.links.map((link) => link.code).join(","),
		);
		check(
			"quota reflects all existing links",
			ownerList.quota.used === 2 &&
				ownerList.quota.limit === 100 &&
				ownerList.quota.remaining === 98,
			JSON.stringify(ownerList.quota),
		);

		console.log("\nAccount isolation");
		const otherList = await listLinks(actors.other.cookie);
		check(
			"another account sees none of the links",
			otherList.status === 200 && otherList.links.length === 0,
			`links=${otherList.links.length}`,
		);
		const otherCreate = await createLink(actors.other.cookie, {
			destination: "https://example.com/other",
		});
		const otherCode = otherCreate.payload?.link.code ?? "";
		if (otherCode) createdCodes.push(otherCode);
		const ownerAfterOther = await listLinks(actors.owner.cookie);
		check(
			"another account's link is not visible to the owner",
			!ownerAfterOther.links.some((link) => link.code === otherCode),
		);

		console.log("\nPublic redirect");
		const apiRedirect = await apiFetch(`/${firstCode}`);
		check(
			"API origin redirects with HTTP 302 to the stored destination",
			apiRedirect.status === 302 &&
				apiRedirect.headers.get("location") === "https://example.com/first",
			`status=${apiRedirect.status} location=${apiRedirect.headers.get("location")}`,
		);
		const webRedirect = await fetch(`${WEB_ORIGIN}/${secondCode}`, {
			redirect: "manual",
		});
		check(
			"website origin redirects with HTTP 302 to the stored destination",
			webRedirect.status === 302 &&
				webRedirect.headers.get("location") === "https://example.com/second",
			`status=${webRedirect.status} location=${webRedirect.headers.get("location")}`,
		);
		const missing = "mzzzzzz";
		const apiMissing = await apiFetch(`/${missing}`);
		const apiMissingBody = await apiMissing.text();
		check(
			"unknown code returns 404 with the unavailable page",
			apiMissing.status === 404 &&
				apiMissingBody.includes("Link unavailable") &&
				apiMissingBody.includes(`href="${WEB_ORIGIN}"`),
			`status=${apiMissing.status}`,
		);
		check(
			"unavailable page does not reveal destination or owner",
			!apiMissingBody.includes("example.com") &&
				!apiMissingBody.includes(actors.owner.userId),
		);
		const webMissing = await fetch(`${WEB_ORIGIN}/${missing}`, {
			redirect: "manual",
		});
		const webMissingBody = await webMissing.text();
		check(
			"website unknown code also shows the unavailable page",
			webMissing.status === 404 && webMissingBody.includes("Link unavailable"),
			`status=${webMissing.status}`,
		);
		const dashboard = await fetch(`${WEB_ORIGIN}/dashboard`, {
			redirect: "manual",
		});
		check(
			"application routes are unaffected by dynamic codes",
			dashboard.status === 307 &&
				(dashboard.headers.get("location") ?? "").endsWith("/login"),
			`status=${dashboard.status} location=${dashboard.headers.get("location")}`,
		);

		console.log("\nCollision handling");
		const duplicate = await db
			.execute(sql`
				INSERT INTO links (id, code, destination, owner_id, slot)
				SELECT 'verify-duplicate', ${firstCode}, 'https://example.com/overwrite',
				       ${actors.owner.userId}, 100
			`)
			.catch((error: unknown) => error);
		check(
			"duplicate link codes are rejected by the database",
			errorCode(duplicate) === "23505",
			`code=${errorCode(duplicate)}`,
		);
		const afterDuplicate = await listLinks(actors.owner.cookie);
		check(
			"existing link destination is not overwritten",
			afterDuplicate.links.some(
				(link) =>
					link.code === firstCode &&
					link.destination === "https://example.com/first",
			),
		);
		let codeAttempts = 0;
		const forced = await createLinkDirect(
			actors.owner.userId,
			{ destination: "https://example.com/collision", title: "Collision" },
			() => {
				codeAttempts += 1;
				return codeAttempts === 1 ? firstCode : generateLinkCode();
			},
		);
		check(
			"a colliding code is retried until it is unique",
			codeAttempts >= 2 && forced.code !== firstCode,
			`attempts=${codeAttempts} code=${forced.code}`,
		);

		console.log("\nRate limit (10 creations per minute, concurrent)");
		const rateResults = await Promise.all(
			Array.from({ length: 12 }, (_, index) =>
				createLink(actors.rate.cookie, {
					destination: `https://example.com/rate/${index}`,
				}),
			),
		);
		const rateCreated = rateResults.filter((result) => result.status === 201);
		const rateLimited = rateResults.filter((result) => result.status === 429);
		check(
			"exactly 10 of 12 concurrent creations succeed",
			rateCreated.length === 10,
			`created=${rateCreated.length}`,
		);
		check(
			"the remaining concurrent creations are rate limited",
			rateLimited.length === 2 &&
				rateLimited.every(
					(result) => errorCode(result.error) === "RATE_LIMITED",
				),
			`limited=${rateLimited.length}`,
		);
		for (const result of rateCreated) {
			if (result.payload) createdCodes.push(result.payload.link.code);
		}
		const rateList = await listLinks(actors.rate.cookie);
		check(
			"all 10 accepted creations are persisted",
			rateList.links.length === 10,
			`links=${rateList.links.length}`,
		);
		const thirteenth = await createLink(actors.rate.cookie, {
			destination: "https://example.com/rate/thirteenth",
		});
		check(
			"a further creation within the minute is rate limited",
			thirteenth.status === 429,
			`status=${thirteenth.status}`,
		);
		check(
			"codes are unique across creations",
			new Set(rateList.links.map((link) => link.code)).size === 10,
		);

		console.log("\nQuota (100 links per account, concurrent)");
		await db.execute(sql`
			INSERT INTO links (id, code, destination, owner_id, slot)
			SELECT gen_random_uuid()::text,
			       'quota' || lpad(series::text, 2, '0'),
			       'https://example.com/quota/' || series,
			       ${actors.quota.userId},
			       series
			FROM generate_series(1, 99) AS series
		`);
		const quotaAttempts = await Promise.all([
			createLink(actors.quota.cookie, {
				destination: "https://example.com/quota/final-a",
			}),
			createLink(actors.quota.cookie, {
				destination: "https://example.com/quota/final-b",
			}),
			createLink(actors.quota.cookie, {
				destination: "https://example.com/quota/final-c",
			}),
		]);
		const quotaCreated = quotaAttempts.filter(
			(result) => result.status === 201,
		);
		const quotaBlocked = quotaAttempts.filter(
			(result) => result.status === 409,
		);
		check(
			"exactly one of three concurrent creations fits the last slot",
			quotaCreated.length === 1,
			`created=${quotaCreated.length}`,
		);
		check(
			"the other concurrent creations report the quota",
			quotaBlocked.length === 2 &&
				quotaBlocked.every(
					(result) => errorCode(result.error) === "QUOTA_REACHED",
				),
			`blocked=${quotaBlocked.length}`,
		);
		for (const result of quotaCreated) {
			if (result.payload) createdCodes.push(result.payload.link.code);
		}
		const quotaList = await listLinks(actors.quota.cookie);
		check(
			"the account holds exactly 100 links",
			quotaList.total === 100 && quotaList.quota.used === 100,
			`total=${quotaList.total} used=${quotaList.quota.used}`,
		);
		const quotaAgain = await createLink(actors.quota.cookie, {
			destination: "https://example.com/quota/over",
		});
		check(
			"a creation beyond the quota is rejected",
			quotaAgain.status === 409,
			`status=${quotaAgain.status}`,
		);

		console.log("\nSearch, pagination, edit, and enable/disable");
		const marketing = await createLink(actors.manage.cookie, {
			destination: "https://www.Example.com/Launch",
			title: "Marketing Site",
		});
		const docs = await createLink(actors.manage.cookie, {
			destination: "https://docs.example.org/guide",
			title: "Docs Portal",
		});
		const percent = await createLink(actors.manage.cookie, {
			destination: "https://report.example.net/100%25",
			title: "Budget 100%",
		});
		for (const result of [marketing, docs, percent]) {
			if (result.payload) createdCodes.push(result.payload.link.code);
		}
		const marketingCode = marketing.payload?.link.code ?? "";
		const docsCode = docs.payload?.link.code ?? "";
		const percentCode = percent.payload?.link.code ?? "";
		check(
			"three links are available for management checks",
			[marketing, docs, percent].every((result) => result.status === 201),
		);

		const byTitle = await listLinks(actors.manage.cookie, { q: "marketing" });
		check(
			"search matches Link Titles case-insensitively",
			byTitle.status === 200 &&
				byTitle.total === 1 &&
				byTitle.links[0]?.code === marketingCode,
			`total=${byTitle.total}`,
		);
		const byUrl = await listLinks(actors.manage.cookie, {
			q: "DOCS.EXAMPLE.ORG",
		});
		check(
			"search matches Destination URLs case-insensitively",
			byUrl.status === 200 &&
				byUrl.total === 1 &&
				byUrl.links[0]?.code === docsCode,
			`total=${byUrl.total}`,
		);
		const literalPercent = await listLinks(actors.manage.cookie, { q: "100%" });
		check(
			"search treats LIKE wildcards literally",
			literalPercent.status === 200 &&
				literalPercent.total === 1 &&
				literalPercent.links[0]?.code === percentCode,
			`total=${literalPercent.total}`,
		);
		const noMatches = await listLinks(actors.manage.cookie, {
			q: "no-such-link",
		});
		check(
			"a search without matches returns an empty result",
			noMatches.status === 200 &&
				noMatches.total === 0 &&
				noMatches.links.length === 0,
			`total=${noMatches.total}`,
		);
		const isolatedSearch = await listLinks(actors.other.cookie, {
			q: "marketing",
		});
		check(
			"search never crosses account boundaries",
			isolatedSearch.status === 200 && isolatedSearch.total === 0,
			`total=${isolatedSearch.total}`,
		);
		const ordered = await listLinks(actors.manage.cookie);
		check(
			"matching links keep newest-first ordering",
			ordered.links.map((link) => link.code).join(",") ===
				[percentCode, docsCode, marketingCode].join(","),
			ordered.links.map((link) => link.code).join(","),
		);

		const edited = await updateLink(actors.manage.cookie, marketingCode, {
			title: "Launch hub",
			destination: "https://example.com/launch",
		});
		check(
			"the owner can edit title and destination",
			edited.status === 200 &&
				edited.payload?.link.title === "Launch hub" &&
				edited.payload?.link.destination === "https://example.com/launch",
			`status=${edited.status}`,
		);
		check(
			"editing preserves the Link Code, public URL, and ownership",
			edited.payload?.link.code === marketingCode &&
				edited.payload?.link.shortUrl === `${WEB_ORIGIN}/${marketingCode}`,
		);
		const editedRedirect = await apiFetch(`/${marketingCode}`);
		check(
			"the public URL redirects to the edited destination",
			editedRedirect.status === 302 &&
				editedRedirect.headers.get("location") ===
					"https://example.com/launch",
			`status=${editedRedirect.status} location=${editedRedirect.headers.get("location")}`,
		);
		const clearedTitle = await updateLink(
			actors.manage.cookie,
			marketingCode,
			{ title: null },
		);
		check(
			"clearing the optional Link Title is allowed",
			clearedTitle.status === 200 && clearedTitle.payload?.link.title === null,
			`status=${clearedTitle.status}`,
		);

		const invalidUrl = await updateLink(actors.manage.cookie, docsCode, {
			destination: "ftp://example.com/file",
		});
		check(
			"unsupported edit destinations are rejected with INVALID_URL",
			invalidUrl.status === 400 && errorCode(invalidUrl.error) === "INVALID_URL",
			`status=${invalidUrl.status} code=${errorCode(invalidUrl.error)}`,
		);
		const invalidTitle = await updateLink(actors.manage.cookie, docsCode, {
			title: "x".repeat(121),
		});
		check(
			"overlong edit titles are rejected with INVALID_TITLE",
			invalidTitle.status === 400 &&
				errorCode(invalidTitle.error) === "INVALID_TITLE",
			`status=${invalidTitle.status} code=${errorCode(invalidTitle.error)}`,
		);
		const immutableCode = await updateLink(actors.manage.cookie, docsCode, {
			code: "abc2345",
		});
		check(
			"the Link Code cannot be edited through the API",
			immutableCode.status === 400,
			`status=${immutableCode.status}`,
		);
		const emptyUpdate = await updateLink(
			actors.manage.cookie,
			docsCode,
			{},
		);
		check(
			"an empty update is rejected",
			emptyUpdate.status === 400,
			`status=${emptyUpdate.status}`,
		);
		const deleteAttempt = await apiFetch(`/api/links/${docsCode}`, {
			method: "DELETE",
			headers: { cookie: actors.manage.cookie },
		});
		check(
			"there is no permanent-deletion endpoint",
			deleteAttempt.status >= 400,
			`status=${deleteAttempt.status}`,
		);

		const foreignEdit = await updateLink(actors.other.cookie, docsCode, {
			destination: "https://evil.example/overwrite",
		});
		check(
			"another account cannot edit a link by guessing its code",
			foreignEdit.status === 404 &&
				errorCode(foreignEdit.error) === "NOT_FOUND",
			`status=${foreignEdit.status} code=${errorCode(foreignEdit.error)}`,
		);
		const afterForeignEdit = await listLinks(actors.manage.cookie, {
			q: "docs portal",
		});
		check(
			"a denied edit leaves the owner's link unchanged",
			afterForeignEdit.links[0]?.destination ===
				"https://docs.example.org/guide",
			afterForeignEdit.links[0]?.destination,
		);
		const unknownEdit = await updateLink(
			actors.other.cookie,
			"mmmmmmm",
			{ enabled: false },
		);
		check(
			"updating an unknown code returns NOT_FOUND",
			unknownEdit.status === 404 &&
				errorCode(unknownEdit.error) === "NOT_FOUND",
			`status=${unknownEdit.status} code=${errorCode(unknownEdit.error)}`,
		);

		const disabled = await updateLink(actors.manage.cookie, docsCode, {
			enabled: false,
		});
		check(
			"the owner can disable a link",
			disabled.status === 200 && disabled.payload?.link.enabled === false,
			`status=${disabled.status}`,
		);
		const disabledApi = await apiFetch(`/${docsCode}`);
		const disabledApiBody = await disabledApi.text();
		check(
			"a disabled link shows the unavailable page without revealing its destination",
			disabledApi.status === 404 &&
				disabledApiBody.includes("Link unavailable") &&
				!disabledApiBody.includes("docs.example.org"),
			`status=${disabledApi.status}`,
		);
		const disabledWeb = await fetch(`${WEB_ORIGIN}/${docsCode}`, {
			redirect: "manual",
		});
		const disabledWebBody = await disabledWeb.text();
		check(
			"the website also shows the unavailable page for a disabled link",
			disabledWeb.status === 404 &&
				disabledWebBody.includes("Link unavailable"),
			`status=${disabledWeb.status}`,
		);
		const activeOnly = await listLinks(actors.manage.cookie, {
			status: "active",
		});
		check(
			"the Active filter omits disabled links",
			activeOnly.status === 200 &&
				!activeOnly.links.some((link) => link.code === docsCode),
		);
		const disabledOnly = await listLinks(actors.manage.cookie, {
			status: "disabled",
		});
		check(
			"the Disabled filter shows only disabled links",
			disabledOnly.status === 200 &&
				disabledOnly.total === 1 &&
				disabledOnly.links[0]?.code === docsCode,
			`total=${disabledOnly.total}`,
		);
		const searchAndFilter = await listLinks(actors.manage.cookie, {
			q: "docs",
			status: "disabled",
		});
		check(
			"search and status filters combine",
			searchAndFilter.total === 1 &&
				searchAndFilter.links[0]?.code === docsCode,
			`total=${searchAndFilter.total}`,
		);
		const enabledAgain = await updateLink(actors.manage.cookie, docsCode, {
			enabled: true,
		});
		check(
			"the owner can enable a disabled link again",
			enabledAgain.status === 200 && enabledAgain.payload?.link.enabled === true,
			`status=${enabledAgain.status}`,
		);
		const reenabledRedirect = await apiFetch(`/${docsCode}`);
		check(
			"enabling restores the redirect",
			reenabledRedirect.status === 302 &&
				reenabledRedirect.headers.get("location") ===
					"https://docs.example.org/guide",
			`status=${reenabledRedirect.status}`,
		);

		const healthyPage = await listLinks(actors.quota.cookie);
		check(
			"listing paginates ten links per page",
			healthyPage.status === 200 &&
				healthyPage.page === 1 &&
				healthyPage.pageSize === 10 &&
				healthyPage.total === 100 &&
				healthyPage.totalPages === 10 &&
				healthyPage.links.length === 10,
			`page=${healthyPage.page} size=${healthyPage.pageSize} total=${healthyPage.total} pages=${healthyPage.totalPages}`,
		);
		const lastPage = await listLinks(actors.quota.cookie, { page: "10" });
		check(
			"the last page holds the remaining links",
			lastPage.status === 200 &&
				lastPage.page === 10 &&
				lastPage.links.length === 10,
			`page=${lastPage.page} links=${lastPage.links.length}`,
		);
		const clampedPage = await listLinks(actors.quota.cookie, { page: "99" });
		check(
			"a page beyond the result set is clamped to the last page",
			clampedPage.status === 200 && clampedPage.page === 10,
			`page=${clampedPage.page}`,
		);
		const invalidPage = await listLinks(actors.quota.cookie, { page: "0" });
		check(
			"an invalid page number is rejected",
			invalidPage.status === 400,
			`status=${invalidPage.status}`,
		);
		const quotaEditCode = quotaCreated[0]?.payload?.link.code ?? "";
		const quotaEdit = quotaEditCode
			? await updateLink(actors.quota.cookie, quotaEditCode, {
					destination: "https://example.com/quota/edited",
					title: "Edited at the quota",
				})
			: null;
		check(
			"links remain editable at the 100-link quota",
			quotaEdit?.status === 200 &&
				quotaEdit.payload?.link.destination ===
					"https://example.com/quota/edited",
			`status=${quotaEdit?.status}`,
		);
	} finally {
		const ids = Object.values(actors).map((actor) => actor.userId);
		await db.delete(user).where(inArray(user.id, ids));
		const leftovers = await db
			.select({ code: links.code })
			.from(links)
			.where(inArray(links.ownerId, ids));
		if (leftovers.length > 0) {
			console.log(`  WARN  leftover links after cleanup: ${leftovers.length}`);
		}
	}

	console.log(`\n${passed} passed, ${failed} failed`);
	if (failed > 0) {
		process.exit(1);
	}
}

await main();
process.exit(0);
