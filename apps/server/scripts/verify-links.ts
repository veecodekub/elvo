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

type LinkPayload = {
	link: {
		code: string;
		title: string | null;
		destination: string;
		shortUrl: string;
		createdAt: string;
	};
	quota: { used: number; limit: number; remaining: number };
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

async function listLinks(cookie: string) {
	const response = await apiFetch("/api/links", { headers: { cookie } });
	const json = (await response.json()) as {
		links: LinkPayload["link"][];
		quota: LinkPayload["quota"];
	};
	return { status: response.status, ...json };
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
			quotaList.links.length === 100 && quotaList.quota.used === 100,
			`links=${quotaList.links.length} used=${quotaList.quota.used}`,
		);
		const quotaAgain = await createLink(actors.quota.cookie, {
			destination: "https://example.com/quota/over",
		});
		check(
			"a creation beyond the quota is rejected",
			quotaAgain.status === 409,
			`status=${quotaAgain.status}`,
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
