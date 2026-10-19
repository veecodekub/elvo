import { execFileSync } from "node:child_process";

// Vercel Functions run without the varlock CLI, so freeze the resolved env
// into the build output (`dist/.varlock-frozen-env`). Other targets - local
// dev, Docker, `vercel dev` - keep resolving from .env files at runtime.
if (process.env.VERCEL !== "1") {
	process.exit(0);
}

const args = ["freeze", "--out", "dist/.varlock-frozen-env"];
if (!process.env._VARLOCK_ENV_KEY) {
	args.push("--allow-plaintext");
}

execFileSync("varlock", args, { stdio: "inherit" });
