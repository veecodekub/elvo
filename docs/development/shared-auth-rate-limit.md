# Shared Authentication Rate Limits

Better Auth stores authentication rate-limit counters in PostgreSQL's `rate_limit` table. Every server instance uses the same table, so a new instance or restart does not reset a client's budget. The installed adapter performs conditional atomic increments to enforce limits under concurrent requests.

This is separate from the owner-specific Short Link creation limit. The auth library keeps its existing endpoint rules and enables rate limiting in production by default; development and test environments retain the library's default disabled setting.

## Schema and deployment

Apply the checked-in database migrations before deploying the server configuration that selects database storage:

```bash
bun run db:migrate
```

Run migration tooling with the database workspace's environment configuration as described in the repository setup instructions. Review migrations before applying them to an existing deployment. No Redis service or additional production credentials are required.

After auth schema options change, regenerate the schema with `bun run auth:generate`, inspect the diff, and generate a Drizzle migration. Keep the auth library and adapter versions aligned.

## Verification

The auth rate-limit regression uses a disposable in-memory PostgreSQL-compatible database through the same Neon HTTP/Drizzle adapter as the application. It checks a budget shared by separate auth instances, concurrent requests, a fresh process, and expired counters. It uses synthetic credentials and never reads the deployed database.

```bash
bun test apps/server/src/auth-rate-limit.test.ts
```

The ordinary Google-only auth tests continue to cover provider configuration, cookie attributes, anonymous sessions, and disabled password sign-in:

```bash
bun test packages/auth/src/index.test.ts
```
