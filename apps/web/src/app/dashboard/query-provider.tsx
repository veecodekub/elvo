"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";

let browserQueryClient: QueryClient | undefined;

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				staleTime: 30_000,
			},
			mutations: {
				retry: false,
			},
		},
	});
}

function getQueryClient() {
	if (typeof window === "undefined") {
		return createQueryClient();
	}
	browserQueryClient ??= createQueryClient();
	return browserQueryClient;
}

export default function DashboardQueryProvider({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<QueryClientProvider client={getQueryClient()}>
			{children}
			{process.env.NODE_ENV === "development" ? (
				<ReactQueryDevtools initialIsOpen={false} />
			) : null}
		</QueryClientProvider>
	);
}
