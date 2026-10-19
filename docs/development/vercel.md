# Vercel Deployment

The repository deploys as one Vercel project with two services, defined in
`vercel.json` at the repository root.

## Services and routing

| Service  | Root          | Framework | Public path                       |
| -------- | ------------- | --------- | --------------------------------- |
| `server` | `apps/server` | `hono`    | `/api/*` (rewrite)                |
| `web`    | `apps/web`    | `nextjs`  | every other path (catch-all rule) |

- Rewrites are evaluated top to bottom: `/api/(.*)` reaches the server service
  first, so `/api/links` and `/api/auth/*` keep their full paths. The catch-all
  `/(.*)` sends everything else, including `/<code>` short links, to the web
  service.
- `server` is internal apart from the `/api/*` rewrite. Short links are served
  by the web route handler `apps/web/src/app/[code]/route.ts`, which proxies to
  the server over the binding.
- `web` calls `server` through the binding declared in `vercel.json`. Vercel
  injects the internal URL into `SERVER_URL` for server-side code at runtime
  (functions only, never during builds or in middleware). Do not set
  `SERVER_URL` yourself.
- The browser calls same-origin `/api/*`, which the rewrite routes to the
  server service. `NEXT_PUBLIC_SERVER_URL` is therefore optional in production
  and stays unset; local development and Docker still set it to an absolute API
  origin.

## Project setup

1. Import the repository into Vercel and set the project's framework preset to
   **Services** in Build and Deployment settings. The project builds as
   services only when that preset is selected and `vercel.json` contains the
   `services` key.
2. Configure environment variables for the server service (per environment):

   | Variable                              | Value                                                                 |
   | ------------------------------------- | --------------------------------------------------------------------- |
   | `DATABASE_URL`                        | PostgreSQL (Neon) connection string                                    |
   | `BETTER_AUTH_SECRET`                  | Auth signing secret, at least 32 characters                            |
   | `BETTER_AUTH_URL`                     | The deployment's public HTTPS origin, e.g. `https://elvo.example`      |
   | `CORS_ORIGIN`                         | Same public origin as `BETTER_AUTH_URL`                                |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client; sign-in stays disabled without both         |
   | `PUBLIC_WEB_ORIGIN`                   | Optional; defaults to `CORS_ORIGIN`. Used to build Short Link URLs.    |

   The web service needs no required variables: the binding supplies
   `SERVER_URL`, and the browser uses same-origin `/api/*`.
3. Register `https://<public-origin>/api/auth/callback/google` as an authorized
   redirect URI in the Google Cloud console. The callback is on the project's
   public origin even though the server service handles it.
4. Keep `BETTER_AUTH_URL` and `CORS_ORIGIN` equal so Better Auth issues
   same-site cookies (SameSite=Lax) and no cross-site allowances are needed.
5. Preview deployments are separate origins. Google sign-in on a preview URL
   requires its own authorized redirect URI, or restrict OAuth credentials to
   the production environment.

Database migrations are not part of a deployment. Apply them from a machine
with `DATABASE_URL` set:

```bash
bun run db:migrate   # fresh databases
bun run db:push      # databases created before migrations existed
```

## Local development with Services

`vercel dev` runs both services together and injects the binding variables.
The `services` configuration requires Vercel CLI 64 or newer; check with
`vercel --version` and use `bunx vercel@latest` if your global CLI is older.

```bash
vercel dev                  # linked project; uses the project's environment variables
vercel dev -L               # local mode; no Vercel authentication
bunx vercel@latest dev -L   # when the installed CLI predates services
```

Requests then go to one origin, matching production routing: `/api/*` reaches
the server, everything else reaches the web app. `bun run dev` remains the
faster loop for day-to-day work with the two ports and
`NEXT_PUBLIC_SERVER_URL`; it does not exercise the services routing or binding.

`vercel dev` loads `apps/web/.env`, so a `NEXT_PUBLIC_SERVER_URL` set there
keeps browser calls pointed at that absolute API origin. Leave it unset while
testing services routing locally, then restore it for `bun run dev`.

## Verifying a deployment

1. `GET <origin>/api/links` without a session returns `401` — the `/api/*`
   rewrite reaches the server service.
2. `GET <origin>/` renders the web app, and `/<code>` for a known link issues a
   `302` to its destination — the catch-all and the web proxy both work.
3. `/<unknown-code>` renders the server's "Link unavailable" page and exposes
   neither the destination nor the owner.
4. Sign in with Google, create a link, and confirm the displayed Short Link
   uses the deployment origin and opens correctly.
