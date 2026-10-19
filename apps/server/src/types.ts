import type { EvlogVariables } from "evlog/hono";

export type SessionUser = {
	id: string;
	name: string;
	email: string;
	image?: string | null;
};

/** Shared Hono environment: evlog context plus the signed-in user. */
export type AppEnv = EvlogVariables & {
	Variables: {
		user: SessionUser;
	};
};
