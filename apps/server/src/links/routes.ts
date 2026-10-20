import type { createAuth } from "@elvo/auth";
import type { Database } from "@elvo/db";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { scheduleClickRecording } from "../analytics/service";
import { createRequireSession } from "../session";
import type { AppEnv } from "../types";
import {
	createLinkInputSchema,
	destinationErrorMessage,
	isLinkCode,
	LINK_QUOTA_LIMIT,
	listLinksQuerySchema,
	parseDestination,
	renderLinkUnavailablePage,
	titleErrorMessage,
	updateLinkInputSchema,
} from "./domain";
import {
	countLinks,
	createLink,
	findLinkDestination,
	LinkLimitError,
	type LinkRow,
	listLinks,
	type UpdateLinkChanges,
	updateLink,
} from "./service";

export type LinksRoutesDeps = {
	db: Database;
	auth: ReturnType<typeof createAuth>;
	publicWebOrigin: string;
};

type ApiErrorCode =
	| "INVALID_REQUEST"
	| "INVALID_URL"
	| "INVALID_TITLE"
	| "NOT_FOUND"
	| "QUOTA_REACHED"
	| "RATE_LIMITED"
	| "UNAUTHORIZED";

function apiError(code: ApiErrorCode, message: string, field?: string) {
	return { error: { code, message, ...(field ? { field } : {}) } };
}

function serializeLink(row: LinkRow, publicWebOrigin: string) {
	return {
		code: row.code,
		title: row.title,
		destination: row.destination,
		enabled: row.enabled,
		shortUrl: `${publicWebOrigin}/${row.code}`,
		totalClicks: row.totalClicks,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

function serializeQuota(used: number) {
	return {
		used,
		limit: LINK_QUOTA_LIMIT,
		remaining: Math.max(0, LINK_QUOTA_LIMIT - used),
	};
}

function unavailablePage(publicWebOrigin: string) {
	return {
		html: renderLinkUnavailablePage(publicWebOrigin),
		status: 404,
		headers: {
			"Cache-Control": "no-store",
			"X-Robots-Tag": "noindex",
		},
	} as const;
}

export function createLinksRoutes(deps: LinksRoutesDeps) {
	const routes = new Hono<AppEnv>();
	const requireSession = createRequireSession(deps.auth);

	routes.get("/api/links", requireSession, async (c) => {
		const parsed = listLinksQuerySchema.safeParse({
			q: c.req.query("q"),
			status: c.req.query("status"),
			page: c.req.query("page"),
		});
		if (!parsed.success) {
			return c.json(
				apiError("INVALID_REQUEST", "Search, status, or page is invalid."),
				400,
			);
		}

		const ownerId = c.get("user").id;
		const [page, used] = await Promise.all([
			listLinks(deps.db, ownerId, {
				query: parsed.data.q || undefined,
				status: parsed.data.status,
				page: parsed.data.page,
			}),
			countLinks(deps.db, ownerId),
		]);

		return c.json({
			links: page.rows.map((row) => serializeLink(row, deps.publicWebOrigin)),
			quota: serializeQuota(used),
			page: page.page,
			pageSize: page.pageSize,
			total: page.total,
			totalPages: page.totalPages,
		});
	});

	routes.patch(
		"/api/links/:code",
		bodyLimit({ maxSize: 16 * 1024 }),
		requireSession,
		async (c) => {
			const code = c.req.param("code");
			if (!isLinkCode(code)) {
				return c.json(apiError("NOT_FOUND", "Link not found."), 404);
			}

			const body = await c.req.json().catch(() => null);
			if (body === null || typeof body !== "object" || Array.isArray(body)) {
				return c.json(
					apiError(
						"INVALID_REQUEST",
						"Send a JSON body with the fields to update.",
					),
					400,
				);
			}

			const parsed = updateLinkInputSchema.safeParse(body);
			if (!parsed.success) {
				const field = parsed.error.issues[0]?.path[0];
				if (field === "title") {
					return c.json(
						apiError("INVALID_TITLE", titleErrorMessage, "title"),
						400,
					);
				}
				if (field === "destination") {
					return c.json(
						apiError("INVALID_URL", destinationErrorMessage, "destination"),
						400,
					);
				}
				return c.json(
					apiError(
						"INVALID_REQUEST",
						parsed.error.issues[0]?.message ??
							"Send at least one field to update.",
					),
					400,
				);
			}

			const changes: UpdateLinkChanges = {};
			if (parsed.data.title !== undefined) {
				changes.title = parsed.data.title ? parsed.data.title : null;
			}
			if (parsed.data.destination !== undefined) {
				const destination = parseDestination(parsed.data.destination);
				if (!destination) {
					return c.json(
						apiError("INVALID_URL", destinationErrorMessage, "destination"),
						400,
					);
				}
				changes.destination = destination.toString();
			}
			if (parsed.data.enabled !== undefined) {
				changes.enabled = parsed.data.enabled;
			}

			const row = await updateLink(deps.db, c.get("user").id, code, changes);
			if (!row) {
				return c.json(apiError("NOT_FOUND", "Link not found."), 404);
			}

			return c.json({
				link: serializeLink(row, deps.publicWebOrigin),
			});
		},
	);

	routes.post(
		"/api/links",
		bodyLimit({ maxSize: 16 * 1024 }),
		requireSession,
		async (c) => {
			const body = await c.req.json().catch(() => null);
			if (body === null || typeof body !== "object" || Array.isArray(body)) {
				return c.json(
					apiError(
						"INVALID_REQUEST",
						"Send a JSON body with a destination URL.",
					),
					400,
				);
			}

			const parsed = createLinkInputSchema.safeParse(body);
			if (!parsed.success) {
				const field =
					parsed.error.issues[0]?.path[0] === "title" ? "title" : "destination";
				return c.json(
					field === "title"
						? apiError("INVALID_TITLE", titleErrorMessage, field)
						: apiError("INVALID_URL", destinationErrorMessage, field),
					400,
				);
			}

			const destination = parseDestination(parsed.data.destination);
			if (!destination) {
				return c.json(
					apiError("INVALID_URL", destinationErrorMessage, "destination"),
					400,
				);
			}

			const ownerId = c.get("user").id;
			const title = parsed.data.title ? parsed.data.title : null;

			try {
				const row = await createLink(deps.db, ownerId, {
					destination: destination.toString(),
					title,
				});
				const used = await countLinks(deps.db, ownerId);
				return c.json(
					{
						link: serializeLink(row, deps.publicWebOrigin),
						quota: serializeQuota(used),
					},
					201,
				);
			} catch (error) {
				if (error instanceof LinkLimitError) {
					if (error.code === "RATE_LIMITED") {
						return c.json(
							apiError(
								"RATE_LIMITED",
								"You can create up to 10 links per minute. Try again shortly.",
							),
							429,
						);
					}
					return c.json(
						apiError(
							"QUOTA_REACHED",
							"You have reached the 100-link limit for this account.",
						),
						409,
					);
				}
				throw error;
			}
		},
	);

	// Public redirect on the API origin, mirroring the website route.
	routes.get("/:code", async (c) => {
		const code = c.req.param("code");
		const target = isLinkCode(code)
			? await findLinkDestination(deps.db, code)
			: null;
		if (!target) {
			const page = unavailablePage(deps.publicWebOrigin);
			return c.html(page.html, page.status, page.headers);
		}
		scheduleClickRecording(deps.db, target.id);
		return c.redirect(target.destination, 302);
	});

	return routes;
}
