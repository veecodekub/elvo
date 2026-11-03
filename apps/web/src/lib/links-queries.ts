import {
	type QueryClient,
	type QueryKey,
	queryOptions,
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";

import {
	getLinkAnalytics,
	type LinkAnalytics,
	type LinkQuota,
	type LinkStatusFilter,
	type LinksSnapshot,
	listLinks,
	type ShortLink,
	updateShortLink,
} from "@/lib/links-api";

export const LINKS_STALE_TIME_MS = 30_000;
export const ANALYTICS_POLL_MS = 30_000;

export type LinkListFilters = {
	query: string;
	status: LinkStatusFilter;
	page: number;
};

export type UpdateLinkInput = {
	title?: string | null;
	destination?: string;
	enabled?: boolean;
};

type UpdateLinkVariables = {
	code: string;
	input: UpdateLinkInput;
};

type ToggleLinkVariables = {
	code: string;
	enabled: boolean;
};

type ToggleRollbackContext = {
	previousEnabledByQuery: Array<{
		queryKey: QueryKey;
		enabled: boolean;
	}>;
};

type ToggleLinkMutationFn = (
	variables: ToggleLinkVariables,
) => Promise<{ link: ShortLink }>;

export type LinkToggleRequest = {
	link: ShortLink;
	enabled: boolean;
	undo?: boolean;
};

export function createLinkToggleController(
	execute: (request: LinkToggleRequest) => Promise<void>,
	onPendingChange: (code: string, pending: boolean) => void,
) {
	const pendingCodes = new Set<string>();
	const queuedUndo = new Map<string, LinkToggleRequest>();

	async function run(request: LinkToggleRequest) {
		try {
			await execute(request);
		} catch {
			// The caller owns error reporting. Continue with a queued Undo if present.
		}

		const code = request.link.code;
		const undoRequest = queuedUndo.get(code);
		if (undoRequest) {
			queuedUndo.delete(code);
			void run(undoRequest);
			return;
		}

		pendingCodes.delete(code);
		onPendingChange(code, false);
	}

	return {
		isPending(code: string) {
			return pendingCodes.has(code);
		},
		request(request: LinkToggleRequest) {
			const code = request.link.code;
			if (pendingCodes.has(code)) {
				if (request.undo) {
					queuedUndo.set(code, request);
				}
				return;
			}

			pendingCodes.add(code);
			onPendingChange(code, true);
			void run(request);
		},
	};
}

export const linkKeys = {
	all: ["links"] as const,
	lists: () => [...linkKeys.all, "list"] as const,
	list: (filters: LinkListFilters) =>
		[...linkKeys.lists(), filters.query, filters.status, filters.page] as const,
	analytics: (code: string) => [...linkKeys.all, "analytics", code] as const,
};

export function linksQueryOptions(filters: LinkListFilters) {
	return queryOptions({
		queryKey: linkKeys.list(filters),
		queryFn: ({ signal }) => listLinks({ ...filters, signal }),
		staleTime: LINKS_STALE_TIME_MS,
	});
}

export function linkAnalyticsQueryOptions(code: string | null) {
	return queryOptions({
		queryKey: linkKeys.analytics(code ?? ""),
		queryFn: ({ signal }) => {
			if (!code) {
				throw new Error("A link code is required for analytics.");
			}
			return getLinkAnalytics(code, { signal });
		},
		enabled: Boolean(code),
		staleTime: 0,
		refetchInterval: ANALYTICS_POLL_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: false,
	});
}

export function patchLinkInSnapshots(
	queryClient: QueryClient,
	code: string,
	changes: Partial<ShortLink>,
) {
	queryClient.setQueriesData<LinksSnapshot>(
		{ queryKey: linkKeys.lists() },
		(snapshot) => {
			if (!snapshot) return snapshot;
			let changed = false;
			const links = snapshot.links.map((link) => {
				if (link.code !== code) return link;
				changed = true;
				return { ...link, ...changes };
			});
			return changed ? { ...snapshot, links } : snapshot;
		},
	);
}

export function replaceLinkInSnapshots(
	queryClient: QueryClient,
	link: ShortLink,
) {
	queryClient.setQueriesData<LinksSnapshot>(
		{ queryKey: linkKeys.lists() },
		(snapshot) => {
			if (!snapshot) return snapshot;
			let changed = false;
			const links = snapshot.links.map((current) => {
				if (current.code !== link.code) return current;
				changed = true;
				return link;
			});
			return changed ? { ...snapshot, links } : snapshot;
		},
	);
	queryClient.setQueryData<LinkAnalytics>(
		linkKeys.analytics(link.code),
		(analytics) =>
			analytics
				? {
						...analytics,
						title: link.title,
						totalClicks: link.totalClicks,
					}
				: analytics,
	);
}

export function setQuotaInSnapshots(
	queryClient: QueryClient,
	quota: LinkQuota,
) {
	queryClient.setQueriesData<LinksSnapshot>(
		{ queryKey: linkKeys.lists() },
		(snapshot) => (snapshot ? { ...snapshot, quota } : snapshot),
	);
}

export function useUpdateLinkMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ code, input }: UpdateLinkVariables) =>
			updateShortLink(code, input),
		onSuccess: ({ link }) => {
			replaceLinkInSnapshots(queryClient, link);
		},
	});
}

export function useToggleLinkMutation() {
	const queryClient = useQueryClient();
	return useMutation(createToggleLinkMutationOptions(queryClient));
}

export function createToggleLinkMutationOptions(
	queryClient: QueryClient,
	mutationFn: ToggleLinkMutationFn = ({ code, enabled }) =>
		updateShortLink(code, { enabled }),
): UseMutationOptions<
	{ link: ShortLink },
	Error,
	ToggleLinkVariables,
	ToggleRollbackContext
> {
	return {
		mutationFn,
		onMutate: async ({ code, enabled }) => {
			await queryClient.cancelQueries({ queryKey: linkKeys.lists() });
			const previousEnabledByQuery = queryClient
				.getQueriesData<LinksSnapshot>({ queryKey: linkKeys.lists() })
				.flatMap(([queryKey, snapshot]) => {
					const link = snapshot?.links.find((current) => current.code === code);
					return link ? [{ queryKey, enabled: link.enabled }] : [];
				});
			patchLinkInSnapshots(queryClient, code, { enabled });
			return { previousEnabledByQuery } satisfies ToggleRollbackContext;
		},
		onError: (_error, variables, context) => {
			if (!context) return;
			for (const { queryKey, enabled } of context.previousEnabledByQuery) {
				queryClient.setQueryData<LinksSnapshot>(queryKey, (snapshot) => {
					if (!snapshot) return snapshot;
					let changed = false;
					const links = snapshot.links.map((link) => {
						if (link.code !== variables.code) return link;
						changed = true;
						return { ...link, enabled };
					});
					return changed ? { ...snapshot, links } : snapshot;
				});
			}
		},
		onSuccess: ({ link }) => {
			replaceLinkInSnapshots(queryClient, link);
		},
	};
}
