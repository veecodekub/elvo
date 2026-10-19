import { createAuth } from "@elvo/auth";
import { createDb } from "@elvo/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
