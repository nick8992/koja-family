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
    SELECT id, url, caption, uploaded_by_user, created_at
      FROM person_photos
     WHERE person_id = ${personId}
     ORDER BY created_at DESC
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
