"use client";

import { Button } from "@elvo/ui/components/button";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@elvo/ui/components/chart";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@elvo/ui/components/dialog";
import { Skeleton } from "@elvo/ui/components/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { LinksApiError, type ShortLink } from "@/lib/links-api";
import {
	linkAnalyticsQueryOptions,
	patchLinkInSnapshots,
} from "@/lib/links-queries";

const GENERIC_ANALYTICS_ERROR =
	"We couldn't load analytics. Check your connection and try again.";

function hostnameOf(value: string) {
	try {
		return new URL(value).hostname;
	} catch {
		return value;
	}
}

function linkTitle(link: ShortLink) {
	return link.title ?? hostnameOf(link.destination);
}

function formatAnalyticsDay(value: string) {
	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	}).format(date);
}

function formatNumber(value: number) {
	return value.toLocaleString("en-US");
}

export default function LinkAnalyticsDialog({
	link,
	onClose,
}: {
	link: ShortLink;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const analyticsQuery = useQuery(linkAnalyticsQueryOptions(link.code));
	const analytics = analyticsQuery.data ?? null;
	const analyticsLoading = analyticsQuery.isFetching && !analytics;
	const analyticsError = analyticsQuery.error
		? analyticsQuery.error instanceof LinksApiError
			? analyticsQuery.error.message
			: GENERIC_ANALYTICS_ERROR
		: null;

	useEffect(() => {
		if (!analytics) return;
		patchLinkInSnapshots(queryClient, analytics.code, {
			totalClicks: analytics.totalClicks,
		});
	}, [analytics, queryClient]);

	const analyticsTotal = analytics?.totalClicks ?? link.totalClicks;
	const analyticsChartData =
		analytics?.days.map((day) => ({
			clicks: day.clicks,
			date: day.date,
			label: formatAnalyticsDay(day.date),
		})) ?? [];
	const analyticsEmpty =
		analytics?.days.every((day) => day.clicks === 0) ?? false;

	return (
		<Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Click analytics</DialogTitle>
					<DialogDescription>{linkTitle(link)}</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<div className="rounded-lg border bg-muted/30 px-4 py-3">
						<p className="text-muted-foreground text-sm">Total Clicks</p>
						<p
							className="font-semibold text-3xl tabular-nums"
							data-testid="analytics-total"
							aria-live="polite"
						>
							{analyticsLoading && !analytics
								? "…"
								: formatNumber(analyticsTotal)}
						</p>
						<p className="text-muted-foreground text-xs">
							Lifetime successful redirects.
						</p>
					</div>

					{analyticsError && !analyticsLoading ? (
						<div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 p-3">
							<p role="alert" className="text-destructive text-sm">
								{analyticsError}
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void analyticsQuery.refetch()}
							>
								<RefreshCw data-icon="inline-start" />
								Try again
							</Button>
						</div>
					) : null}

					{analyticsLoading && !analytics ? (
						<div
							className="grid gap-3"
							role="status"
							aria-label="Loading analytics"
							aria-busy="true"
						>
							<Skeleton className="h-4 w-44" />
							<Skeleton className="h-48 w-full rounded-lg" />
						</div>
					) : analytics ? (
						<div className="flex flex-col gap-3">
							<div>
								<p className="font-medium text-sm">Last 30 UTC calendar days</p>
								<p className="text-muted-foreground text-xs">
									{analytics.range.start} to {analytics.range.end}
								</p>
							</div>
							<ChartContainer
								config={{
									clicks: {
										color: "var(--foreground)",
										label: "Clicks",
									},
								}}
								className="h-48 w-full"
								role="group"
								aria-label="Daily clicks for the last 30 UTC calendar days"
							>
								<BarChart accessibilityLayer data={analyticsChartData}>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										tickMargin={8}
										minTickGap={24}
									/>
									<ChartTooltip
										cursor={false}
										content={
											<ChartTooltipContent
												labelFormatter={(value) => `${String(value)} · UTC`}
											/>
										}
									/>
									<Bar
										dataKey="clicks"
										fill="var(--color-clicks)"
										radius={[3, 3, 0, 0]}
									/>
								</BarChart>
							</ChartContainer>
							{analyticsEmpty ? (
								<p className="text-muted-foreground text-sm">
									{analytics.totalClicks === 0
										? "No clicks recorded yet. Share the short link to start collecting analytics."
										: "No clicks in the last 30 UTC days. The lifetime total above is kept."}
								</p>
							) : null}
							<p className="text-muted-foreground text-xs">
								Repeat openings and bots are counted. Destination loads and
								unique visitors are not tracked. Updates automatically every 30
								seconds.
							</p>
						</div>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
