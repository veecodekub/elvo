import { describe, expect, test } from "bun:test";

import {
	ANALYTICS_DAYS,
	analyticsWindow,
	buildDailySeries,
	retentionCutoff,
	utcDateKey,
} from "./domain";

describe("analyticsWindow", () => {
	test("covers exactly 30 UTC calendar days ending today", () => {
		expect(analyticsWindow(new Date("2026-10-20T12:00:00.000Z"))).toEqual({
			end: "2026-10-20",
			start: "2026-09-21",
		});
	});

	test("keeps the same window throughout a UTC day", () => {
		expect(analyticsWindow(new Date("2026-10-20T00:00:00.000Z"))).toEqual(
			analyticsWindow(new Date("2026-10-20T23:59:59.999Z")),
		);
	});

	test("advances the window at UTC midnight", () => {
		expect(analyticsWindow(new Date("2026-10-21T00:00:00.000Z"))).toEqual({
			end: "2026-10-21",
			start: "2026-09-22",
		});
	});

	test("handles month and year boundaries", () => {
		expect(analyticsWindow(new Date("2026-01-01T08:00:00.000Z"))).toEqual({
			end: "2026-01-01",
			start: "2025-12-03",
		});
	});
});

describe("buildDailySeries", () => {
	test("fills zero-activity days in ascending UTC order", () => {
		const series = buildDailySeries(
			[
				{ clicks: 4, day: "2026-10-20" },
				{ clicks: 2, day: "2026-09-21" },
			],
			new Date("2026-10-20T18:30:00.000Z"),
		);

		expect(series).toHaveLength(ANALYTICS_DAYS);
		expect(series[0]).toEqual({ clicks: 2, date: "2026-09-21" });
		expect(series[29]).toEqual({ clicks: 4, date: "2026-10-20" });
		expect(series[1]?.clicks).toBe(0);
		expect(series.reduce((total, day) => total + day.clicks, 0)).toBe(6);
	});

	test("ignores rows outside the latest 30 days", () => {
		const series = buildDailySeries(
			[
				{ clicks: 99, day: "2026-09-20" },
				{ clicks: 1, day: "2026-10-20" },
				{ clicks: 7, day: "2026-10-21" },
			],
			new Date("2026-10-20T18:30:00.000Z"),
		);

		expect(series.reduce((total, day) => total + day.clicks, 0)).toBe(1);
	});
});

describe("retentionCutoff", () => {
	test("keeps 30 UTC days including today", () => {
		expect(utcDateKey(new Date("2026-10-20T23:59:59.999Z"))).toBe("2026-10-20");
		expect(retentionCutoff(new Date("2026-10-20T23:59:59.999Z"))).toBe(
			"2026-09-21",
		);
	});
});
