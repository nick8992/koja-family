import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type GalleryPhoto = {
  id: number;
  url: string;
  caption: string | null;
  uploadedByUser: number | null;
  createdAt: string;
};

export async function loadPersonGallery(
  personId: number,
  limit = 60
): Promise<GalleryPhoto[]> {
  const rows = await db.execute<{
    id: number;
    url: string;
    caption: string | null;
    uploaded_by_user: number | null;
    created_at: string;
  }>(sql`
    SELECT pp.id, pp.url, pp.caption, pp.uploaded_by_user, pp.created_at
      FROM person_photos pp
      JOIN persons per ON per.id = pp.person_id
     WHERE pp.person_id = ${personId}
       AND (per.profile_photo_url IS NULL OR pp.url <> per.profile_photo_url)
     ORDER BY pp.created_at DESC
     LIMIT ${limit}
  `);
  return (rows as unknown as {
    id: number;
    url: string;
    caption: string | null;
    uploaded_by_user: number | null;
    created_at: string;
  }[]).map((r) => ({
    id: r.id,
    url: r.url,
    caption: r.caption,
    uploadedByUser: r.uploaded_by_user,
    createdAt: r.created_at,
  }));
}
