ALTER TABLE "persons" ADD COLUMN "sibling_order" integer;--> statement-breakpoint

-- Push Nashat (Badri's child) to the rightmost slot among Badri's children.
-- NULL sibling_order sorts by id; a large explicit value always wins the
-- tiebreak via COALESCE(sibling_order, id) ordering.
UPDATE "persons"
   SET "sibling_order" = 1000000
 WHERE first_name = 'Nashat'
   AND father_id = 74;