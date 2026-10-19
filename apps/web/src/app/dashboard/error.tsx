"use client";
import { Button } from "@elvo/ui/components/button";
export default function DashboardError({ reset }: { reset: () => void }) {
	return (
		<main className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-12">
			<h1 className="font-semibold text-xl">Could not load your workspace</h1>
			<p className="text-muted-foreground text-sm">
				Please check your connection and try again.
			</p>
			<Button onClick={reset}>Try again</Button>
		</main>
	);
}
