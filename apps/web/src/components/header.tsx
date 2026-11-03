"use client";
import { cn } from "@elvo/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isMarketingPath, MARKETING_LINKS } from "@/lib/brand";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

function MarketingNav({ mobile = false }: { mobile?: boolean }) {
	const pathname = usePathname();

	return (
		<nav
			aria-label={mobile ? "Primary mobile" : "Primary"}
			className={cn(
				mobile
					? "mx-auto flex w-full max-w-6xl gap-4 overflow-x-auto px-4 pb-3 text-sm md:hidden"
					: "hidden items-center gap-5 text-sm md:flex",
			)}
		>
			{MARKETING_LINKS.map((link) => {
				const active = pathname === link.href;
				return (
					<Link
						key={link.href}
						href={link.href}
						aria-current={active ? "page" : undefined}
						className={cn(
							"whitespace-nowrap transition-colors hover:text-foreground",
							active ? "text-foreground" : "text-muted-foreground",
						)}
					>
						{link.label}
					</Link>
				);
			})}
		</nav>
	);
}

export default function Header() {
	const pathname = usePathname();
	if (
		process.env.NODE_ENV !== "production" &&
		pathname.startsWith("/prototype/")
	)
		return null;

	const isMarketing = isMarketingPath(pathname);

	return (
		<header className="relative z-20 border-b bg-background">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
				<div className="flex min-w-0 items-center gap-6">
					<Link href="/" className="font-semibold text-xl tracking-tight">
						elvo{" "}
						<span className="font-normal text-muted-foreground text-sm">
							/ links
						</span>
					</Link>
					{isMarketing ? <MarketingNav /> : null}
				</div>
				<div className="flex items-center gap-3">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			{isMarketing ? <MarketingNav mobile /> : null}
		</header>
	);
}
