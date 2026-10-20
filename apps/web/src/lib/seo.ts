import type { Metadata } from "next";

import { SITE_NAME } from "./brand";
import { absoluteUrl, OG_IMAGE_ALT, OG_IMAGE_PATH } from "./site";

type PageSeoInput = {
	title: string;
	description: string;
	path: string;
	keywords?: readonly string[];
	absoluteTitle?: boolean;
};

/** Shared metadata for indexable marketing pages. */
export function pageMetadata({
	title,
	description,
	path,
	keywords,
	absoluteTitle = false,
}: PageSeoInput): Metadata {
	return {
		...(absoluteTitle ? { title: { absolute: title } } : { title }),
		description,
		...(keywords ? { keywords: [...keywords] } : {}),
		alternates: { canonical: path },
		openGraph: {
			type: "website",
			locale: "en_US",
			url: absoluteUrl(path),
			siteName: SITE_NAME,
			title,
			description,
			images: [
				{
					url: absoluteUrl(OG_IMAGE_PATH),
					width: 1200,
					height: 630,
					alt: OG_IMAGE_ALT,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [absoluteUrl(OG_IMAGE_PATH)],
		},
	};
}
