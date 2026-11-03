import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { createAuth } from "@elvo/auth";
import { createDb } from "@elvo/db";
import { rateLimit } from "@elvo/db/schema/auth";
import { eq } from "drizzle-orm";

import { startIsolatedDatabase } from "../scripts/test-database";

const config = {
	BETTER_AUTH_URL: "http://localhost:3000",
	CORS_ORIGIN: "http://localhost:3001",
	BETTER_AUTH_SECRET: "shared-rate-limit-test-secret-at-least-32-characters",
};

const coldProcessSource = `import { createAuth } from "@elvo/auth";
import { createDb } from "@elvo/db";
const auth = createAuth({"BETTER_AUTH_URL":"http://localhost:3000","CORS_ORIGIN":"http://localhost:3001","BETTER_AUTH_SECRET":"shared-rate-limit-test-secret-at-least-32-characters"}, createDb({ DATABASE_URL: process.env.DATABASE_URL }));
const context = await auth.$context;
Object.assign(context.rateLimit, { enabled: true, max: 4, window: 3600 });
const response = await auth.handler(new Request("http://localhost:3000/api/auth/ok", { headers: { "x-forwarded-for": "203.0.113.26" } }));
console.log(response.status);
`;

test("auth counters are atomic, survive a fresh process, and expire in the shared database", async () => {
	const fixture = await startIsolatedDatabase();
	try {
		const database = createDb({ DATABASE_URL: fixture.databaseUrl });
		async function instance() {
			const auth = createAuth(
				config,
				createDb({ DATABASE_URL: fixture.databaseUrl }),
			);
			Object.assign((await auth.$context).rateLimit, {
				enabled: true,
				max: 4,
				window: 3600,
			});
			return auth;
		}
		const instances = await Promise.all([instance(), instance()]);
		const request = (ip = "203.0.113.26") =>
			new Request(`${config.BETTER_AUTH_URL}/api/auth/ok`, {
				headers: { "x-forwarded-for": ip },
			});

		const responses = await Promise.all(
			Array.from({ length: 12 }, (_, index) => {
				const auth = instances[index % instances.length];
				if (!auth) throw new Error("Missing test auth instance");
				return auth.handler(request());
			}),
		);
		expect(
			responses.filter((response) => response.status === 200),
		).toHaveLength(4);
		expect(
			responses.filter((response) => response.status === 429),
		).toHaveLength(8);
		const rows = await database.select().from(rateLimit);
		expect(rows).toHaveLength(1);
		const stored = rows[0];
		if (!stored) throw new Error("The rate-limit budget was not persisted");
		expect(stored.count).toBe(4);

		const coldProcess = Bun.spawn(
			[
				process.execPath,
				"--preload",
				fileURLToPath(
					new URL("../scripts/test-database-preload.ts", import.meta.url),
				),
				"-e",
				coldProcessSource,
			],
			{
				cwd: fileURLToPath(new URL("..", import.meta.url)),
				env: {
					...process.env,
					NODE_ENV: "test",
					DATABASE_URL: fixture.databaseUrl,
					ELVO_TEST_DATABASE_URL: fixture.databaseUrl,
					ELVO_TEST_DATABASE_HTTP_ENDPOINT: fixture.endpoint,
				},
				stdout: "pipe",
				stderr: "pipe",
			},
		);
		const [status, errors, exitCode] = await Promise.all([
			new Response(coldProcess.stdout).text(),
			new Response(coldProcess.stderr).text(),
			coldProcess.exited,
		]);
		expect(errors).not.toContain("error:");
		expect(exitCode).toBe(0);
		expect(status.trim()).toBe("429");

		const restarted = await instance();
		expect((await restarted.handler(request("203.0.113.27"))).status).toBe(200);
		const blocked = await restarted.handler(request());
		expect(blocked.status).toBe(429);
		expect(Number(blocked.headers.get("x-retry-after"))).toBeGreaterThan(0);

		await database
			.update(rateLimit)
			.set({ lastRequest: Date.now() - 3_601_000 })
			.where(eq(rateLimit.key, stored.key));
		expect((await restarted.handler(request())).status).toBe(200);
		const [refreshed] = await database
			.select()
			.from(rateLimit)
			.where(eq(rateLimit.key, stored.key));
		expect(refreshed?.count).toBe(1);
	} finally {
		await fixture.close();
	}
}, 30_000);
