import type { Database } from "@elvo/db";
import { links } from "@elvo/db/schema/links";
import { count, desc, eq, sql } from "drizzle-orm";

import {
	generateLinkCode,
	LINK_QUOTA_LIMIT,
	LINK_RATE_LIMIT,
	LINK_RATE_WINDOW_SECONDS,
} from "./domain";

export type LinkRow = {
	id: string;
	code: string;
	title: string | null;
	destination: string;
	slot: number | null;
	ownerId: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CreateLinkInput = {
	destination: string;
	title: string | null;
};

export type LinkLimitCode = "RATE_LIMITED" | "QUOTA_REACHED";

export class LinkLimitError extends Error {
	readonly code: LinkLimitCode;

	constructor(code: LinkLimitCode) {
		super(code);
		this.name = "LinkLimitError";
		this.code = code;
	}
}

/**
 * Enough attempts for the worst realistic race: the rate limit allows at most
 * ten creations per minute per owner, so a creation can lose at most ten
 * concurrent slot races before one of them succeeds.
 */
const MAX_INSERT_ATTEMPTS = 25;

/** Postgres error code, unwrapping drivers that nest the original error. */
function postgresErrorCode(error: unknown): string | undefined {
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

function isUniqueViolation(error: unknown): boolean {
	return postgresErrorCode(error) === "23505";
}

/**
 * Concurrency-safe rolling-window rate limit. The conditional upsert is
 * evaluated under a row lock, so concurrent creations serialize and can never
 * exceed ten reservations per minute per owner.
 */
async function reserveRateLimit(
	db: Database,
	ownerId: string,
): Promise<boolean> {
	const result = await db.execute(sql`
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

export async function countLinks(
	db: Database,
	ownerId: string,
): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(links)
		.where(eq(links.ownerId, ownerId));
	return Number(row?.value ?? 0);
}

export async function listLinks(
	db: Database,
	ownerId: string,
): Promise<LinkRow[]> {
	return db
		.select()
		.from(links)
		.where(eq(links.ownerId, ownerId))
		.orderBy(desc(links.createdAt), desc(links.id))
		.limit(LINK_QUOTA_LIMIT);
}

export async function findLinkDestination(
	db: Database,
	code: string,
): Promise<string | null> {
	const [row] = await db
		.select({ destination: links.destination })
		.from(links)
		.where(eq(links.code, code))
		.limit(1);
	return row?.destination ?? null;
}

async function getLinkById(db: Database, id: string): Promise<LinkRow | null> {
	const [row] = await db.select().from(links).where(eq(links.id, id)).limit(1);
	return row ?? null;
}

/**
 * Creates a link while enforcing the account quota. Quota slots (1..100) are
 * reserved by the insert itself through a partial unique index, so concurrent
 * creations for one account can never exceed 100: the loser of a slot race
 * writes nothing and retries with the next free slot.
 */
export async function createLink(
	db: Database,
	ownerId: string,
	input: CreateLinkInput,
	generateCode: () => string = generateLinkCode,
): Promise<LinkRow> {
	const allowed = await reserveRateLimit(db, ownerId);
	if (!allowed) {
		throw new LinkLimitError("RATE_LIMITED");
	}

	for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt += 1) {
		const id = crypto.randomUUID();
		const code = generateCode();

		try {
			const result = await db.execute<{ id: string }>(sql`
				INSERT INTO links (id, code, title, destination, owner_id, slot)
				SELECT ${id}, ${code}, ${input.title}, ${input.destination}, ${ownerId}, candidate.slot
				FROM generate_series(1, ${LINK_QUOTA_LIMIT}) AS candidate(slot)
				WHERE NOT EXISTS (
					SELECT 1
					FROM links AS taken
					WHERE taken.owner_id = ${ownerId}
						AND taken.slot = candidate.slot
				)
				ORDER BY candidate.slot
				LIMIT 1
				ON CONFLICT (owner_id, slot) WHERE slot IS NOT NULL DO NOTHING
				RETURNING id
			`);

			const insertedId = result.rows[0]?.id;
			if (insertedId) {
				const row = await getLinkById(db, insertedId);
				if (!row) {
					throw new Error("Created link could not be loaded");
				}
				return row;
			}

			const used = await countLinks(db, ownerId);
			if (used >= LINK_QUOTA_LIMIT) {
				throw new LinkLimitError("QUOTA_REACHED");
			}
			// Another concurrent creation reserved the candidate slot; retry.
		} catch (error) {
			if (isUniqueViolation(error)) {
				// Link Code collision; the insert wrote nothing, retry with a new code.
				continue;
			}
			throw error;
		}
	}

	throw new Error("Could not reserve a link slot after repeated attempts");
}
