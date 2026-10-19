import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	platform: "node",
	deps: {
		// Vercel ships `dist/index.mjs` as a standalone function bundle, which
		// cannot resolve dependencies through Bun's workspace symlinks at
		// runtime. Bundle everything so the function is self-contained.
		alwaysBundle: [/./],
	},
});
