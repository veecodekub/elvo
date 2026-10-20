import type { createAuth } from "@elvo/auth";
import type { Database } from "@elvo/db";
import { Hono } from "hono";

import { isLinkCode } from "../links/domain";
import { createRequireSession } from "../session";
import type { AppEnv } from "../types";
import { deleteExpiredDailyClicks, getLinkAnalytics } from "./service";

export type AnalyticsRoutesDeps = {
	db: Database;
	auth: ReturnType<typeof createAuth>;
	cronSecret?: string;
};

function secretsMatch(left: string, right: string): boolean {
	const length = Math.max(left.length, right.length);
	let difference = left.length ^ right.length;
	for (let index = 0; index < length; index += 1) {
		difference |=
			(left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
	}
	return difference === 0;
}

function apiError(code: "NOT_FOUND" | "UNAUTHORIZED", message: string) {
	return { error: { code, message } };
}

export function createAnalyticsRoutes(deps: AnalyticsRoutesDeps) {
	const routes = new Hono<AppEnv>();
	const requireSession = createRequireSession(deps.auth);

	routes.get("/api/links/:code/analytics", requireSession, async (c) => {
		const code = c.req.param("code");
		if (!isLinkCode(code)) {
			return c.json(apiError("NOT_FOUND", "Link not found."), 404);
		}

		const analytics = await getLinkAnalytics(deps.db, c.get("user").id, code);
		if (!analytics) {
			return c.json(apiError("NOT_FOUND", "Link not found."), 404);
		}

		return c.json(analytics, 200, { "Cache-Control": "no-store" });
	});

	// Vercel Cron invokes this path daily and sends `Authorization: Bearer
	// <CRON_SECRET>` when the project has CRON_SECRET configured.
	routes.get("/api/internal/retention", async (c) => {
		const authorization = c.req.header("authorization");
		if (
			!deps.cronSecret ||
			!authorization ||
			!secretsMatch(authorization, `Bearer ${deps.cronSecret}`)
		) {
			return c.json(
				apiError("UNAUTHORIZED", "Scheduled retention is not authorized."),
				401,
			);
		}

		const deleted = await deleteExpiredDailyClicks(deps.db);
		return c.json({ deleted }, 200, { "Cache-Control": "no-store" });
	});

	return routes;
}
