import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function runAuthClient(source: string, overrides: Record<string, string> = {}) {
	const result = spawnSync(process.execPath, ["--no-env-file", "-e", source], {
		cwd: webRoot,
		encoding: "utf8",
		env: {
			PATH: process.env.PATH ?? "",
			HOME: process.env.HOME ?? "",
			NODE_ENV: "production",
			SERVER_URL: "",
			NEXT_PUBLIC_SERVER_URL: "",
			BETTER_AUTH_URL: "",
			NEXT_PUBLIC_BETTER_AUTH_URL: "",
			PUBLIC_BETTER_AUTH_URL: "",
			NUXT_PUBLIC_BETTER_AUTH_URL: "",
			NUXT_PUBLIC_AUTH_URL: "",
			BASE_URL: "/",
			NEXTAUTH_URL: "",
			NEXT_PUBLIC_AUTH_URL: "",
			VERCEL_URL: "",
			...overrides,
		},
		timeout: 10_000,
	});

	if (result.error) throw result.error;
	assert.equal(result.status, 0, result.stderr || result.stdout);
	return result.stdout.trim();
}

const captureSessionFetch = [
	"globalThis.fetch = async (input) => {",
	"const request = input instanceof Request ? input : new Request(input);",
	"console.log('FETCH_URL=' + request.url);",
	"return Response.json({ session: null, user: null });",
	"};",
	"const { authClient } = await import('./src/lib/auth-client.ts');",
	"await authClient.getSession();",
].join("\n");

function fetchUrlFrom(output: string) {
	const line = output
		.split("\n")
		.find((value) => value.startsWith("FETCH_URL="));
	assert.ok(line);
	return line;
}

describe("auth client base URL discovery", () => {
	it("imports without URL environment during a server build", () => {
		const output = runAuthClient(
			"await import('./src/lib/auth-client.ts'); console.log('AUTH_CLIENT_IMPORTED');",
		);

		assert.equal(output, "AUTH_CLIENT_IMPORTED");
	});

	it("uses SERVER_URL for server-side auth requests", () => {
		const output = runAuthClient(captureSessionFetch, {
			SERVER_URL: "https://auth.internal.example",
		});

		assert.equal(
			fetchUrlFrom(output),
			"FETCH_URL=https://auth.internal.example/api/auth/get-session",
		);
	});

	it("keeps browser auth requests on the current origin", () => {
		const output = runAuthClient(
			[
				"globalThis.window = { location: { origin: 'https://app.example.test' } };",
				captureSessionFetch,
			].join("\n"),
		);

		assert.equal(
			fetchUrlFrom(output),
			"FETCH_URL=https://app.example.test/api/auth/get-session",
		);
	});
});
