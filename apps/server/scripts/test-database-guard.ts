export type TestDatabaseEnvironment = {
	NODE_ENV?: string;
	ELVO_TEST_DATABASE_URL?: string;
	ELVO_TEST_DATABASE_HTTP_ENDPOINT?: string;
	DATABASE_URL?: string;
};

export type IsolatedDatabaseTarget = {
	databaseUrl: string;
	endpoint: string;
};

/**
 * Database verification accepts only the loopback database created by
 * test-database.ts. Requiring a separate test URL and endpoint keeps a
 * developer's ordinary DATABASE_URL from being an implicit target.
 */
export function assertIsolatedTestDatabase(
	environment: TestDatabaseEnvironment = process.env,
): IsolatedDatabaseTarget {
	if (environment.NODE_ENV !== "test") {
		throw new Error("Database verification requires NODE_ENV=test.");
	}

	const databaseUrl = environment.ELVO_TEST_DATABASE_URL?.trim();
	if (!databaseUrl) {
		throw new Error(
			"Database verification requires ELVO_TEST_DATABASE_URL from the isolated test database fixture.",
		);
	}
	if (environment.DATABASE_URL?.trim() !== databaseUrl) {
		throw new Error(
			"Database verification requires DATABASE_URL to exactly match ELVO_TEST_DATABASE_URL.",
		);
	}

	let database: URL;
	try {
		database = new URL(databaseUrl);
	} catch {
		throw new Error("ELVO_TEST_DATABASE_URL must be a valid PostgreSQL URL.");
	}
	if (
		(database.protocol !== "postgres:" &&
			database.protocol !== "postgresql:") ||
		database.hostname !== "127.0.0.1" ||
		!database.port ||
		database.pathname !== "/elvo_test"
	) {
		throw new Error(
			"ELVO_TEST_DATABASE_URL must target the loopback elvo_test database created by test-database.ts.",
		);
	}

	const endpointValue = environment.ELVO_TEST_DATABASE_HTTP_ENDPOINT?.trim();
	if (!endpointValue) {
		throw new Error(
			"Database verification requires ELVO_TEST_DATABASE_HTTP_ENDPOINT from the isolated test database fixture.",
		);
	}

	let endpoint: URL;
	try {
		endpoint = new URL(endpointValue);
	} catch {
		throw new Error(
			"ELVO_TEST_DATABASE_HTTP_ENDPOINT must be a valid loopback HTTP URL.",
		);
	}
	if (
		endpoint.protocol !== "http:" ||
		endpoint.hostname !== "127.0.0.1" ||
		!endpoint.port ||
		endpoint.port !== database.port ||
		endpoint.username ||
		endpoint.password ||
		endpoint.pathname !== "/sql" ||
		endpoint.search ||
		endpoint.hash
	) {
		throw new Error(
			"ELVO_TEST_DATABASE_HTTP_ENDPOINT must target the loopback /sql endpoint created by test-database.ts.",
		);
	}

	return { databaseUrl, endpoint: endpoint.href };
}
