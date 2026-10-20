import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { CtaSection } from "@/components/marketing/cta-section";
import { FaqList } from "@/components/marketing/faq-list";
import { PageIntro } from "@/components/marketing/page-intro";
import { CONTACT_URL } from "@/lib/brand";
import { faqItems } from "@/lib/faq";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
	title: "Frequently Asked Questions",
	description:
		"Answers about Elvo Links accounts, short links, QR codes, click counting, analytics retention, and account limits.",
	path: "/faq",
	keywords: [
		"Elvo Links FAQ",
		"URL shortener questions",
		"short link QR code FAQ",
		"link analytics FAQ",
	],
});

const faqJsonLd = {
	"@context": "https://schema.org",
	"@type": "FAQPage",
	mainEntity: faqItems.map((item) => ({
		"@type": "Question",
		name: item.question,
		acceptedAnswer: {
			"@type": "Answer",
			text: item.answer,
		},
	})),
};

export default function FaqPage() {
	return (
		<>
			<JsonLd data={faqJsonLd} />
			<main className="flex-1">
				<PageIntro
					eyebrow="FAQ"
					title="Questions about Elvo Links"
					description="Short answers about accounts, links, QR codes, and the limits of aggregate click analytics."
				/>

				<section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
					<FaqList items={faqItems} />
					<p className="mt-8 text-muted-foreground text-sm">
						Still need help? Open an issue in the{" "}
						<a
							href={CONTACT_URL}
							className="text-foreground underline underline-offset-4"
							target="_blank"
							rel="noreferrer"
						>
							Elvo Links repository
						</a>
						.
					</p>
				</section>

				<CtaSection
					title="Try Elvo Links"
					description="Sign in with Google and create a short link with a QR code and aggregate click analytics."
				/>
			</main>
		</>
	);
}
