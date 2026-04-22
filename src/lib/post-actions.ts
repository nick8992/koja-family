'use server';

import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import type { SessionUser } from './permissions';
import {
  fanOutAnnouncementNotifications,
  notifyPostLike,
  notifyPostComment,
} from './notifications';

async function actorPersonInfo(user: SessionUser): Promise<{
  personId: number;
  firstName: string;
} | null> {
  if (!user.personId) return null;
  const rows = await db.execute<{ first_name: string }>(
    sql`SELECT first_name FROM persons WHERE id = ${user.personId} LIMIT 1`
  );
  const row = (rows as unknown as { first_name: string }[])[0];
  if (!row) return null;
  return { personId: user.personId, firstName: row.first_name };
}

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

  // Fan out notifications only for announcements from approved users.
  // Unapproved users' announcements are invisible to others anyway, so
  // don't spam inboxes about a pending post.
  if (kind === 'announcement' && user.approved) {
    try {
      const actor = await actorPersonInfo(user);
      if (actor) {
        await fanOutAnnouncementNotifications({
          actorUserId: Number(user.id),
          actorPersonId: actor.personId,
          actorFirstName: actor.firstName,
          bodyPreview: body,
        });
      }
    } catch (err) {
      console.warn('[notifications] announcement fan-out failed:', err);
    }
  }

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

  // Notify the post author (if they're not the commenter).
  if (user.approved) {
    try {
      const actor = await actorPersonInfo(user);
      if (actor) {
        await notifyPostComment({
          postId,
          actorUserId: Number(user.id),
          actorPersonId: actor.personId,
          actorFirstName: actor.firstName,
          commentBody: body,
        });
      }
    } catch (err) {
      console.warn('[notifications] comment notify failed:', err);
    }
  }

  revalidatePath('/feed');
  return { status: 'ok' };
}

export async function toggleLikeAction(formData: FormData): Promise<void> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return;
  }
  const postId = Number(formData.get('postId'));
  if (!Number.isInteger(postId) || postId < 1) return;

  // Make sure the post exists and isn't deleted
  const postRows = await db.execute<{ id: number }>(
    sql`SELECT id FROM posts WHERE id = ${postId} AND deleted_at IS NULL`
  );
  if ((postRows as unknown as unknown[]).length === 0) return;

  // Toggle: if the row exists, delete; otherwise insert.
  const existing = await db.execute<{ id: number }>(
    sql`SELECT id FROM post_likes WHERE post_id = ${postId} AND user_id = ${Number(user.id)}`
  );
  const wasLiked = (existing as unknown as unknown[]).length > 0;
  if (wasLiked) {
    await db.execute(sql`
      DELETE FROM post_likes WHERE post_id = ${postId} AND user_id = ${Number(user.id)}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO post_likes (post_id, user_id)
      VALUES (${postId}, ${Number(user.id)})
      ON CONFLICT (post_id, user_id) DO NOTHING
    `);
    // Notify the post author on new likes only (not on unlike).
    if (user.approved) {
      try {
        const actor = await actorPersonInfo(user);
        if (actor) {
          await notifyPostLike({
            postId,
            actorUserId: Number(user.id),
            actorPersonId: actor.personId,
            actorFirstName: actor.firstName,
          });
        }
      } catch (err) {
        console.warn('[notifications] like notify failed:', err);
      }
    }
  }

  revalidatePath('/feed');
  revalidatePath('/');
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
