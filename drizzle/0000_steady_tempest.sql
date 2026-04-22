CREATE TABLE "admin_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"kind" varchar(30) NOT NULL,
	"message" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"author_user_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "edit_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"edited_by_user" integer,
	"field_name" varchar(50) NOT NULL,
	"old_value" text,
	"new_value" text,
	"edited_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_user_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"location" varchar(300),
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"token" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pending_edits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"field_name" varchar(50) NOT NULL,
	"new_value" text,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now(),
	"resolved_at" timestamp with time zone,
	"resolved_by" integer,
	CONSTRAINT "pending_edits_status_check" CHECK ("pending_edits"."status" IN ('pending', 'applied', 'rejected', 'discarded'))
);
--> statement-breakpoint
CREATE TABLE "person_photos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"uploaded_by_user" integer,
	"url" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" serial PRIMARY KEY NOT NULL,
	"father_id" integer,
	"mother_id" integer,
	"spouse_id" integer,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) DEFAULT 'Koja',
	"name_arabic" varchar(200),
	"gender" char(1) DEFAULT 'M',
	"birth_date" date,
	"death_date" date,
	"is_deceased" boolean DEFAULT false,
	"birthplace" varchar(200),
	"current_location" varchar(200),
	"occupation" varchar(200),
	"bio" text,
	"profile_photo_url" text,
	"phone" varchar(30),
	"phone_public" boolean DEFAULT false,
	"email" varchar(255),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "persons_gender_check" CHECK ("persons"."gender" IN ('M', 'F'))
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"author_user_id" integer NOT NULL,
	"body" text NOT NULL,
	"kind" varchar(20) DEFAULT 'general',
	"photo_urls" text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	"visible" boolean DEFAULT true,
	CONSTRAINT "posts_kind_check" CHECK ("posts"."kind" IN ('general', 'business', 'story', 'announcement'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30),
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'member',
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"is_active" boolean DEFAULT true,
	CONSTRAINT "users_person_id_unique" UNIQUE("person_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('member', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_edited_by_user_users_id_fk" FOREIGN KEY ("edited_by_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_edits" ADD CONSTRAINT "pending_edits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_edits" ADD CONSTRAINT "pending_edits_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_edits" ADD CONSTRAINT "pending_edits_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_photos" ADD CONSTRAINT "person_photos_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_photos" ADD CONSTRAINT "person_photos_uploaded_by_user_users_id_fk" FOREIGN KEY ("uploaded_by_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_father_id_persons_id_fk" FOREIGN KEY ("father_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_mother_id_persons_id_fk" FOREIGN KEY ("mother_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_spouse_id_persons_id_fk" FOREIGN KEY ("spouse_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comments_post" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_edit_history_person" ON "edit_history" USING btree ("person_id","edited_at");--> statement-breakpoint
CREATE INDEX "idx_events_time" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "idx_pending_user" ON "pending_edits" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_persons_father" ON "persons" USING btree ("father_id");--> statement-breakpoint
CREATE INDEX "idx_persons_name" ON "persons" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX "idx_posts_feed" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");