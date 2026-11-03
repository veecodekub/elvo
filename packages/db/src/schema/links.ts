import { defineRelationsPart, sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	pgTable,
	primaryKey,
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
		/**
		 * Owners can switch a link off without changing its code or quota
		 * slot. Disabled links resolve to the "Link unavailable" page.
		 */
		enabled: boolean("enabled").default(true).notNull(),
		/**
		 * Lifetime count of successful redirect responses. Kept separately from
		 * daily aggregates so retention never changes the lifetime total.
		 */
		totalClicks: integer("total_clicks").default(0).notNull(),
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
 * Daily UTC Click aggregates. Retention keeps only the latest 30 calendar
 * days; lifetime totals live on `links.totalClicks`. Rows stay anonymous:
 * there is no visitor identifier, IP address, or per-request record.
 */
export const linkDailyClicks = pgTable(
	"link_daily_clicks",
	{
		linkId: text("link_id")
			.notNull()
			.references(() => links.id, { onDelete: "cascade" }),
		day: date("day").notNull(),
		clicks: integer("clicks").default(0).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.linkId, table.day] }),
		index("link_daily_clicks_day_idx").on(table.day),
	],
);

/**
 * At most ten creation timestamps per owner in the rolling one-minute window.
 * One owner row is updated atomically to serialize concurrent reservations.
 */
export const linkRateLimits = pgTable("link_rate_limits", {
	ownerId: text("owner_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	// Keep old SQL compatible during rollout and rollback; the migration trigger
	// mirrors legacy writes into the rolling reservations.
	windowStartedAt: timestamp("window_started_at").defaultNow().notNull(),
	windowCount: integer("window_count").default(0).notNull(),
	reservations: timestamp("reservations", {
		withTimezone: true,
		mode: "date",
	})
		.array()
		.default(sql`ARRAY[]::timestamptz[]`)
		.notNull(),
});

export const linksRelations = defineRelationsPart({ user, links }, (r) => ({
	links: {
		owner: r.one.user({
			from: r.links.ownerId,
			to: r.user.id,
		}),
	},
}));
