import type { ReactNode } from "react";

export function PageIntro({
	eyebrow,
	title,
	description,
	children,
}: {
	eyebrow: string;
	title: ReactNode;
	description: string;
	children?: ReactNode;
}) {
	return (
		<section className="border-b bg-muted/20">
			<div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
				<div className="flex max-w-3xl flex-col items-start gap-5">
					<p className="font-medium text-muted-foreground text-sm">{eyebrow}</p>
					<h1 className="text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
						{title}
					</h1>
					<p className="text-lg text-muted-foreground">{description}</p>
					{children ? <div className="pt-1">{children}</div> : null}
				</div>
			</div>
		</section>
	);
}
