-- Recursive ancestor chain: returns (id, depth) pairs starting with p itself at depth 0.
CREATE OR REPLACE FUNCTION ancestors_of(p INTEGER, max_depth INTEGER DEFAULT 50)
RETURNS TABLE(id INTEGER, depth INTEGER) AS $$
    WITH RECURSIVE chain AS (
        SELECT persons.id, 0 AS depth
          FROM persons WHERE persons.id = p
        UNION ALL
        SELECT parent.id, c.depth + 1
          FROM chain c
          JOIN persons child  ON child.id  = c.id
          JOIN persons parent ON parent.id = child.father_id
         WHERE c.depth < max_depth
    )
    SELECT chain.id, chain.depth FROM chain;
$$ LANGUAGE SQL STABLE;
--> statement-breakpoint

-- Permission: self + 3 generations up. Admin bypass.
CREATE OR REPLACE FUNCTION user_can_edit(u_id INTEGER, target_person_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    u_person INTEGER;
    u_role   VARCHAR(20);
BEGIN
    SELECT person_id, role INTO u_person, u_role FROM users WHERE id = u_id;
    IF u_role = 'admin' THEN RETURN TRUE; END IF;

    RETURN EXISTS (
        SELECT 1 FROM ancestors_of(u_person, 3) WHERE id = target_person_id
    );
END;
$$ LANGUAGE plpgsql STABLE;
--> statement-breakpoint

-- View: every person joined with their claim status
CREATE OR REPLACE VIEW person_with_claim AS
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
