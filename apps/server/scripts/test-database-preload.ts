import { neonConfig } from "@neondatabase/serverless";

import { assertIsolatedTestDatabase } from "./test-database-guard";

const target = assertIsolatedTestDatabase();
neonConfig.fetchEndpoint = target.endpoint;
