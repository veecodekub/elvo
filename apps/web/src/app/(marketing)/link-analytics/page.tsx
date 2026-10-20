import { Button } from "@elvo/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@elvo/ui/components/card";
import { Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CtaSection } from "@/components/marketing/cta-section";
import { PageIntro } from "@/components/marketing/page-intro";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
	title: "Short-Link Click Analytics",
	description:
		"See lifetime clicks and the latest 30 UTC days of daily activity for every short link. Elvo Links counts redirects without collecting visitor IP addresses or unique-visitor profiles.",
	path: "/link-analytics",
	keywords: [
		"link click analytics",
		"short link analytics",
		"click tracking",
		"privacy-friendly link analytics",
	],
});

const counted = [
	"Successful redirects for known, enabled links",
	"Repeat openings of the same link",
	"Bot requests that reach the redirect",
] as const;

const notCounted = [
	"Unknown, disabled, or suspended links",
	"Destination page loads",
	"Unique visitors",
	"Country, device, or referrer",
] as const;

export default function LinkAnalyticsPage() {
	return (
		<main className="flex-1">
			<PageIntro
				eyebrow="Click analytics"
				title="Short-link analytics without visitor tracking."
				description="See lifetime clicks and a daily chart for the latest 30 UTC days. The numbers answer how much a link is used, not who opened it."
			>
				<div className="flex flex-wrap gap-3">
					<Button
						size="lg"
						nativeButton={false}
						render={<Link href="/dashboard" />}
					>
						Open your dashboard
					</Button>
					<Button
						size="lg"
						variant="outline"
						nativeButton={false}
						render={<Link href="/faq" />}
					>
						Read the FAQ
					</Button>
				</div>
			</PageIntro>

			<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
					<div>
						<h2 className="font-semibold text-3xl tracking-tight">
							What you can see
						</h2>
						<p className="mt-3 text-muted-foreground">
							Every link in your dashboard has a lifetime Total Clicks counter
							and a chart that updates while the analytics dialog is open.
						</p>
						<div className="mt-8 grid gap-4 sm:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle>
										<h3 className="font-medium text-base">Total Clicks</h3>
									</CardTitle>
									<CardDescription>
										A lifetime count for that short link, retained even when
										older daily rows are removed.
									</CardDescription>
								</CardHeader>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle>
										<h3 className="font-medium text-base">30-day chart</h3>
									</CardTitle>
									<CardDescription>
										Daily UTC aggregates for the latest 30 calendar days,
										including zero-activity days.
									</CardDescription>
								</CardHeader>
							</Card>
						</div>
					</div>
					<div className="space-y-6">
						<h2 className="font-semibold text-3xl tracking-tight">
							What the numbers mean
						</h2>
						<p className="text-muted-foreground text-sm leading-7">
							Elvo Links counts redirect responses, not people. If one person
							opens a link three times, the link receives three clicks. If a bot
							follows the short URL, that request also counts. This keeps the
							metric simple and honest about what it measures.
						</p>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="rounded-2xl border bg-card p-5">
								<h3 className="font-medium text-sm">Counted</h3>
								<ul className="mt-3 space-y-2">
									{counted.map((item) => (
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
							<div className="rounded-2xl border bg-card p-5">
								<h3 className="font-medium text-sm">Not counted</h3>
								<ul className="mt-3 space-y-2">
									{notCounted.map((item) => (
										<li key={item} className="flex items-start gap-2 text-sm">
											<X
												aria-hidden="true"
												className="mt-0.5 size-4 shrink-0 text-muted-foreground"
											/>
											<span className="text-muted-foreground">{item}</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="border-y bg-muted/20">
				<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
					<div className="grid gap-10 lg:grid-cols-2">
						<div>
							<h2 className="font-semibold text-3xl tracking-tight">
								Freshness and retention
							</h2>
							<p className="mt-3 text-muted-foreground">
								Analytics refresh within a minute. The dashboard polls every 30
								seconds while the dialog is open.
							</p>
						</div>
						<ul className="space-y-3 text-sm">
							{[
								"Lifetime totals remain on the link indefinitely.",
								"Daily rows older than the latest 30 UTC days are removed by a daily retention job.",
								"Recording failures may undercount; they never block a redirect.",
								"No visitor IP address, country, device, referrer, or unique-visitor ID is stored for click analytics.",
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
						For the complete data model, read the{" "}
						<Link
							href="/privacy"
							className="text-foreground underline underline-offset-4"
						>
							privacy policy
						</Link>{" "}
						or the{" "}
						<Link
							href="/faq"
							className="text-foreground underline underline-offset-4"
						>
							FAQ
						</Link>
						.
					</p>
				</div>
			</section>

			<CtaSection
				title="Create a link you can measure"
				description="Sign in with Google to start a short link, then open its analytics whenever you need a quick read."
				secondaryLabel="How short links work"
				secondaryHref="/url-shortener"
			/>
		</main>
	);
}
