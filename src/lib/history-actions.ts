'use server';

import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import type { SessionUser } from './permissions';
import { getSupabaseAdmin, PROFILE_PHOTOS_BUCKET } from './supabase';

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user as SessionUser | undefined;
  if (!u || !u.id) throw new Error('not_signed_in');
  if (u.role !== 'admin') throw new Error('forbidden');
  return u;
}

export type CreateHistoryState =
  | { status: 'idle' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

export async function createHistoryPostAction(
  _prev: CreateHistoryState,
  formData: FormData
): Promise<CreateHistoryState> {
  let user: SessionUser;
  try {
    user = await requireAdmin();
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'forbidden',
    };
  }

  const title = String(formData.get('title') ?? '').trim();
  if (title.length < 1 || title.length > 200) {
    return { status: 'error', message: 'bad_title' };
  }
  const body = String(formData.get('body') ?? '').trim();
  if (body.length < 1 || body.length > 20000) {
    return { status: 'error', message: 'bad_body' };
  }
  const photoUrlRaw = String(formData.get('photoUrl') ?? '').trim();
  const photoUrl =
    photoUrlRaw && /^https?:\/\//.test(photoUrlRaw) && photoUrlRaw.length <= 2048
      ? photoUrlRaw
      : null;

  try {
    await db.execute(sql`
      INSERT INTO family_history_posts (author_user_id, title, body, photo_url)
      VALUES (${Number(user.id)}, ${title}, ${body}, ${photoUrl})
    `);
  } catch (err) {
    console.error('[history] create failed:', err);
    return { status: 'error', message: 'generic' };
  }

  revalidatePath('/history');
  return { status: 'ok' };
}

export async function deleteHistoryPostAction(formData: FormData): Promise<void> {
  try {
    await requireAdmin();
  } catch {
    return;
  }
  const postId = Number(formData.get('postId'));
  if (!Number.isInteger(postId) || postId < 1) return;

  const rows = await db.execute<{ photo_url: string | null }>(sql`
    SELECT photo_url FROM family_history_posts
     WHERE id = ${postId} AND deleted_at IS NULL
  `);
  const row = (rows as unknown as { photo_url: string | null }[])[0];
  if (!row) return;

  await db.execute(sql`
    UPDATE family_history_posts SET deleted_at = NOW() WHERE id = ${postId}
  `);

  // Best-effort: strip the accompanying image from Supabase Storage.
  if (row.photo_url) {
    try {
      const match = row.photo_url.match(
        /\/storage\/v1\/object\/public\/profile-photos\/(.+)$/
      );
      if (match) {
        const supabase = getSupabaseAdmin();
        await supabase.storage
          .from(PROFILE_PHOTOS_BUCKET)
          .remove([match[1]])
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }

  revalidatePath('/history');
}
