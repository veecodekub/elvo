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
import { CtaSection } from "@/components/marketing/cta-section";
import { PageIntro } from "@/components/marketing/page-intro";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
	title: "Free URL Shortener with QR Codes",
	description:
		"Create a free short link, download a QR code, and see aggregate clicks. Elvo Links keeps the destination editable and does not track visitor IPs in click analytics.",
	path: "/url-shortener",
	keywords: [
		"free URL shortener",
		"short link generator",
		"URL shortener with QR codes",
		"link shortener",
	],
});

const reasons = [
	{
		title: "The code stays stable",
		description:
			"Edit the destination or title later without changing the short URL or breaking a printed QR code.",
	},
	{
		title: "Analytics stay aggregate",
		description:
			"See lifetime clicks and daily activity for the latest 30 UTC days, not a profile of individual visitors.",
	},
	{
		title: "The account stays simple",
		description:
			"Sign in with Google and manage up to 100 links from one compact dashboard.",
	},
] as const;

export default function UrlShortenerPage() {
	return (
		<main className="flex-1">
			<PageIntro
				eyebrow="URL shortener"
				title="A free URL shortener for clean, reliable sharing."
				description="Turn a long URL into a short link you can share anywhere. Add a QR code, keep the destination editable, and see aggregate clicks without visitor tracking."
			>
				<div className="flex flex-wrap gap-3">
					<Button
						size="lg"
						nativeButton={false}
						render={<Link href="/login" />}
					>
						<GoogleIcon data-icon="inline-start" />
						Create a short link
					</Button>
					<Button
						size="lg"
						variant="outline"
						nativeButton={false}
						render={<Link href="/qr-code-generator" />}
					>
						Explore QR codes
					</Button>
				</div>
			</PageIntro>

			<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<div className="grid gap-10 lg:grid-cols-2">
					<div className="space-y-4">
						<h2 className="font-semibold text-3xl tracking-tight">
							What is a short link?
						</h2>
						<p className="text-muted-foreground">
							A short link is a compact URL that redirects to a longer
							destination. Instead of pasting a long address into a bio, slide,
							or message, you share a short URL ending in a seven-character code
							and keep the destination in one place.
						</p>
						<p className="text-muted-foreground">
							Elvo Links generates a seven-character code from an unambiguous
							alphabet. Codes are unique and never reuse an application route.
							The destination must be an HTTP or HTTPS URL.
						</p>
					</div>
					<div className="space-y-4">
						<h2 className="font-semibold text-3xl tracking-tight">
							Why use Elvo Links?
						</h2>
						<p className="text-muted-foreground">
							The product is intentionally small: clean links, downloadable QR
							codes, and click counts that answer “is this link being used?”
							without asking who clicked it.
						</p>
						<ul className="space-y-3">
							{[
								"Google-only sign-in, so there is no extra password to manage.",
								"Owners can edit, disable, and re-enable their own links.",
								"Unknown, disabled, and suspended links show the same unavailable page.",
								"Daily click data is retained for the latest 30 UTC days.",
							].map((item) => (
								<li key={item} className="flex items-start gap-2 text-sm">
									<Check
										aria-hidden="true"
										className="mt-0.5 size-4 shrink-0 text-foreground"
									/>
									<span className="text-muted-foreground">{item}</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>

			<section className="border-y bg-muted/20">
				<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
					<h2 className="font-semibold text-3xl tracking-tight">
						Built for links you might need to change
					</h2>
					<p className="mt-3 max-w-2xl text-muted-foreground">
						A short link is often printed, posted, or shared before the final
						destination is settled. Elvo Links keeps the code stable while the
						destination remains editable.
					</p>
					<div className="mt-10 grid gap-4 md:grid-cols-3">
						{reasons.map((reason) => (
							<Card key={reason.title} className="h-full">
								<CardHeader>
									<CardTitle>
										<h3 className="font-medium text-base">{reason.title}</h3>
									</CardTitle>
									<CardDescription>{reason.description}</CardDescription>
								</CardHeader>
							</Card>
						))}
					</div>
				</div>
			</section>

			<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
					<div>
						<h2 className="font-semibold text-3xl tracking-tight">
							Limits and access
						</h2>
						<p className="mt-3 text-muted-foreground">
							The MVP is free and deliberately bounded. These limits keep the
							service predictable while it is small.
						</p>
					</div>
					<ul className="space-y-4 text-sm">
						{[
							"Up to 100 links per account, including disabled links.",
							"At most 10 link creations per rolling minute.",
							"Google sign-in is required to create or manage links.",
							"Short links use the Elvo Links public domain; custom domains are not part of the MVP.",
							"Every link uses a seven-character code that cannot be changed after creation.",
						].map((item) => (
							<li key={item} className="flex items-start gap-2">
								<Check
									aria-hidden="true"
									className="mt-1 size-4 shrink-0 text-foreground"
								/>
								<span className="text-muted-foreground">{item}</span>
							</li>
						))}
					</ul>
				</div>
				<p className="mt-10 text-muted-foreground text-sm">
					Want the full details?{" "}
					<Link
						href="/faq"
						className="text-foreground underline underline-offset-4"
					>
						Read the FAQ
					</Link>
					.
				</p>
			</section>

			<CtaSection
				title="Create your first short link"
				description="Sign in with Google, paste a destination, and share a cleaner link in a minute."
				secondaryLabel="Explore QR codes"
				secondaryHref="/qr-code-generator"
			/>
		</main>
	);
}
