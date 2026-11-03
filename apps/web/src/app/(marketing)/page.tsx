import { Button } from "@elvo/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@elvo/ui/components/card";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { GoogleIcon } from "@/components/google-icon";
import { JsonLd } from "@/components/json-ld";
import { CtaSection } from "@/components/marketing/cta-section";
import { FaqList } from "@/components/marketing/faq-list";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/brand";
import { faqItems } from "@/lib/faq";
import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
	title: `${SITE_NAME} | Free URL Shortener with QR Codes and Click Analytics`,
	description: SITE_DESCRIPTION,
	path: "/",
	absoluteTitle: true,
	keywords: [
		"free URL shortener",
		"short links",
		"QR codes for links",
		"link click analytics",
		"privacy-friendly analytics",
	],
});

const features = [
	{
		title: "Change the destination later",
		description:
			"Update the destination or title at any time. The seven-character code stays the same, so links you have already shared keep working.",
		href: "/url-shortener",
		linkLabel: "See how short links work",
	},
	{
		title: "Reuse the same QR code",
		description:
			"Download a black-and-white PNG QR code for your short URL. Change the destination later without replacing QR codes you have already shared.",
		href: "/qr-code-generator",
		linkLabel: "Explore QR codes",
	},
	{
		title: "Understand clicks without visitor profiles",
		description:
			"See lifetime click totals and daily click counts for the latest 30 UTC days. Elvo link analytics do not store visitor IP addresses or calculate unique visitors.",
		href: "/link-analytics",
		linkLabel: "Explore click analytics",
	},
] as const;

const steps = [
	{
		title: "Sign in with Google",
		description:
			"Create a free account with Google. There is no Elvo password to set.",
	},
	{
		title: "Add a destination URL",
		description:
			"Enter an HTTP or HTTPS URL. Elvo creates a seven-character code; add an optional title to recognize it in your dashboard.",
	},
	{
		title: "Share and review clicks",
		description:
			"Share the short URL or download its QR code. Review lifetime clicks and daily activity for the latest 30 UTC days.",
	},
] as const;

const jsonLd = [
	{
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE_NAME,
		url: SITE_URL,
		description: SITE_DESCRIPTION,
		inLanguage: "en",
	},
	{
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: SITE_NAME,
		applicationCategory: "UtilitiesApplication",
		operatingSystem: "Web",
		url: SITE_URL,
		description: SITE_DESCRIPTION,
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
		featureList: [
			"Short links",
			"Downloadable QR codes",
			"Lifetime and 30-day click analytics",
			"Privacy-friendly click counting",
		],
	},
];

export default function Home() {
	return (
		<>
			<JsonLd data={jsonLd} />
			<main className="relative z-10 flex-1">
				<section className="border-b bg-muted/20">
					<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
						<div className="flex max-w-3xl flex-col items-start gap-6">
							<p className="font-medium text-muted-foreground text-sm">
								Short links, QR codes, and click analytics
							</p>
							<h1 className="text-balance font-semibold text-4xl tracking-tight sm:text-6xl">
								Short links you can update after sharing.
							</h1>
							<p className="max-w-2xl text-lg text-muted-foreground">
								Change the destination while keeping the same short URL and QR
								code. Track lifetime clicks and daily click counts for the
								latest 30 UTC days.
							</p>
							<div className="flex flex-wrap gap-3">
								<Button
									size="lg"
									nativeButton={false}
									render={<Link href="/login" />}
								>
									<GoogleIcon data-icon="inline-start" />
									Continue with Google
								</Button>
								<Button
									size="lg"
									variant="outline"
									nativeButton={false}
									render={<Link href="/url-shortener" />}
								>
									Explore the URL shortener
								</Button>
							</div>
							<p className="text-muted-foreground text-xs">
								Free to use. Sign in with Google. Up to 100 links per account.
							</p>
						</div>
					</div>
				</section>

				<section
					aria-labelledby="features-heading"
					className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
				>
					<div className="max-w-2xl">
						<h2
							id="features-heading"
							className="font-semibold text-3xl tracking-tight"
						>
							Built for the links you share
						</h2>
						<p className="mt-3 text-muted-foreground">
							Update destinations without changing short URLs, reuse the same QR
							codes, and review clicks without storing visitor IP addresses in
							Elvo link analytics.
						</p>
					</div>
					<div className="mt-10 grid gap-4 sm:grid-cols-3">
						{features.map((feature) => (
							<Link key={feature.href} href={feature.href} className="group">
								<Card className="h-full transition-colors group-hover:bg-muted/40">
									<CardHeader>
										<CardTitle>
											<h3 className="font-medium text-base">{feature.title}</h3>
										</CardTitle>
										<CardDescription>{feature.description}</CardDescription>
									</CardHeader>
									<p className="px-5 text-muted-foreground text-sm underline-offset-4 group-hover:text-foreground group-hover:underline">
										{feature.linkLabel}
									</p>
								</Card>
							</Link>
						))}
					</div>
				</section>

				<section
					aria-labelledby="how-it-works-heading"
					className="border-y bg-muted/20"
				>
					<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
						<div className="max-w-2xl">
							<h2
								id="how-it-works-heading"
								className="font-semibold text-3xl tracking-tight"
							>
								Share a link in three steps
							</h2>
							<p className="mt-3 text-muted-foreground">
								Sign in with Google, add a destination URL, and share the short
								URL or its QR code.
							</p>
						</div>
						<ol className="mt-10 grid gap-4 md:grid-cols-3">
							{steps.map((step, index) => (
								<li key={step.title}>
									<Card className="h-full">
										<CardHeader>
											<p className="font-mono text-muted-foreground text-xs">
												0{index + 1}
											</p>
											<CardTitle>
												<h3 className="font-medium text-base">{step.title}</h3>
											</CardTitle>
											<CardDescription>{step.description}</CardDescription>
										</CardHeader>
									</Card>
								</li>
							))}
						</ol>
					</div>
				</section>

				<section aria-labelledby="privacy-heading">
					<div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.25fr]">
						<div>
							<p className="font-medium text-muted-foreground text-sm">
								Privacy in link analytics
							</p>
							<h2
								id="privacy-heading"
								className="mt-3 text-balance font-semibold text-3xl tracking-tight sm:text-4xl"
							>
								See link activity without building visitor profiles.
							</h2>
						</div>
						<div className="space-y-5 text-muted-foreground">
							<p>
								Elvo counts successful redirects without storing visitor IP
								addresses, country, device, referrer, or unique-visitor IDs in
								link analytics.
							</p>
							<ul className="grid gap-3 sm:grid-cols-2">
								{[
									"No visitor IP addresses in link analytics",
									"No country, device, referrer, or visitor-ID data",
									"Lifetime totals and daily counts for 30 UTC days",
									"Repeat clicks and bot requests are included in click totals",
								].map((item) => (
									<li key={item} className="flex items-start gap-2">
										<Check
											aria-hidden="true"
											className="mt-1 size-4 shrink-0 text-foreground"
										/>
										<span className="text-sm">{item}</span>
									</li>
								))}
							</ul>
							<p className="text-sm">
								Read more about{" "}
								<Link
									href="/link-analytics"
									className="text-foreground underline underline-offset-4"
								>
									how link analytics work
								</Link>
								.
							</p>
						</div>
					</div>
				</section>

				<section
					aria-labelledby="faq-preview-heading"
					className="border-y bg-muted/20"
				>
					<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div className="max-w-2xl">
								<h2
									id="faq-preview-heading"
									className="font-semibold text-3xl tracking-tight"
								>
									Common questions
								</h2>
								<p className="mt-3 text-muted-foreground">
									Answers about accounts, short links, QR codes, and click
									analytics.
								</p>
							</div>
							<Link
								href="/faq"
								className="text-sm underline underline-offset-4"
							>
								Browse all FAQs
							</Link>
						</div>
						<div className="mt-8">
							<FaqList items={faqItems.slice(0, 4)} />
						</div>
					</div>
				</section>

				<CtaSection
					title="Ready to share your first short link?"
					description="Sign in with Google to create up to 100 short links and download a QR code for each."
					secondaryLabel="Browse all FAQs"
				/>
			</main>
		</>
	);
}
