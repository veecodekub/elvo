"use client";
import { Badge } from "@elvo/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@elvo/ui/components/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@elvo/ui/components/empty";
import type { authClient } from "@/lib/auth-client";
export default function Dashboard({
	session,
}: {
	session: typeof authClient.$Infer.Session;
}) {
	return (
		<main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Your links</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Welcome, {session.user.name}. A simple home for everything you
						share.
					</p>
				</div>
				<Badge variant="secondary">Personal account</Badge>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>All links</CardTitle>
					<CardDescription>Your personal link workspace.</CardDescription>
				</CardHeader>
				<CardContent>
					<Empty>
						<EmptyHeader>
							<EmptyTitle>Your workspace is ready</EmptyTitle>
							<EmptyDescription>
								Link creation will be available soon.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</CardContent>
			</Card>
		</main>
	);
}
