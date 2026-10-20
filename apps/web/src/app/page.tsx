import { Button } from "@elvo/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@elvo/ui/components/card";
import Link from "next/link";

import { GoogleIcon } from "@/components/google-icon";
export default function Home() {
	return (
		<main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-20">
			<section className="flex max-w-2xl flex-col items-start gap-5">
				<p className="text-muted-foreground text-sm">Elvo Links</p>
				<h1 className="text-balance font-semibold text-4xl tracking-tight sm:text-6xl">
					Short Links. Clean Experience.
				</h1>
				<p className="text-lg text-muted-foreground">
					A simpler way to share. Create short links, download QR codes, and
					understand your clicks.
				</p>
				<div className="flex gap-3">
					<Button
						size="lg"
						nativeButton={false}
						render={<Link href="/login" />}
					>
						<GoogleIcon data-icon="inline-start" />
						Continue with Google
					</Button>
					<Button
						size="lg"
						variant="outline"
						nativeButton={false}
						render={<Link href="/dashboard" />}
					>
						Your dashboard
					</Button>
				</div>
			</section>
			<section aria-label="Features" className="grid gap-4 sm:grid-cols-3">
				{[
					{
						title: "Short URLs",
						description: "One clean link for everything you share.",
					},
					{
						title: "QR Codes",
						description: "Take your short links into the real world.",
					},
					{
						title: "Click Analytics",
						description: "See how your links connect.",
					},
				].map((item) => (
					<Card key={item.title}>
						<CardHeader>
							<CardTitle>{item.title}</CardTitle>
							<CardDescription>{item.description}</CardDescription>
						</CardHeader>
					</Card>
				))}
			</section>
		</main>
	);
}
