import type { createAuth } from "@elvo/auth";
import { identifyUser } from "evlog/better-auth";
import type { MiddlewareHandler } from "hono";

import type { AppEnv } from "./types";

type AuthSession = Awaited<
	ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>
>;

/**
 * Resolves the Better Auth session once for an owner-only route, records the
 * identity on that request's log, and applies the shared 401 response.
 */
export function createRequireSession(
	auth: ReturnType<typeof createAuth>,
): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		const startedAt = Date.now();
		const log = c.get("log");
		let session: AuthSession;
		try {
			session = await auth.api.getSession({
				headers: c.req.raw.headers,
			});
		} catch (error) {
			log?.set({
				auth: {
					resolvedIn: Date.now() - startedAt,
					identified: false,
					error: true,
				},
			});
			throw error;
		}

		if (log) {
			const identified = session
				? identifyUser(log, session as Parameters<typeof identifyUser>[1], {
						maskEmail: true,
					})
				: false;
			log.set({
				auth: {
					resolvedIn: Date.now() - startedAt,
					identified,
				},
			});
		}

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
