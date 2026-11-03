import type { Database } from "@elvo/db";
import { sql } from "drizzle-orm";

const FAILURE_FUNCTION = "verify_analytics_fail_daily";
const FIXTURE_LINK_ID =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type TriggerDatabase = Pick<Database, "execute">;

export async function installAnalyticsFailureTrigger(
	database: TriggerDatabase,
	linkId: string,
) {
	if (!FIXTURE_LINK_ID.test(linkId)) {
		throw new Error("The failure trigger requires a fixture link UUID");
	}

	await removeAnalyticsFailureTrigger(database);
	await database.execute(
		sql.raw(`
			CREATE FUNCTION ${FAILURE_FUNCTION}() RETURNS trigger AS $$
			BEGIN
				RAISE EXCEPTION 'simulated analytics recording failure';
			END;
			$$ LANGUAGE plpgsql
		`),
	);
	await database.execute(
		sql.raw(`
			CREATE TRIGGER ${FAILURE_FUNCTION}_trigger
			BEFORE INSERT OR UPDATE ON link_daily_clicks
			FOR EACH ROW WHEN (NEW.link_id = '${linkId}')
			EXECUTE FUNCTION ${FAILURE_FUNCTION}()
		`),
	);
}

export async function removeAnalyticsFailureTrigger(database: TriggerDatabase) {
	try {
		await database.execute(
			sql.raw(
				`DROP TRIGGER IF EXISTS ${FAILURE_FUNCTION}_trigger ON link_daily_clicks`,
			),
		);
	} finally {
		await database.execute(
			sql.raw(`DROP FUNCTION IF EXISTS ${FAILURE_FUNCTION}()`),
		);
	}
}
