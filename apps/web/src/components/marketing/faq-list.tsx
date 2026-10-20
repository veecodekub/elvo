import { ChevronDown } from "lucide-react";

import type { FaqItem } from "@/lib/faq";

export function FaqList({ items }: { items: readonly FaqItem[] }) {
	return (
		<div className="divide-y rounded-2xl border bg-card">
			{items.map((item) => (
				<details key={item.question} className="group px-5 py-4">
					<summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-sm [&::-webkit-details-marker]:hidden">
						{item.question}
						<ChevronDown
							aria-hidden="true"
							className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
						/>
					</summary>
					<p className="max-w-3xl pt-3 text-muted-foreground text-sm leading-7">
						{item.answer}
					</p>
				</details>
			))}
		</div>
	);
}
