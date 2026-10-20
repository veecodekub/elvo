import type { ReactNode } from "react";

import { PageIntro } from "./page-intro";

export function LegalPage({
	title,
	description,
	updated,
	children,
}: {
	title: string;
	description: string;
	updated: string;
	children: ReactNode;
}) {
	return (
		<main className="flex-1">
			<PageIntro eyebrow="Legal" title={title} description={description} />
			<article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
				<p className="text-muted-foreground text-sm">Last updated: {updated}</p>
				<div className="mt-10 space-y-9">{children}</div>
			</article>
		</main>
	);
}

export function LegalSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="space-y-3">
			<h2 className="font-semibold text-lg tracking-tight">{title}</h2>
			<div className="space-y-3 text-muted-foreground text-sm leading-7">
				{children}
			</div>
		</section>
	);
}
