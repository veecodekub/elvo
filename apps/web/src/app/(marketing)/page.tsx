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
	title: `${SITE_NAME} — Free URL Shortener with QR Codes & Click Analytics`,
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
		title: "Stable short links",
		description:
			"Seven-character codes that stay the same, even when you edit the destination later.",
		href: "/url-shortener",
		linkLabel: "How short links work",
	},
	{
		title: "QR codes that keep working",
		description:
			"Download a black-and-white PNG. The code points to your short link, not the destination.",
		href: "/qr-code-generator",
		linkLabel: "Explore QR codes",
	},
	{
		title: "Clicks, not surveillance",
		description:
			"See lifetime clicks and a 30-day daily chart. Repeat clicks count. Visitor IP addresses do not.",
		href: "/link-analytics",
		linkLabel: "See click analytics",
	},
] as const;

const steps = [
	{
		title: "Sign in with Google",
		description:
			"Create your personal account without another password to manage.",
	},
	{
		title: "Shorten a destination",
		description:
			"Paste an http or https URL, add an optional title, and let Elvo generate the code.",
	},
	{
		title: "Share and measure",
		description:
			"Copy the short link, download its QR code, and open analytics when you need them.",
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
			<div
				aria-hidden="true"
				className="pointer-events-none fixed inset-0 z-0"
			>
				<div
					className="absolute inset-0 dark:hidden"
					style={{ background: "#fff" }}
				>
					<div
						className="absolute inset-0 opacity-30"
						style={{
							backgroundImage: `
								linear-gradient(rgba(15, 23, 42, 0.1) 1px, transparent 1px),
								linear-gradient(90deg, rgba(15, 23, 42, 0.1) 1px, transparent 1px)
							`,
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
							backgroundImage: `
								linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
								linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
							`,
							backgroundSize: "60px 60px",
						}}
					/>
				</div>
			</div>
			<main className="relative z-10 flex-1">
				<section className="border-b bg-muted/20">
					<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
						<div className="flex max-w-3xl flex-col items-start gap-6">
							<p className="font-medium text-muted-foreground text-sm">
								Elvo Links · Short Links. Clean Experience.
							</p>
							<h1 className="text-balance font-semibold text-4xl tracking-tight sm:text-6xl">
								Short links with QR codes and clear click analytics.
							</h1>
							<p className="max-w-2xl text-lg text-muted-foreground">
								Create a clean short link, download a QR code, and see how it
								performs—without collecting visitor IP addresses or building a
								profile of the people who click.
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
									See how it works
								</Button>
							</div>
							<p className="text-muted-foreground text-xs">
								Free MVP. Google sign-in. Up to 100 links per account.
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
							Everything a short link needs
						</h2>
						<p className="mt-3 text-muted-foreground">
							Elvo Links keeps the useful parts of a link shortener and leaves
							out the parts that turn your audience into a dataset.
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
								From long URL to useful link
							</h2>
							<p className="mt-3 text-muted-foreground">
								No setup ritual. Create an account, make a link, and share it.
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
								Privacy by default
							</p>
							<h2
								id="privacy-heading"
								className="mt-3 text-balance font-semibold text-3xl tracking-tight sm:text-4xl"
							>
								Clicks, not surveillance.
							</h2>
						</div>
						<div className="space-y-5 text-muted-foreground">
							<p>
								Elvo Links records that a redirect happened, not who clicked it.
								The analytics are deliberately aggregate: useful for
								understanding activity, not for profiling people.
							</p>
							<ul className="grid gap-3 sm:grid-cols-2">
								{[
									"No visitor IP addresses in click analytics",
									"No country, device, or referrer profiles",
									"Lifetime counts plus 30 UTC days of daily data",
									"Repeat clicks and bots are counted honestly",
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
									how click analytics works
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
									Questions, answered
								</h2>
								<p className="mt-3 text-muted-foreground">
									Short answers about accounts, QR codes, and click counting.
								</p>
							</div>
							<Link
								href="/faq"
								className="text-sm underline underline-offset-4"
							>
								Read all FAQ
							</Link>
						</div>
						<div className="mt-8">
							<FaqList items={faqItems.slice(0, 4)} />
						</div>
					</div>
				</section>

				<CtaSection />
			</main>
		</>
	);
}
