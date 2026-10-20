import type { Database } from "@elvo/db";
import { linkDailyClicks, links } from "@elvo/db/schema/links";
import { waitUntil } from "@vercel/functions";
import { and, eq, gte, lt, lte, sql } from "drizzle-orm";

import {
	ANALYTICS_TIME_ZONE,
	analyticsWindow,
	buildDailySeries,
	type DailyClicks,
	retentionCutoff,
} from "./domain";

export type LinkAnalytics = {
	code: string;
	title: string | null;
	totalClicks: number;
	days: DailyClicks[];
	range: {
		start: string;
		end: string;
		timeZone: typeof ANALYTICS_TIME_ZONE;
	};
};

/**
 * Atomically increments the lifetime total and today's UTC daily bucket. The
 * single statement keeps the two aggregates consistent: if either write fails,
 * neither is applied.
 */
export async function recordClick(db: Database, linkId: string): Promise<void> {
	await db.execute(sql`
		WITH recorded AS (
			INSERT INTO link_daily_clicks (link_id, day, clicks)
			VALUES (${linkId}, (now() AT TIME ZONE 'UTC')::date, 1)
			ON CONFLICT (link_id, day)
			DO UPDATE SET clicks = link_daily_clicks.clicks + 1
			RETURNING link_id
		)
		UPDATE links
		SET total_clicks = total_clicks + 1
		WHERE id = ${linkId}
	`);
}

/**
 * Records a Click after the redirect has been sent. On Vercel, `waitUntil`
 * extends the invocation until the write settles. Outside Vercel the promise
 * still runs in the long-lived process. Recording failures are logged and
 * deliberately swallowed so redirects never fail because analytics failed.
 */
export function scheduleClickRecording(db: Database, linkId: string): void {
	const task = recordClick(db, linkId).catch((error: unknown) => {
		console.error("[analytics] failed to record click", error);
	});
	try {
		waitUntil(task);
	} catch {
		// No Vercel request context (local Bun, Docker); let it run in-process.
	}
	void task;
}

/**
 * Owner-scoped analytics lookup. A foreign or unknown Link Code returns null,
 * which the route serializes as the same 404 so ownership never leaks.
 */
export async function getLinkAnalytics(
	db: Database,
	ownerId: string,
	code: string,
	now: Date = new Date(),
): Promise<LinkAnalytics | null> {
	const [link] = await db
		.select({
			code: links.code,
			id: links.id,
			title: links.title,
			totalClicks: links.totalClicks,
		})
		.from(links)
		.where(and(eq(links.ownerId, ownerId), eq(links.code, code)))
		.limit(1);

	if (!link) return null;

	const { end, start } = analyticsWindow(now);
	const rows = await db
		.select({
			clicks: linkDailyClicks.clicks,
			day: linkDailyClicks.day,
		})
		.from(linkDailyClicks)
		.where(
			and(
				eq(linkDailyClicks.linkId, link.id),
				gte(linkDailyClicks.day, start),
				lte(linkDailyClicks.day, end),
			),
		);

	return {
		code: link.code,
		days: buildDailySeries(rows, now),
		range: { end, start, timeZone: ANALYTICS_TIME_ZONE },
		title: link.title,
		totalClicks: link.totalClicks,
	};
}

/**
 * Removes daily aggregates outside the latest 30 UTC calendar days. Lifetime
 * totals remain on `links`, so retention never reduces Total Clicks.
 */
export async function deleteExpiredDailyClicks(
	db: Database,
	now: Date = new Date(),
): Promise<number> {
	const cutoff = retentionCutoff(now);
	const deleted = await db
		.delete(linkDailyClicks)
		.where(lt(linkDailyClicks.day, cutoff))
		.returning({ day: linkDailyClicks.day });
	return deleted.length;
}
