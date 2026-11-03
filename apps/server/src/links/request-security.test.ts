import { describe, expect, test } from "bun:test";
import type { createAuth } from "@elvo/auth";
import type { Database } from "@elvo/db";
import { Hono } from "hono";
import {
	isSupportedJsonContentType,
	isTrustedRequestOrigin,
} from "./request-security";
import { createLinksRoutes } from "./routes";

const trustedOrigins = ["https://dashboard.example", "http://localhost:3001"];

function createApp(session: { user: { id: string } } | null) {
	let databaseCalls = 0;
	const database = new Proxy(
		{},
		{
			get() {
				return () => {
					databaseCalls += 1;
					throw new Error("A denied request reached the database.");
				};
			},
		},
	) as Database;
	const auth = {
		api: {
			getSession: async () => session,
		},
	} as unknown as ReturnType<typeof createAuth>;
	const app = new Hono();
	app.route(
		"/",
		createLinksRoutes({
			auth,
			db: database,
			publicWebOrigin: "https://links.example",
			trustedOrigins,
		}),
	);

	return { app, getDatabaseCalls: () => databaseCalls };
}

describe("owner link mutation request security", () => {
	test("accepts JSON media types and configured local cross-port origins", () => {
		expect(isSupportedJsonContentType("application/json; charset=utf-8")).toBe(
			true,
		);
		expect(isSupportedJsonContentType("application/vnd.api+json")).toBe(true);
		expect(isSupportedJsonContentType("text/plain")).toBe(false);
		expect(
			isTrustedRequestOrigin(
				"http://localhost:3001",
				undefined,
				"http://localhost:3000",
				trustedOrigins,
			),
		).toBe(true);
		expect(
			isTrustedRequestOrigin(
				"https://dashboard.example",
				undefined,
				"https://api.example",
				trustedOrigins,
			),
		).toBe(true);
	});

	test("rejects untrusted cross-origin creation and update before database access", async () => {
		const { app, getDatabaseCalls } = createApp({ user: { id: "owner-1" } });
		const requests = [
			{
				path: "/api/links",
				method: "POST",
				contentType: "application/x-www-form-urlencoded",
				body: "destination=https%3A%2F%2Fevil.example",
			},
			{
				path: "/api/links/abc2345",
				method: "PATCH",
				contentType: "text/plain",
				body: '{"destination":"https://evil.example"}',
			},
		] as const;

		for (const request of requests) {
			const response = await app.request(request.path, {
				method: request.method,
				headers: {
					"content-type": request.contentType,
					origin: "https://attacker.example",
				},
				body: request.body,
			});
			expect(response.status).toBe(403);
			expect(await response.json()).toMatchObject({
				error: { code: "FORBIDDEN" },
			});
		}

		expect(getDatabaseCalls()).toBe(0);
	});

	test("rejects unsupported content types on trusted origins before database access", async () => {
		const { app, getDatabaseCalls } = createApp({ user: { id: "owner-1" } });
		const requests = [
			{
				path: "/api/links",
				method: "POST",
				body: "destination=https%3A%2F%2Fexample.com",
			},
			{
				path: "/api/links/abc2345",
				method: "PATCH",
				body: '{"enabled":false}',
			},
		] as const;

		for (const request of requests) {
			const response = await app.request(request.path, {
				method: request.method,
				headers: {
					"content-type": "application/x-www-form-urlencoded",
					origin: "http://localhost:3001",
				},
				body: request.body,
			});
			expect(response.status).toBe(415);
			expect(await response.json()).toMatchObject({
				error: { code: "INVALID_REQUEST" },
			});
		}

		expect(getDatabaseCalls()).toBe(0);
	});

	test("keeps anonymous mutation requests at the existing 401 response", async () => {
		const { app, getDatabaseCalls } = createApp(null);
		const response = await app.request("/api/links", {
			method: "POST",
			headers: {
				"content-type": "text/plain",
				origin: "https://attacker.example",
			},
			body: "destination=https%3A%2F%2Fevil.example",
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({
			error: { code: "UNAUTHORIZED" },
		});
		expect(getDatabaseCalls()).toBe(0);
	});
});
