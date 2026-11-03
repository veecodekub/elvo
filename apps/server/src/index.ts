import { initLogger } from "evlog";
import { createFsDrain } from "evlog/fs";
import { evlog } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAnalyticsRoutes } from "./analytics/routes";
import { ENV } from "./env.server";
import { createLinksRoutes } from "./links/routes";
import { auth, db, publicWebOrigin } from "./services";
import { createSessionIdentifier } from "./session";
import type { AppEnv } from "./types";

initLogger({
	env: { service: "elvo-server" },
});

const app = new Hono<AppEnv>();

app.use(
	evlog({
		drain: process.env.NODE_ENV === "production" ? undefined : createFsDrain(),
	}),
);
app.use("*", createSessionIdentifier(auth));

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

app.route(
	"/",
	createLinksRoutes({
		db,
		auth,
		publicWebOrigin,
		trustedOrigins: [ENV.CORS_ORIGIN],
	}),
);
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
