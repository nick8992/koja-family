import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { loadAllPersons } from '@/lib/tree-data';
import { loadFeed, type FeedPost, type FeedComment } from '@/lib/feed-data';
import { relationship } from '@/lib/relationships';
import { getLanguage, tServer } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n/dictionary';
import { PostComposer } from '@/components/PostComposer';
import { CommentForm } from '@/components/CommentForm';
import { LikeButton } from '@/components/LikeButton';
import { PhotoGrid } from '@/components/PhotoGrid';
import {
  DeletePostButton,
  DeleteCommentButton,
} from '@/components/DeletePostButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Feed' };

type Viewer = {
  userId: number | null;
  personId: number | null;
  role: 'member' | 'admin' | null;
  approved: boolean;
  displayName: string;
  photoUrl: string | null;
};

function fmtTime(iso: string, lang: 'en' | 'ar'): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.max(0, Math.round((now - then) / 1000));
  if (secs < 60) return lang === 'ar' ? 'الآن' : 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return lang === 'ar' ? `منذ ${mins} دقيقة` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return lang === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return lang === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar' : 'en');
}

export default async function FeedPage() {
  const session = await auth();
  const sessionUser = session?.user as
    | {
        id?: string;
        personId?: number | null;
        role?: 'member' | 'admin';
        approved?: boolean;
        displayName?: string;
      }
    | undefined;

  const viewer: Viewer = sessionUser
    ? {
        userId: sessionUser.id ? Number(sessionUser.id) : null,
        personId: sessionUser.personId ?? null,
        role: sessionUser.role ?? 'member',
        approved: !!sessionUser.approved,
        displayName: sessionUser.displayName ?? '',
        photoUrl: null,
      }
    : {
        userId: null,
        personId: null,
        role: null,
        approved: false,
        displayName: '',
        photoUrl: null,
      };

  // Fetch viewer's photo for composer avatar
  if (viewer.personId) {
    const { db } = await import('@/db');
    const { sql } = await import('drizzle-orm');
    const rows = await db.execute<{ profile_photo_url: string | null; first_name: string }>(
      sql`SELECT profile_photo_url, first_name FROM persons WHERE id = ${viewer.personId}`
    );
    const r = (rows as unknown as { profile_photo_url: string | null; first_name: string }[])[0];
    if (r) {
      viewer.photoUrl = r.profile_photo_url;
      if (!viewer.displayName) viewer.displayName = r.first_name;
    }
  }

  const lang = await getLanguage();
  const [nodes, feed] = await Promise.all([
    loadAllPersons(),
    loadFeed(viewer.userId),
  ]);

  const byId = new Map<number, { id: number; fid: number | null }>();
  for (const n of nodes) byId.set(n.id, { id: n.id, fid: n.fid });

  function relLabel(authorPersonId: number): string | null {
    if (!viewer.personId) return null;
    if (viewer.personId === authorPersonId) return translate(lang, 'feed.you');
    const rel = relationship(byId, viewer.personId, authorPersonId, lang);
    if (rel.mrca == null) return translate(lang, 'profile.not_related');
    const your = translate(lang, 'profile.your');
    return your ? `${your} ${rel.directional}` : rel.directional;
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
        {await tServer('feed.title')}
      </h1>
      <p className="font-display mt-2 mb-8 text-base italic text-ink-muted sm:text-lg">
        {await tServer('feed.sub')}
      </p>

      {viewer.userId ? (
        <PostComposer
          viewer={{
            displayName: viewer.displayName || 'You',
            photoUrl: viewer.photoUrl,
            approved: viewer.approved,
          }}
        />
      ) : (
        <div className="mb-6 border border-border bg-cream p-5 text-center">
          <p className="font-display italic text-ink-muted">
            {await tServer('feed.signed_out')}{' '}
            <Link href="/login" className="not-italic font-medium text-terracotta-deep hover:underline">
              {await tServer('nav.login')}
            </Link>
          </p>
        </div>
      )}

      {feed.posts.length === 0 ? (
        <div className="border border-border bg-cream p-10 text-center">
          <p className="font-display italic text-ink-muted">
            {await tServer('feed.empty')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {feed.posts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              comments={feed.commentsByPost.get(post.id) ?? []}
              viewer={viewer}
              relLabelFor={relLabel}
              lang={lang}
              isFirst={i === 0}
              labels={{
                general: translate(lang, 'feed.kind.general'),
                story: translate(lang, 'feed.kind.story'),
                business: translate(lang, 'feed.kind.business'),
                announcement: translate(lang, 'feed.kind.announcement'),
                eventAnnouncement: translate(lang, 'feed.kind.event_announcement'),
                viewEvent: translate(lang, 'feed.view_event'),
                pendingPostNotice: translate(lang, 'feed.pending.post'),
                pendingCommentNotice: translate(lang, 'feed.pending.comment'),
                noComments: translate(lang, 'feed.no_comments'),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  comments,
  viewer,
  relLabelFor,
  lang,
  isFirst,
  labels,
}: {
  post: FeedPost;
  comments: FeedComment[];
  viewer: Viewer;
  relLabelFor: (authorPersonId: number) => string | null;
  lang: 'en' | 'ar';
  isFirst: boolean;
  labels: {
    general: string;
    story: string;
    business: string;
    announcement: string;
    eventAnnouncement: string;
    viewEvent: string;
    pendingPostNotice: string;
    pendingCommentNotice: string;
    noComments: string;
  };
}) {
  const rel = relLabelFor(post.author.personId);
  const canDelete =
    viewer.userId != null &&
    (viewer.role === 'admin' || viewer.userId === post.author.userId);

  const isEventPost = post.linkedEventId != null;
  const kindLabel =
    post.kind === 'general'
      ? null
      : post.kind === 'story'
      ? labels.story
      : post.kind === 'business'
      ? labels.business
      : post.kind === 'announcement'
      ? isEventPost
        ? labels.eventAnnouncement
        : labels.announcement
      : null;

  return (
    <article className="rounded-sm border border-border bg-cream p-5 shadow-sm">
      {post.pendingForViewer ? (
        <div className="mb-3 border-s-[3px] border-gold bg-parchment-deep px-3 py-1.5 text-xs italic text-ink-muted font-display">
          {labels.pendingPostNotice}
        </div>
      ) : null}
      <header className="flex items-center gap-3">
        <Link href={`/profile/${post.author.personId}`} className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-gold font-display text-base font-semibold text-cream"
            style={{
              background: post.author.photoUrl
                ? `url(${post.author.photoUrl}) center/cover`
                : 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))',
            }}
          >
            {post.author.photoUrl ? null : post.author.firstName[0]?.toUpperCase()}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold text-ink hover:text-terracotta-deep">
              {post.author.firstName}
            </span>
            {rel ? (
              <span className="text-xs italic text-ink-muted">{rel}</span>
            ) : null}
          </span>
        </Link>
        <span className="ms-auto font-display text-xs text-ink-muted">
          {fmtTime(post.createdAt, lang)}
        </span>
      </header>
      {kindLabel ? (
        <span className="font-display my-3 inline-block border border-border bg-parchment-deep px-2.5 py-0.5 text-[11px] tracking-widest uppercase text-ink-muted">
          {kindLabel}
        </span>
      ) : null}
      {post.body ? (
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
          {post.body}
        </p>
      ) : null}
      {post.photoUrls.length > 0 ? (
        <PhotoGrid urls={post.photoUrls} priority={isFirst} />
      ) : null}
      {post.linkedEventId != null ? (
        <Link
          href={`/events/${post.linkedEventId}`}
          className="font-display mt-3 inline-flex items-center gap-1.5 rounded-sm border border-olive-deep bg-olive-deep px-3 py-1.5 text-xs font-medium text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep"
        >
          {labels.viewEvent}
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-4 border-t border-dotted border-border pt-2">
        <LikeButton
          postId={post.id}
          likeCount={post.likeCount}
          viewerLiked={post.viewerLiked}
          signedIn={viewer.userId != null}
        />
        {canDelete ? <DeletePostButton postId={post.id} /> : <span />}
      </div>

      <div className="mt-3 pt-2">
        {comments.length === 0 ? (
          <p className="font-display text-xs italic text-ink-muted">
            {labels.noComments}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => {
              const cRel = relLabelFor(c.author.personId);
              const canDeleteC =
                viewer.userId != null &&
                (viewer.role === 'admin' ||
                  viewer.userId === c.author.userId ||
                  viewer.userId === post.author.userId);
              return (
                <li key={c.id} className="flex gap-2">
                  <Link
                    href={`/profile/${c.author.personId}`}
                    className="shrink-0"
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gold font-display text-xs font-semibold text-cream"
                      style={{
                        background: c.author.photoUrl
                          ? `url(${c.author.photoUrl}) center/cover`
                          : 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))',
                      }}
                    >
                      {c.author.photoUrl ? null : c.author.firstName[0]?.toUpperCase()}
                    </span>
                  </Link>
                  <div className="flex-1 rounded-sm border border-border bg-parchment px-3 py-2">
                    {c.pendingForViewer ? (
                      <div className="mb-1 text-[10px] italic text-ink-muted">
                        {labels.pendingCommentNotice}
                      </div>
                    ) : null}
                    <div className="flex items-baseline gap-2">
                      <Link
                        href={`/profile/${c.author.personId}`}
                        className="font-display text-sm font-semibold text-ink hover:text-terracotta-deep"
                      >
                        {c.author.firstName}
                      </Link>
                      {cRel ? (
                        <span className="text-[11px] italic text-ink-muted">
                          {cRel}
                        </span>
                      ) : null}
                      <span className="ms-auto font-display text-[11px] text-ink-muted">
                        {fmtTime(c.createdAt, lang)}
                      </span>
                    </div>
                    {c.body ? (
                      <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">
                        {c.body}
                      </p>
                    ) : null}
                    {c.photoUrls.length > 0 ? <PhotoGrid urls={c.photoUrls} /> : null}
                    {canDeleteC ? (
                      <div className="mt-1 flex justify-end">
                        <DeleteCommentButton commentId={c.id} />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {viewer.userId ? (
          <CommentForm
            postId={post.id}
            viewer={{
              displayName: viewer.displayName,
              photoUrl: viewer.photoUrl,
            }}
          />
        ) : null}
      </div>
    </article>
  );
}
