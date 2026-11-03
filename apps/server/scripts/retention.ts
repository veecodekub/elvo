/**
 * Deletes daily Click aggregates outside the latest 30 UTC calendar days.
 * Lifetime totals on `links` are never touched.
 *
 * Run from apps/server: `bun run analytics:retention`
 * Or let the Vercel Cron entry call `/api/internal/retention` daily.
 */

import "./test-database-preload";
import { deleteExpiredDailyClicks } from "../src/analytics/service";
import { db } from "../src/services";

const deleted = await deleteExpiredDailyClicks(db);
console.log(`Deleted ${deleted} expired daily analytics row(s).`);
process.exit(0);
