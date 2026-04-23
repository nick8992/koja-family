-- Notes aren't rendered anywhere in the UI anymore; wipe them so the
-- old "Spelling uncertain" / "Corrected from ..." / etc. text stops
-- showing up in any future admin view. The column stays in the schema
-- in case we want to repurpose it.

UPDATE persons SET notes = NULL WHERE notes IS NOT NULL;
