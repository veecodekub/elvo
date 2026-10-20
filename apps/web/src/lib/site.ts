import { ENV } from "@/env";

const FALLBACK_SITE_URL = "https://elvo-links.vercel.app";

function normalizeSiteUrl(value: string) {
	return new URL(value).origin;
}

function resolveSiteUrl() {
	const configured = ENV.NEXT_PUBLIC_SITE_URL?.trim();
	if (configured) return normalizeSiteUrl(configured);

	const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
	if (vercelHost) {
		return normalizeSiteUrl(
			vercelHost.startsWith("http") ? vercelHost : `https://${vercelHost}`,
		);
	}

	return FALLBACK_SITE_URL;
}

/** Canonical public origin used by metadata, sitemap, robots, and JSON-LD. */
export const SITE_URL = resolveSiteUrl();
export const OG_IMAGE_PATH = "/opengraph-image";
export const OG_IMAGE_ALT =
	"Elvo Links — Short links with QR codes and click analytics";

export function absoluteUrl(path: string) {
	return new URL(path, SITE_URL).toString();
}
