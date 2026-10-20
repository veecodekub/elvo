import type { SVGProps } from "react";

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.89c2.28-2.1 3.56-5.19 3.56-8.89Z"
				fill="#4285F4"
			/>
			<path
				d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.89-3.02c-1.08.72-2.45 1.15-4.04 1.15-3.11 0-5.75-2.1-6.69-4.93H1.29v3.12A12 12 0 0 0 12 24Z"
				fill="#34A853"
			/>
			<path
				d="M5.31 14.29a7.21 7.21 0 0 1 0-4.58V6.59H1.29a12 12 0 0 0 0 10.82l4.02-3.12Z"
				fill="#FBBC05"
			/>
			<path
				d="M12 4.75c1.76 0 3.34.61 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.59l4.02 3.12C6.25 6.85 8.89 4.75 12 4.75Z"
				fill="#EA4335"
			/>
		</svg>
	);
}
