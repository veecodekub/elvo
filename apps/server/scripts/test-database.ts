import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { neonConfig } from "@neondatabase/serverless";

type QueryRequest = {
	query?: unknown;
	params?: unknown;
};

type QueryField = {
	name: string;
	dataTypeID?: number;
	dataTypeSize?: number;
	dataTypeModifier?: number;
};

type QueryResult = {
	rows: unknown[][];
	fields: QueryField[];
	affectedRows?: number;
	rowCount?: number;
	command?: string;
};

export type IsolatedDatabase = {
	databaseUrl: string;
	endpoint: string;
	close(): Promise<void>;
};

const migrationsPath = resolve(
	import.meta.dir,
	"../../../packages/db/src/migrations",
);

async function applyMigrations(database: PGlite) {
	const directories = (await readdir(migrationsPath, { withFileTypes: true }))
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();

	if (directories.length === 0) {
		throw new Error(
			"No SQL migrations were found for the isolated test database.",
		);
	}

	for (const directory of directories) {
		const migrationPath = resolve(migrationsPath, directory, "migration.sql");
		const migration = await readFile(migrationPath, "utf8");
		await database.exec(migration);
	}
}

function commandFor(query: string) {
	return (
		query
			.trim()
			.match(/^[a-z]+/i)?.[0]
			?.toUpperCase() ?? "UNKNOWN"
	);
}

function createNeonHandler(database: PGlite) {
	return async (request: Request) => {
		const url = new URL(request.url);
		if (url.pathname !== "/sql") {
			return new Response("Not found", { status: 404 });
		}
		if (request.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		try {
			const body = (await request.json()) as QueryRequest;
			if (typeof body.query !== "string") {
				return Response.json(
					{ message: "A SQL query is required." },
					{ status: 400 },
				);
			}
			const params = Array.isArray(body.params) ? body.params : [];
			const description = await database.describeQuery(body.query);
			const parsers = Object.fromEntries(
				description.resultFields.map((field) => [
					field.dataTypeID,
					(value: string) => value,
				]),
			);
			const result = (await database.query(body.query, params, {
				rowMode: "array",
				parsers,
			})) as unknown as QueryResult;

			return Response.json({
				rows: result.rows,
				fields: result.fields,
				rowCount: result.rowCount ?? result.affectedRows ?? result.rows.length,
				command: result.command ?? commandFor(body.query),
			});
		} catch (error) {
			const details = error as {
				code?: string;
				detail?: string;
				hint?: string;
				message?: string;
			};
			return Response.json(
				{
					severity: "ERROR",
					code: details.code ?? "XX000",
					message: details.message ?? "The isolated SQL query failed.",
					detail: details.detail,
					hint: details.hint,
				},
				{ status: 400 },
			);
		}
	};
}

/**
 * Starts a fresh in-memory PostgreSQL-compatible database and a Neon HTTP
 * endpoint on loopback. The database is gone when close() is called or its
 * owning process exits.
 */
export async function startIsolatedDatabase(): Promise<IsolatedDatabase> {
	const database = new PGlite();
	await database.waitReady;
	const previousFetchEndpoint = neonConfig.fetchEndpoint;
	let server: ReturnType<typeof Bun.serve> | undefined;

	try {
		await applyMigrations(database);
		server = Bun.serve({
			hostname: "127.0.0.1",
			port: 0,
			fetch: createNeonHandler(database),
		});
		const endpoint = "http://127.0.0.1:" + server.port + "/sql";
		const databaseUrl =
			"postgresql://postgres:test@127.0.0.1:" + server.port + "/elvo_test";
		neonConfig.fetchEndpoint = endpoint;

		let closed = false;
		return {
			databaseUrl,
			endpoint,
			async close() {
				if (closed) return;
				closed = true;
				server?.stop(true);
				neonConfig.fetchEndpoint = previousFetchEndpoint;
				await database.close();
			},
		};
	} catch (error) {
		server?.stop(true);
		neonConfig.fetchEndpoint = previousFetchEndpoint;
		await database.close();
		throw error;
	}
}

if (import.meta.main) {
	const database = await startIsolatedDatabase();
	console.log("Disposable in-memory database is ready.");
	console.log("ELVO_TEST_DATABASE_URL=" + database.databaseUrl);
	console.log("DATABASE_URL=" + database.databaseUrl);
	console.log("ELVO_TEST_DATABASE_HTTP_ENDPOINT=" + database.endpoint);
	console.log("The database is erased when this process stops.");

	await new Promise<void>((resolve) => {
		process.once("SIGINT", resolve);
		process.once("SIGTERM", resolve);
	});
	await database.close();
}
