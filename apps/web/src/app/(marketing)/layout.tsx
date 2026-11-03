import type { ReactNode } from "react";

import Footer from "@/components/footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
	return (
		<div className="relative isolate flex flex-1 flex-col">
			{children}
			<div className="relative z-10">
				<Footer />
			</div>
		</div>
	);
}
