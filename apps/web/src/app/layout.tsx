import { cn } from "@elvo/ui/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import PageBackground from "@/components/page-background";
import Providers from "@/components/providers";
import { ENV } from "@/env";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/brand";
import { absoluteUrl, OG_IMAGE_ALT, OG_IMAGE_PATH, SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const defaultTitle = `${SITE_NAME} — Free URL Shortener with QR Codes & Click Analytics`;

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: defaultTitle,
		template: `%s | ${SITE_NAME}`,
	},
	description: SITE_DESCRIPTION,
	applicationName: SITE_NAME,
	authors: [{ name: "Elvo" }],
	creator: "Elvo",
	publisher: "Elvo",
	category: "technology",
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-image-preview": "large",
			"max-snippet": -1,
			"max-video-preview": -1,
		},
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: SITE_URL,
		siteName: SITE_NAME,
		title: defaultTitle,
		description: SITE_DESCRIPTION,
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
		title: defaultTitle,
		description: SITE_DESCRIPTION,
		images: [absoluteUrl(OG_IMAGE_PATH)],
	},
	verification: {
		google: ENV.GOOGLE_SITE_VERIFICATION || undefined,
		other: ENV.BING_SITE_VERIFICATION
			? { "msvalidate.01": ENV.BING_SITE_VERIFICATION }
			: undefined,
	},
	manifest: "/manifest.webmanifest",
	appleWebApp: {
		capable: true,
		title: SITE_NAME,
		statusBarStyle: "default",
	},
	formatDetection: {
		telephone: false,
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#09090b" },
	],
	colorScheme: "light dark",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={cn("font-sans", inter.variable)}
		>
			<body className="antialiased">
				<Providers>
					<PageBackground />
					<div className="relative z-10 grid min-h-svh grid-rows-[auto_1fr]">
						<Header />
						{children}
					</div>
				</Providers>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
