import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

/**
 * Every approved, active user except the actor gets an announcement
 * notification. Used for posts of kind='announcement' and for events
 * (which produce an announcement post as a side effect).
 */
export async function fanOutAnnouncementNotifications(args: {
  actorUserId: number;
  actorPersonId: number;
  actorFirstName: string;
  bodyPreview: string;
  link?: string;
}): Promise<void> {
  const { actorUserId, actorPersonId, actorFirstName, bodyPreview, link } = args;
  const preview = bodyPreview.length > 80 ? bodyPreview.slice(0, 77) + '\u2026' : bodyPreview;
  const message = `${actorFirstName} posted an announcement: ${preview}`;
  await db.execute(sql`
    INSERT INTO notifications (user_id, kind, message, link, actor_person_id)
    SELECT u.id, 'announcement', ${message}, ${link ?? '/feed'}, ${actorPersonId}
      FROM users u
     WHERE u.approved_at IS NOT NULL
       AND u.is_active = TRUE
       AND u.id <> ${actorUserId}
  `);
}

/**
 * Notify a post's author that someone liked it. No-op if the liker IS the author.
 */
export async function notifyPostLike(args: {
  postId: number;
  actorUserId: number;
  actorPersonId: number;
  actorFirstName: string;
}): Promise<void> {
  const { postId, actorUserId, actorPersonId, actorFirstName } = args;
  // Join to get the post author's user row and short-circuit if self-like.
  const rows = await db.execute<{ author_user_id: number }>(sql`
    SELECT author_user_id FROM posts WHERE id = ${postId} AND deleted_at IS NULL
  `);
  const post = (rows as unknown as { author_user_id: number }[])[0];
  if (!post) return;
  if (post.author_user_id === actorUserId) return;
  await db.execute(sql`
    INSERT INTO notifications (user_id, kind, message, link, actor_person_id)
    VALUES (
      ${post.author_user_id},
      'like',
      ${`${actorFirstName} liked your post`},
      '/feed',
      ${actorPersonId}
    )
  `);
}

/**
 * Notify a post's author that someone commented. No-op if commenter IS author.
 */
export async function notifyPostComment(args: {
  postId: number;
  actorUserId: number;
  actorPersonId: number;
  actorFirstName: string;
  commentBody: string;
}): Promise<void> {
  const { postId, actorUserId, actorPersonId, actorFirstName, commentBody } = args;
  const rows = await db.execute<{ author_user_id: number }>(sql`
    SELECT author_user_id FROM posts WHERE id = ${postId} AND deleted_at IS NULL
  `);
  const post = (rows as unknown as { author_user_id: number }[])[0];
  if (!post) return;
  if (post.author_user_id === actorUserId) return;
  const preview = commentBody.length > 80 ? commentBody.slice(0, 77) + '\u2026' : commentBody;
  const message = `${actorFirstName} commented on your post: ${preview}`;
  await db.execute(sql`
    INSERT INTO notifications (user_id, kind, message, link, actor_person_id)
    VALUES (
      ${post.author_user_id},
      'comment',
      ${message},
      '/feed',
      ${actorPersonId}
    )
  `);
}

export async function loadUnreadCount(userId: number): Promise<number> {
  const rows = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n FROM notifications
     WHERE user_id = ${userId} AND read_at IS NULL
  `);
  return Number((rows as unknown as { n: number }[])[0]?.n ?? 0);
}

export type NotificationItem = {
  id: number;
  kind: string;
  message: string;
  link: string | null;
  actorPersonId: number | null;
  actorFirstName: string | null;
  actorPhotoUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function loadNotifications(
  userId: number,
  limit = 60
): Promise<NotificationItem[]> {
  const rows = await db.execute<{
    id: number;
    kind: string;
    message: string;
    link: string | null;
    actor_person_id: number | null;
    actor_first_name: string | null;
    actor_photo_url: string | null;
    read_at: string | null;
    created_at: string;
  }>(sql`
    SELECT n.id, n.kind, n.message, n.link, n.actor_person_id, n.read_at, n.created_at,
           p.first_name AS actor_first_name,
           p.profile_photo_url AS actor_photo_url
      FROM notifications n
 LEFT JOIN persons p ON p.id = n.actor_person_id
     WHERE n.user_id = ${userId}
     ORDER BY n.created_at DESC
     LIMIT ${limit}
  `);
  return (rows as unknown as {
    id: number;
    kind: string;
    message: string;
    link: string | null;
    actor_person_id: number | null;
    actor_first_name: string | null;
    actor_photo_url: string | null;
    read_at: string | null;
    created_at: string;
  }[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    message: r.message,
    link: r.link,
    actorPersonId: r.actor_person_id,
    actorFirstName: r.actor_first_name,
    actorPhotoUrl: r.actor_photo_url,
    readAt: r.read_at,
    createdAt: r.created_at,
  }));
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  await db.execute(sql`
    UPDATE notifications SET read_at = NOW()
     WHERE user_id = ${userId} AND read_at IS NULL
  `);
}
