import type { Metadata } from "next";
import { Suspense } from "react";
import SignInForm from "@/components/sign-in-form";

export const metadata: Metadata = {
	title: "Sign in",
	description:
		"Sign in to Elvo Links with Google to create and manage short links.",
	robots: {
		index: false,
		follow: false,
	},
};

export default function LoginPage() {
	return (
		<main className="flex min-h-full items-center justify-center px-4 py-12 sm:py-20">
			<h1 className="sr-only">Sign in to Elvo Links</h1>
			<Suspense fallback={<p>Loading sign-in…</p>}>
				<SignInForm />
			</Suspense>
		</main>
	);
}
