-- Drop the trailing "See the full event \u2192 /events..." footer from any
-- announcement post body where it appears. The feed now renders a real
-- "View event \u2192" button below event-linked posts, so the URL text in the
-- body is redundant (and the old text often pointed at /events without
-- the id anyway).
--
-- Only touches announcement-kind posts that are linked to an event via
-- events.announcement_post_id, so general announcement posts that happen
-- to mention the string aren't accidentally rewritten.

UPDATE posts p
   SET body = regexp_replace(
     p.body,
     E'\\s*See the full event[^\\n]*$',
     '',
     'g'
   )
 WHERE p.kind = 'announcement'
   AND p.id IN (SELECT announcement_post_id FROM events WHERE announcement_post_id IS NOT NULL)
   AND p.body ~ 'See the full event';
