import { createAuthClient } from "better-auth/react";

import { getServerApiBaseUrl } from "@/lib/links-api";

function withoutTrailingSlash(url: string) {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Auth API base URL. Server-side calls go through the internal service URL
 * (`SERVER_URL`), which Docker Compose sets and Vercel injects via the service
 * binding. Browsers call the configured public API origin, or same-origin
 * `/api/auth` when none is set (Vercel rewrites `/api/*` to the server).
 */
function getAuthBaseUrl() {
	const serverBaseUrl = getServerApiBaseUrl();
	if (serverBaseUrl) {
		return `${withoutTrailingSlash(serverBaseUrl)}/api/auth`;
	}

	if (typeof window !== "undefined") {
		return new URL("/api/auth", window.location.origin).toString();
	}

	// Reached only while collecting build output, before a request exists.
	return "/api/auth";
}

export const authClient = createAuthClient({
	baseURL: getAuthBaseUrl(),
});
