import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Vercel builds freeze the resolved env into `dist/.varlock-frozen-env` (see
// scripts/freeze-env.ts) because the runtime has no varlock CLI or .env files.
// Varlock only reads a frozen file when asked to, so opt in when the deployed
// bundle actually ships one - local dev, Docker, and `vercel dev` resolve from
// .env files instead.
const frozenEnvPath = fileURLToPath(
	new URL(".varlock-frozen-env", import.meta.url),
);

if (process.env.VERCEL === "1" && existsSync(frozenEnvPath)) {
	process.env._VARLOCK_USE_FROZEN_ENV ??= frozenEnvPath;
}
