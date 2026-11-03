# Google Sign-in Setup

Elvo Links uses Better Auth 1.7.7 on the Hono server. Google is the only enabled sign-in method; email/password sign-in is disabled. The `user`, `session`, and `account` tables persist sign-in state and Google identities in the configured database. Apply all checked-in migrations before first use (`bun run db:migrate` for a fresh database).

## Local configuration

1. In Google Cloud Console, create an OAuth client of type **Web application**. Configure the consent screen and add test users if the app is in testing mode.
2. Add JavaScript origin `http://localhost:3001` and authorized redirect URI `http://localhost:3000/api/auth/callback/google`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the ignored `apps/server/.env`. Keep `BETTER_AUTH_URL=http://localhost:3000` and `CORS_ORIGIN=http://localhost:3001`. Set web `NEXT_PUBLIC_SERVER_URL=http://localhost:3000`.
4. Run `bun run env:generate` after schema changes. Restart the server after changing env values, then run `bun run dev` from the root.
5. Open `/login`, continue with Google, and confirm `/dashboard` shows your account. Account opens real profile details; Sign out ends the session. A later visit to `/dashboard` should return to `/login`.

The server can start without OAuth credentials to support initial setup, but Google sign-in is unavailable until both are supplied. Credentials belong only on the server. Use the same localhost hostname on both apps; ports may differ.

## Deployment

Set Google credentials in the server deployment environment. On Vercel
Services the website and API share one public origin
([Vercel deployment](vercel.md)): set `BETTER_AUTH_URL` and `CORS_ORIGIN` to
that origin and register its exact `/api/auth/callback/google` URL with Google.
`SERVER_URL`, when used for server-side requests, is an internal networking
override; it does not change Google's registered public callback.

HTTPS uses secure cookies. Local same-host HTTP uses HTTP-only SameSite=Lax cookies. Separate hosts use SameSite=None and require HTTPS; browser third-party cookie policies may still require deploying web and auth on the same site.

## Verification

- `bun run test` from the repository root
- `bun run check-types` from the repository root
- Anonymous `/dashboard` redirects to `/login`; provider errors/cancellation return to a retryable login screen.
- Verify success and sign-out using a real Google test user and configured database. Automated configuration tests do not prove Google's consent/callback round trip.

The authenticated dashboard starts without demo link records. Accounts, sessions, and user-created links persist in the configured database; link creation and management are implemented. The accepted interactive design remains at the development-only `/prototype/dashboard` route.

Provider reference: https://www.better-auth.com/docs/authentication/google
