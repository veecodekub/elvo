/**
 * End-to-end verification for issue #5 (View aggregate Click Analytics).
 *
 * Requires the dev servers to be running (`bun run dev`), the schema to be
 * applied, and Chromium installed (`bunx playwright install chromium`).
 * Creates temporary accounts and links, exercises redirect counting,
 * concurrency, UTC windows, retention, isolation, recording failures, and the
 * real dashboard dialog (desktop, mobile, loading, empty, and failure states).
 *
 * Run from apps/server: `bun run verify:analytics`
 */

import { session, user } from "@elvo/db/schema/auth";
import { linkDailyClicks, links } from "@elvo/db/schema/links";
import { makeSignature } from "better-auth/crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { type Browser, chromium } from "playwright";

import {
	ANALYTICS_DAYS,
	addUtcDays,
	analyticsWindow,
	retentionCutoff,
	utcDateKey,
} from "../src/analytics/domain";
import { deleteExpiredDailyClicks } from "../src/analytics/service";
import { db } from "../src/services";

const API_ORIGIN = process.env.VERIFY_API_ORIGIN ?? "http://localhost:3000";
const WEB_ORIGIN = process.env.VERIFY_WEB_ORIGIN ?? "http://localhost:3001";
const SECRET = process.env.BETTER_AUTH_SECRET ?? "";
const DESTINATION = "https://example.com/analytics-verification";
const FAILURE_FUNCTION = "verify_analytics_fail_daily";

type LinkRecord = {
	code: string;
	title: string | null;
	destination: string;
	enabled: boolean;
	shortUrl: string;
	totalClicks: number;
	createdAt: string;
	updatedAt: string;
};

type AnalyticsPayload = {
	code: string;
	title: string | null;
	totalClicks: number;
	days: Array<{ date: string; clicks: number }>;
	range: { start: string; end: string; timeZone: string };
};

type Actor = {
	userId: string;
	cookie: string;
	cookieValue: string;
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

async function createActor(label: string): Promise<Actor> {
	const userId = `verify-analytics-${label}-${crypto.randomUUID()}`;
	const token = crypto.randomUUID();
	await db.insert(user).values({
		id: userId,
		name: `Verify Analytics ${label}`,
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
		cookieValue: `${token}.${signature}`,
	};
}

async function createLink(cookie: string, title: string) {
	const response = await fetch(`${API_ORIGIN}/api/links`, {
		method: "POST",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify({ destination: DESTINATION, title }),
	});
	const json = (await response.json()) as {
		link?: LinkRecord;
		error?: { code?: string; message?: string };
	};
	return { status: response.status, ...json };
}

async function updateLink(
	cookie: string,
	code: string,
	body: Record<string, unknown>,
) {
	const response = await fetch(`${API_ORIGIN}/api/links/${code}`, {
		method: "PATCH",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	return response.json() as Promise<{ link?: LinkRecord }>;
}

async function getAnalytics(cookie: string, code: string) {
	const response = await fetch(
		`${API_ORIGIN}/api/links/${encodeURIComponent(code)}/analytics`,
		{ headers: { cookie } },
	);
	const json = (await response.json().catch(() => null)) as
		| (AnalyticsPayload & { error?: unknown })
		| null;
	return {
		payload: response.ok ? (json as AnalyticsPayload) : null,
		status: response.status,
	};
}

async function waitForAnalytics(
	cookie: string,
	code: string,
	predicate: (payload: AnalyticsPayload) => boolean,
	timeout = 5_000,
) {
	const deadline = Date.now() + timeout;
	let last: AnalyticsPayload | null = null;
	while (Date.now() < deadline) {
		const result = await getAnalytics(cookie, code);
		if (result.status === 200 && result.payload) {
			last = result.payload;
			if (predicate(last)) return { ok: true, payload: last };
		}
		await Bun.sleep(150);
	}
	return { ok: false, payload: last };
}

async function publicRedirect(code: string) {
	return fetch(`${WEB_ORIGIN}/${code}`, { redirect: "manual" });
}

function todayClicks(payload: AnalyticsPayload): number {
	const today = utcDateKey(new Date());
	return payload.days.find((day) => day.date === today)?.clicks ?? -1;
}

async function installFailureTrigger() {
	await removeFailureTrigger();
	await db.execute(
		sql.raw(`
			CREATE FUNCTION ${FAILURE_FUNCTION}() RETURNS trigger AS $$
			BEGIN
				RAISE EXCEPTION 'simulated analytics recording failure';
			END;
			$$ LANGUAGE plpgsql
		`),
	);
	await db.execute(
		sql.raw(`
			CREATE TRIGGER ${FAILURE_FUNCTION}_trigger
			BEFORE INSERT OR UPDATE ON link_daily_clicks
			FOR EACH ROW EXECUTE FUNCTION ${FAILURE_FUNCTION}()
		`),
	);
}

async function removeFailureTrigger() {
	await db.execute(
		sql.raw(
			`DROP TRIGGER IF EXISTS ${FAILURE_FUNCTION}_trigger ON link_daily_clicks`,
		),
	);
	await db.execute(sql.raw(`DROP FUNCTION IF EXISTS ${FAILURE_FUNCTION}()`));
}

async function main() {
	if (!SECRET) {
		throw new Error("BETTER_AUTH_SECRET is not loaded; run from apps/server");
	}

	const owner = await createActor("owner");
	const other = await createActor("other");
	let chromiumBrowser: Browser | null = null;

	try {
		console.log("\nOwned analytics access");
		const main = await createLink(
			owner.cookie,
			`Analytics main ${crypto.randomUUID().slice(0, 8)}`,
		);
		const code = main.link?.code ?? "";
		check(
			"an owner can create a link for analytics verification",
			main.status === 201 && Boolean(code),
			`status=${main.status}`,
		);
		check(
			"a new link starts with zero lifetime clicks",
			main.link?.totalClicks === 0,
			String(main.link?.totalClicks),
		);

		const anonymous = await fetch(`${API_ORIGIN}/api/links/${code}/analytics`);
		check(
			"anonymous analytics requests are rejected",
			anonymous.status === 401,
			`status=${anonymous.status}`,
		);
		const foreign = await getAnalytics(other.cookie, code);
		check(
			"another owner cannot read analytics by guessing the code",
			foreign.status === 404,
			`status=${foreign.status}`,
		);
		const unknown = await getAnalytics(owner.cookie, "mmmmmmm");
		check(
			"an unknown code returns the same analytics 404",
			unknown.status === 404,
			`status=${unknown.status}`,
		);

		const initial = await getAnalytics(owner.cookie, code);
		const expectedWindow = analyticsWindow(new Date());
		check(
			"owned analytics load successfully",
			initial.status === 200 && initial.payload?.code === code,
			`status=${initial.status}`,
		);
		check(
			"the API reports the owner-only title",
			initial.payload?.title === main.link?.title,
			initial.payload?.title ?? "missing",
		);
		check(
			"the series covers exactly 30 UTC calendar days",
			initial.payload?.days.length === ANALYTICS_DAYS &&
				initial.payload.days[0]?.date === expectedWindow.start &&
				initial.payload.days[29]?.date === expectedWindow.end,
			`days=${initial.payload?.days.length} start=${initial.payload?.days[0]?.date} end=${initial.payload?.days[29]?.date}`,
		);
		check(
			"the response labels the range as UTC",
			initial.payload?.range.timeZone === "UTC" &&
				initial.payload.range.start === expectedWindow.start &&
				initial.payload.range.end === expectedWindow.end,
			JSON.stringify(initial.payload?.range),
		);
		check(
			"zero-activity days are included",
			initial.payload?.days.every((day) => day.clicks === 0) === true,
		);
		check(
			"a new link reports zero Total Clicks",
			initial.payload?.totalClicks === 0,
			String(initial.payload?.totalClicks),
		);

		console.log("\nSuccessful redirects");
		for (let index = 0; index < 3; index += 1) {
			const response = await publicRedirect(code);
			check(
				`repeat opening ${index + 1} redirects successfully`,
				response.status === 302 &&
					response.headers.get("location") === DESTINATION,
				`status=${response.status} location=${response.headers.get("location")}`,
			);
		}
		const repeated = await waitForAnalytics(
			owner.cookie,
			code,
			(payload) => payload.totalClicks === 3,
		);
		check(
			"repeat openings increment the lifetime total",
			repeated.ok && repeated.payload?.totalClicks === 3,
			String(repeated.payload?.totalClicks),
		);
		check(
			"today's UTC daily bucket matches the lifetime total",
			repeated.payload !== null && todayClicks(repeated.payload) === 3,
			String(repeated.payload ? todayClicks(repeated.payload) : "missing"),
		);

		const concurrent = await Promise.all(
			Array.from({ length: 10 }, () => publicRedirect(code)),
		);
		check(
			"ten concurrent openings all redirect successfully",
			concurrent.every((response) => response.status === 302),
			concurrent.map((response) => response.status).join(","),
		);
		const incremented = await waitForAnalytics(
			owner.cookie,
			code,
			(payload) => payload.totalClicks === 13,
		);
		check(
			"concurrent increments are not lost",
			incremented.ok && incremented.payload?.totalClicks === 13,
			String(incremented.payload?.totalClicks),
		);
		check(
			"the daily bucket also reflects every concurrent opening",
			incremented.payload !== null && todayClicks(incremented.payload) === 13,
			String(
				incremented.payload ? todayClicks(incremented.payload) : "missing",
			),
		);

		console.log("\nNon-counting requests");
		const disabled = await updateLink(owner.cookie, code, { enabled: false });
		check("the owner can disable the link", disabled.link?.enabled === false);
		const disabledResponse = await publicRedirect(code);
		check(
			"a disabled link returns the unavailable page",
			disabledResponse.status === 404,
			`status=${disabledResponse.status}`,
		);
		await Bun.sleep(300);
		const afterDisabled = await getAnalytics(owner.cookie, code);
		check(
			"disabled links do not record clicks",
			afterDisabled.payload?.totalClicks === 13,
			String(afterDisabled.payload?.totalClicks),
		);
		const unknownResponse = await publicRedirect("mmmmmmm");
		check(
			"an unknown link returns the unavailable page",
			unknownResponse.status === 404,
			`status=${unknownResponse.status}`,
		);
		await updateLink(owner.cookie, code, { enabled: true });
		const reenabled = await publicRedirect(code);
		check(
			"re-enabling restores the redirect",
			reenabled.status === 302,
			`status=${reenabled.status}`,
		);
		const afterReenabled = await waitForAnalytics(
			owner.cookie,
			code,
			(payload) => payload.totalClicks === 14,
		);
		check(
			"counts resume after re-enabling",
			afterReenabled.ok && afterReenabled.payload?.totalClicks === 14,
			String(afterReenabled.payload?.totalClicks),
		);

		console.log("\nRecording failures");
		const failureLink = await createLink(
			owner.cookie,
			`Analytics failure ${crypto.randomUUID().slice(0, 8)}`,
		);
		const failureCode = failureLink.link?.code ?? "";
		await installFailureTrigger();
		let failureResponse: Response;
		try {
			failureResponse = await publicRedirect(failureCode);
			// Let the detached recording attempt run while the failing trigger is
			// still installed; the redirect response itself is already complete.
			await Bun.sleep(1_000);
		} finally {
			await removeFailureTrigger();
		}
		check(
			"a redirect still succeeds while analytics recording fails",
			failureResponse.status === 302 &&
				failureResponse.headers.get("location") === DESTINATION,
			`status=${failureResponse.status} location=${failureResponse.headers.get("location")}`,
		);
		await Bun.sleep(300);
		const afterFailure = await getAnalytics(owner.cookie, failureCode);
		check(
			"a failed recording leaves the lifetime total unchanged",
			afterFailure.payload?.totalClicks === 0,
			String(afterFailure.payload?.totalClicks),
		);
		const recovered = await publicRedirect(failureCode);
		check(
			"the link redirects normally after recording recovers",
			recovered.status === 302,
			`status=${recovered.status}`,
		);
		const afterRecovery = await waitForAnalytics(
			owner.cookie,
			failureCode,
			(payload) => payload.totalClicks === 1,
		);
		check(
			"recording resumes after the failure",
			afterRecovery.ok && afterRecovery.payload?.totalClicks === 1,
			String(afterRecovery.payload?.totalClicks),
		);

		console.log("\nUTC boundaries and retention");
		const boundaryLink = await createLink(
			owner.cookie,
			`Analytics boundary ${crypto.randomUUID().slice(0, 8)}`,
		);
		const boundaryCode = boundaryLink.link?.code ?? "";
		const boundaryId = (
			await db
				.select({ id: links.id })
				.from(links)
				.where(eq(links.code, boundaryCode))
				.limit(1)
		)[0]?.id;
		if (!boundaryId) throw new Error("boundary link id is missing");
		const window = analyticsWindow(new Date());
		const startDate = new Date(`${window.start}T00:00:00.000Z`);
		const previousDate = utcDateKey(addUtcDays(startDate, -1));
		const yesterdayDate = utcDateKey(addUtcDays(startDate, 28));
		await db.insert(linkDailyClicks).values([
			{ clicks: 2, day: window.start, linkId: boundaryId },
			{ clicks: 5, day: previousDate, linkId: boundaryId },
			{ clicks: 3, day: yesterdayDate, linkId: boundaryId },
		]);
		await db.execute(
			sql`UPDATE links SET total_clicks = 42 WHERE id = ${boundaryId}`,
		);
		const boundary = await getAnalytics(owner.cookie, boundaryCode);
		check(
			"the oldest day in the 30-day window is retained",
			boundary.payload?.days[0]?.date === window.start &&
				boundary.payload.days[0]?.clicks === 2,
			JSON.stringify(boundary.payload?.days[0]),
		);
		check(
			"days outside the 30-day window are not exposed",
			!boundary.payload?.days.some((day) => day.date === previousDate),
			previousDate,
		);
		check(
			"lifetime Total Clicks stays independent of daily retention",
			boundary.payload?.totalClicks === 42,
			String(boundary.payload?.totalClicks),
		);
		const deleted = await deleteExpiredDailyClicks(db);
		check(
			"retention deletes at least the expired day",
			deleted >= 1,
			String(deleted),
		);
		const oldRows = await db
			.select({ clicks: linkDailyClicks.clicks })
			.from(linkDailyClicks)
			.where(
				and(
					eq(linkDailyClicks.linkId, boundaryId),
					eq(linkDailyClicks.day, previousDate),
				),
			);
		check("expired daily rows are removed", oldRows.length === 0);
		const keptRows = await db
			.select({ clicks: linkDailyClicks.clicks })
			.from(linkDailyClicks)
			.where(
				and(
					eq(linkDailyClicks.linkId, boundaryId),
					eq(linkDailyClicks.day, window.start),
				),
			);
		check(
			"retention keeps every day inside the latest 30 days",
			keptRows.length === 1 && keptRows[0]?.clicks === 2,
			JSON.stringify(keptRows),
		);
		const afterRetention = await getAnalytics(owner.cookie, boundaryCode);
		check(
			"retention does not change lifetime Total Clicks",
			afterRetention.payload?.totalClicks === 42,
			String(afterRetention.payload?.totalClicks),
		);
		check(
			"retention cutoff matches the analytics window",
			retentionCutoff(new Date()) === window.start,
			retentionCutoff(new Date()),
		);

		console.log("\nDashboard analytics");
		const uiTitle = `Analytics UI ${crypto.randomUUID().slice(0, 8)}`;
		const uiLink = await createLink(owner.cookie, uiTitle);
		const uiCode = uiLink.link?.code ?? "";
		chromiumBrowser = await chromium.launch();
		const context = await chromiumBrowser.newContext({
			viewport: { width: 1280, height: 900 },
		});
		await context.addCookies([
			{
				name: "better-auth.session_token",
				value: owner.cookieValue,
				url: WEB_ORIGIN,
				httpOnly: true,
				sameSite: "Lax",
			},
		]);
		const page = await context.newPage();
		await page.goto(`${WEB_ORIGIN}/dashboard`, {
			waitUntil: "domcontentloaded",
		});
		await page.getByRole("heading", { name: "Your links" }).waitFor();
		const row = page.getByRole("row").filter({ hasText: uiTitle });
		await row.waitFor();
		check(
			"the desktop table exposes a Clicks column",
			await page.getByRole("columnheader", { name: "Clicks" }).isVisible(),
		);
		const rowAnalytics = row.getByRole("button", {
			name: `Analytics for ${uiTitle}`,
		});
		check(
			"the desktop click count opens analytics",
			(await rowAnalytics.count()) >= 1 &&
				(await rowAnalytics.first().isVisible()),
		);
		await rowAnalytics.first().click();
		let dialog = page.getByRole("dialog");
		await dialog.getByRole("heading", { name: "Click analytics" }).waitFor();
		await dialog
			.getByText("Last 30 UTC calendar days", { exact: true })
			.waitFor({ timeout: 10_000 })
			.catch(() => undefined);
		await dialog
			.locator(".recharts-surface")
			.first()
			.waitFor({ timeout: 10_000 })
			.catch(() => undefined);
		check(
			"the analytics dialog labels Total Clicks",
			(await dialog.getByText("Total Clicks", { exact: true }).count()) === 1,
		);
		check(
			"the empty state is shown before any clicks",
			(await dialog.getByText(/No clicks recorded yet/).count()) === 1,
		);
		check(
			"the dialog explains the 30 UTC day window",
			(await dialog
				.getByText("Last 30 UTC calendar days", { exact: true })
				.count()) === 1 &&
				(await dialog.getByText(/UTC calendar days/).count()) >= 1,
		);
		check(
			"the daily chart renders",
			await dialog.locator(".recharts-surface").first().isVisible(),
		);
		await page.keyboard.press("Escape");
		await dialog.waitFor({ state: "hidden" });

		await page.route("**/api/links/*/analytics", async (route) => {
			await Bun.sleep(750);
			await route.continue();
		});
		await rowAnalytics.first().click();
		dialog = page.getByRole("dialog");
		await dialog.getByRole("heading", { name: "Click analytics" }).waitFor();
		check(
			"the loading state is shown while analytics load",
			await dialog
				.getByRole("status", { name: "Loading analytics" })
				.isVisible(),
		);
		await dialog
			.getByText("Last 30 UTC calendar days", { exact: true })
			.waitFor();
		await page.unroute("**/api/links/*/analytics");
		await page.keyboard.press("Escape");
		await dialog.waitFor({ state: "hidden" });

		await page.route("**/api/links/*/analytics", async (route) => {
			await route.fulfill({
				body: JSON.stringify({
					error: { code: "INTERNAL", message: "Analytics unavailable." },
				}),
				contentType: "application/json",
				status: 500,
			});
		});
		await rowAnalytics.first().click();
		dialog = page.getByRole("dialog");
		await dialog.getByRole("heading", { name: "Click analytics" }).waitFor();
		await dialog.getByRole("alert").waitFor();
		check(
			"the analytics failure state is accessible",
			(await dialog.getByRole("alert").textContent())?.includes(
				"Analytics unavailable.",
			) === true,
		);
		await page.unroute("**/api/links/*/analytics");
		await dialog.getByRole("button", { name: "Try again" }).click();
		await dialog
			.getByText("Last 30 UTC calendar days", { exact: true })
			.waitFor();
		check(
			"retrying recovers the analytics view",
			await dialog.locator(".recharts-surface").first().isVisible(),
		);

		const beforePoll = await dialog
			.getByTestId("analytics-total")
			.textContent();
		check("the dialog starts at zero clicks", beforePoll?.trim() === "0");
		const pollResponse = await publicRedirect(uiCode);
		check(
			"a click arrives while the analytics dialog is open",
			pollResponse.status === 302,
			`status=${pollResponse.status}`,
		);
		const pollDeadline = Date.now() + 40_000;
		let polledTotal = "";
		while (Date.now() < pollDeadline) {
			polledTotal =
				(await dialog.getByTestId("analytics-total").textContent())?.trim() ??
				"";
			if (polledTotal === "1") break;
			await Bun.sleep(1_000);
		}
		check(
			"analytics refresh automatically within one minute",
			polledTotal === "1",
			polledTotal || "missing",
		);

		console.log("\nMobile analytics");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.getByRole("heading", { name: "Your links" }).waitFor();
		const mobileCard = page.locator("li").filter({ hasText: uiTitle });
		const mobileAnalytics = mobileCard.getByRole("button", {
			name: `Analytics for ${uiTitle}`,
		});
		await mobileAnalytics.waitFor({ timeout: 10_000 }).catch(() => undefined);
		check(
			"the mobile card shows a click-count analytics action",
			(await mobileAnalytics.count()) === 1 &&
				(await mobileAnalytics.isVisible()),
		);
		await mobileAnalytics.click();
		dialog = page.getByRole("dialog");
		await dialog.getByRole("heading", { name: "Click analytics" }).waitFor();
		await dialog
			.getByText("Last 30 UTC calendar days", { exact: true })
			.waitFor({ timeout: 10_000 })
			.catch(() => undefined);
		await dialog
			.locator(".recharts-surface")
			.first()
			.waitFor({ timeout: 10_000 })
			.catch(() => undefined);
		check(
			"analytics are usable on mobile",
			(await dialog.getByText("Total Clicks", { exact: true }).count()) === 1 &&
				(await dialog.locator(".recharts-surface").first().isVisible()),
		);
		await page.keyboard.press("Escape");
		await dialog.waitFor({ state: "hidden" });
		check("the analytics dialog dismisses with the keyboard", true);
	} finally {
		await removeFailureTrigger().catch(() => undefined);
		await chromiumBrowser?.close();
		const ids = [owner.userId, other.userId];
		await db.delete(user).where(inArray(user.id, ids));
	}

	console.log(`\n${passed} passed, ${failed} failed`);
	if (failed > 0) {
		process.exit(1);
	}
}

await main();
process.exit(0);
