import { describe, expect, test } from "bun:test";

import { assertIsolatedTestDatabase } from "./test-database-guard";

const databaseUrl = "postgresql://postgres:test@127.0.0.1:54321/elvo_test";
const endpoint = "http://127.0.0.1:54321/sql";

function validEnvironment() {
	return {
		NODE_ENV: "test",
		DATABASE_URL: databaseUrl,
		ELVO_TEST_DATABASE_URL: databaseUrl,
		ELVO_TEST_DATABASE_HTTP_ENDPOINT: endpoint,
	};
}

describe("isolated database guard", () => {
	test("accepts the explicit loopback fixture target", () => {
		expect(assertIsolatedTestDatabase(validEnvironment())).toEqual({
			databaseUrl,
			endpoint,
		});
	});

	test("requires NODE_ENV=test", () => {
		const environment = validEnvironment();
		environment.NODE_ENV = "development";
		expect(() => assertIsolatedTestDatabase(environment)).toThrow(
			"NODE_ENV=test",
		);
	});

	test("requires an explicit test database URL", () => {
		const environment = validEnvironment();
		Reflect.deleteProperty(environment, "ELVO_TEST_DATABASE_URL");
		expect(() => assertIsolatedTestDatabase(environment)).toThrow(
			"ELVO_TEST_DATABASE_URL",
		);
	});

	test("requires the configured database URL to match the test URL", () => {
		const environment = validEnvironment();
		environment.DATABASE_URL = "postgresql://shared.example.net/app";
		expect(() => assertIsolatedTestDatabase(environment)).toThrow(
			"exactly match",
		);
	});

	test("rejects non-loopback database hosts", () => {
		const environment = validEnvironment();
		environment.ELVO_TEST_DATABASE_URL =
			"postgresql://postgres:test@db.example.net:5432/elvo_test";
		environment.DATABASE_URL = environment.ELVO_TEST_DATABASE_URL;
		expect(() => assertIsolatedTestDatabase(environment)).toThrow("loopback");
	});

	test("rejects non-loopback SQL endpoints", () => {
		const environment = validEnvironment();
		environment.ELVO_TEST_DATABASE_HTTP_ENDPOINT =
			"https://production.example.net/sql";
		expect(() => assertIsolatedTestDatabase(environment)).toThrow(
			"loopback /sql",
		);
	});

	test("requires matching endpoint and database ports", () => {
		const environment = validEnvironment();
		environment.ELVO_TEST_DATABASE_HTTP_ENDPOINT = "http://127.0.0.1:54322/sql";
		expect(() => assertIsolatedTestDatabase(environment)).toThrow(
			"loopback /sql",
		);
	});

	test("rejects SQL endpoint credentials", () => {
		const environment = validEnvironment();
		environment.ELVO_TEST_DATABASE_HTTP_ENDPOINT =
			"http://user:secret@127.0.0.1:54321/sql";
		expect(() => assertIsolatedTestDatabase(environment)).toThrow(
			"loopback /sql",
		);
	});

	test("rejects an arbitrary local database name", () => {
		const environment = validEnvironment();
		environment.ELVO_TEST_DATABASE_URL =
			"postgresql://postgres:test@127.0.0.1:54321/postgres";
		environment.DATABASE_URL = environment.ELVO_TEST_DATABASE_URL;
		expect(() => assertIsolatedTestDatabase(environment)).toThrow("elvo_test");
	});
});
