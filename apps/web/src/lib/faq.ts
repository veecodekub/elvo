export type FaqItem = {
	question: string;
	answer: string;
};

export const faqItems = [
	{
		question: "Is Elvo Links free to use?",
		answer:
			"Yes. Elvo Links is free to use. Sign in with Google to create and manage your links.",
	},
	{
		question: "Do visitors need an account to open a short link?",
		answer:
			"No. Anyone can open an Elvo short link. You only need a Google account to create or manage links.",
	},
	{
		question: "Can I edit a short link after sharing it?",
		answer:
			"Yes. You can update the destination or title without changing the seven-character code, so you do not need to replace short URLs or QR codes you have shared. You can also disable the link.",
	},
	{
		question: "Will my QR code work if I change the destination?",
		answer:
			"Yes. Your QR code points to the Elvo short URL, not directly to the destination. Update the destination later and keep using the same QR code.",
	},
	{
		question: "How are clicks counted?",
		answer:
			"Each successful redirect for a known, enabled short link counts as one click. Repeat visits and bot requests count too; Elvo does not calculate unique visitors.",
	},
	{
		question: "Do you collect visitor IP addresses for analytics?",
		answer:
			"Elvo link analytics do not store visitor IP addresses, country, device, referrer, or unique-visitor IDs. Vercel Web Analytics and Speed Insights are cookieless and designed to avoid identifying individual visitors. Authentication sessions may still store standard security metadata. See the privacy policy for details.",
	},
	{
		question: "How long is analytics data kept?",
		answer:
			"Lifetime click totals stay with the link. Daily aggregates are kept for the latest 30 UTC calendar days; older daily records are removed.",
	},
	{
		question: "What happens when I disable a link?",
		answer:
			'A disabled short link no longer redirects and shows a "Link unavailable" page. Re-enable it to restore the original destination and short URL.',
	},
	{
		question: "How many links can I create?",
		answer:
			"Each account can have up to 100 links. You can create no more than 10 links per rolling minute. Disabled links still count toward the limit.",
	},
	{
		question: "Can I delete a link?",
		answer:
			"The current version does not support deleting links. You can disable a link instead; it stays in your account and counts toward your limit.",
	},
	{
		question: "Can I use my own domain?",
		answer:
			"Elvo Links does not currently support custom domains. All short links use the Elvo Links domain.",
	},
	{
		question: "Do I need to install an app?",
		answer: "No app is needed. Open Elvo Links in a desktop or mobile browser.",
	},
] satisfies readonly FaqItem[];
