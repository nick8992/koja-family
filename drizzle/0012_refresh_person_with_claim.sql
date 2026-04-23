-- The person_with_claim view was originally defined with SELECT p.* which
-- Postgres expands at creation time, so columns added later (birth_year,
-- death_year, sibling_order) never surfaced through the view. CREATE OR
-- REPLACE VIEW can only append columns at the end; since the new columns
-- fall in the middle of the natural column order, drop + recreate.
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
LEFT JOIN users u ON u.person_id = p.id;
