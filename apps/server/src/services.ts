import { createAuth } from "@elvo/auth";
import { createDb } from "@elvo/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);

/**
 * Public origin used for `/<code>` short links. Prefer the explicit
 * PUBLIC_WEB_ORIGIN; fall back to the website CORS origin for local setups.
 */
export const publicWebOrigin = (
	ENV.PUBLIC_WEB_ORIGIN ?? ENV.CORS_ORIGIN
).replace(/\/+$/, "");
