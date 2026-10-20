import { Button } from "@elvo/ui/components/button";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CtaSection } from "@/components/marketing/cta-section";
import { PageIntro } from "@/components/marketing/page-intro";
import { CONTACT_URL, GITHUB_URL, SITE_NAME } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
	title: "About Elvo Links",
	description:
		"Elvo Links is a small URL shortening product focused on clean links, downloadable QR codes, and privacy-friendly aggregate click analytics.",
	path: "/about",
	keywords: [
		"about Elvo Links",
		"simple URL shortener",
		"privacy-friendly link tool",
	],
});

const principles = [
	{
		title: "Keep the link useful",
		description:
			"A short link should remain stable after it is printed or shared. Destinations can change; the code should not.",
	},
	{
		title: "Count activity, not people",
		description:
			"Click analytics should answer whether a link is used without building a visitor profile. Aggregate counts are enough for the MVP.",
	},
	{
		title: "Stay small on purpose",
		description:
			"Google sign-in, a compact dashboard, and a short list of features. Less surface area means fewer things to manage.",
	},
] as const;

export default function AboutPage() {
	return (
		<main className="flex-1">
			<PageIntro
				eyebrow="About"
				title="A small, focused link tool."
				description={`${SITE_NAME} is Elvo's URL shortening product. It exists to make sharing a link simpler without turning the audience into a tracking project.`}
			>
				<div className="flex flex-wrap gap-3">
					<Button
						size="lg"
						nativeButton={false}
						render={<Link href="/login" />}
					>
						Get started
					</Button>
					<Button
						size="lg"
						variant="outline"
						nativeButton={false}
						render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
					>
						View the repository
					</Button>
				</div>
			</PageIntro>

			<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
					<div>
						<h2 className="font-semibold text-3xl tracking-tight">
							What the MVP includes
						</h2>
						<p className="mt-3 text-muted-foreground">
							Elvo Links is intentionally narrower than a full link-management
							platform. The current product covers the core flow from sign-in to
							sharing.
						</p>
					</div>
					<ul className="grid gap-3 sm:grid-cols-2">
						{[
							"Google-only sign-in",
							"Up to 100 links per account",
							"Seven-character short codes",
							"Downloadable QR codes",
							"Destination editing and enable/disable",
							"Lifetime and 30-day click analytics",
						].map((item) => (
							<li key={item} className="flex items-start gap-2 text-sm">
								<Check
									aria-hidden="true"
									className="mt-1 size-4 shrink-0 text-foreground"
								/>
								<span className="text-muted-foreground">{item}</span>
							</li>
						))}
					</ul>
				</div>
			</section>

			<section className="border-y bg-muted/20">
				<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
					<h2 className="font-semibold text-3xl tracking-tight">
						What we optimize for
					</h2>
					<div className="mt-10 grid gap-4 md:grid-cols-3">
						{principles.map((principle) => (
							<div
								key={principle.title}
								className="rounded-2xl border bg-card p-5"
							>
								<h3 className="font-medium text-base">{principle.title}</h3>
								<p className="mt-2 text-muted-foreground text-sm leading-7">
									{principle.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<div className="max-w-2xl space-y-4">
					<h2 className="font-semibold text-3xl tracking-tight">
						Built in the open
					</h2>
					<p className="text-muted-foreground">
						The project is developed in a public repository. You can read the
						code, report a problem, or follow the implementation notes.
					</p>
					<p className="text-muted-foreground text-sm">
						For privacy or account requests, contact the maintainers through{" "}
						<a
							href={CONTACT_URL}
							className="text-foreground underline underline-offset-4"
							target="_blank"
							rel="noreferrer"
						>
							the issue tracker
						</a>
						.
					</p>
				</div>
			</section>

			<CtaSection
				title="Make your next link cleaner"
				description="Create a short link, download its QR code, and check the clicks when you need them."
				secondaryLabel="Read the FAQ"
			/>
		</main>
	);
}
