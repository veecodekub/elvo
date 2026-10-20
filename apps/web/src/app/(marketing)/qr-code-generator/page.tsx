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
	title: "QR Code Generator for Short Links",
	description:
		"Download a black-and-white PNG QR code for any Elvo short link. The code encodes the short URL, so editing the destination does not break printed QR codes.",
	path: "/qr-code-generator",
	keywords: [
		"QR code generator for links",
		"short link QR code",
		"download QR code PNG",
		"QR code for URL",
	],
});

const benefits = [
	{
		title: "Points to the short link",
		description:
			"The QR code encodes the Elvo short URL, not the destination. You can change where the link goes without reprinting the code.",
	},
	{
		title: "Clean black-and-white PNG",
		description:
			"Download a flattened PNG with a four-module quiet zone. It is ready for documents, posters, slides, and print workflows.",
	},
	{
		title: "One code, one stable URL",
		description:
			"The short code never changes. That makes the QR code a durable pointer rather than a snapshot of the current destination.",
	},
] as const;

export default function QrCodeGeneratorPage() {
	return (
		<main className="flex-1">
			<PageIntro
				eyebrow="QR codes"
				title="Download a QR code for any short link."
				description="Elvo Links turns your short link into a black-and-white PNG you can print, stick, or share. Because the code points to the short URL, editing the destination does not break it."
			>
				<Button size="lg" nativeButton={false} render={<Link href="/login" />}>
					<GoogleIcon data-icon="inline-start" />
					Create a short link
				</Button>
			</PageIntro>

			<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
					<div>
						<h2 className="font-semibold text-3xl tracking-tight">
							A QR code that can survive a destination change
						</h2>
						<p className="mt-3 text-muted-foreground">
							Most QR codes encode a final URL directly. If that URL changes,
							the printed code becomes obsolete. A short-link QR code works
							differently: it points to a stable short URL that you can keep
							editing.
						</p>
					</div>
					<div className="space-y-4 text-muted-foreground text-sm leading-7">
						<p>
							When you open the QR dialog for a link, Elvo Links generates a
							code for the public short URL. The PNG includes the quiet zone
							required for reliable scanning and is flattened to pure black and
							white.
						</p>
						<p>
							This is a QR code generator for Elvo short links, not arbitrary
							text or files. The destination must be a valid HTTP or HTTPS URL.
						</p>
					</div>
				</div>
				<div className="mt-10 grid gap-4 md:grid-cols-3">
					{benefits.map((benefit) => (
						<Card key={benefit.title} className="h-full">
							<CardHeader>
								<CardTitle>
									<h3 className="font-medium text-base">{benefit.title}</h3>
								</CardTitle>
								<CardDescription>{benefit.description}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</section>

			<section className="border-y bg-muted/20">
				<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
					<div className="grid gap-10 lg:grid-cols-2">
						<div>
							<h2 className="font-semibold text-3xl tracking-tight">
								Where a short-link QR code helps
							</h2>
							<p className="mt-3 text-muted-foreground">
								Use one when the physical artifact outlives the first
								destination.
							</p>
						</div>
						<ul className="grid gap-3 sm:grid-cols-2">
							{[
								"Posters and flyers",
								"Packaging and labels",
								"Event slides",
								"Printed menus",
								"Business cards",
								"Presentation handouts",
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
				</div>
			</section>

			<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<div className="grid gap-10 lg:grid-cols-2">
					<div>
						<h2 className="font-semibold text-3xl tracking-tight">
							How to get your QR code
						</h2>
						<ol className="mt-6 space-y-4 text-muted-foreground text-sm">
							<li className="flex gap-3">
								<span className="font-mono text-foreground">01</span>
								<span>Sign in with Google and create a short link.</span>
							</li>
							<li className="flex gap-3">
								<span className="font-mono text-foreground">02</span>
								<span>Open the QR action for that link in the dashboard.</span>
							</li>
							<li className="flex gap-3">
								<span className="font-mono text-foreground">03</span>
								<span>
									Download the PNG. The file is named for the short code.
								</span>
							</li>
						</ol>
					</div>
					<div className="rounded-2xl border bg-card p-6">
						<h3 className="font-medium text-base">What you get</h3>
						<ul className="mt-4 space-y-3 text-muted-foreground text-sm">
							<li>A QR code for the public short URL.</li>
							<li>A black-and-white PNG with a quiet zone.</li>
							<li>A code that keeps working after destination edits.</li>
							<li>No visitor tracking added by the QR code itself.</li>
						</ul>
					</div>
				</div>
				<p className="mt-10 text-muted-foreground text-sm">
					Read more about{" "}
					<Link
						href="/url-shortener"
						className="text-foreground underline underline-offset-4"
					>
						creating short links
					</Link>{" "}
					or{" "}
					<Link
						href="/link-analytics"
						className="text-foreground underline underline-offset-4"
					>
						how clicks are counted
					</Link>
					.
				</p>
			</section>

			<CtaSection
				title="Make a QR code that lasts"
				description="Create a short link, download its PNG, and keep the destination flexible."
				secondaryLabel="How short links work"
				secondaryHref="/url-shortener"
			/>
		</main>
	);
}
