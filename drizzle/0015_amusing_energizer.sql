CREATE TABLE "family_history_posts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"author_user_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "family_history_posts" ADD CONSTRAINT "family_history_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_history_created" ON "family_history_posts" USING btree ("created_at");