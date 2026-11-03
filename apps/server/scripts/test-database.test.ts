import { expect, test } from "bun:test";
import { createDb } from "@elvo/db";
import { user } from "@elvo/db/schema/auth";
import { linkDailyClicks, links } from "@elvo/db/schema/links";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

import {
	installAnalyticsFailureTrigger,
	removeAnalyticsFailureTrigger,
} from "./analytics-failure-trigger";
import { startIsolatedDatabase } from "./test-database";

test("Neon HTTP queries use the isolated PostgreSQL fixture", async () => {
	const database = await startIsolatedDatabase();
	try {
		const sql = neon(database.databaseUrl);
		const rows = await sql.query(
			"SELECT $1::integer AS value, '2026-11-04T12:30:00.000Z'::timestamptz AS created_at, ARRAY[1, 2, 3]::integer[] AS values, 9223372036854775807::bigint AS total",
			[42],
		);
		const row = rows[0] as
			| {
					value: number;
					created_at: string | Date;
					values: number[];
					total: string;
			  }
			| undefined;

		expect(row?.value).toBe(42);
		expect(new Date(row?.created_at ?? "").getTime()).not.toBeNaN();
		expect(row?.values).toEqual([1, 2, 3]);
		expect(row?.total).toBe("9223372036854775807");

		const fullResultsSql = neon(database.databaseUrl, { fullResults: true });
		const result = await fullResultsSql.query("SELECT 1::integer AS value", []);
		expect(result.rows[0]?.value).toBe(1);

		const arraySql = neon(database.databaseUrl, { arrayMode: true });
		const arrayRows = await arraySql.query("SELECT 7::integer AS value", []);
		expect(arrayRows[0]).toEqual([7]);
	} finally {
		await database.close();
	}
});

test("analytics failure injection affects only its fixture link", async () => {
	const database = await startIsolatedDatabase();
	const db = createDb({ DATABASE_URL: database.databaseUrl });
	const suffix = crypto.randomUUID();
	const ownerId = `analytics-trigger-owner-${suffix}`;
	const fixtureLinkId = crypto.randomUUID();
	const unrelatedLinkId = crypto.randomUUID();
	try {
		await db.insert(user).values({
			id: ownerId,
			name: "Analytics trigger fixture",
			email: `${ownerId}@verify.invalid`,
		});
		await db.insert(links).values([
			{
				id: fixtureLinkId,
				code: `code-${fixtureLinkId}`,
				destination: "https://example.invalid",
				ownerId,
			},
			{
				id: unrelatedLinkId,
				code: `code-${unrelatedLinkId}`,
				destination: "https://example.invalid",
				ownerId,
			},
		]);
		await installAnalyticsFailureTrigger(db, fixtureLinkId);

		await db.insert(linkDailyClicks).values({
			linkId: unrelatedLinkId,
			day: "2026-11-04",
			clicks: 1,
		});
		let fixtureFailed = false;
		try {
			await db.insert(linkDailyClicks).values({
				linkId: fixtureLinkId,
				day: "2026-11-04",
				clicks: 1,
			});
		} catch {
			fixtureFailed = true;
		}

		const unrelatedRows = await db
			.select({ linkId: linkDailyClicks.linkId })
			.from(linkDailyClicks)
			.where(eq(linkDailyClicks.linkId, unrelatedLinkId));
		expect(fixtureFailed).toBe(true);
		expect(unrelatedRows).toHaveLength(1);
	} finally {
		await removeAnalyticsFailureTrigger(db).catch(() => undefined);
		await db
			.delete(user)
			.where(eq(user.id, ownerId))
			.catch(() => undefined);
		await database.close();
	}
});
