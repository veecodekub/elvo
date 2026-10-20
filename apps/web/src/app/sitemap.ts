import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

const pages = [
	{ path: "/", changeFrequency: "weekly", priority: 1 },
	{ path: "/url-shortener", changeFrequency: "monthly", priority: 0.9 },
	{ path: "/qr-code-generator", changeFrequency: "monthly", priority: 0.8 },
	{ path: "/link-analytics", changeFrequency: "monthly", priority: 0.8 },
	{ path: "/faq", changeFrequency: "monthly", priority: 0.6 },
	{ path: "/about", changeFrequency: "yearly", priority: 0.4 },
	{ path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
	{ path: "/terms", changeFrequency: "yearly", priority: 0.2 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
	const lastModified = new Date();

	return pages.map((page) => ({
		url: absoluteUrl(page.path),
		lastModified,
		changeFrequency: page.changeFrequency,
		priority: page.priority,
	}));
}
