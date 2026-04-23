CREATE TABLE "album_photos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uploaded_by_user" integer NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "album_photos" ADD CONSTRAINT "album_photos_uploaded_by_user_users_id_fk" FOREIGN KEY ("uploaded_by_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_album_created" ON "album_photos" USING btree ("created_at");