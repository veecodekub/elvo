import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/marketing/legal-page";
import { CONTACT_URL, GITHUB_URL } from "@/lib/brand";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
	title: "Privacy Policy",
	description:
		"How Elvo Links handles privacy, account information, short links, aggregate click and website analytics, authentication sessions, and hosting logs.",
	path: "/privacy",
});

export default function PrivacyPage() {
	return (
		<LegalPage
			title="Privacy Policy"
			description="What Elvo Links collects, why it is needed, and what its click and website analytics deliberately leave out."
			updated="October 20, 2026"
		>
			<p>
				Elvo Links is a URL shortening product operated as part of Elvo. This
				policy explains the information we handle when you use the website,
				create an account, or open a short link.
			</p>

			<LegalSection title="Information we collect">
				<ul>
					<li>
						<strong className="text-foreground">Account information.</strong>{" "}
						When you sign in with Google, we receive your name, email address,
						profile image, and Google account identifier. We do not receive your
						Google password.
					</li>
					<li>
						<strong className="text-foreground">Links you create.</strong> We
						store the title, destination URL, generated short code,
						enabled/disabled status, and timestamps.
					</li>
					<li>
						<strong className="text-foreground">Click aggregates.</strong> We
						store a lifetime click total per link and daily aggregate counts for
						the latest 30 UTC calendar days. Click analytics does not store
						visitor IP addresses, country, device, referrer, or a unique-visitor
						identifier. Repeat redirects and bot requests are included in the
						aggregate counts.
					</li>
					<li>
						<strong className="text-foreground">Session information.</strong>{" "}
						Our authentication system may store session metadata such as an IP
						address and browser user agent to keep sessions secure. This is
						separate from click analytics.
					</li>
					<li>
						<strong className="text-foreground">Technical logs.</strong> Our
						hosting and infrastructure providers may process standard request
						logs, such as IP address, timestamp, requested path, and user agent,
						for security, reliability, and abuse prevention.
					</li>
					<li>
						<strong className="text-foreground">Website analytics.</strong> We
						use Vercel Web Analytics and Speed Insights to measure aggregate
						page traffic and site performance. Vercel processes aggregated usage
						and performance data for us. These tools do not use cookies or
						advertising identifiers, and we do not use them to build visitor
						profiles.
					</li>
				</ul>
			</LegalSection>

			<LegalSection title="How we use information">
				<ul>
					<li>
						Provide accounts, create and manage short links, and redirect
						visitors.
					</li>
					<li>
						Show lifetime click totals and daily click aggregates to link
						owners.
					</li>
					<li>
						Secure the service, prevent abuse, and enforce account and rate
						limits.
					</li>
					<li>Respond to support, privacy, and account requests.</li>
					<li>
						Understand aggregate website traffic and measure site performance.
					</li>
					<li>Maintain and improve the reliability of the service.</li>
				</ul>
				<p>
					We do not sell personal information. We do not use click or website
					analytics for advertising or to build visitor profiles.
				</p>
			</LegalSection>

			<LegalSection title="Cookies and local storage">
				<p>
					Elvo Links uses essential authentication cookies to keep you signed
					in. The service does not use advertising cookies. Vercel Web Analytics
					and Speed Insights are designed not to use cookies. Your browser may
					also store theme preferences locally.
				</p>
			</LegalSection>

			<LegalSection title="Sharing and service providers">
				<p>We share information only as needed to operate the service:</p>
				<ul>
					<li>Google, for sign-in and account authentication.</li>
					<li>
						Vercel, for website and API hosting, Web Analytics, and Speed
						Insights.
					</li>
					<li>Neon, for the PostgreSQL database.</li>
					<li>
						Other providers that help us run, secure, or support the service.
					</li>
				</ul>
				<p>
					These providers may process data in countries other than your own. We
					may also disclose information when required by law or to protect the
					service, our users, or the public.
				</p>
			</LegalSection>

			<LegalSection title="Retention">
				<ul>
					<li>
						Daily click aggregates are kept for the latest 30 UTC calendar days.
						Older daily rows are deleted by a scheduled retention job.
					</li>
					<li>
						Lifetime click totals remain with a link until the link or account
						is removed.
					</li>
					<li>
						Account and link data remain until you ask us to delete them,
						subject to legal, security, and operational needs.
					</li>
					<li>
						Authentication sessions expire according to the auth configuration.
					</li>
					<li>
						Website analytics and performance data are retained according to
						Vercel's service terms.
					</li>
				</ul>
			</LegalSection>

			<LegalSection title="Security">
				<p>
					We use reasonable technical and organizational measures to protect the
					service. No method of transmission or storage is completely secure, so
					we cannot promise absolute security.
				</p>
			</LegalSection>

			<LegalSection title="Your choices">
				<ul>
					<li>You can edit or disable your links from the dashboard.</li>
					<li>You can revoke Elvo Links access from your Google account.</li>
					<li>
						You can request access, correction, or deletion by contacting us
						through the{" "}
						<a
							href={CONTACT_URL}
							className="text-foreground underline underline-offset-4"
							target="_blank"
							rel="noreferrer"
						>
							project issue tracker
						</a>
						. Account deletion is not yet self-service in the MVP.
					</li>
				</ul>
			</LegalSection>

			<LegalSection title="Children">
				<p>
					Elvo Links is not directed to children under 13. Do not create an
					account if you are under 13.
				</p>
			</LegalSection>

			<LegalSection title="Changes">
				<p>
					We may update this policy as the product changes. The date at the top
					of this page shows the latest revision. Continued use after an update
					means you accept the revised policy.
				</p>
			</LegalSection>

			<LegalSection title="Contact">
				<p>
					For privacy questions or requests, use the{" "}
					<a
						href={CONTACT_URL}
						className="text-foreground underline underline-offset-4"
						target="_blank"
						rel="noreferrer"
					>
						Elvo Links issue tracker
					</a>{" "}
					or the{" "}
					<a
						href={GITHUB_URL}
						className="text-foreground underline underline-offset-4"
						target="_blank"
						rel="noreferrer"
					>
						project repository
					</a>
					.
				</p>
			</LegalSection>
		</LegalPage>
	);
}
