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
