/**
 * End-to-end verification for issue #4 (Download a Link QR Code).
 *
 * Requires the dev servers to be running (`bun run dev`), the schema to be
 * applied, and Chromium installed (`bunx playwright install chromium`).
 * Creates a temporary account, opens the real dashboard in Chromium, downloads
 * the QR PNG through the UI, decodes it, and checks that the encoded short URL
 * still reaches a newly edited destination. Every temporary account is removed
 * afterwards.
 *
 * Run from apps/server: `bun run verify:qr`
 */

import { readFile } from "node:fs/promises";
import { session, user } from "@elvo/db/schema/auth";
import { makeSignature } from "better-auth/crypto";
import { inArray } from "drizzle-orm";
import jsQR from "jsqr";
import { chromium } from "playwright";
import { PNG } from "pngjs";

import { db } from "../src/services";

const API_ORIGIN = process.env.VERIFY_API_ORIGIN ?? "http://localhost:3000";
const WEB_ORIGIN = process.env.VERIFY_WEB_ORIGIN ?? "http://localhost:3001";
const SECRET = process.env.BETTER_AUTH_SECRET ?? "";
const ORIGINAL_DESTINATION = "https://example.com/qr-original?from=qr";
const UPDATED_DESTINATION = "https://example.com/qr-updated?from=qr";

type LinkRecord = {
	code: string;
	title: string | null;
	destination: string;
	enabled: boolean;
	shortUrl: string;
	createdAt: string;
	updatedAt: string;
};

type Actor = {
	userId: string;
	cookie: string;
	cookieValue: string;
};

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

async function createActor(label: string): Promise<Actor> {
	const userId = `verify-qr-${label}-${crypto.randomUUID()}`;
	const token = crypto.randomUUID();
	await db.insert(user).values({
		id: userId,
		name: `Verify QR ${label}`,
		email: `${userId}@verify.invalid`,
		emailVerified: true,
	});
	await db.insert(session).values({
		id: crypto.randomUUID(),
		token,
		userId,
		expiresAt: new Date(Date.now() + 60 * 60 * 1000),
	});
	const signature = await makeSignature(token, SECRET);
	return {
		userId,
		cookie: `better-auth.session_token=${token}.${signature}`,
		cookieValue: `${token}.${signature}`,
	};
}

async function createLink(cookie: string, title: string) {
	const response = await fetch(`${API_ORIGIN}/api/links`, {
		method: "POST",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify({ destination: ORIGINAL_DESTINATION, title }),
	});
	const json = (await response.json()) as {
		link?: LinkRecord;
		error?: { code?: string; message?: string };
	};
	return { status: response.status, ...json };
}

async function updateLink(
	cookie: string,
	code: string,
	body: Record<string, unknown>,
) {
	const response = await fetch(`${API_ORIGIN}/api/links/${code}`, {
		method: "PATCH",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	const json = (await response.json()) as {
		link?: LinkRecord;
		error?: { code?: string; message?: string };
	};
	return { status: response.status, ...json };
}

async function listLinks(cookie: string) {
	const response = await fetch(`${API_ORIGIN}/api/links`, {
		headers: { cookie },
	});
	return response.json() as Promise<{
		links: LinkRecord[];
		total: number;
	}>;
}

function decodePng(bytes: Buffer) {
	const png = PNG.sync.read(bytes);
	const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, {
		inversionAttempts: "dontInvert",
	});
	return { png, result };
}

function analyzePixels(png: PNG) {
	let transparent = 0;
	let colored = 0;
	let black = 0;
	let white = 0;
	let gray = 0;
	for (let index = 0; index < png.data.length; index += 4) {
		const red = png.data[index] ?? 0;
		const green = png.data[index + 1] ?? 0;
		const blue = png.data[index + 2] ?? 0;
		const alpha = png.data[index + 3] ?? 0;
		if (alpha !== 255) transparent += 1;
		if (red !== green || green !== blue) colored += 1;
		if (red === 0 && green === 0 && blue === 0) {
			black += 1;
		} else if (red === 255 && green === 255 && blue === 255) {
			white += 1;
		} else {
			gray += 1;
		}
	}
	return { black, colored, gray, transparent, white };
}

function isWhitePixel(png: PNG, x: number, y: number) {
	const index = (y * png.width + x) * 4;
	return (
		png.data[index] === 255 &&
		png.data[index + 1] === 255 &&
		png.data[index + 2] === 255
	);
}

/** The four-module quiet zone must be intact on every side. */
function hasQuietZone(png: PNG, version: number) {
	const modules = 17 + version * 4;
	const moduleSize = png.width / (modules + 8);
	const margin = Math.max(1, Math.floor(moduleSize * 4) - 1);
	for (let y = 0; y < png.height; y += 1) {
		for (let x = 0; x < png.width; x += 1) {
			const inVerticalMargin =
				(y < margin || y >= png.height - margin) && x >= 0 && x < png.width;
			const inHorizontalMargin =
				(x < margin || x >= png.width - margin) && y >= 0 && y < png.height;
			if (
				(inVerticalMargin || inHorizontalMargin) &&
				!isWhitePixel(png, x, y)
			) {
				return false;
			}
		}
	}
	return true;
}

async function main() {
	if (!SECRET) {
		throw new Error("BETTER_AUTH_SECRET is not loaded; run from apps/server");
	}

	const owner = await createActor("owner");
	const other = await createActor("other");
	const title = `QR verification ${crypto.randomUUID().slice(0, 8)}`;
	let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

	try {
		console.log("\nOwned QR data");
		const created = await createLink(owner.cookie, title);
		const code = created.link?.code ?? "";
		check(
			"an owner can create a link for QR verification",
			created.status === 201 && Boolean(code),
			`status=${created.status}`,
		);
		const shortUrl = `${WEB_ORIGIN}/${code}`;
		check(
			"the API exposes the configured public short URL",
			created.link?.shortUrl === shortUrl,
			created.link?.shortUrl,
		);
		const anonymous = await fetch(`${API_ORIGIN}/api/links`);
		check("anonymous requests cannot read link data", anonymous.status === 401);
		const otherList = await listLinks(other.cookie);
		check(
			"another owner cannot see the link or its QR data",
			otherList.total === 0 &&
				!otherList.links.some((link) => link.code === code),
			`total=${otherList.total}`,
		);
		const foreignEdit = await updateLink(other.cookie, code, {
			destination: "https://evil.example/overwrite",
		});
		check(
			"another owner cannot edit the link behind the QR code",
			foreignEdit.status === 404,
			`status=${foreignEdit.status}`,
		);

		console.log("\nDashboard download");
		browser = await chromium.launch();
		const context = await browser.newContext({
			acceptDownloads: true,
			viewport: { width: 1280, height: 900 },
		});
		await context.addCookies([
			{
				name: "better-auth.session_token",
				value: owner.cookieValue,
				url: WEB_ORIGIN,
				httpOnly: true,
				sameSite: "Lax",
			},
		]);
		const page = await context.newPage();
		await page.goto(`${WEB_ORIGIN}/dashboard`, {
			waitUntil: "domcontentloaded",
		});
		await page.getByRole("heading", { name: "Your links" }).waitFor();

		const row = page.getByRole("row").filter({ hasText: title });
		await row.waitFor();
		await row.getByRole("button", { name: `QR for ${title}` }).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("heading", { name: "QR code" }).waitFor();
		check(
			"the QR dialog shows the short URL and download action",
			(await dialog.getByText(shortUrl).count()) === 1 &&
				(await dialog.getByRole("button", { name: "Download PNG" }).count()) ===
					1,
		);
		const preview = dialog.getByRole("img", {
			name: `QR code for ${shortUrl}`,
		});
		check(
			"the dialog renders an accessible QR preview",
			await preview.isVisible(),
		);

		// Simulate a generation failure and confirm the dialog reports it instead
		// of silently doing nothing.
		await page.evaluate(() => {
			const canvasPrototype = Reflect.get(globalThis, "HTMLCanvasElement")
				.prototype as { toDataURL: () => string };
			const original = canvasPrototype.toDataURL;
			Reflect.set(globalThis, "__elvoRestoreToDataUrl", () => {
				canvasPrototype.toDataURL = original;
			});
			canvasPrototype.toDataURL = () => {
				throw new Error("simulated QR generation failure");
			};
		});
		const failedDownload = page.waitForEvent("download", { timeout: 750 });
		await dialog.getByRole("button", { name: "Download PNG" }).click();
		check(
			"the failed download does not trigger a file",
			(await failedDownload.catch(() => null)) === null,
		);
		check(
			"a generation failure is reported accessibly",
			await dialog.getByRole("alert").isVisible(),
		);
		check("the dialog stays open after a failure", await dialog.isVisible());
		await page.evaluate(() => {
			const restore = Reflect.get(globalThis, "__elvoRestoreToDataUrl");
			if (typeof restore === "function") restore();
		});

		const [download] = await Promise.all([
			page.waitForEvent("download"),
			dialog.getByRole("button", { name: "Download PNG" }).click(),
		]);
		const suggestedFilename = download.suggestedFilename();
		check(
			"the download is named elvo-<code>.png",
			suggestedFilename === `elvo-${code}.png`,
			suggestedFilename,
		);
		const downloadPath = await download.path();
		if (!downloadPath) {
			throw new Error("Chromium did not expose the downloaded file");
		}
		const bytes = await readFile(downloadPath);
		const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
		check(
			"the download is a PNG file",
			pngSignature.every((byte, index) => bytes[index] === byte),
		);
		const { png, result } = decodePng(bytes);
		check(
			"the downloaded PNG decodes to the exact configured short URL",
			result?.data === shortUrl,
			result?.data ?? "no QR code found",
		);
		check(
			"the QR encodes the short URL, never the destination",
			result?.data === shortUrl &&
				result.data !== ORIGINAL_DESTINATION &&
				!result.data.includes("example.com"),
			result?.data ?? "no QR code found",
		);
		const pixels = analyzePixels(png);
		const totalPixels = png.width * png.height;
		check(
			"the QR PNG is opaque black-and-white",
			pixels.transparent === 0 &&
				pixels.colored === 0 &&
				pixels.black > 0 &&
				pixels.white > 0 &&
				pixels.gray < totalPixels * 0.02,
			`black=${pixels.black} white=${pixels.white} gray=${pixels.gray} colored=${pixels.colored} transparent=${pixels.transparent}`,
		);
		check(
			"the QR keeps the four-module quiet zone",
			result !== null && hasQuietZone(png, result.version),
			result ? `version=${result.version} size=${png.width}` : "no QR code",
		);

		console.log("\nRedirects and destination edits");
		const decodedUrl = result?.data ?? "";
		const redirect = await fetch(decodedUrl, { redirect: "manual" });
		check(
			"the decoded short URL redirects publicly to the destination",
			redirect.status === 302 &&
				redirect.headers.get("location") === ORIGINAL_DESTINATION,
			`status=${redirect.status} location=${redirect.headers.get("location")}`,
		);
		const edited = await updateLink(owner.cookie, code, {
			destination: UPDATED_DESTINATION,
		});
		check(
			"the owner can edit the destination",
			edited.status === 200 && edited.link?.destination === UPDATED_DESTINATION,
			`status=${edited.status}`,
		);
		const updatedRedirect = await fetch(decodedUrl, { redirect: "manual" });
		check(
			"the same downloaded QR reaches the updated destination without regeneration",
			updatedRedirect.status === 302 &&
				updatedRedirect.headers.get("location") === UPDATED_DESTINATION,
			`status=${updatedRedirect.status} location=${updatedRedirect.headers.get("location")}`,
		);

		console.log("\nMobile dialog and keyboard dismissal");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.getByRole("heading", { name: "Your links" }).waitFor();
		await page.getByRole("button", { name: `Actions for ${title}` }).click();
		await page.getByRole("menuitem", { name: "QR code" }).click();
		const mobileDialog = page.getByRole("dialog");
		await mobileDialog.getByRole("heading", { name: "QR code" }).waitFor();
		check(
			"the QR dialog and download action are usable on mobile",
			(await mobileDialog.getByText(shortUrl).count()) === 1 &&
				(await mobileDialog
					.getByRole("button", { name: "Download PNG" })
					.isVisible()),
		);
		await page.keyboard.press("Escape");
		await mobileDialog.waitFor({ state: "hidden" });
		check("the QR dialog dismisses with the keyboard", true);
	} finally {
		await browser?.close();
		const ids = [owner.userId, other.userId];
		await db.delete(user).where(inArray(user.id, ids));
	}

	console.log(`\n${passed} passed, ${failed} failed`);
	if (failed > 0) {
		process.exit(1);
	}
}

await main();
process.exit(0);
