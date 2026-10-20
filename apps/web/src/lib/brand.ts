export const SITE_NAME = "Elvo Links";
export const SITE_DESCRIPTION =
	"Create clean short links, download QR codes, and see lifetime clicks plus a 30-day chart. Free with Google sign-in, with click analytics that do not track visitors.";
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
