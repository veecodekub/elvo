# Isolated Database Verification

The database verification scripts require a disposable database target. They refuse to run unless all of these are set:

- NODE_ENV=test
- ELVO_TEST_DATABASE_URL points to the loopback elvo_test database
- DATABASE_URL exactly matches ELVO_TEST_DATABASE_URL
- ELVO_TEST_DATABASE_HTTP_ENDPOINT points to the matching loopback /sql endpoint

The fixture is an in-memory PGlite database. It applies every checked-in SQL migration when it starts, listens only on 127.0.0.1, and disappears when its process stops. It does not read the configured application database or any credentials from a .env file.

## Start the fixture

From the repository root, install dependencies once. Then open a terminal and start the disposable database:

~~~sh
cd apps/server
bun run test:database
~~~

Copy the printed ELVO_TEST_DATABASE_URL and ELVO_TEST_DATABASE_HTTP_ENDPOINT values. The database URL and endpoint include the same ephemeral port.

## Start the API

In a second terminal, from apps/server, set the fixture values and synthetic local configuration:

~~~sh
export NODE_ENV=test
export ELVO_TEST_DATABASE_URL='postgresql://postgres:test@127.0.0.1:<port>/elvo_test'
export DATABASE_URL="$ELVO_TEST_DATABASE_URL"
export ELVO_TEST_DATABASE_HTTP_ENDPOINT='http://127.0.0.1:<port>/sql'
export BETTER_AUTH_SECRET='isolated-verification-secret-long-enough-for-tests'
export BETTER_AUTH_URL='http://localhost:3000'
export CORS_ORIGIN='http://localhost:3001'
export PUBLIC_WEB_ORIGIN='http://localhost:3001'
bun run dev:isolated
~~~

Replace <port> with the port printed by the fixture. The preload validates the target and routes the unchanged Neon HTTP driver to the fixture.

## Start the website and run checks

In a third terminal, start the website:

~~~sh
NEXT_PUBLIC_SERVER_URL=http://localhost:3000 bun run dev:web
~~~

In a fourth terminal, from apps/server, export the same fixture values and secret, then run any database verification:

~~~sh
bun run verify:links
bun run verify:analytics
bun run verify:qr
bun run verify:seo
bun run analytics:retention
~~~

The analytics and QR browser checks also require Chromium. Install it from apps/server with:

~~~sh
bunx playwright install chromium
~~~

Stop the fixture process when finished. All test rows and database objects disappear with it. Never substitute a shared or production URL for the printed fixture URL.
