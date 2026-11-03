import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { createDb, type Database } from "@elvo/db";
import { session, user } from "@elvo/db/schema/auth";
import { neonConfig } from "@neondatabase/serverless";
import { inArray, sql } from "drizzle-orm";
import { startIsolatedDatabase } from "../../scripts/test-database";
import { LINK_RATE_LIMIT, LINK_RATE_WINDOW_SECONDS } from "./domain";
import { createLink, LinkLimitError } from "./service";

let database: Database | undefined;
let isolatedDatabase:
	| Awaited<ReturnType<typeof startIsolatedDatabase>>
	| undefined;
const ownerIds: string[] = [];

beforeAll(async () => {
	isolatedDatabase = await startIsolatedDatabase();
	neonConfig.fetchEndpoint = isolatedDatabase.endpoint;
	database = createDb({ DATABASE_URL: isolatedDatabase.databaseUrl });
});

afterAll(async () => {
	try {
		if (database && ownerIds.length > 0) {
			await database.delete(session).where(inArray(session.userId, ownerIds));
			await database.delete(user).where(inArray(user.id, ownerIds));
		}
	} finally {
		await isolatedDatabase?.close();
	}
});

async function createOwner(): Promise<string> {
	if (!database) throw new Error("The isolated database was not initialized.");
	const id = `legacy-rate-${crypto.randomUUID()}`;
	await database.insert(user).values({
		id,
		name: id,
		email: `${id}@verify.invalid`,
		emailVerified: true,
	});
	ownerIds.push(id);
	return id;
}

/** The fixed-window SQL issued by the previous server version. */
async function reserveWithLegacyServer(ownerId: string): Promise<boolean> {
	if (!database) throw new Error("The isolated database was not initialized.");
	const result = await database.execute(sql`
		INSERT INTO link_rate_limits (owner_id, window_started_at, window_count)
		VALUES (${ownerId}, now(), 1)
		ON CONFLICT (owner_id) DO UPDATE SET
			window_count = CASE
				WHEN link_rate_limits.window_started_at > now() - make_interval(secs => ${LINK_RATE_WINDOW_SECONDS})
					THEN link_rate_limits.window_count + 1
				ELSE 1
			END,
			window_started_at = CASE
				WHEN link_rate_limits.window_started_at > now() - make_interval(secs => ${LINK_RATE_WINDOW_SECONDS})
					THEN link_rate_limits.window_started_at
				ELSE now()
			END
		WHERE link_rate_limits.window_started_at <= now() - make_interval(secs => ${LINK_RATE_WINDOW_SECONDS})
			OR link_rate_limits.window_count < ${LINK_RATE_LIMIT}
		RETURNING window_count
	`);

	return result.rows.length > 0;
}

async function reserveWithCurrentServer(ownerId: string): Promise<boolean> {
	if (!database) throw new Error("The isolated database was not initialized.");
	try {
		await createLink(database, ownerId, {
			destination: "https://example.com/current-server",
			title: null,
		});
		return true;
	} catch (error) {
		if (error instanceof LinkLimitError && error.code === "RATE_LIMITED") {
			return false;
		}
		throw error;
	}
}

async function reservationCount(ownerId: string): Promise<number> {
	if (!database) throw new Error("The isolated database was not initialized.");
	const result = await database.execute<{ reservation_count: number }>(sql`
		SELECT cardinality(reservations) AS reservation_count
		FROM link_rate_limits
		WHERE owner_id = ${ownerId}
	`);
	return Number(result.rows[0]?.reservation_count ?? 0);
}

describe("rolling link rate limit during mixed-version rollout", () => {
	test("shares ten rolling reservations between interleaved old and new servers", async () => {
		const ownerId = await createOwner();
		const secondOwnerId = await createOwner();
		const outcomes: { server: "legacy" | "current"; allowed: boolean }[] = [];

		for (let attempt = 0; attempt < 12; attempt += 1) {
			const server = attempt % 2 === 0 ? "legacy" : "current";
			const allowed =
				server === "legacy"
					? await reserveWithLegacyServer(ownerId)
					: await reserveWithCurrentServer(ownerId);
			outcomes.push({ server, allowed });
			expect(await reservationCount(ownerId)).toBeLessThanOrEqual(10);
		}

		expect(outcomes.filter((outcome) => outcome.allowed)).toHaveLength(10);
		expect(outcomes.filter((outcome) => !outcome.allowed)).toHaveLength(2);
		expect(
			outcomes.some(
				(outcome) => outcome.server === "legacy" && outcome.allowed,
			),
		).toBe(true);
		expect(
			outcomes.some(
				(outcome) => outcome.server === "current" && outcome.allowed,
			),
		).toBe(true);
		expect(await reservationCount(ownerId)).toBe(10);

		// A saturated owner cannot consume another owner's reservation budget.
		expect(await reserveWithLegacyServer(secondOwnerId)).toBe(true);
		expect(await reservationCount(secondOwnerId)).toBe(1);
	});

	test("does not count modern reservations twice and keeps the cap at ten", async () => {
		const ownerId = await createOwner();
		const outcomes = await Promise.all(
			Array.from({ length: 10 }, () => reserveWithCurrentServer(ownerId)),
		);

		expect(outcomes.every(Boolean)).toBe(true);
		expect(await reservationCount(ownerId)).toBe(10);
		expect(await reserveWithCurrentServer(ownerId)).toBe(false);
		expect(await reservationCount(ownerId)).toBe(10);
	});

	test("backfills existing counters and preserves the previous server schema", async () => {
		if (!database)
			throw new Error("The isolated database was not initialized.");
		const ownerId = await createOwner();
		await database.execute(
			sql`DROP TRIGGER elvo_capture_legacy_link_reservation ON link_rate_limits`,
		);
		await database.execute(
			sql`DROP FUNCTION elvo_capture_legacy_link_reservation()`,
		);
		await database.execute(
			sql`ALTER TABLE link_rate_limits DROP COLUMN reservations`,
		);
		await database.execute(sql`
			INSERT INTO link_rate_limits (owner_id, window_started_at, window_count)
			VALUES (${ownerId}, now(), 12)
		`);
		const migration = await readFile(
			new URL(
				"../../../../packages/db/src/migrations/20261103174849_rolling_link_rate_limits/migration.sql",
				import.meta.url,
			),
			"utf8",
		);
		await database.execute(sql.raw(migration));
		expect(await reservationCount(ownerId)).toBe(10);
		expect(await reserveWithLegacyServer(ownerId)).toBe(false);
		expect(await reserveWithCurrentServer(ownerId)).toBe(false);

		await database.execute(sql`
			UPDATE link_rate_limits
			SET reservations = array_fill(now() - interval '61 seconds', ARRAY[10])
			WHERE owner_id = ${ownerId}
		`);
		expect(await reserveWithCurrentServer(ownerId)).toBe(true);
		expect(await reservationCount(ownerId)).toBe(1);
	});
});
