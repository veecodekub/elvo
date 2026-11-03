export const SITE_NAME = "Elvo Links";
export const SITE_DESCRIPTION =
	"Create short links, reusable QR codes, and click analytics. Track lifetime clicks and daily activity for 30 UTC days. Elvo link analytics do not store visitor IP addresses.";
export const GITHUB_URL = "https://github.com/veecodekub/elvo";
export const CONTACT_URL = `${GITHUB_URL}/issues`;

export const MARKETING_LINKS = [
	{ href: "/url-shortener", label: "URL shortener" },
	{ href: "/qr-code-generator", label: "QR codes" },
	{ href: "/link-analytics", label: "Analytics" },
	{ href: "/faq", label: "FAQ" },
] as const;

const MARKETING_PATHS = new Set<string>([
	"/",
	"/about",
	"/privacy",
	"/terms",
	...MARKETING_LINKS.map((link) => link.href),
]);

export function isMarketingPath(pathname: string) {
	return MARKETING_PATHS.has(pathname);
}
