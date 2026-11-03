import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createDb, type Database } from "@elvo/db";
import { session, user } from "@elvo/db/schema/auth";
import { neonConfig } from "@neondatabase/serverless";
import { inArray, sql } from "drizzle-orm";
import { startIsolatedDatabase } from "../../scripts/test-database";
import { createLink, LinkLimitError, updateLink } from "./service";

let database: Database | undefined;
let isolatedDatabase:
	| Awaited<ReturnType<typeof startIsolatedDatabase>>
	| undefined;
const ownerIds: string[] = [];

beforeAll(async () => {
	isolatedDatabase = await startIsolatedDatabase();
	neonConfig.fetchEndpoint = isolatedDatabase.endpoint;
	database = createDb({ DATABASE_URL: isolatedDatabase.databaseUrl });
	await database.execute(sql`
		ALTER TABLE link_rate_limits
		ADD COLUMN IF NOT EXISTS reservations timestamptz[] NOT NULL
		DEFAULT ARRAY[]::timestamptz[]
	`);
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
	const id = `rolling-${crypto.randomUUID()}`;
	await database.insert(user).values({
		id,
		name: id,
		email: `${id}@verify.invalid`,
		emailVerified: true,
	});
	ownerIds.push(id);
	return id;
}

async function createAt(ownerId: string, reservedAt: Date) {
	if (!database) throw new Error("The isolated database was not initialized.");
	return createLink(
		database,
		ownerId,
		{
			destination: "https://example.com/rolling-window",
			title: null,
		},
		undefined,
		reservedAt,
	);
}

describe("rolling link creation limits", () => {
	test("frees only the reservation older than 60 seconds", async () => {
		const ownerId = await createOwner();
		const t0 = new Date("2030-01-01T00:00:00.000Z");
		const t59 = new Date(t0.getTime() + 59_000);
		const t601 = new Date(t0.getTime() + 60_100);

		const first = await createAt(ownerId, t0);
		await Promise.all(Array.from({ length: 9 }, () => createAt(ownerId, t59)));
		const edited = await updateLink(database as Database, ownerId, first.code, {
			destination: "https://example.com/edited",
		});
		expect(edited?.destination).toBe("https://example.com/edited");
		await expect(createAt(ownerId, t601)).resolves.toMatchObject({
			ownerId,
		});
		await expect(createAt(ownerId, t601)).rejects.toMatchObject({
			code: "RATE_LIMITED",
		});
	});

	test("admits no more than ten concurrent reservations and isolates owners", async () => {
		const firstOwner = await createOwner();
		const secondOwner = await createOwner();
		const at = new Date("2030-02-03T04:05:06.000Z");
		const attempts = await Promise.allSettled(
			Array.from({ length: 12 }, (_, index) =>
				createLink(
					database as Database,
					firstOwner,
					{
						destination: `https://example.com/concurrent/${index}`,
						title: null,
					},
					undefined,
					at,
				),
			),
		);
		const accepted = attempts.filter(
			(attempt) => attempt.status === "fulfilled",
		);
		const rejected = attempts
			.filter((attempt) => attempt.status === "rejected")
			.map((attempt) => attempt.reason);

		expect(accepted).toHaveLength(10);
		expect(rejected).toHaveLength(2);
		expect(
			rejected.every(
				(error) =>
					error instanceof LinkLimitError && error.code === "RATE_LIMITED",
			),
		).toBe(true);
		await expect(createAt(secondOwner, at)).resolves.toMatchObject({
			ownerId: secondOwner,
		});
	});
});
