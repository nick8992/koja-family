ALTER TABLE "persons" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "deleted_by_user" integer;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "deletion_batch_id" text;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_deleted_by_user_users_id_fk" FOREIGN KEY ("deleted_by_user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_persons_deletion_batch" ON "persons" USING btree ("deletion_batch_id");--> statement-breakpoint

-- Rebuild person_with_claim to filter soft-deleted rows. Everything
-- downstream (tree, profile, children, ancestors) uses this view, so
-- once a row is flagged deleted it disappears from the UI until undo.
DROP VIEW IF EXISTS person_with_claim;--> statement-breakpoint

CREATE VIEW person_with_claim AS
SELECT
    p.*,
    u.id           AS claimant_user_id,
    u.approved_at  AS claimant_approved_at,
    CASE
        WHEN u.id IS NULL                 THEN 'unclaimed'
        WHEN u.approved_at IS NULL
             AND u.rejected_at IS NULL    THEN 'pending'
        WHEN u.approved_at IS NOT NULL    THEN 'approved'
        ELSE 'rejected'
    END AS claim_status
FROM persons p
LEFT JOIN users u ON u.person_id = p.id
WHERE p.deleted_at IS NULL;
