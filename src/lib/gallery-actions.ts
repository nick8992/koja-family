'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { canEditPerson, type SessionUser } from './permissions';
import { getSupabaseAdmin, PROFILE_PHOTOS_BUCKET } from './supabase';

const GALLERY_PREFIX = 'gallery';

async function requireSessionUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user as SessionUser | undefined;
  if (!u || !u.id) throw new Error('not_signed_in');
  return u;
}

export type GallerySignedUploadState =
  | { status: 'idle' }
  | {
      status: 'ok';
      signedUrl: string;
      publicUrl: string;
      contentType: string;
    }
  | { status: 'error'; message: string };

export async function createGalleryPhotoUploadUrlAction(
  _prev: GallerySignedUploadState,
  formData: FormData
): Promise<GallerySignedUploadState> {
  try {
    let user: SessionUser;
    try {
      user = await requireSessionUser();
    } catch {
      return { status: 'error', message: 'not_signed_in' };
    }

    const personId = Number(formData.get('personId'));
    if (!Number.isInteger(personId) || personId < 1) {
      return { status: 'error', message: 'bad_person' };
    }
    const allowed = await canEditPerson(Number(user.id), personId);
    if (!allowed) return { status: 'error', message: 'forbidden' };

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
    const key = `${GALLERY_PREFIX}/${personId}/${Date.now()}-${randomBytes(6).toString(
      'hex'
    )}.${ext}`;

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (err) {
      console.error('[gallery] supabase client missing env:', err);
      return { status: 'error', message: 'upload_failed' };
    }

    const { data, error } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .createSignedUploadUrl(key);
    if (error || !data) {
      console.error('[gallery] createSignedUploadUrl failed:', error);
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
    console.error('[gallery] createPhotoUploadUrl threw:', err);
    return { status: 'error', message: 'upload_failed' };
  }
}

export type GallerySaveState =
  | { status: 'idle' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

export async function saveGalleryPhotoAction(
  _prev: GallerySaveState,
  formData: FormData
): Promise<GallerySaveState> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return { status: 'error', message: 'not_signed_in' };
  }
  const personId = Number(formData.get('personId'));
  if (!Number.isInteger(personId) || personId < 1) {
    return { status: 'error', message: 'bad_person' };
  }
  const url = String(formData.get('url') ?? '').trim();
  if (!url || url.length > 2048 || !/^https?:\/\//.test(url)) {
    return { status: 'error', message: 'bad_url' };
  }
  const caption = String(formData.get('caption') ?? '').trim().slice(0, 500) || null;

  const allowed = await canEditPerson(Number(user.id), personId);
  if (!allowed) return { status: 'error', message: 'forbidden' };

  await db.execute(sql`
    INSERT INTO person_photos (person_id, uploaded_by_user, url, caption)
    VALUES (${personId}, ${Number(user.id)}, ${url}, ${caption})
  `);

  revalidatePath(`/profile/${personId}`);
  return { status: 'ok' };
}

export async function removeGalleryPhotoAction(formData: FormData): Promise<void> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return;
  }
  const photoId = Number(formData.get('photoId'));
  if (!Number.isInteger(photoId) || photoId < 1) return;

  // Uploader can delete their own. Anyone with edit rights on the
  // person (3-gen or admin) can remove from the gallery. Admin bypass.
  const rows = await db.execute<{
    person_id: number;
    uploaded_by_user: number | null;
    url: string;
  }>(sql`
    SELECT person_id, uploaded_by_user, url
      FROM person_photos WHERE id = ${photoId}
  `);
  const row = (rows as unknown as {
    person_id: number;
    uploaded_by_user: number | null;
    url: string;
  }[])[0];
  if (!row) return;

  const me = Number(user.id);
  const canEdit = await canEditPerson(me, row.person_id);
  if (!canEdit && row.uploaded_by_user !== me && user.role !== 'admin') return;

  await db.execute(sql`DELETE FROM person_photos WHERE id = ${photoId}`);

  // Best-effort: remove the file from Supabase Storage.
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

  revalidatePath(`/profile/${row.person_id}`);
}
