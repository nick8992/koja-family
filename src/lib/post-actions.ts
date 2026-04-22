'use server';

import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import type { SessionUser } from './permissions';

async function requireSessionUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user as SessionUser | undefined;
  if (!u || !u.id) throw new Error('not_signed_in');
  return u;
}

const ALLOWED_KINDS = new Set(['general', 'story', 'business', 'announcement']);

export type CreatePostState =
  | { status: 'idle' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

export async function createPostAction(
  _prev: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return { status: 'error', message: 'not_signed_in' };
  }

  const body = String(formData.get('body') ?? '').trim();
  if (body.length < 1) return { status: 'error', message: 'empty' };
  if (body.length > 4000) return { status: 'error', message: 'too_long' };

  const kindRaw = String(formData.get('kind') ?? 'general');
  const kind = ALLOWED_KINDS.has(kindRaw) ? kindRaw : 'general';

  await db.execute(sql`
    INSERT INTO posts (author_user_id, body, kind)
    VALUES (${Number(user.id)}, ${body}, ${kind})
  `);

  revalidatePath('/feed');
  revalidatePath('/');
  return { status: 'ok' };
}

export async function deletePostAction(formData: FormData): Promise<void> {
  const user = await requireSessionUser();
  const postId = Number(formData.get('postId'));
  if (!Number.isInteger(postId) || postId < 1) return;

  // Authors can delete their own posts; admins can delete any.
  const rows = await db.execute<{ author_user_id: number }>(sql`
    SELECT author_user_id FROM posts WHERE id = ${postId} AND deleted_at IS NULL
  `);
  const post = (rows as unknown as { author_user_id: number }[])[0];
  if (!post) return;
  if (post.author_user_id !== Number(user.id) && user.role !== 'admin') return;

  await db.execute(sql`
    UPDATE posts SET deleted_at = NOW() WHERE id = ${postId}
  `);
  revalidatePath('/feed');
  revalidatePath('/');
}

export type CreateCommentState =
  | { status: 'idle' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

export async function createCommentAction(
  _prev: CreateCommentState,
  formData: FormData
): Promise<CreateCommentState> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return { status: 'error', message: 'not_signed_in' };
  }

  const postId = Number(formData.get('postId'));
  if (!Number.isInteger(postId) || postId < 1) {
    return { status: 'error', message: 'bad_post' };
  }
  const body = String(formData.get('body') ?? '').trim();
  if (body.length < 1) return { status: 'error', message: 'empty' };
  if (body.length > 2000) return { status: 'error', message: 'too_long' };

  const postRows = await db.execute<{ id: number }>(
    sql`SELECT id FROM posts WHERE id = ${postId} AND deleted_at IS NULL`
  );
  if ((postRows as unknown as unknown[]).length === 0) {
    return { status: 'error', message: 'bad_post' };
  }

  await db.execute(sql`
    INSERT INTO comments (post_id, author_user_id, body)
    VALUES (${postId}, ${Number(user.id)}, ${body})
  `);

  revalidatePath('/feed');
  return { status: 'ok' };
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  const user = await requireSessionUser();
  const commentId = Number(formData.get('commentId'));
  if (!Number.isInteger(commentId) || commentId < 1) return;

  // The commenter can delete their own comment; the post author can delete
  // any comment on their post; admins can delete anything.
  const rows = await db.execute<{
    id: number;
    post_id: number;
    comment_author: number;
    post_author: number;
  }>(sql`
    SELECT c.id,
           c.post_id,
           c.author_user_id AS comment_author,
           p.author_user_id AS post_author
      FROM comments c
      JOIN posts p ON p.id = c.post_id
     WHERE c.id = ${commentId} AND c.deleted_at IS NULL
  `);
  const row = (rows as unknown as {
    comment_author: number;
    post_author: number;
  }[])[0];
  if (!row) return;
  const me = Number(user.id);
  if (
    row.comment_author !== me &&
    row.post_author !== me &&
    user.role !== 'admin'
  ) {
    return;
  }

  await db.execute(sql`
    UPDATE comments SET deleted_at = NOW() WHERE id = ${commentId}
  `);
  revalidatePath('/feed');
}
