"use client";

import { usePathname } from "next/navigation";

const DASHBOARD_PATHS = ["/dashboard", "/prototype/dashboard"] as const;

export default function PageBackground() {
	const pathname = usePathname();
	const isDashboard = DASHBOARD_PATHS.some(
		(path) => pathname === path || pathname.startsWith(path + "/"),
	);

	if (isDashboard) return null;

	return (
		<div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
			<div
				className="absolute inset-0 dark:hidden"
				style={{ background: "#fff" }}
			>
				<div
					className="absolute inset-0 opacity-30"
					style={{
						backgroundImage:
							"linear-gradient(rgba(15, 23, 42, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.1) 1px, transparent 1px)",
						backgroundSize: "60px 60px",
					}}
				/>
			</div>
			<div
				className="absolute inset-0 hidden dark:block"
				style={{ background: "#000" }}
			>
				<div
					className="absolute inset-0 opacity-30"
					style={{
						backgroundImage:
							"linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
						backgroundSize: "60px 60px",
					}}
				/>
			</div>
		</div>
	);
}
