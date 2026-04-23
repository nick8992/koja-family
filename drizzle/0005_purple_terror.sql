ALTER TABLE "comments" ADD COLUMN "photo_urls" text[];--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "announcement_post_id" bigint;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_announcement_post_id_posts_id_fk" FOREIGN KEY ("announcement_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;