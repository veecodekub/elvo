import { defineRelationsPart, sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const links = pgTable(
	"links",
	{
		id: text("id").primaryKey(),
		code: text("code").notNull().unique(),
		title: text("title"),
		destination: text("destination").notNull(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		/**
		 * Quota slot in 1..100, unique per owner. Reserved by the creation
		 * statement so concurrent requests can never exceed the link quota.
		 * Nullable only to allow backfilling links created before quotas.
		 */
		slot: integer("slot"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("links_owner_created_idx").on(table.ownerId, table.createdAt),
		uniqueIndex("links_owner_slot_unique")
			.on(table.ownerId, table.slot)
			.where(sql`${table.slot} is not null`),
	],
);

/**
 * One row per owner tracking the rolling one-minute creation window. The
 * conditional upsert doubles as the concurrency-safe rate limiter.
 */
export const linkRateLimits = pgTable("link_rate_limits", {
	ownerId: text("owner_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	windowStartedAt: timestamp("window_started_at").defaultNow().notNull(),
	windowCount: integer("window_count").default(0).notNull(),
});

export const linksRelations = defineRelationsPart({ user, links }, (r) => ({
	links: {
		owner: r.one.user({
			from: r.links.ownerId,
			to: r.user.id,
		}),
	},
}));
