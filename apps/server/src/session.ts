import type { createAuth } from "@elvo/auth";
import type { MiddlewareHandler } from "hono";

import type { AppEnv } from "./types";

/**
 * Resolves the Better Auth session for every request in a route group and
 * stores the signed-in user on the Hono context. Unauthenticated requests get
 * the same 401 shape from every owner-only endpoint.
 */
export function createRequireSession(
	auth: ReturnType<typeof createAuth>,
): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		});
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
