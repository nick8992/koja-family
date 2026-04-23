import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type AlbumPhoto = {
  id: number;
  url: string;
  caption: string | null;
  uploadedByUser: number;
  uploaderFirstName: string | null;
  uploaderPersonId: number | null;
  createdAt: string;
};

export async function loadAlbum(limit = 200): Promise<AlbumPhoto[]> {
  const rows = await db.execute<{
    id: number;
    url: string;
    caption: string | null;
    uploaded_by_user: number;
    uploader_first_name: string | null;
    uploader_person_id: number | null;
    created_at: string;
  }>(sql`
    SELECT ap.id, ap.url, ap.caption, ap.uploaded_by_user, ap.created_at,
           per.first_name AS uploader_first_name,
           u.person_id    AS uploader_person_id
      FROM album_photos ap
      JOIN users u   ON u.id  = ap.uploaded_by_user
      LEFT JOIN persons per ON per.id = u.person_id
     WHERE ap.deleted_at IS NULL
     ORDER BY ap.created_at DESC
     LIMIT ${limit}
  `);
  return (rows as unknown as {
    id: number;
    url: string;
    caption: string | null;
    uploaded_by_user: number;
    uploader_first_name: string | null;
    uploader_person_id: number | null;
    created_at: string;
  }[]).map((r) => ({
    id: r.id,
    url: r.url,
    caption: r.caption,
    uploadedByUser: r.uploaded_by_user,
    uploaderFirstName: r.uploader_first_name,
    uploaderPersonId: r.uploader_person_id,
    createdAt: r.created_at,
  }));
}
