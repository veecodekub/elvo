import { describe, expect, test } from "bun:test";
import type { createAuth } from "@elvo/auth";
import { Hono } from "hono";
import { createRequireSession, createSessionIdentifier } from "./session";
import type { AppEnv } from "./types";

type TestSession = {
	session: { id: string; expiresAt: Date };
	user: { id: string; name: string; email: string; image: null };
};

function makeSession(id: string): TestSession {
	return {
		session: {
			id: `session-${id}`,
			expiresAt: new Date("2030-01-01T00:00:00Z"),
		},
		user: { id, name: id, email: `${id}@example.com`, image: null },
	};
}

function createAuthMock(resolve: (headers: Headers) => TestSession | null) {
	let lookups = 0;
	const auth = {
		api: {
			getSession: async ({ headers }: { headers: Headers }) => {
				lookups += 1;
				return resolve(headers);
			},
		},
	} as unknown as ReturnType<typeof createAuth>;

	return { auth, getLookups: () => lookups };
}

function createAppWithRequestLogging(auth: ReturnType<typeof createAuth>) {
	const app = new Hono<AppEnv>();
	const logs: Record<string, unknown>[] = [];
	app.use("*", async (c, next) => {
		const fields: Record<string, unknown> = {};
		logs.push(fields);
		c.set("log", {
			set(values: Record<string, unknown>) {
				Object.assign(fields, values);
			},
		} as never);
		await next();
	});
	app.use("*", createSessionIdentifier(auth));
	app.get("/api/links", createRequireSession(auth), (c) =>
		c.json({ id: c.get("user").id }),
	);
	return { app, logs };
}

describe("request-scoped auth session resolution", () => {
	test("uses one session lookup for owner authorization and masked logging", async () => {
		const { auth, getLookups } = createAuthMock((headers) => {
			const cookie = headers.get("cookie");
			if (cookie === "session=one") return makeSession("one");
			if (cookie === "session=two") return makeSession("two");
			return null;
		});
		const { app, logs } = createAppWithRequestLogging(auth);

		const responses = await Promise.all([
			app.request("/api/links", {
				headers: { cookie: "session=one" },
			}),
			app.request("/api/links", {
				headers: { cookie: "session=two" },
			}),
		]);

		expect(await responses[0]?.json()).toEqual({ id: "one" });
		expect(await responses[1]?.json()).toEqual({ id: "two" });
		expect(getLookups()).toBe(2);
		expect(logs).toHaveLength(2);
		expect(
			logs.map((log) => (log.user as { id: string; email: string }).id).sort(),
		).toEqual(["one", "two"]);
		expect(
			logs.map((log) => (log.user as { email: string }).email).sort(),
		).toEqual(["o***@example.com", "t***@example.com"]);
		expect(
			logs.every(
				(log) =>
					(log.auth as { identified: boolean }).identified === true &&
					typeof (log.auth as { resolvedIn: number }).resolvedIn === "number",
			),
		).toBe(true);
	});

	test("keeps anonymous owner requests at the existing 401 response", async () => {
		const { auth, getLookups } = createAuthMock(() => null);
		const { app } = createAppWithRequestLogging(auth);

		const response = await app.request("/api/links");
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			error: {
				code: "UNAUTHORIZED",
				message: "Sign in to manage your links.",
			},
		});
		expect(getLookups()).toBe(1);
	});

	test("does not resolve sessions for public redirects or retention", async () => {
		const { auth, getLookups } = createAuthMock(() => {
			throw new Error("Public routes must not resolve a session.");
		});
		const app = new Hono<AppEnv>();
		app.use("*", createSessionIdentifier(auth));
		app.get("/:code", (c) => c.text("redirect"));
		app.get("/api/internal/retention", (c) => c.text("retained"));

		const redirect = await app.request("/abc2345");
		const retention = await app.request("/api/internal/retention");
		expect(redirect.status).toBe(200);
		expect(retention.status).toBe(200);
		expect(getLookups()).toBe(0);
	});
});
