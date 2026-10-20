export type FaqItem = {
	question: string;
	answer: string;
};

export const faqItems = [
	{
		question: "Is Elvo Links free?",
		answer:
			"Yes. The current MVP is free to use. Creating and managing links requires a Google account.",
	},
	{
		question: "Do I need an account to open a short link?",
		answer:
			"No. Anyone can open a short link. A Google account is only required to create and manage links.",
	},
	{
		question: "Can I edit a short link after sharing it?",
		answer:
			"Yes. Owners can edit the destination and title, or disable the link. The seven-character short code stays the same, so existing links and QR codes keep working.",
	},
	{
		question: "Do QR codes break if I change the destination?",
		answer:
			"No. Every QR code encodes the Elvo short link, not the destination. Editing the destination keeps the short URL and the printed QR code valid.",
	},
	{
		question: "How are clicks counted?",
		answer:
			"Every successful redirect for a known, enabled link counts as one click. Repeat openings and bot requests count too. Elvo Links does not calculate unique visitors.",
	},
	{
		question: "Do you collect visitor IP addresses for analytics?",
		answer:
			"Click analytics does not store visitor IP addresses, country, device, referrer, or a unique-visitor identifier. Authentication sessions may store standard security metadata; see the privacy policy for details.",
	},
	{
		question: "How long is analytics data kept?",
		answer:
			"Lifetime totals stay with the link. Daily click aggregates are kept for the latest 30 UTC calendar days; older daily rows are removed.",
	},
	{
		question: "What happens when I disable a link?",
		answer:
			'The short link stops redirecting and shows a "Link unavailable" page. Re-enabling it restores the original short URL and destination.',
	},
	{
		question: "How many links can I create?",
		answer:
			"Each account can hold up to 100 links and create at most 10 links per rolling minute. Disabled links still count toward the 100-link limit.",
	},
	{
		question: "Can I delete a link?",
		answer:
			"The MVP supports disabling links rather than deleting them. A disabled link stays in your account and keeps its quota slot.",
	},
	{
		question: "Can I use my own domain?",
		answer:
			"Not in the current MVP. Every short link uses the Elvo Links public domain.",
	},
	{
		question: "Do I need to install an app?",
		answer: "No. Elvo Links runs in the browser. Use it on desktop or mobile.",
	},
] satisfies readonly FaqItem[];
