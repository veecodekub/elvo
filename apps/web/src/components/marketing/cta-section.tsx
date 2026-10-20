import { Button } from "@elvo/ui/components/button";
import type { Route } from "next";
import Link from "next/link";

import { GoogleIcon } from "@/components/google-icon";

export function CtaSection({
	title = "Ready to make a cleaner link?",
	description = "Sign in with Google and create your first short link in a minute.",
	secondaryLabel = "Read the FAQ",
	secondaryHref = "/faq",
}: {
	title?: string;
	description?: string;
	secondaryLabel?: string;
	secondaryHref?: Route;
}) {
	return (
		<section className="border-t bg-muted/20">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<div className="flex max-w-2xl flex-col items-start gap-5">
					<h2 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
						{title}
					</h2>
					<p className="text-lg text-muted-foreground">{description}</p>
					<div className="flex flex-wrap gap-3 pt-1">
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
							render={<Link href={secondaryHref} />}
						>
							{secondaryLabel}
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
