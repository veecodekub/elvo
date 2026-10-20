import type { Route } from "next";
import Link from "next/link";

import { GITHUB_URL, MARKETING_LINKS, SITE_NAME } from "@/lib/brand";

function FooterGroup({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-3">
			<h2 className="font-medium text-sm">{title}</h2>
			<ul className="space-y-2 text-muted-foreground text-sm">{children}</ul>
		</div>
	);
}

function FooterLink({
	href,
	children,
	external = false,
}: {
	href: string;
	children: React.ReactNode;
	external?: boolean;
}) {
	const className = "transition-colors hover:text-foreground";

	return (
		<li>
			{external ? (
				<a href={href} className={className} target="_blank" rel="noreferrer">
					{children}
				</a>
			) : (
				<Link href={href as Route} className={className}>
					{children}
				</Link>
			)}
		</li>
	);
}

export default function Footer() {
	return (
		<footer className="border-t bg-muted/20">
			<div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
				<div className="space-y-3">
					<Link href="/" className="font-semibold text-xl tracking-tight">
						elvo{" "}
						<span className="font-normal text-muted-foreground text-sm">
							/ links
						</span>
					</Link>
					<p className="max-w-xs text-muted-foreground text-sm">
						Short Links. Clean Experience. Create, share, and understand your
						links with click analytics that do not track visitors.
					</p>
				</div>
				<FooterGroup title="Product">
					{MARKETING_LINKS.map((link) => (
						<FooterLink key={link.href} href={link.href}>
							{link.label}
						</FooterLink>
					))}
				</FooterGroup>
				<FooterGroup title="Resources">
					<FooterLink href="/faq">FAQ</FooterLink>
					<FooterLink href="/about">About</FooterLink>
					<FooterLink href={GITHUB_URL} external>
						GitHub
					</FooterLink>
				</FooterGroup>
				<FooterGroup title="Legal">
					<FooterLink href="/privacy">Privacy</FooterLink>
					<FooterLink href="/terms">Terms</FooterLink>
				</FooterGroup>
			</div>
			<div className="border-t">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-muted-foreground text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<p>
						© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
					</p>
					<p>Free to use. Built for simple sharing.</p>
				</div>
			</div>
		</footer>
	);
}
