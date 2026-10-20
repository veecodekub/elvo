CREATE TABLE "link_daily_clicks" (
	"link_id" text,
	"day" date,
	"clicks" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "link_daily_clicks_pkey" PRIMARY KEY("link_id","day")
);
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "total_clicks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "link_daily_clicks_day_idx" ON "link_daily_clicks" ("day");--> statement-breakpoint
ALTER TABLE "link_daily_clicks" ADD CONSTRAINT "link_daily_clicks_link_id_links_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE;