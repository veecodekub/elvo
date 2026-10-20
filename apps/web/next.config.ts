import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const withVarlock = varlockNextConfigPlugin();

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	output: "standalone",
	async headers() {
		const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

		return [
			{ source: "/login", headers: noindex },
			{ source: "/dashboard", headers: noindex },
			{ source: "/dashboard/:path*", headers: noindex },
			{ source: "/prototype", headers: noindex },
			{ source: "/prototype/:path*", headers: noindex },
		];
	},
};

export default withVarlock(nextConfig);
