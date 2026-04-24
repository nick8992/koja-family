import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type HistoryPost = {
  id: number;
  title: string;
  body: string;
  photoUrl: string | null;
  createdAt: string;
  authorUserId: number;
  authorFirstName: string | null;
  authorPersonId: number | null;
};

export async function loadHistoryPosts(limit = 100): Promise<HistoryPost[]> {
  const rows = await db.execute<{
    id: number;
    title: string;
    body: string;
    photo_url: string | null;
    created_at: string;
    author_user_id: number;
    author_first_name: string | null;
    author_person_id: number | null;
  }>(sql`
    SELECT h.id, h.title, h.body, h.photo_url, h.created_at,
           h.author_user_id,
           per.first_name AS author_first_name,
           u.person_id    AS author_person_id
      FROM family_history_posts h
      JOIN users u   ON u.id  = h.author_user_id
      LEFT JOIN persons per ON per.id = u.person_id
     WHERE h.deleted_at IS NULL
     ORDER BY h.created_at DESC
     LIMIT ${limit}
  `);
  return (rows as unknown as {
    id: number;
    title: string;
    body: string;
    photo_url: string | null;
    created_at: string;
    author_user_id: number;
    author_first_name: string | null;
    author_person_id: number | null;
  }[]).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    photoUrl: r.photo_url,
    createdAt: r.created_at,
    authorUserId: r.author_user_id,
    authorFirstName: r.author_first_name,
    authorPersonId: r.author_person_id,
  }));
}
