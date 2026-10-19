import { getServerApiBaseUrl } from "@/lib/links-api";

export const dynamic = "force-dynamic";

/**
 * Public short links (`/<code>`). The API owns lookup, redirect, and the
 * "Link unavailable" page, so this route forwards the outcome unchanged.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ code: string }> },
) {
	const { code } = await params;
	const upstream = await fetch(
		`${getServerApiBaseUrl()}/${encodeURIComponent(code)}`,
		{
			cache: "no-store",
			redirect: "manual",
		},
	);

	if (upstream.status === 302) {
		const location = upstream.headers.get("location");
		if (location) {
			return new Response(null, {
				status: 302,
				headers: { "Cache-Control": "no-store", Location: location },
			});
		}
	}

	return new Response(await upstream.text(), {
		status: upstream.status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "text/html; charset=utf-8",
			"X-Robots-Tag": "noindex",
		},
	});
}
