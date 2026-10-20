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

4. Install Chromium once, then run the Link QR Code verification from the
   server workspace:

   ```bash
   cd apps/server
   bunx playwright install chromium
   bun run verify:qr
   ```

   The script creates a temporary owner, signs a session cookie for Chromium,
   downloads the PNG through the real dashboard dialog, and checks the
   `elvo-<code>.png` filename. It decodes the PNG with `jsqr`, confirms the
   exact public Short Link URL and a four-module quiet zone, and verifies the
   downloaded code redirects. It then edits the destination and checks the same
   downloaded code reaches the new destination. It also exercises the
   generation-failure message and the mobile dialog. All temporary accounts are
   removed afterwards.

5. With the dev servers still running, verify aggregate analytics:

   ```bash
   cd apps/server
   bun run verify:analytics
   ```

   The script checks owner-only access and isolation, the 30-day UTC series with
   zero-activity days, repeat and concurrent redirect increments, disabled and
   unknown links not counting, redirects surviving a simulated recording
   failure, retention preserving lifetime totals and removing expired days, and
   the real dashboard on desktop and mobile. It also checks the loading, empty,
   failure, retry, and automatic-refresh behavior, then removes all temporary
   accounts.

6. Manually confirm the UX: sign in, search and filter the list, page through
   ten-link pages, edit a title and destination, disable and re-enable a link
   (including Undo), discard an unsaved edit, copy a link, open the QR dialog,
   download and scan the PNG, open the short URL and observe the redirect, open
   the Click Analytics dialog and confirm the lifetime total and 30-day chart,
   then visit a disabled or unknown code and confirm the "Link unavailable"
   page. Check the dashboard at mobile, tablet, and desktop widths.
