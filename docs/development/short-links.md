# Short Links

Issue #2 lets an authenticated owner create a Short Link and gives visitors an
HTTP 302 redirect from `/<code>` on the public website.

## Behavior

- `POST /api/links` validates an HTTP/HTTPS Destination URL and an optional Link
  Title, then generates a unique, immutable seven-character Link Code from an
  unambiguous alphabet. Codes never match application routes.
- `GET /api/links` returns the signed-in owner's links newest first plus quota
  usage.
- `GET /<code>` on the server (and the website's `/<code>` route) redirects with
  HTTP 302 to the stored destination. Unknown codes render a "Link unavailable"
  page that reveals neither the destination nor the owner.
- Each account can hold at most 100 links, and at most 10 links can be created
  per rolling minute. Both limits are enforced in the database so concurrent
  requests cannot exceed them.

## Configuration

`PUBLIC_WEB_ORIGIN` on the server is the public website origin used to build
Short Link URLs (for example `https://elvo.example`). It is optional and falls
back to `CORS_ORIGIN`, so local development works with the web app on port 3001.
On Vercel Services the website and API share one public origin, so the project
domain is also the short-link origin ([Vercel deployment](vercel.md)).

Do not hardcode illustrative domains in application code.

## Data model

- `links` stores ownership, code, title, destination, and a quota `slot` in
  1..100. A partial unique index on `(owner_id, slot)` makes the creation
  statement itself reserve quota, which is exact under concurrency.
- `link_rate_limits` keeps one row per owner with the rolling window start and
  count. A guarded `ON CONFLICT DO UPDATE` serializes concurrent creations.

## Migrations

Schema migrations live in `packages/db/src/migrations`.

- After changing the schema, run `bun run db:generate` from the repository root.
- Fresh databases: `bun run db:migrate`.
- Databases created with `db:push` before migrations existed: use
  `bun run db:push`. The first generated migration is a full baseline, so
  `db:migrate` is intended for new databases.

## Verification

1. Install dependencies and apply the schema:

   ```bash
   bun install
   bun run db:push
   ```

2. Run unit tests and type checks:

   ```bash
   bun test
   bun run check-types
   ```

3. Start the apps with `bun run dev`, then run the end-to-end verification from
   the server workspace:

   ```bash
   cd apps/server
   bun run verify:links
   ```

   The script creates temporary accounts and verifies validation, persistence,
   newest-first listing, account isolation, HTTP 302 redirects on both origins,
   the unavailable page, collision retries, concurrent rate limiting
   (10 per minute), and concurrent quota enforcement (100 per account). It
   deletes every temporary account afterwards.

4. Manually confirm the UX: sign in, create a link, copy it from the success
   footer and the list, open the QR dialog, open the short URL and observe the
   redirect, then visit an unknown code and confirm the "Link unavailable" page.
