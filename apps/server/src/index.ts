import { initLogger } from "evlog";
import {
	type BetterAuthInstance,
	createAuthMiddleware,
} from "evlog/better-auth";
import { createFsDrain } from "evlog/fs";
import { evlog } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAnalyticsRoutes } from "./analytics/routes";
import { ENV } from "./env.server";
import { createLinksRoutes } from "./links/routes";
import { auth, db, publicWebOrigin } from "./services";
import type { AppEnv } from "./types";

initLogger({
	env: { service: "elvo-server" },
});

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
	exclude: ["/api/auth/**"],
	maskEmail: true,
});

const app = new Hono<AppEnv>();

app.use(
	evlog({
		drain: process.env.NODE_ENV === "production" ? undefined : createFsDrain(),
	}),
);
app.use("*", async (c, next) => {
	await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
	await next();
});

app.use(
	"/*",
	cors({
		origin: ENV.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", async (c) => auth.handler(c.req.raw));

app.route("/", createLinksRoutes({ db, auth, publicWebOrigin }));
app.route(
	"/",
	createAnalyticsRoutes({
		auth,
		cronSecret: ENV.CRON_SECRET,
		db,
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
