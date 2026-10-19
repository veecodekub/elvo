import type { createAuth } from "@elvo/auth";
import type { Database } from "@elvo/db";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import type { AppEnv } from "../types";
import {
	createLinkInputSchema,
	destinationErrorMessage,
	isLinkCode,
	LINK_QUOTA_LIMIT,
	parseDestination,
	renderLinkUnavailablePage,
	titleErrorMessage,
} from "./domain";
import {
	countLinks,
	createLink,
	findLinkDestination,
	LinkLimitError,
	type LinkRow,
	listLinks,
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
		shortUrl: `${publicWebOrigin}/${row.code}`,
		createdAt: row.createdAt.toISOString(),
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

	const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
		const session = await deps.auth.api.getSession({
			headers: c.req.raw.headers,
		});
		if (!session?.user) {
			return c.json(
				apiError("UNAUTHORIZED", "Sign in to manage your links."),
				401,
			);
		}
		c.set("user", {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email,
			image: session.user.image ?? null,
		});
		await next();
	};

	routes.get("/api/links", requireSession, async (c) => {
		const ownerId = c.get("user").id;
		const [rows, used] = await Promise.all([
			listLinks(deps.db, ownerId),
			countLinks(deps.db, ownerId),
		]);

		return c.json({
			links: rows.map((row) => serializeLink(row, deps.publicWebOrigin)),
			quota: serializeQuota(used),
		});
	});

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
		const destination = isLinkCode(code)
			? await findLinkDestination(deps.db, code)
			: null;
		if (!destination) {
			const page = unavailablePage(deps.publicWebOrigin);
			return c.html(page.html, page.status, page.headers);
		}
		return c.redirect(destination, 302);
	});

	return routes;
}
