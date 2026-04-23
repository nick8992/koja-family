'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { canEditPerson, type SessionUser } from './permissions';
import { getSupabaseAdmin, PROFILE_PHOTOS_BUCKET } from './supabase';

export type PhotoUploadState =
  | { status: 'idle' }
  | { status: 'ok'; url: string }
  | { status: 'error'; message: string };

const MAX_BYTES = 8 * 1024 * 1024; // 8MB server limit (after client compression)
// The client always re-encodes to WebP before upload, so that's the
// common-case type. Keep a few others allowed in case client-side
// compression had to bail out on an unusual source format.
const ALLOWED_TYPES = new Set([
  'image/webp',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/bmp',
  'image/tiff',
  '', // some iOS Safari / screenshot flows report an empty type
]);

async function requireSessionUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user as SessionUser | undefined;
  if (!u || !u.id) throw new Error('not_signed_in');
  return u;
}

export async function uploadProfilePhotoAction(
  _prev: PhotoUploadState,
  formData: FormData
): Promise<PhotoUploadState> {
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

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { status: 'error', message: 'no_file' };
  }
  if (file.size === 0) return { status: 'error', message: 'no_file' };
  if (file.size > MAX_BYTES) return { status: 'error', message: 'too_big' };
  if (!ALLOWED_TYPES.has(file.type)) {
    return { status: 'error', message: 'bad_type' };
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const key = `${personId}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;

  const supabase = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(key, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
  if (uploadErr) {
    console.error('[photo] upload failed:', uploadErr);
    return { status: 'error', message: 'upload_failed' };
  }

  const { data: publicData } = supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .getPublicUrl(key);
  const publicUrl = publicData.publicUrl;

  // Remove the previous photo (best effort — don't fail the write if it's gone)
  const existingRows = await db.execute<{ profile_photo_url: string | null }>(sql`
    SELECT profile_photo_url FROM persons WHERE id = ${personId} LIMIT 1
  `);
  const prev = (existingRows as unknown as { profile_photo_url: string | null }[])[0]
    ?.profile_photo_url;
  if (prev) {
    const prevKey = prev.split('/storage/v1/object/public/' + PROFILE_PHOTOS_BUCKET + '/')[1];
    if (prevKey) {
      await supabase.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .remove([prevKey])
        .catch((e) => console.warn('[photo] prev remove failed:', e));
    }
  }

  // Persist the URL. Approved users write through; unapproved users'
  // photo change would go to pending_edits — but for simplicity we write
  // through for the photo URL specifically (photos need to be visible
  // immediately for the uploader to see). Admins can reset later.
  await db.execute(sql`
    UPDATE persons SET profile_photo_url = ${publicUrl}, updated_at = NOW()
     WHERE id = ${personId}
  `);
  await db.execute(sql`
    INSERT INTO edit_history (person_id, edited_by_user, field_name, old_value, new_value)
    VALUES (${personId}, ${Number(user.id)}, 'profile_photo_url', ${prev}, ${publicUrl})
  `);
  await db.execute(sql`
    INSERT INTO person_photos (person_id, uploaded_by_user, url, caption)
    VALUES (${personId}, ${Number(user.id)}, ${publicUrl}, NULL)
  `);

  revalidatePath(`/profile/${personId}`);
  revalidatePath('/tree');
  revalidatePath('/');

  return { status: 'ok', url: publicUrl };
}

// Separate bucket folder for feed photos (keeps profile photos clean).
const FEED_PHOTOS_PREFIX = 'feed';

export type FeedPhotoUploadState =
  | { status: 'idle' }
  | { status: 'ok'; url: string }
  | { status: 'error'; message: string };

/**
 * Used by the feed composer / comment form. Uploads a single image file
 * and returns its public URL. Client typically calls this once per file,
 * collecting URLs before submitting the final post/comment.
 */
export async function uploadFeedPhotoAction(
  _prev: FeedPhotoUploadState,
  formData: FormData
): Promise<FeedPhotoUploadState> {
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

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { status: 'error', message: 'no_file' };
    }
    if (file.size === 0) return { status: 'error', message: 'no_file' };
    // Client compresses to ~2000px/85% WebP, usually < 500KB. 10MB ceiling
    // just to catch anything that slips through.
    if (file.size > 10 * 1024 * 1024) return { status: 'error', message: 'too_big' };
    if (!file.type.startsWith('image/')) {
      return { status: 'error', message: 'bad_type' };
    }

    const extFromType =
      file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/png'
        ? 'png'
        : 'jpg';
    const key = `${FEED_PHOTOS_PREFIX}/${Number(user.id)}/${Date.now()}-${randomBytes(6).toString(
      'hex'
    )}.${extFromType}`;

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (err) {
      console.error('[photo] supabase client missing env:', err);
      return { status: 'error', message: 'upload_failed' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(key, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
    if (uploadErr) {
      console.error(
        '[photo] feed upload failed:',
        uploadErr,
        'key=',
        key,
        'type=',
        file.type,
        'size=',
        file.size
      );
      return { status: 'error', message: 'upload_failed' };
    }

    const { data: publicData } = supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(key);
    return { status: 'ok', url: publicData.publicUrl };
  } catch (err) {
    // Last-resort catch so the global error boundary never gets triggered
    // by a photo upload. Logs still record the stack for debugging.
    console.error('[photo] uploadFeedPhoto threw:', err);
    return { status: 'error', message: 'upload_failed' };
  }
}

export async function removeProfilePhotoAction(
  _prev: PhotoUploadState,
  formData: FormData
): Promise<PhotoUploadState> {
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

  const existingRows = await db.execute<{ profile_photo_url: string | null }>(sql`
    SELECT profile_photo_url FROM persons WHERE id = ${personId} LIMIT 1
  `);
  const prev = (existingRows as unknown as { profile_photo_url: string | null }[])[0]
    ?.profile_photo_url;

  await db.execute(sql`
    UPDATE persons SET profile_photo_url = NULL, updated_at = NOW()
     WHERE id = ${personId}
  `);
  await db.execute(sql`
    INSERT INTO edit_history (person_id, edited_by_user, field_name, old_value, new_value)
    VALUES (${personId}, ${Number(user.id)}, 'profile_photo_url', ${prev}, NULL)
  `);

  if (prev) {
    const supabase = getSupabaseAdmin();
    const prevKey = prev.split('/storage/v1/object/public/' + PROFILE_PHOTOS_BUCKET + '/')[1];
    if (prevKey) {
      await supabase.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .remove([prevKey])
        .catch((e) => console.warn('[photo] remove failed:', e));
    }
  }

  revalidatePath(`/profile/${personId}`);
  revalidatePath('/tree');
  revalidatePath('/');

  return { status: 'ok', url: '' };
}
