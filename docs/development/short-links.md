# Short Links

Authenticated owners create Short Links and manage them from the dashboard;
visitors get an HTTP 302 redirect from `/<code>` on the public website. Issue
#2 added creation and redirects; issue #3 added search, pagination, editing,
and enable/disable; issue #4 added downloadable Link QR Codes; issue #5 added
aggregate Click Analytics.

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
- The dashboard's QR dialog previews a black-and-white Link QR Code for the
  configured public Short Link URL and downloads it as `elvo-<code>.png`. The
  PNG always encodes `/<code>`, never the Destination URL, so a downloaded
  code keeps working when the destination is edited. The PNG includes the
  four-module quiet zone and is flattened to pure black and white. A generation
  failure is reported in the dialog, which stays open. QR customization and
  alternative formats are out of scope.
- `GET /api/links/:code/analytics` returns the signed-in owner's lifetime Total
  Clicks and a daily series for the latest 30 UTC calendar days, including
  zero-activity days. Unknown codes and another account's links both return the
  same `404 NOT_FOUND`. The dashboard opens the data in a dialog that refreshes
  every 30 seconds while open and shows loading, empty, and retryable failure
  states; the table and mobile cards expose the current lifetime count.
- Every successful redirect for a known, enabled link records one Click after
  the response has been sent. Repeat openings and bots count; disabled,
  unknown, and suspended links do not. Destination loads, unique visitors,
  visitor IP addresses, country, device, referrer, and bot filtering are not
  tracked. Recording failures are logged and swallowed so a redirect never
  fails because analytics failed, which can undercount totals.
- Each account can hold at most 100 links, and at most 10 links can be created
  per rolling minute. Both limits are enforced in the database so concurrent
  requests cannot exceed them.

## Configuration

`PUBLIC_WEB_ORIGIN` on the server is the public website origin used to build
Short Link URLs (for example `https://elvo.example`). It is optional and falls
back to `CORS_ORIGIN`, so local development works with the web app on port 3001.
On Vercel Services the website and API share one public origin, so the project
domain is also the short-link origin ([Vercel deployment](vercel.md)).

Daily analytics retention runs through either:

- The Vercel Cron entry in `vercel.json`, which calls
  `GET /api/internal/retention` daily at 00:15 UTC. Set `CRON_SECRET` (at least
  16 characters) in the server service environment; Vercel sends it as
  `Authorization: Bearer <CRON_SECRET>`. Without the secret the endpoint returns
  `401`.
- The standalone command, for local or external schedulers:

  ```bash
  cd apps/server
  bun run analytics:retention
  ```

Retention deletes daily rows older than the latest 30 UTC calendar days and
never changes lifetime totals.

Do not hardcode illustrative domains in application code.

## Data model

- `links` stores ownership, code, title, destination, an `enabled` flag, a
  quota `slot` in 1..100, and a lifetime `total_clicks` counter. A partial
  unique index on `(owner_id, slot)` makes the creation statement itself reserve
  quota, which is exact under concurrency. Disabling a link keeps its slot, so
  the quota counts disabled links too.
- `link_daily_clicks` stores anonymous daily UTC aggregates keyed by
  `(link_id, day)` with a cascading link foreign key. A Click increments the
  link's lifetime counter and today's daily row in one statement, so concurrent
  increments are not lost and a failure leaves both aggregates consistent.
  Retention removes rows before the latest 30 UTC days while `total_clicks`
  remains intact.
- `link_rate_limits` keeps one row per owner with at most ten reservation
  timestamps. A guarded `ON CONFLICT DO UPDATE` serializes concurrent creations.
  Legacy window columns and a compatibility trigger share this budget with old
  server instances during upgrades and rollback.

## Migrations

Schema migrations live in `packages/db/src/migrations`.

- After changing the schema, run `bun run db:generate` from the repository root.
- Fresh databases: `bun run db:migrate`.
- Existing databases initialized with `db:push`: compare their schema with the
  historical migration snapshot and establish the matching migration-history
  baseline before running `bun run db:migrate`. Do not replay initial CREATE
  statements or substitute `db:push`; it does not install the rolling-limit
  compatibility trigger. See [link-rate-limit.md](./link-rate-limit.md).

## Verification

Run unit tests and type checks from the repository root:

```bash
bun run test
bun run check-types
```

Database-backed verification requires the isolated in-memory PGlite database and
Neon HTTP endpoint. Follow
[`database-verification.md`](database-verification.md) for the fixture, API and
website launch commands, verification scripts, Chromium prerequisite, and safe
retention invocation. Those scripts fail closed unless explicitly pointed at the
fixture. Do not run them against a shared or production database.
