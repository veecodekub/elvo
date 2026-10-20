type JsonLdData = Record<string, unknown> | readonly Record<string, unknown>[];

export function JsonLd({ data }: { data: JsonLdData }) {
	const json = JSON.stringify(data).replaceAll("<", "\\u003c");
	return (
		<script
			type="application/ld+json"
			// Structured data is generated from local content and escaped above.
			dangerouslySetInnerHTML={{ __html: json }}
		/>
	);
}
