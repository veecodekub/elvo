import { Suspense } from "react";
import SignInForm from "@/components/sign-in-form";
export default function LoginPage() {
	return (
		<main className="flex min-h-full items-center justify-center px-4 py-12 sm:py-20">
			<Suspense fallback={<p>Loading sign-in…</p>}>
				<SignInForm />
			</Suspense>
		</main>
	);
}
