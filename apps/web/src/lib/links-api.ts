export type ShortLink = {
	code: string;
	title: string | null;
	destination: string;
	shortUrl: string;
	createdAt: string;
};

export type LinkQuota = {
	used: number;
	limit: number;
	remaining: number;
};

export type LinksSnapshot = {
	links: ShortLink[];
	quota: LinkQuota;
};

export type LinksApiErrorCode =
	| "INVALID_REQUEST"
	| "INVALID_URL"
	| "INVALID_TITLE"
	| "QUOTA_REACHED"
	| "RATE_LIMITED"
	| "UNAUTHORIZED";

export class LinksApiError extends Error {
	readonly code: LinksApiErrorCode | "UNKNOWN";
	readonly field?: string;
	readonly status: number;

	constructor(
		message: string,
		options: { code?: string; field?: string; status: number },
	) {
		super(message);
		this.name = "LinksApiError";
		this.code = (options.code as LinksApiErrorCode | undefined) ?? "UNKNOWN";
		this.field = options.field;
		this.status = options.status;
	}
}

function normalizeBaseUrl(value: string) {
	return value.replace(/\/+$/, "");
}

/**
 * Browser-facing API origin. An empty value means same-origin: on Vercel the
 * `/api/*` rewrite sends those requests to the server service, while local
 * development sets NEXT_PUBLIC_SERVER_URL to the API port.
 */
export function getApiBaseUrl() {
	return normalizeBaseUrl(process.env.NEXT_PUBLIC_SERVER_URL ?? "");
}

/**
 * API origin for server-side calls from route handlers and server components.
 * Prefer the internal service URL: Docker Compose sets SERVER_URL and Vercel
 * injects it through the `web` service binding. Falls back to the public URL.
 */
export function getServerApiBaseUrl() {
	const processEnv = typeof process === "undefined" ? undefined : process.env;
	if (typeof window === "undefined" && processEnv?.SERVER_URL) {
		return normalizeBaseUrl(processEnv.SERVER_URL);
	}
	return getApiBaseUrl();
}

type ErrorBody = {
	error?: {
		code?: string;
		field?: string;
		message?: string;
	};
};

async function parseResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as ErrorBody | null;
		throw new LinksApiError(
			body?.error?.message ?? "Something went wrong. Please try again.",
			{
				code: body?.error?.code,
				field: body?.error?.field,
				status: response.status,
			},
		);
	}
	return (await response.json()) as T;
}

export async function listLinks(options?: {
	cookie?: string;
}): Promise<LinksSnapshot> {
	const response = await fetch(`${getServerApiBaseUrl()}/api/links`, {
		cache: "no-store",
		credentials: options?.cookie ? "omit" : "include",
		headers: options?.cookie ? { cookie: options.cookie } : undefined,
	});
	return parseResponse<LinksSnapshot>(response);
}

export async function createShortLink(input: {
	destination: string;
	title?: string;
}): Promise<{ link: ShortLink; quota: LinkQuota }> {
	const response = await fetch(`${getApiBaseUrl()}/api/links`, {
		body: JSON.stringify(input),
		cache: "no-store",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});
	return parseResponse<{ link: ShortLink; quota: LinkQuota }>(response);
}
