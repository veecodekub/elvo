import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/marketing/legal-page";
import { CONTACT_URL } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
	title: "Terms of Service",
	description:
		"The terms for using Elvo Links, including accounts, acceptable use, link limits, availability, and liability.",
	path: "/terms",
});

export default function TermsPage() {
	return (
		<LegalPage
			title="Terms of Service"
			description="The rules for using Elvo Links, creating short links, and sharing them."
			updated="October 20, 2026"
		>
			<p>
				These terms govern your use of Elvo Links. By creating an account or
				using the service, you agree to them. If you do not agree, do not use
				the service.
			</p>

			<LegalSection title="Eligibility and accounts">
				<ul>
					<li>You must be at least 13 years old to use Elvo Links.</li>
					<li>
						You sign in with Google. You are responsible for keeping your Google
						account secure and for activity performed through your Elvo Links
						account.
					</li>
					<li>
						You must provide accurate account information and follow applicable
						laws.
					</li>
				</ul>
			</LegalSection>

			<LegalSection title="Your links and acceptable use">
				<p>
					You retain ownership of the titles and destination URLs you submit.
					You give Elvo Links permission to store, process, and redirect them to
					operate the service.
				</p>
				<p>You may not use Elvo Links to:</p>
				<ul>
					<li>Distribute malware, phishing pages, or fraudulent content.</li>
					<li>Send spam or evade platform safety controls.</li>
					<li>
						Share illegal content or content that infringes another person's
						rights.
					</li>
					<li>Harass, threaten, or deceive people.</li>
					<li>
						Probe, scrape, overload, or interfere with the service or its
						providers.
					</li>
					<li>Bypass account limits, rate limits, or access controls.</li>
				</ul>
				<p>
					You are responsible for the destinations you shorten. We may disable
					or suspend links or accounts that violate these terms, create risk, or
					are required to be removed by law.
				</p>
			</LegalSection>

			<LegalSection title="Limits and availability">
				<ul>
					<li>
						Each account can hold up to 100 links, including disabled links.
					</li>
					<li>Each account can create at most 10 links per rolling minute.</li>
					<li>
						Short links use the Elvo Links public domain. Custom domains and
						self-service deletion are not part of the current MVP.
					</li>
					<li>
						The MVP is provided free of charge and may change, pause, or stop
						without notice. We do not guarantee uninterrupted or error-free
						operation.
					</li>
				</ul>
			</LegalSection>

			<LegalSection title="Intellectual property">
				<p>
					The Elvo Links name, interface, code, and branding belong to Elvo or
					its licensors. These terms do not grant you ownership of the service.
					You may not copy or reuse the service except as allowed by applicable
					law or an open-source license.
				</p>
			</LegalSection>

			<LegalSection title="Third-party services">
				<p>
					Elvo Links relies on Google for authentication and on hosting and
					database providers to run the service. Your use of those services may
					also be governed by their own terms and policies.
				</p>
			</LegalSection>

			<LegalSection title="Disclaimers">
				<p>
					The service is provided “as is” and “as available,” without warranties
					of any kind, whether express or implied, including fitness for a
					particular purpose, merchantability, and non-infringement. You use the
					service at your own risk.
				</p>
			</LegalSection>

			<LegalSection title="Limitation of liability">
				<p>
					To the maximum extent permitted by law, Elvo Links and Elvo are not
					liable for indirect, incidental, special, consequential, or punitive
					damages, or for lost data, profits, or business opportunities, arising
					from or related to your use of the service. Where liability cannot be
					excluded, it is limited to the maximum extent permitted by law.
				</p>
			</LegalSection>

			<LegalSection title="Termination">
				<p>
					You may stop using the service at any time. We may suspend or end
					access if you violate these terms, create risk, or if we discontinue
					the service. Sections that by their nature should survive termination,
					including disclaimers and limitation of liability, will survive.
				</p>
			</LegalSection>

			<LegalSection title="Changes">
				<p>
					We may update these terms as the product changes. The date at the top
					of this page shows the latest revision. Continued use after an update
					means you accept the revised terms.
				</p>
			</LegalSection>

			<LegalSection title="Contact">
				<p>
					Questions about these terms? Use the{" "}
					<a
						href={CONTACT_URL}
						className="text-foreground underline underline-offset-4"
						target="_blank"
						rel="noreferrer"
					>
						Elvo Links issue tracker
					</a>
					.
				</p>
			</LegalSection>
		</LegalPage>
	);
}
