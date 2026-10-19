import { describe, expect, test } from "bun:test";

import {
	createLinkInputSchema,
	generateLinkCode,
	isLinkCode,
	isReservedLinkCode,
	LINK_CODE_ALPHABET,
	LINK_CODE_LENGTH,
	parseDestination,
	renderLinkUnavailablePage,
} from "./domain";

describe("parseDestination", () => {
	test("accepts http and https URLs and trims whitespace", () => {
		expect(parseDestination("https://example.com/launch")?.toString()).toBe(
			"https://example.com/launch",
		);
		expect(parseDestination("  http://example.com  ")?.toString()).toBe(
			"http://example.com/",
		);
	});

	test("rejects unsupported schemes", () => {
		for (const value of [
			"ftp://example.com/file",
			"javascript:alert(1)",
			"mailto:hello@example.com",
			"data:text/html,hi",
		]) {
			expect(parseDestination(value)).toBeNull();
		}
	});

	test("rejects malformed and empty values", () => {
		for (const value of ["", "   ", "not a url", "example.com", "https://"]) {
			expect(parseDestination(value)).toBeNull();
		}
	});

	test("rejects destinations beyond the length limit", () => {
		const longUrl = `https://example.com/${"a".repeat(2048)}`;
		expect(parseDestination(longUrl)).toBeNull();
	});
});

describe("createLinkInputSchema", () => {
	test("trims destination and title", () => {
		const parsed = createLinkInputSchema.parse({
			destination: " https://example.com ",
			title: "  Launch  ",
		});
		expect(parsed.destination).toBe("https://example.com");
		expect(parsed.title).toBe("Launch");
	});

	test("rejects titles longer than 120 characters", () => {
		const parsed = createLinkInputSchema.safeParse({
			destination: "https://example.com",
			title: "x".repeat(121),
		});
		expect(parsed.success).toBe(false);
	});
});

describe("generateLinkCode", () => {
	test("returns codes in the unambiguous alphabet", () => {
		for (let index = 0; index < 200; index += 1) {
			const code = generateLinkCode();
			expect(code).toHaveLength(LINK_CODE_LENGTH);
			expect(isLinkCode(code)).toBe(true);
			for (const character of code) {
				expect(LINK_CODE_ALPHABET).toContain(character);
			}
		}
	});

	test("generates distinct codes for a sample of 1000", () => {
		const codes = new Set<string>();
		for (let index = 0; index < 1000; index += 1) {
			codes.add(generateLinkCode());
		}
		expect(codes.size).toBe(1000);
	});
});

describe("isReservedLinkCode", () => {
	test("reserves application paths", () => {
		expect(isReservedLinkCode("api")).toBe(true);
		expect(isReservedLinkCode("dashboard")).toBe(true);
		expect(isReservedLinkCode("FAVICON.ICO")).toBe(true);
	});

	test("allows generated codes", () => {
		expect(isReservedLinkCode(generateLinkCode())).toBe(false);
	});
});

describe("renderLinkUnavailablePage", () => {
	test("shows the unavailable message with a home link", () => {
		const html = renderLinkUnavailablePage("https://elvo.test");
		expect(html).toContain("Link unavailable");
		expect(html).toContain('href="https://elvo.test"');
		expect(html).toContain("Go to Elvo Links");
	});

	test("escapes the configured origin", () => {
		const html = renderLinkUnavailablePage('https://x.test/"><script>');
		expect(html).not.toContain("<script>");
	});
});
