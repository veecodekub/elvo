import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

const JSON_MEDIA_TYPE = /^application\/[a-z0-9][a-z0-9!#$&^_.+-]*\+json$/i;

export function isSupportedJsonContentType(value: string | undefined): boolean {
	if (!value) return false;
	const mediaType = value.split(";", 1)[0]?.trim().toLowerCase();
	return (
		mediaType === "application/json" ||
		Boolean(mediaType?.match(JSON_MEDIA_TYPE))
	);
}

function parseOrigin(value: string, allowPath: boolean): string | null {
	try {
		const url = new URL(value);
		if (
			(url.protocol !== "http:" && url.protocol !== "https:") ||
			url.username ||
			url.password ||
			(!allowPath &&
				(url.pathname !== "/" || url.search.length > 0 || url.hash.length > 0))
		) {
			return null;
		}
		return url.origin;
	} catch {
		return null;
	}
}

/**
 * Validates browser-provided origins while allowing command-line and server
 * clients that send JSON but omit Origin and Referer headers.
 */
export function isTrustedRequestOrigin(
	originHeader: string | undefined,
	refererHeader: string | undefined,
	requestOrigin: string,
	trustedOrigins: readonly string[],
): boolean {
	const requestSource = originHeader ?? refererHeader;
	if (!requestSource) return true;

	const sourceOrigin = parseOrigin(requestSource, originHeader === undefined);
	if (!sourceOrigin) return false;

	const allowedOrigins = [requestOrigin, ...trustedOrigins]
		.map((origin) => parseOrigin(origin, false))
		.filter((origin): origin is string => origin !== null);
	return allowedOrigins.includes(sourceOrigin);
}

export function createTrustedJsonMutationMiddleware(
	trustedOrigins: readonly string[],
): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		if (
			!isTrustedRequestOrigin(
				c.req.header("origin"),
				c.req.header("referer"),
				new URL(c.req.url).origin,
				trustedOrigins,
			)
		) {
			return c.json(
				{
					error: {
						code: "FORBIDDEN",
						message: "This request origin is not allowed.",
					},
				},
				403,
			);
		}

		if (!isSupportedJsonContentType(c.req.header("content-type"))) {
			return c.json(
				{
					error: {
						code: "INVALID_REQUEST",
						message: "Send the request body as JSON.",
					},
				},
				415,
			);
		}

		await next();
	};
}
