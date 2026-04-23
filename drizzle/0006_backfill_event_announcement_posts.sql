-- Backfill: for events created before the announcement_post_id column
-- was added, link each to an announcement post by the same creator near
-- the event's created_at. If none exists, synthesize a new announcement
-- post so the event has a comment surface on /events/[id] + /feed.
--
-- Idempotent: no-op if every event already has an announcement_post_id
-- (the prod DB was backfilled out-of-band before this migration landed).

DO $$
DECLARE
    ev RECORD;
    matched_id BIGINT;
    new_body TEXT;
BEGIN
    FOR ev IN
        SELECT id, title, description, location, starts_at,
               creator_user_id, created_at
          FROM events
         WHERE announcement_post_id IS NULL AND deleted_at IS NULL
    LOOP
        SELECT id INTO matched_id
          FROM posts
         WHERE author_user_id = ev.creator_user_id
           AND kind = 'announcement'
           AND deleted_at IS NULL
           AND created_at BETWEEN ev.created_at - INTERVAL '2 minutes'
                              AND ev.created_at + INTERVAL '2 minutes'
         ORDER BY ABS(EXTRACT(EPOCH FROM (created_at - ev.created_at))) ASC
         LIMIT 1;

        IF matched_id IS NULL THEN
            new_body :=
                ev.title || E'\n\n' ||
                'When: ' || TO_CHAR(ev.starts_at AT TIME ZONE 'UTC',
                                    'Dy, Mon FMDD, YYYY, FMHH12:MI AM') ||
                COALESCE(E'\nWhere: ' || ev.location, '') ||
                COALESCE(E'\n\n' || ev.description, '') ||
                E'\n\nSee the full event \u2192 /events/' || ev.id;
            INSERT INTO posts (author_user_id, body, kind)
            VALUES (ev.creator_user_id, new_body, 'announcement')
            RETURNING id INTO matched_id;
        END IF;

        UPDATE events SET announcement_post_id = matched_id WHERE id = ev.id;
    END LOOP;
END $$;
