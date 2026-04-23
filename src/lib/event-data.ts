import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type FamilyEvent = {
  id: number;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  announcementPostId: number | null;
  creator: {
    userId: number;
    personId: number;
    firstName: string;
    photoUrl: string | null;
    approved: boolean;
  };
  pendingForViewer: boolean;
};

type Row = {
  id: number;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  announcement_post_id: number | null;
  creator_user_id: number;
  creator_person_id: number;
  creator_first_name: string;
  creator_photo_url: string | null;
  creator_approved: boolean;
};

/**
 * Returns events whose start time is today or later.
 * Silent-limited-access: an unapproved creator's events are visible only
 * to them until approval.
 */
export async function getEvent(
  id: number,
  viewerUserId: number | null
): Promise<FamilyEvent | null> {
  const viewer = viewerUserId ?? 0;
  const rows = await db.execute<Row>(sql`
    SELECT e.id, e.title, e.description, e.starts_at, e.ends_at, e.location,
           e.announcement_post_id,
           e.creator_user_id,
           u.person_id                AS creator_person_id,
           p.first_name               AS creator_first_name,
           p.profile_photo_url        AS creator_photo_url,
           (u.approved_at IS NOT NULL) AS creator_approved
      FROM events e
      JOIN users u   ON u.id = e.creator_user_id
      JOIN persons p ON p.id = u.person_id
     WHERE e.id = ${id}
       AND e.deleted_at IS NULL
       AND (u.approved_at IS NOT NULL OR e.creator_user_id = ${viewer})
     LIMIT 1
  `);
  const arr = rows as unknown as Row[];
  if (arr.length === 0) return null;
  const r = arr[0];
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    location: r.location,
    announcementPostId: r.announcement_post_id,
    creator: {
      userId: r.creator_user_id,
      personId: r.creator_person_id,
      firstName: r.creator_first_name,
      photoUrl: r.creator_photo_url,
      approved: !!r.creator_approved,
    },
    pendingForViewer: !r.creator_approved && r.creator_user_id === viewerUserId,
  };
}

export async function loadUpcomingEvents(
  viewerUserId: number | null,
  limit = 50
): Promise<FamilyEvent[]> {
  const viewer = viewerUserId ?? 0;
  const rows = await db.execute<Row>(sql`
    SELECT e.id, e.title, e.description, e.starts_at, e.ends_at, e.location,
           e.announcement_post_id,
           e.creator_user_id,
           u.person_id                AS creator_person_id,
           p.first_name               AS creator_first_name,
           p.profile_photo_url        AS creator_photo_url,
           (u.approved_at IS NOT NULL) AS creator_approved
      FROM events e
      JOIN users u   ON u.id = e.creator_user_id
      JOIN persons p ON p.id = u.person_id
     WHERE e.deleted_at IS NULL
       AND e.starts_at >= NOW() - INTERVAL '1 day'
       AND (u.approved_at IS NOT NULL OR e.creator_user_id = ${viewer})
     ORDER BY e.starts_at ASC
     LIMIT ${limit}
  `);
  return (rows as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    location: r.location,
    announcementPostId: r.announcement_post_id,
    creator: {
      userId: r.creator_user_id,
      personId: r.creator_person_id,
      firstName: r.creator_first_name,
      photoUrl: r.creator_photo_url,
      approved: !!r.creator_approved,
    },
    pendingForViewer: !r.creator_approved && r.creator_user_id === viewerUserId,
  }));
}
