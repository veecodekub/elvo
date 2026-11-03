import type { createAuth } from "@elvo/auth";
import { identifyUser } from "evlog/better-auth";
import type { Context, MiddlewareHandler } from "hono";

import type { AppEnv, AuthSessionResolution } from "./types";

/**
 * Resolve a session at most once in this Hono request context. The cached
 * result never leaves the context, so parallel requests remain isolated.
 */
export async function resolveRequestSession(
	c: Context<AppEnv>,
	auth: ReturnType<typeof createAuth>,
): Promise<AuthSessionResolution> {
	const cached = c.get("authSessionResolution");
	if (cached) return cached;

	const startedAt = Date.now();
	try {
		const resolution: AuthSessionResolution = {
			session: await auth.api.getSession({ headers: c.req.raw.headers }),
			resolvedIn: Date.now() - startedAt,
		};
		c.set("authSessionResolution", resolution);
		return resolution;
	} catch {
		const resolution: AuthSessionResolution = {
			session: null,
			resolvedIn: Date.now() - startedAt,
			error: true,
		};
		c.set("authSessionResolution", resolution);
		return resolution;
	}
}

function requiresOwnerSession(method: string, path: string): boolean {
	const normalizedMethod = method.toUpperCase();
	return (
		(normalizedMethod === "GET" && path === "/api/links") ||
		(normalizedMethod === "POST" && path === "/api/links") ||
		(normalizedMethod === "PATCH" && /^\/api\/links\/[^/]+$/.test(path)) ||
		(normalizedMethod === "GET" &&
			/^\/api\/links\/[^/]+\/analytics$/.test(path))
	);
}

/**
 * Adds Better Auth identity fields to evlog only for owner-only API requests.
 * Public redirects, scheduled retention, and OAuth routes need no session.
 */
export function createSessionIdentifier(
	auth: ReturnType<typeof createAuth>,
): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		if (requiresOwnerSession(c.req.method, c.req.path)) {
			const resolution = await resolveRequestSession(c, auth);
			const identified = resolution.session
				? identifyUser(
						c.get("log"),
						resolution.session as Parameters<typeof identifyUser>[1],
						{ maskEmail: true },
					)
				: false;
			c.get("log").set({
				auth: {
					resolvedIn: resolution.resolvedIn,
					identified,
					...(resolution.error ? { error: true } : {}),
				},
			});
		}
		await next();
	};
}

/**
 * Resolves the Better Auth session for every request in a route group and
 * stores the signed-in user on the Hono context. Unauthenticated requests get
 * the same 401 shape from every owner-only endpoint.
 */
export function createRequireSession(
	auth: ReturnType<typeof createAuth>,
): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		const { session } = await resolveRequestSession(c, auth);
		if (!session?.user) {
			return c.json(
				{
					error: {
						code: "UNAUTHORIZED",
						message: "Sign in to manage your links.",
					},
				},
				401,
			);
		}
		c.set("user", {
			email: session.user.email,
			id: session.user.id,
			image: session.user.image ?? null,
			name: session.user.name,
		});
		await next();
	};
}
