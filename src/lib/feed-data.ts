import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type PostKind = 'general' | 'story' | 'business' | 'announcement';

export type FeedPost = {
  id: number;
  body: string;
  kind: PostKind;
  photoUrls: string[];
  createdAt: string;
  author: {
    userId: number;
    personId: number;
    firstName: string;
    photoUrl: string | null;
    approved: boolean;
  };
  pendingForViewer: boolean;
  likeCount: number;
  viewerLiked: boolean;
  /** If this post is an announcement for an event, the event id. */
  linkedEventId: number | null;
};

export type FeedComment = {
  id: number;
  postId: number;
  body: string;
  photoUrls: string[];
  createdAt: string;
  author: {
    userId: number;
    personId: number;
    firstName: string;
    photoUrl: string | null;
    approved: boolean;
  };
  pendingForViewer: boolean;
};

type PostRow = {
  id: number;
  body: string;
  kind: PostKind;
  photo_urls: string[] | null;
  created_at: string;
  author_user_id: number;
  author_person_id: number;
  author_first_name: string;
  author_photo_url: string | null;
  author_approved: boolean;
  like_count: number;
  viewer_liked: boolean;
  linked_event_id: number | null;
};

type CommentRow = {
  id: number;
  post_id: number;
  body: string;
  photo_urls: string[] | null;
  created_at: string;
  author_user_id: number;
  author_person_id: number;
  author_first_name: string;
  author_photo_url: string | null;
  author_approved: boolean;
};

/**
 * Silent-limited-access feed. Approved authors' posts show to everyone;
 * an unapproved author sees only their own post in the feed (others don't
 * see it at all).
 */
export async function loadFeed(
  viewerUserId: number | null,
  limit = 60
): Promise<{ posts: FeedPost[]; commentsByPost: Map<number, FeedComment[]> }> {
  const viewer = viewerUserId ?? 0;
  const postRows = await db.execute<PostRow>(sql`
    SELECT p.id, p.body, p.kind, p.photo_urls, p.created_at,
           p.author_user_id,
           u.person_id                AS author_person_id,
           per.first_name             AS author_first_name,
           per.profile_photo_url      AS author_photo_url,
           (u.approved_at IS NOT NULL) AS author_approved,
           (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
           EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ${viewer}) AS viewer_liked,
           (SELECT e.id FROM events e
             WHERE e.announcement_post_id = p.id AND e.deleted_at IS NULL
             LIMIT 1) AS linked_event_id
      FROM posts p
      JOIN users u   ON u.id  = p.author_user_id
      JOIN persons per ON per.id = u.person_id
     WHERE p.deleted_at IS NULL
       AND (u.approved_at IS NOT NULL OR p.author_user_id = ${viewer})
     ORDER BY p.created_at DESC
     LIMIT ${limit}
  `);
  const posts = (postRows as unknown as PostRow[]).map((r) => ({
    id: r.id,
    body: r.body,
    kind: r.kind,
    photoUrls: r.photo_urls ?? [],
    createdAt: r.created_at,
    author: {
      userId: r.author_user_id,
      personId: r.author_person_id,
      firstName: r.author_first_name,
      photoUrl: r.author_photo_url,
      approved: !!r.author_approved,
    },
    pendingForViewer:
      !r.author_approved && r.author_user_id === viewerUserId,
    likeCount: Number(r.like_count ?? 0),
    viewerLiked: !!r.viewer_liked,
    linkedEventId: r.linked_event_id,
  }));

  const commentsByPost = new Map<number, FeedComment[]>();
  if (posts.length === 0) return { posts, commentsByPost };

  const postIds = posts.map((p) => p.id);
  // Build an explicit IN (...) clause — drizzle doesn't serialize a JS
  // array as a native Postgres array literal, so ANY($array) fails with
  // "malformed array literal". sql.join expands to a parameter per value.
  const idList = sql.join(
    postIds.map((id) => sql`${id}`),
    sql`, `
  );
  const commentRows = await db.execute<CommentRow>(sql`
    SELECT c.id, c.post_id, c.body, c.photo_urls, c.created_at,
           c.author_user_id,
           u.person_id                AS author_person_id,
           per.first_name             AS author_first_name,
           per.profile_photo_url      AS author_photo_url,
           (u.approved_at IS NOT NULL) AS author_approved
      FROM comments c
      JOIN users u   ON u.id  = c.author_user_id
      JOIN persons per ON per.id = u.person_id
     WHERE c.deleted_at IS NULL
       AND c.post_id IN (${idList})
       AND (u.approved_at IS NOT NULL OR c.author_user_id = ${viewer})
     ORDER BY c.created_at ASC
  `);
  for (const r of commentRows as unknown as CommentRow[]) {
    const list = commentsByPost.get(r.post_id) ?? [];
    list.push({
      id: r.id,
      postId: r.post_id,
      body: r.body,
      photoUrls: r.photo_urls ?? [],
      createdAt: r.created_at,
      author: {
        userId: r.author_user_id,
        personId: r.author_person_id,
        firstName: r.author_first_name,
        photoUrl: r.author_photo_url,
        approved: !!r.author_approved,
      },
      pendingForViewer: !r.author_approved && r.author_user_id === viewerUserId,
    });
    commentsByPost.set(r.post_id, list);
  }

  return { posts, commentsByPost };
}
