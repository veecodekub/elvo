import type { ReactNode } from "react";

import Footer from "@/components/footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-1 flex-col">
			{children}
			<Footer />
		</div>
	);
}
