'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import type { SessionUser } from './permissions';
import { getSupabaseAdmin, PROFILE_PHOTOS_BUCKET } from './supabase';

const ALBUM_PREFIX = 'album';

async function requireSessionUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user as SessionUser | undefined;
  if (!u || !u.id) throw new Error('not_signed_in');
  return u;
}

export type AlbumSignedUploadState =
  | { status: 'idle' }
  | {
      status: 'ok';
      signedUrl: string;
      publicUrl: string;
      contentType: string;
    }
  | { status: 'error'; message: string };

export async function createAlbumPhotoUploadUrlAction(
  _prev: AlbumSignedUploadState,
  formData: FormData
): Promise<AlbumSignedUploadState> {
  try {
    let user: SessionUser;
    try {
      user = await requireSessionUser();
    } catch {
      return { status: 'error', message: 'not_signed_in' };
    }
    if (!user.approved && user.role !== 'admin') {
      return { status: 'error', message: 'forbidden' };
    }

    const contentTypeRaw = String(formData.get('contentType') ?? 'image/webp');
    const contentType = /^image\//.test(contentTypeRaw) ? contentTypeRaw : 'image/webp';
    const ext =
      contentType === 'image/webp'
        ? 'webp'
        : contentType === 'image/png'
        ? 'png'
        : contentType === 'image/gif'
        ? 'gif'
        : 'jpg';
    const key = `${ALBUM_PREFIX}/${Number(user.id)}/${Date.now()}-${randomBytes(6).toString(
      'hex'
    )}.${ext}`;

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (err) {
      console.error('[album] supabase client missing env:', err);
      return { status: 'error', message: 'upload_failed' };
    }

    const { data, error } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .createSignedUploadUrl(key);
    if (error || !data) {
      console.error('[album] createSignedUploadUrl failed:', error);
      return { status: 'error', message: 'upload_failed' };
    }

    let signedUrl = (data as { signedUrl?: string }).signedUrl ?? '';
    if (!signedUrl) {
      const path = (data as { path?: string }).path ?? key;
      const token = (data as { token?: string }).token ?? '';
      const base = process.env.SUPABASE_URL;
      signedUrl = `${base}/storage/v1/object/upload/sign/${PROFILE_PHOTOS_BUCKET}/${path}?token=${token}`;
    }

    const { data: publicData } = supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(key);

    return {
      status: 'ok',
      signedUrl,
      publicUrl: publicData.publicUrl,
      contentType,
    };
  } catch (err) {
    console.error('[album] createPhotoUploadUrl threw:', err);
    return { status: 'error', message: 'upload_failed' };
  }
}

export type AlbumSaveState =
  | { status: 'idle' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

export async function saveAlbumPhotoAction(
  _prev: AlbumSaveState,
  formData: FormData
): Promise<AlbumSaveState> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return { status: 'error', message: 'not_signed_in' };
  }
  if (!user.approved && user.role !== 'admin') {
    return { status: 'error', message: 'forbidden' };
  }

  const url = String(formData.get('url') ?? '').trim();
  if (!url || url.length > 2048 || !/^https?:\/\//.test(url)) {
    return { status: 'error', message: 'bad_url' };
  }
  const caption = String(formData.get('caption') ?? '').trim().slice(0, 2000) || null;

  await db.execute(sql`
    INSERT INTO album_photos (uploaded_by_user, url, caption)
    VALUES (${Number(user.id)}, ${url}, ${caption})
  `);

  revalidatePath('/album');
  return { status: 'ok' };
}

export async function removeAlbumPhotoAction(formData: FormData): Promise<void> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return;
  }
  if (user.role !== 'admin') return;

  const photoId = Number(formData.get('photoId'));
  if (!Number.isInteger(photoId) || photoId < 1) return;

  const rows = await db.execute<{ url: string }>(sql`
    SELECT url FROM album_photos WHERE id = ${photoId} AND deleted_at IS NULL
  `);
  const row = (rows as unknown as { url: string }[])[0];
  if (!row) return;

  await db.execute(sql`
    UPDATE album_photos SET deleted_at = NOW() WHERE id = ${photoId}
  `);

  try {
    const match = row.url.match(
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

  revalidatePath('/album');
}
