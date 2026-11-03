-- Keep old and new creation handlers on one rolling budget during deployment.
-- One DO statement makes the column, backfill and compatibility trigger atomic.
DO $migration$
BEGIN
	LOCK TABLE link_rate_limits IN ACCESS EXCLUSIVE MODE;

	ALTER TABLE link_rate_limits
		ADD COLUMN reservations timestamptz[] NOT NULL DEFAULT ARRAY[]::timestamptz[];

	UPDATE link_rate_limits
	SET reservations = array_fill(
		now(),
		ARRAY[LEAST(GREATEST(window_count, 0), 10)]
	);

	EXECUTE $definition$
		CREATE FUNCTION elvo_capture_legacy_link_reservation()
		RETURNS trigger AS $body$
		DECLARE
			active_reservations timestamptz[];
		BEGIN
			IF TG_OP = 'INSERT' THEN
				-- New handlers supply their reservation and leave the old count at zero.
				IF cardinality(NEW.reservations) > 0 OR NEW.window_count = 0 THEN
					RETURN NEW;
				END IF;
				active_reservations := ARRAY[]::timestamptz[];
			ELSE
				SELECT COALESCE(array_agg(reserved_at ORDER BY reserved_at), ARRAY[]::timestamptz[])
				INTO active_reservations
				FROM unnest(OLD.reservations) AS reserved_at
				WHERE reserved_at > now() - interval '60 seconds';
			END IF;

			IF cardinality(active_reservations) >= 10 THEN
				RETURN NULL;
			END IF;

			NEW.reservations := active_reservations || ARRAY[now()];
			RETURN NEW;
		END;
		$body$ LANGUAGE plpgsql
	$definition$;

	CREATE TRIGGER elvo_capture_legacy_link_reservation
		BEFORE INSERT OR UPDATE OF window_started_at, window_count
		ON link_rate_limits
		FOR EACH ROW EXECUTE FUNCTION elvo_capture_legacy_link_reservation();
END;
$migration$;
