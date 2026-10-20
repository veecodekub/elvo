import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import Dashboard from "./dashboard";
import DashboardQueryProvider from "./query-provider";

export const metadata: Metadata = {
	title: "Dashboard",
	description: "Manage your Elvo Links short links and click analytics.",
	robots: {
		index: false,
		follow: false,
	},
};

export default async function DashboardPage() {
	const session = await authClient.getSession({
		fetchOptions: {
			headers: await headers(),
			throw: true,
			cache: "no-store",
		},
	});

	if (!session?.user) {
		redirect("/login");
	}

	return (
		<DashboardQueryProvider>
			<Dashboard session={session} />
		</DashboardQueryProvider>
	);
}
