-- Migration 0007 only touched announcement posts currently linked via
-- events.announcement_post_id. Posts whose events were soft-deleted, or
-- whose link was missed by the earlier backfill, still have the stale
-- "See the full event..." footer. Strip it from every announcement post
-- that has it.

UPDATE posts
   SET body = regexp_replace(
     body,
     E'\\s*See the full event[^\\n]*$',
     '',
     'g'
   )
 WHERE kind = 'announcement'
   AND body ~ 'See the full event';
