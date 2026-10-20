export const ANALYTICS_DAYS = 30;
export const ANALYTICS_TIME_ZONE = "UTC";

export type DailyClicks = {
	date: string;
	clicks: number;
};

export type DailyClickRow = {
	day: string;
	clicks: number;
};

/** ISO date key for the UTC calendar day containing `date`. */
export function utcDateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}

export function addUtcDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

/**
 * The latest 30 UTC calendar days, ending with the UTC day containing `now`.
 * Both bounds are inclusive date keys in `YYYY-MM-DD` form.
 */
export function analyticsWindow(now: Date): { start: string; end: string } {
	const end = startOfUtcDay(now);
	const start = addUtcDays(end, -(ANALYTICS_DAYS - 1));
	return { end: utcDateKey(end), start: utcDateKey(start) };
}

/**
 * Expands stored daily aggregate rows into the full 30-day series, inserting
 * zero-activity days and dropping any rows outside the window.
 */
export function buildDailySeries(
	rows: readonly DailyClickRow[],
	now: Date,
): DailyClicks[] {
	const { start } = analyticsWindow(now);
	const clicksByDay = new Map(rows.map((row) => [row.day, row.clicks]));
	const series: DailyClicks[] = [];
	let cursor = new Date(`${start}T00:00:00.000Z`);

	for (let index = 0; index < ANALYTICS_DAYS; index += 1) {
		const date = utcDateKey(cursor);
		series.push({ clicks: clicksByDay.get(date) ?? 0, date });
		cursor = addUtcDays(cursor, 1);
	}

	return series;
}

/**
 * First UTC day that retention keeps. Rows before this date are deleted while
 * lifetime totals on `links` stay untouched.
 */
export function retentionCutoff(now: Date): string {
	return utcDateKey(addUtcDays(startOfUtcDay(now), -(ANALYTICS_DAYS - 1)));
}
