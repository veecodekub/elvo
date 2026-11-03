# Repository Guidelines

## Project Structure & Module Organization

This Bun/Turborepo monorepo uses TypeScript throughout:

- `apps/web/src/app/`: Next.js routes and layouts; app components and helpers live in `src/components/` and `src/lib/`. Route assets include `src/app/favicon.ico`.
- `apps/server/src/`: Hono API entry point, service initialization, and environment bootstrap.
- `packages/ui/src/`: shared shadcn components, hooks, utilities, and global styles.
- `packages/auth/src/`: Better Auth configuration.
- `packages/db/src/`: Drizzle schemas, relations, and migrations.
- `packages/config/`: shared TypeScript configuration.

Keep reusable UI in `packages/ui`; keep application-specific screens in `apps/web`. Read `apps/web/AGENTS.md` before changing frontend code.

## Build, Test, and Development Commands

Run commands from the repository root using Bun 1.3.14:

- `bun install`: install workspace dependencies and generate environment types.
- `bun run dev`: start web on port 3001 and API on port 3000. Use `dev:web` or `dev:server` to run one app.
- `bun run build`: build applications through Turborepo.
- `bun run test`: run Bun tests discovered from the workspace (`*.test.ts`).
- `bun run check-types`: type-check workspace packages.
- `bun run check:ci`: run non-mutating Biome checks for CI.
- `bun run check`: run Biome linting and formatting; this command modifies files.
- `bun run db:generate` / `bun run db:migrate`: generate SQL migrations / apply migrations. `db:push` directly synchronizes a development database.
- `bun run auth:generate`: regenerate the auth schema after changing auth plugins or schema options; review the resulting migration needs.

## Coding Style & Naming Conventions

Use strict TypeScript, tab indentation, and double-quoted JavaScript strings. Biome organizes imports and enforces formatting and lint rules. Follow existing kebab-case filenames, PascalCase React components, and camelCase functions. Import shared primitives through package exports, such as `@elvo/ui/components/button`. Lefthook formats and re-stages matching staged files before commits.

## Testing Guidelines

Use Bun's built-in test runner. Name test files `*.test.ts` and run the workspace suite with `bun run test` (or `bun test` for a focused path). Validate changes with `bun run check-types`, `bun run check:ci`, and `bun run build`. Database-backed verification scripts require the disposable PGlite fixture; follow `docs/development/database-verification.md` for the safe server, browser, and retention commands. Never point verification scripts at a shared or production database.

## Commit & Pull Request Guidelines

History currently contains only `initial commit`, so no established message convention exists. Write concise, imperative commit subjects. PRs should explain the change, link relevant issues, report validation, and include screenshots for visible UI changes. Call out schema migrations and environment changes.

## Environment & Agent Instructions

Commit `.env.schema` files; keep secrets in ignored `.env` files. Run `bun run env:generate` after schema edits and use generated `ENV` accessors. Run Varlock-dependent standalone tools from their owning workspace directory. Agents must prefix shell commands with `rtk`, as required by `/Users/veecodekub/.codex/RTK.md`.

## Agent skills

### Issue tracker

Track issues and specs in GitHub Issues for `veecodekub/elvo`.
See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five standard triage labels.
See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout: root `CONTEXT.md` and `docs/adr/`.
See `docs/agents/domain.md`.
