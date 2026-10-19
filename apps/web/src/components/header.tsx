"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const pathname = usePathname();
	if (
		process.env.NODE_ENV !== "production" &&
		pathname.startsWith("/prototype/")
	)
		return null;
	return (
		<header className="border-b">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
				<Link href="/" className="font-semibold text-xl tracking-tight">
					elvo{" "}
					<span className="font-normal text-muted-foreground text-sm">
						/ links
					</span>
				</Link>
				<div className="flex items-center gap-3">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
