/**
 * End-to-end verification for the public SEO surface.
 *
 * Requires the dev servers to be running (`bun run dev`) and the schema to be
 * applied. Checks public metadata, canonical URLs, sitemap, robots, manifest,
 * generated images, noindex protections, and short-link redirect headers.
 *
 * Run from apps/server: `bun run verify:seo`
 */

import "./test-database-preload";
import { user } from "@elvo/db/schema/auth";
import { links } from "@elvo/db/schema/links";
import { eq } from "drizzle-orm";

import { generateLinkCode } from "../src/links/domain";
import { db } from "../src/services";

const WEB_ORIGIN = process.env.VERIFY_WEB_ORIGIN ?? "http://localhost:3001";
const DESTINATION = "https://example.com/seo-verification";

const publicPages = [
	{ path: "/", title: "Elvo Links", description: "short links" },
	{
		path: "/url-shortener",
		title: "Free URL Shortener with QR Codes",
		description: "short link",
	},
	{
		path: "/qr-code-generator",
		title: "QR Code Generator for Short Links",
		description: "QR code",
	},
	{
		path: "/link-analytics",
		title: "Short-Link Click Analytics",
		description: "clicks",
	},
	{
		path: "/faq",
		title: "Frequently Asked Questions",
		description: "answers",
	},
	{ path: "/about", title: "About Elvo Links", description: "Elvo Links" },
	{ path: "/privacy", title: "Privacy Policy", description: "privacy" },
	{ path: "/terms", title: "Terms of Service", description: "terms" },
] as const;

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, details = "") {
	if (ok) {
		passed += 1;
		console.log(`  PASS  ${name}`);
		return;
	}
	failed += 1;
	console.log(`  FAIL  ${name}${details ? ` (${details})` : ""}`);
}

async function fetchPage(path: string) {
	const response = await fetch(`${WEB_ORIGIN}${path}`, {
		redirect: "manual",
	});
	return { response, html: await response.text() };
}

function findMeta(html: string, key: string) {
	const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
	for (const tag of tags) {
		const name = tag.match(/(?:name|property)=["']([^"']+)["']/i)?.[1];
		if (name === key) {
			return tag.match(/content=["']([^"']*)["']/i)?.[1];
		}
	}
	return undefined;
}

function findCanonical(html: string) {
	const tag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0];
	return tag?.match(/href=["']([^"']+)["']/i)?.[1];
}

function findTitle(html: string) {
	return html.match(/<title>([^<]*)<\/title>/i)?.[1];
}

function findJsonLd(html: string) {
	const matches = html.matchAll(
		/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
	);
	return [...matches].map((match) => JSON.parse(match[1] ?? "null") as unknown);
}

function flattenJsonLd(values: unknown[]): unknown[] {
	return values.flatMap((value) =>
		Array.isArray(value) ? flattenJsonLd(value) : [value],
	);
}

async function createTemporaryLink() {
	const userId = `verify-seo-${crypto.randomUUID()}`;
	const code = generateLinkCode();
	await db.insert(user).values({
		id: userId,
		name: "Verify SEO",
		email: `${userId}@verify.invalid`,
		emailVerified: true,
	});
	await db.insert(links).values({
		id: crypto.randomUUID(),
		code,
		destination: DESTINATION,
		ownerId: userId,
	});
	return { code, userId };
}

async function main() {
	console.log("\nPublic metadata");
	for (const page of publicPages) {
		const { response, html } = await fetchPage(page.path);
		const title = findTitle(html) ?? "";
		const description = findMeta(html, "description") ?? "";
		const canonical = findCanonical(html) ?? "";
		const robots = findMeta(html, "robots") ?? "";
		const ogTitle = findMeta(html, "og:title") ?? "";
		const ogImage = findMeta(html, "og:image") ?? "";
		const twitterCard = findMeta(html, "twitter:card") ?? "";
		const canonicalPath = canonical ? new URL(canonical).pathname : "";
		const expectedPath = page.path === "/" ? "/" : page.path;

		check(`${page.path} returns 200`, response.status === 200);
		check(
			`${page.path} title contains page title`,
			title.toLowerCase().includes(page.title.toLowerCase()),
			title,
		);
		check(
			`${page.path} has description`,
			description.toLowerCase().includes(page.description.toLowerCase()),
			description,
		);
		check(
			`${page.path} has canonical path`,
			canonicalPath === expectedPath,
			`${canonicalPath} !== ${expectedPath}`,
		);
		check(`${page.path} is not noindex`, !robots.includes("noindex"), robots);
		check(`${page.path} has og:title`, ogTitle.length > 0);
		check(`${page.path} has og:image`, ogImage.startsWith("http"), ogImage);
		check(
			`${page.path} has twitter card`,
			twitterCard === "summary_large_image",
			twitterCard,
		);
		check(`${page.path} has an h1`, /<h1\b[^>]*>/i.test(html));
	}

	console.log("\nStructured data");
	const home = await fetchPage("/");
	const homeJsonLd = flattenJsonLd(findJsonLd(home.html));
	check(
		"home publishes WebSite structured data",
		homeJsonLd.some(
			(value) =>
				typeof value === "object" &&
				value !== null &&
				(value as { "@type"?: string })["@type"] === "WebSite",
		),
	);
	check(
		"home publishes SoftwareApplication structured data",
		homeJsonLd.some(
			(value) =>
				typeof value === "object" &&
				value !== null &&
				(value as { "@type"?: string })["@type"] === "SoftwareApplication",
		),
	);

	const faq = await fetchPage("/faq");
	const faqJsonLd = flattenJsonLd(findJsonLd(faq.html));
	check(
		"FAQ publishes FAQPage structured data",
		faqJsonLd.some(
			(value) =>
				typeof value === "object" &&
				value !== null &&
				(value as { "@type"?: string })["@type"] === "FAQPage",
		),
	);

	console.log("\nCrawler files and images");
	const robots = await fetch(`${WEB_ORIGIN}/robots.txt`);
	const robotsText = await robots.text();
	check("robots.txt returns 200", robots.status === 200);
	check(
		"robots.txt includes the sitemap",
		robotsText.includes("Sitemap:") && robotsText.includes("/sitemap.xml"),
		robotsText,
	);
	check("robots.txt disallows /api/", /Disallow: \/api\//.test(robotsText));

	const sitemap = await fetch(`${WEB_ORIGIN}/sitemap.xml`);
	const sitemapText = await sitemap.text();
	const sitemapPaths = [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
		(match) => new URL(match[1] ?? "").pathname,
	);
	check("sitemap.xml returns 200", sitemap.status === 200);
	for (const page of publicPages) {
		check(
			`sitemap includes ${page.path}`,
			sitemapPaths.includes(page.path),
			page.path,
		);
	}
	check(
		"sitemap excludes app-only routes",
		!sitemapPaths.some((path) => /^\/(login|dashboard|prototype)/.test(path)),
		sitemapPaths.join(", "),
	);

	const manifest = await fetch(`${WEB_ORIGIN}/manifest.webmanifest`);
	const manifestBody = (await manifest.json()) as { name?: string };
	check("manifest returns 200", manifest.status === 200);
	check("manifest has the app name", manifestBody.name === "Elvo Links");

	for (const imagePath of [
		"/opengraph-image",
		"/twitter-image",
		"/apple-icon",
		"/icon.svg",
	]) {
		const image = await fetch(`${WEB_ORIGIN}${imagePath}`);
		check(
			`${imagePath} returns an image`,
			image.status === 200 &&
				(image.headers.get("content-type") ?? "").startsWith("image/"),
			`${image.status} ${image.headers.get("content-type")}`,
		);
	}

	console.log("\nNoindex protections");
	const login = await fetch(`${WEB_ORIGIN}/login`, { redirect: "manual" });
	const loginHtml = await login.text();
	check("login returns 200", login.status === 200);
	check(
		"login meta is noindex",
		(findMeta(loginHtml, "robots") ?? "").includes("noindex"),
	);
	check(
		"login header is noindex",
		(login.headers.get("x-robots-tag") ?? "").includes("noindex"),
	);

	const dashboard = await fetch(`${WEB_ORIGIN}/dashboard`, {
		redirect: "manual",
	});
	check(
		"dashboard redirects anonymous visitors",
		dashboard.status === 307 || dashboard.status === 302,
		`status=${dashboard.status}`,
	);
	check(
		"dashboard header is noindex",
		(dashboard.headers.get("x-robots-tag") ?? "").includes("noindex"),
	);

	const temporary = await createTemporaryLink();
	try {
		const shortLink = await fetch(`${WEB_ORIGIN}/${temporary.code}`, {
			redirect: "manual",
		});
		check("short link redirects", shortLink.status === 302);
		check(
			"short link points to the destination",
			shortLink.headers.get("location") === DESTINATION,
		);
		check(
			"short link header is noindex",
			(shortLink.headers.get("x-robots-tag") ?? "").includes("noindex"),
		);
		check(
			"short link is not cached",
			(shortLink.headers.get("cache-control") ?? "").includes("no-store"),
		);

		const unavailable = await fetch(`${WEB_ORIGIN}/${generateLinkCode()}`, {
			redirect: "manual",
		});
		check("unknown short link returns 404", unavailable.status === 404);
		check(
			"unknown short link header is noindex",
			(unavailable.headers.get("x-robots-tag") ?? "").includes("noindex"),
		);
	} finally {
		await db.delete(user).where(eq(user.id, temporary.userId));
	}

	console.log(`\n${passed} passed, ${failed} failed`);
	if (failed > 0) process.exit(1);
}

await main();
