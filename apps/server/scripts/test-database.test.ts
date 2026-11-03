import { expect, test } from "bun:test";
import { neon } from "@neondatabase/serverless";

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
	const sql = neon(database.databaseUrl);
	const suffix = crypto.randomUUID();
	const ownerId = `analytics-trigger-owner-${suffix}`;
	const fixtureLinkId = crypto.randomUUID();
	const unrelatedLinkId = crypto.randomUUID();
	const functionName = `analytics_failure_${suffix.replaceAll("-", "")}`;
	const triggerName = `${functionName}_trigger`;
	try {
		await sql.query(
			`INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)`,
			[ownerId, "Analytics trigger fixture", `${ownerId}@verify.invalid`],
		);
		for (const id of [fixtureLinkId, unrelatedLinkId]) {
			await sql.query(
				"INSERT INTO links (id, code, destination, owner_id) VALUES ($1, $2, $3, $4)",
				[id, `code-${id}`, "https://example.invalid", ownerId],
			);
		}
		await sql.query(
			`CREATE FUNCTION ${functionName}() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'simulated analytics failure'; END; $$ LANGUAGE plpgsql`,
		);
		await sql.query(
			`CREATE TRIGGER ${triggerName} BEFORE INSERT OR UPDATE ON link_daily_clicks FOR EACH ROW WHEN (NEW.link_id = '${fixtureLinkId}') EXECUTE FUNCTION ${functionName}()`,
		);

		await sql.query(
			"INSERT INTO link_daily_clicks (link_id, day, clicks) VALUES ($1, CURRENT_DATE, 1)",
			[unrelatedLinkId],
		);
		let fixtureFailed = false;
		try {
			await sql.query(
				"INSERT INTO link_daily_clicks (link_id, day, clicks) VALUES ($1, CURRENT_DATE, 1)",
				[fixtureLinkId],
			);
		} catch {
			fixtureFailed = true;
		}

		const rows = await sql.query(
			"SELECT link_id FROM link_daily_clicks WHERE link_id = $1",
			[unrelatedLinkId],
		);
		expect(fixtureFailed).toBe(true);
		expect(rows).toHaveLength(1);
	} finally {
		await sql
			.query(`DROP TRIGGER IF EXISTS ${triggerName} ON link_daily_clicks`)
			.catch(() => undefined);
		await sql
			.query(`DROP FUNCTION IF EXISTS ${functionName}()`)
			.catch(() => undefined);
		await sql
			.query(`DELETE FROM "user" WHERE id = $1`, [ownerId])
			.catch(() => undefined);
		await database.close();
	}
});
