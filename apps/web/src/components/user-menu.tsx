"use client";
import { Button } from "@elvo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@elvo/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@elvo/ui/components/dropdown-menu";
import { Skeleton } from "@elvo/ui/components/skeleton";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
export default function UserMenu() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [accountOpen, setAccountOpen] = useState(false);
	const [signingOut, setSigningOut] = useState(false);
	async function signOut() {
		setSigningOut(true);
		try {
			const result = await authClient.signOut();
			if (result.error) throw new Error("Sign out failed");
			router.replace("/");
			router.refresh();
		} catch {
			toast.error("Could not sign out. Please try again.");
		} finally {
			setSigningOut(false);
		}
	}
	if (isPending) return <Skeleton className="h-9 w-24" />;
	if (!session)
		return (
			<Button nativeButton={false} render={<Link href="/login" />}>
				Sign in
			</Button>
		);
	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							disabled={signingOut}
							aria-label="User menu"
						/>
					}
				>
					<UserRound data-icon="inline-start" />
					<span className="hidden max-w-40 truncate sm:inline">
						{session.user.name}
					</span>
					<ChevronDown data-icon="inline-end" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-64">
					<DropdownMenuGroup>
						<DropdownMenuLabel className="truncate">
							{session.user.email}
						</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => setAccountOpen(true)}>
							<UserRound />
							Account
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={signOut}>
							<LogOut />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
			<Dialog open={accountOpen} onOpenChange={setAccountOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Account</DialogTitle>
						<DialogDescription>
							Your personal Elvo Links account.
						</DialogDescription>
					</DialogHeader>
					<dl className="grid gap-3 text-sm">
						<div>
							<dt className="text-muted-foreground">Name</dt>
							<dd className="break-words">{session.user.name}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Email</dt>
							<dd className="break-all">{session.user.email}</dd>
						</div>
					</dl>
				</DialogContent>
			</Dialog>
		</>
	);
}
