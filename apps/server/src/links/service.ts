import type { Database } from "@elvo/db";
import { links } from "@elvo/db/schema/links";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import {
	generateLinkCode,
	LINK_PAGE_SIZE,
	LINK_QUOTA_LIMIT,
	LINK_RATE_LIMIT,
	LINK_RATE_WINDOW_SECONDS,
	type LinkStatusFilter,
} from "./domain";

export type LinkRow = {
	id: string;
	code: string;
	title: string | null;
	destination: string;
	enabled: boolean;
	totalClicks: number;
	slot: number | null;
	ownerId: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ListLinksOptions = {
	query?: string;
	status?: LinkStatusFilter;
	page?: number;
	pageSize?: number;
};

export type LinkPage = {
	rows: LinkRow[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
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
 * Concurrency-safe rolling-window limiter. The owner row is locked by the
 * upsert, so concurrent creations count and append against the same array.
 */
async function reserveRateLimit(
	db: Database,
	ownerId: string,
	reservedAt?: Date,
): Promise<boolean> {
	const timestamp = reservedAt ? sql`${reservedAt}::timestamptz` : sql`now()`;
	const result = await db.execute(sql`
		INSERT INTO link_rate_limits (owner_id, reservations)
		VALUES (${ownerId}, ARRAY[${timestamp}]::timestamptz[])
		ON CONFLICT (owner_id) DO UPDATE SET
			reservations = (
				SELECT COALESCE(
					array_agg(active.reserved_at ORDER BY active.reserved_at),
					ARRAY[]::timestamptz[]
				)
				FROM unnest(link_rate_limits.reservations) AS active(reserved_at)
				WHERE active.reserved_at > ${timestamp} - make_interval(secs => ${LINK_RATE_WINDOW_SECONDS})
			) || ARRAY[${timestamp}]::timestamptz[]
		WHERE (
			SELECT count(*)
			FROM unnest(link_rate_limits.reservations) AS active(reserved_at)
			WHERE active.reserved_at > ${timestamp} - make_interval(secs => ${LINK_RATE_WINDOW_SECONDS})
		) < ${LINK_RATE_LIMIT}
		RETURNING cardinality(reservations)
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

/** Escapes LIKE wildcards so a search for `100%` matches the literal text. */
function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * Newest-first page of the owner's links, optionally narrowed by a
 * case-insensitive title/destination search and an enabled-state filter.
 * The page is clamped server-side so a shrinking result set never strands the
 * dashboard on a page beyond the last one.
 */
export async function listLinks(
	db: Database,
	ownerId: string,
	options: ListLinksOptions = {},
): Promise<LinkPage> {
	const pageSize = options.pageSize ?? LINK_PAGE_SIZE;
	const conditions = [eq(links.ownerId, ownerId)];

	if (options.status === "active") {
		conditions.push(eq(links.enabled, true));
	} else if (options.status === "disabled") {
		conditions.push(eq(links.enabled, false));
	}

	const query = options.query?.trim();
	if (query) {
		const pattern = `%${escapeLikePattern(query)}%`;
		const titleMatch = ilike(links.title, pattern);
		const destinationMatch = ilike(links.destination, pattern);
		conditions.push(or(titleMatch, destinationMatch) ?? titleMatch);
	}

	const where = and(...conditions);
	const [counted] = await db
		.select({ value: count() })
		.from(links)
		.where(where);
	const total = Number(counted?.value ?? 0);
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(1, options.page ?? 1), totalPages);

	const rows = await db
		.select()
		.from(links)
		.where(where)
		.orderBy(desc(links.createdAt), desc(links.id))
		.limit(pageSize)
		.offset((page - 1) * pageSize);

	return { rows, total, page, pageSize, totalPages };
}

export type RedirectTarget = {
	id: string;
	destination: string;
};

export async function findLinkDestination(
	db: Database,
	code: string,
): Promise<RedirectTarget | null> {
	const [row] = await db
		.select({ destination: links.destination, id: links.id })
		.from(links)
		.where(and(eq(links.code, code), eq(links.enabled, true)))
		.limit(1);
	return row ?? null;
}

export type UpdateLinkChanges = {
	title?: string | null;
	destination?: string;
	enabled?: boolean;
};

/**
 * Applies owner-scoped mutations. The owner id is part of the WHERE clause, so
 * guessing another account's Link Code updates nothing and looks the same as an
 * unknown code.
 */
export async function updateLink(
	db: Database,
	ownerId: string,
	code: string,
	changes: UpdateLinkChanges,
): Promise<LinkRow | null> {
	const [row] = await db
		.update(links)
		.set(changes)
		.where(and(eq(links.ownerId, ownerId), eq(links.code, code)))
		.returning();
	return row ?? null;
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
	rateLimitTime?: Date,
): Promise<LinkRow> {
	const allowed = await reserveRateLimit(db, ownerId, rateLimitTime);
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
