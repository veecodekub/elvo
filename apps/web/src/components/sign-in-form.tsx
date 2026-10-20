"use client";
import { Button } from "@elvo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@elvo/ui/components/card";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { GoogleIcon } from "./google-icon";

export default function SignInForm() {
	const params = useSearchParams();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	async function signIn() {
		setError("");
		setPending(true);
		try {
			const result = await authClient.signIn.social({
				provider: "google",
				callbackURL: `${window.location.origin}/dashboard`,
				errorCallbackURL: `${window.location.origin}/login?error=oauth`,
			});
			if (result.error) {
				setError("Google sign-in is unavailable. Please try again later.");
				setPending(false);
			}
		} catch {
			setError("Could not connect. Check your connection and try again.");
			setPending(false);
		}
	}
	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>Welcome to Elvo Links</CardTitle>
				<CardDescription>
					Sign in or create your personal account with Google.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{error || params.has("error") ? (
					<p role="alert" className="text-destructive text-sm">
						{error ||
							"Sign-in was cancelled or could not be completed. Please try again."}
					</p>
				) : null}
				<Button onClick={signIn} disabled={pending} aria-busy={pending}>
					<GoogleIcon data-icon="inline-start" />
					{pending ? "Connecting to Google…" : "Continue with Google"}
				</Button>
				<p className="text-muted-foreground text-xs">
					Short Links. Clean Experience.
				</p>
			</CardContent>
		</Card>
	);
}
