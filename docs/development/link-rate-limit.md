# Rolling Short Link Creation Limits

Each owner has at most ten accepted creation reservations in any rolling 60-second window. PostgreSQL atomically filters expired timestamps and appends one reservation while holding the owner's rate-limit row lock. The stored array is bounded to ten timestamps. Production uses the database clock; deterministic test timestamps are internal service parameters, never request input.

The account quota remains 100 created links. A creation attempt reserves capacity before the insert, so failed attempts can conservatively consume a rate-limit slot. Editing an existing Destination URL does not reserve a creation slot.

## Migration and rollout

Apply the checked-in additive migrations before deploying the new server. The rolling-limit migration adds `reservations`, conservatively backfills existing counters, and installs the compatibility trigger in one atomic SQL statement under an exclusive table lock.

The old `window_started_at` and `window_count` columns remain for old server instances and rollback. Legacy writes append to the same rolling array through the trigger and return no row when the shared budget is full. Modern writes supply their own reservation and are not counted twice. This keeps the cap shared while old and new instances overlap, without a separate traffic pause.

Backfilled requests may remain limited for up to one minute. Keep the legacy columns and trigger while old deployments remain eligible for rollback. Removing that compatibility is a separate migration after those deployments have drained.

Before applying migrations, confirm the database's migration journal. Databases initialized through older `db:push` instructions need an explicit baseline review; do not blindly replay the full initial schema or use `db:push` alone, which does not install the compatibility trigger.

## Verification

```bash
bun test apps/server/src/links/service.test.ts apps/server/src/links/legacy-rate-limit.test.ts
```

These checks run against a fresh disposable database using the checked-in migrations. They cover the rolling boundary, concurrent requests, owner isolation, destination edits, mixed old/new writes, existing-counter backfill, and expiry. They do not use the configured application database.
