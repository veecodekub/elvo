# Short Links

Authenticated owners create Short Links and manage them from the dashboard;
visitors get an HTTP 302 redirect from `/<code>` on the public website. Issue
#2 added creation and redirects; issue #3 added search, pagination, editing,
and enable/disable.

## Behavior

- `POST /api/links` validates an HTTP/HTTPS Destination URL and an optional Link
  Title, then generates a unique, immutable seven-character Link Code from an
  unambiguous alphabet. Codes never match application routes.
- `GET /api/links` returns a page of the signed-in owner's links newest first
  plus quota usage. `q` searches Link Titles and Destination URLs
  case-insensitively, `status` filters `all` / `active` / `disabled`, and
  `page` selects a ten-link page. The last page includes a clamped `page` and
  `totalPages`, so a shrinking result set cannot strand the dashboard.
- `PATCH /api/links/:code` lets the owner edit the Link Title (or clear it with
  `null`), edit the HTTP/HTTPS Destination URL, and enable or disable the link.
  The Link Code, ownership, quota slot, and public URL never change. Updates are
  scoped by owner id in the SQL statement, so another account guessing a code
  gets the same `404 NOT_FOUND` as an unknown code, and nothing is modified.
  Editing works at the 100-link quota; the API exposes no code editing,
  expiration, or deletion.
- `GET /<code>` on the server (and the website's `/<code>` route) redirects with
  HTTP 302 to the stored destination. Unknown, disabled, and suspended links
  render a "Link unavailable" page that reveals neither the destination nor the
  owner. Enabling a disabled link restores the redirect.
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

- `links` stores ownership, code, title, destination, an `enabled` flag, and a
  quota `slot` in 1..100. A partial unique index on `(owner_id, slot)` makes the
  creation statement itself reserve quota, which is exact under concurrency.
  Disabling a link keeps its slot, so the quota counts disabled links too.
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
   (10 per minute), concurrent quota enforcement (100 per account), search by
   title/URL (including wildcard escaping), status filters, pagination and page
   clamping, title/destination edits, disable/re-enable, quota-boundary edits,
   and cross-account edit denial. It deletes every temporary account afterwards.

4. Manually confirm the UX: sign in, search and filter the list, page through
   ten-link pages, edit a title and destination, disable and re-enable a link
   (including Undo), discard an unsaved edit, copy a link, open the QR dialog,
   open the short URL and observe the redirect, then visit a disabled or unknown
   code and confirm the "Link unavailable" page. Check the dashboard at mobile,
   tablet, and desktop widths.
