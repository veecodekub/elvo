import { describe, expect, test } from "bun:test";
import { createDb } from "@elvo/db";
import { createAuth } from "./index";

const database = createDb({
	DATABASE_URL: "postgresql://test:test@localhost:5432/test",
});
const config = {
	BETTER_AUTH_URL: "http://localhost:3000",
	CORS_ORIGIN: "http://localhost:3001",
	BETTER_AUTH_SECRET: "test-only-secret-at-least-32-characters",
	GOOGLE_CLIENT_ID: "test-client",
	GOOGLE_CLIENT_SECRET: "test-secret",
};
describe("Google-only authentication", () => {
	test("disables passwords and configures Google with local-compatible cookies", () => {
		const auth = createAuth(config, database);
		expect(auth.options.emailAndPassword?.enabled).toBe(false);
		expect(auth.options.socialProviders).toEqual({
			google: {
				clientId: "test-client",
				clientSecret: "test-secret",
				prompt: "select_account",
			},
		});
		expect(auth.options.advanced?.defaultCookieAttributes).toMatchObject({
			secure: false,
			sameSite: "lax",
			httpOnly: true,
		});
	});
	test("does not enable an incomplete Google configuration", () => {
		const auth = createAuth(
			{ ...config, GOOGLE_CLIENT_SECRET: undefined },
			database,
		);
		expect(auth.options.socialProviders).toEqual({});
		expect(auth.options.emailAndPassword?.enabled).toBe(false);
	});
	test("keeps secure cookies for HTTPS deployments", () => {
		const auth = createAuth(
			{
				...config,
				BETTER_AUTH_URL: "https://api.example.com",
				CORS_ORIGIN: "https://app.example.com",
			},
			database,
		);
		expect(auth.options.advanced?.defaultCookieAttributes).toMatchObject({
			secure: true,
			sameSite: "none",
			httpOnly: true,
		});
	});
	test("anonymous requests do not receive an authenticated session", async () => {
		const auth = createAuth(config, database);
		const response = await auth.handler(
			new Request("http://localhost:3000/api/auth/get-session"),
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toBeNull();
	});
	test("rejects password sign-in", async () => {
		const auth = createAuth(config, database);
		const response = await auth.handler(
			new Request("http://localhost:3000/api/auth/sign-in/email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: config.CORS_ORIGIN,
				},
				body: JSON.stringify({
					email: "test@example.com",
					password: "never-accepted",
				}),
			}),
		);
		expect(response.ok).toBe(false);
	});
});
