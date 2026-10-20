import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DashboardPrototype from "./dashboard-prototype";

export const metadata: Metadata = {
	title: "Dashboard prototype",
	robots: {
		index: false,
		follow: false,
	},
};

export default function PrototypePage() {
	if (process.env.NODE_ENV === "production") notFound();
	return <DashboardPrototype />;
}
