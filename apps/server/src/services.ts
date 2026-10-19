import { createAuth } from "@elvo/auth";
import { createDb } from "@elvo/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);

// Better Auth derives its route prefix from the base URL path, so a value
// such as `https://example.com/api/auth/callback/google` moves every auth
// endpoint and returns 404s for `/api/auth/*`. The schema documents this
// value as an origin; normalize it and surface the mistake instead of
// breaking sign-in.
const authBaseUrl = new URL(ENV.BETTER_AUTH_URL);
if (authBaseUrl.pathname !== "/") {
	console.warn(
		`[auth] BETTER_AUTH_URL must be the public origin; ignoring path "${authBaseUrl.pathname}".`,
	);
}

export const auth = createAuth(
	{
		BETTER_AUTH_URL: authBaseUrl.origin,
		BETTER_AUTH_SECRET: ENV.BETTER_AUTH_SECRET,
		CORS_ORIGIN: ENV.CORS_ORIGIN,
		GOOGLE_CLIENT_ID: ENV.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: ENV.GOOGLE_CLIENT_SECRET,
	},
	db,
);

/**
 * Public origin used for `/<code>` short links. Prefer the explicit
 * PUBLIC_WEB_ORIGIN; fall back to the website CORS origin for local setups.
 */
export const publicWebOrigin = (
	ENV.PUBLIC_WEB_ORIGIN ?? ENV.CORS_ORIGIN
).replace(/\/+$/, "");
