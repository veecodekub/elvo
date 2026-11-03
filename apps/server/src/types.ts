import type { createAuth } from "@elvo/auth";
import type { EvlogVariables } from "evlog/hono";

export type SessionUser = {
	id: string;
	name: string;
	email: string;
	image?: string | null;
};

export type AuthSession = Awaited<
	ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>
>;

export type AuthSessionResolution = {
	session: AuthSession;
	resolvedIn: number;
	error?: true;
};

/** Shared Hono environment: evlog context plus the request-scoped session. */
export type AppEnv = EvlogVariables & {
	Variables: {
		authSessionResolution?: AuthSessionResolution;
		user: SessionUser;
	};
};
