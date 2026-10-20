import { z } from "zod";

export const LINK_CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const LINK_CODE_LENGTH = 7;
export const LINK_QUOTA_LIMIT = 100;
export const LINK_RATE_LIMIT = 10;
export const LINK_RATE_WINDOW_SECONDS = 60;
export const LINK_TITLE_MAX_LENGTH = 120;
export const LINK_DESTINATION_MAX_LENGTH = 2048;
export const LINK_PAGE_SIZE = 10;
export const LINK_SEARCH_MAX_LENGTH = 200;

export const linkStatusFilterSchema = z.enum(["all", "active", "disabled"]);

export type LinkStatusFilter = z.infer<typeof linkStatusFilterSchema>;

/**
 * Paths served by the website or the API that must never be handed out as a
 * Link Code, so a short link can never shadow an application route.
 */
export const RESERVED_LINK_CODES = new Set([
	"_next",
	"about",
	"account",
	"api",
	"apple-icon",
	"assets",
	"dashboard",
	"favicon.ico",
	"faq",
	"fonts",
	"health",
	"home",
	"icon.svg",
	"images",
	"index",
	"link",
	"link-analytics",
	"links",
	"login",
	"logout",
	"manifest.webmanifest",
	"opengraph-image",
	"privacy",
	"prototype",
	"public",
	"qr-code-generator",
	"robots.txt",
	"settings",
	"sign-in",
	"sign-up",
	"sitemap.xml",
	"terms",
	"twitter-image",
	"url-shortener",
]);

const linkCodePattern = new RegExp(
	`^[${LINK_CODE_ALPHABET}]{${LINK_CODE_LENGTH}}$`,
);

export function isLinkCode(value: string): boolean {
	return linkCodePattern.test(value);
}

export function isReservedLinkCode(value: string): boolean {
	return RESERVED_LINK_CODES.has(value.toLowerCase());
}

/**
 * Cryptographic random Link Code. 32^7 ≈ 34 billion candidates; collisions
 * are still expected as the table grows, so creation retries on conflict.
 */
export function generateLinkCode(): string {
	const bytes = new Uint8Array(LINK_CODE_LENGTH);
	crypto.getRandomValues(bytes);
	let code = "";
	for (const byte of bytes) {
		code += LINK_CODE_ALPHABET[byte % LINK_CODE_ALPHABET.length];
	}
	if (isReservedLinkCode(code)) {
		return generateLinkCode();
	}
	return code;
}

/** Returns a parsed URL only for http(s) destinations. */
export function parseDestination(value: string): URL | null {
	const trimmed = value.trim();
	if (trimmed.length === 0 || trimmed.length > LINK_DESTINATION_MAX_LENGTH) {
		return null;
	}

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return null;
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return null;
	}

	if (!url.hostname) {
		return null;
	}

	return url;
}

export const destinationErrorMessage =
	"Enter a valid HTTP or HTTPS URL, for example https://example.com.";

export const titleErrorMessage = `Keep the title under ${LINK_TITLE_MAX_LENGTH} characters.`;

export const createLinkInputSchema = z.object({
	destination: z.string().trim().min(1).max(LINK_DESTINATION_MAX_LENGTH),
	title: z.string().trim().max(LINK_TITLE_MAX_LENGTH).optional(),
});

export type CreateLinkInput = z.infer<typeof createLinkInputSchema>;

export const listLinksQuerySchema = z.object({
	q: z.string().trim().max(LINK_SEARCH_MAX_LENGTH).optional(),
	status: linkStatusFilterSchema.default("all"),
	page: z.coerce.number().int().min(1).default(1),
});

export const updateLinkInputSchema = z
	.object({
		title: z.string().trim().max(LINK_TITLE_MAX_LENGTH).nullable().optional(),
		destination: z
			.string()
			.trim()
			.min(1)
			.max(LINK_DESTINATION_MAX_LENGTH)
			.optional(),
		enabled: z.boolean().optional(),
	})
	.strict()
	.refine((value) => Object.values(value).some((item) => item !== undefined), {
		message: "Send at least one field to update.",
	});

export type UpdateLinkInput = z.infer<typeof updateLinkInputSchema>;

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/**
 * Unavailable page shown for unknown codes. It must not reveal whether a code
 * ever existed, its destination, or its owner.
 */
export function renderLinkUnavailablePage(publicWebOrigin: string): string {
	const homeUrl = escapeHtml(publicWebOrigin);
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="robots" content="noindex" />
		<title>Link unavailable</title>
		<style>
			:root { color-scheme: light dark; }
			body {
				margin: 0;
				min-height: 100svh;
				display: grid;
				place-items: center;
				font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
				background: #fff;
				color: #09090b;
			}
			main { max-width: 24rem; padding: 2rem; text-align: center; }
			h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
			p { margin: 0 0 1.5rem; color: #71717a; font-size: 0.875rem; }
			a {
				display: inline-block;
				padding: 0.5rem 1rem;
				border-radius: 0.5rem;
				background: #18181b;
				color: #fafafa;
				text-decoration: none;
				font-size: 0.875rem;
				font-weight: 500;
			}
			@media (prefers-color-scheme: dark) {
				body { background: #09090b; color: #fafafa; }
				p { color: #a1a1aa; }
				a { background: #fafafa; color: #18181b; }
			}
		</style>
	</head>
	<body>
		<main>
			<h1>Link unavailable</h1>
			<p>This short link does not exist or is no longer available.</p>
			<a href="${homeUrl}">Go to Elvo Links</a>
		</main>
	</body>
</html>
`;
}
