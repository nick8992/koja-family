import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { getEvent, type FamilyEvent } from '@/lib/event-data';
import { loadAllPersons } from '@/lib/tree-data';
import { relationship } from '@/lib/relationships';
import { getLanguage, tServer } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n/dictionary';
import { CommentForm } from '@/components/CommentForm';
import { DeleteEventButton } from '@/components/DeleteEventButton';
import { DeleteCommentButton } from '@/components/DeletePostButton';
import { PhotoGrid } from '@/components/PhotoGrid';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Event #${id}` };
}

type CommentOnEvent = {
  id: number;
  body: string;
  photo_urls: string[] | null;
  created_at: string;
  author_user_id: number;
  author_person_id: number;
  author_first_name: string;
  author_photo_url: string | null;
  author_approved: boolean;
};

function fmtEventTime(iso: string, lang: 'en' | 'ar'): string {
  const d = new Date(iso);
  const locale = lang === 'ar' ? 'ar' : 'en-US';
  return d.toLocaleString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

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

export default async function EventDetailPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id < 1) notFound();

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
  const viewerUserId = sessionUser?.id ? Number(sessionUser.id) : null;
  const viewerPersonId = sessionUser?.personId ?? null;
  const viewerRole = sessionUser?.role ?? null;

  const ev = await getEvent(id, viewerUserId);
  if (!ev) notFound();

  const lang = await getLanguage();

  // Pull viewer photo/display for the comment form avatar.
  let viewerPhoto: string | null = null;
  let viewerDisplay = sessionUser?.displayName ?? '';
  if (viewerPersonId) {
    const rows = await db.execute<{
      first_name: string;
      profile_photo_url: string | null;
    }>(
      sql`SELECT first_name, profile_photo_url FROM persons WHERE id = ${viewerPersonId}`
    );
    const r = (rows as unknown as { first_name: string; profile_photo_url: string | null }[])[0];
    if (r) {
      viewerPhoto = r.profile_photo_url;
      if (!viewerDisplay) viewerDisplay = r.first_name;
    }
  }

  // Comments attached to the event's announcement post (if any).
  let comments: CommentOnEvent[] = [];
  if (ev.announcementPostId != null) {
    const viewer = viewerUserId ?? 0;
    const rows = await db.execute<CommentOnEvent>(sql`
      SELECT c.id, c.body, c.photo_urls, c.created_at,
             c.author_user_id,
             u.person_id                AS author_person_id,
             p.first_name               AS author_first_name,
             p.profile_photo_url        AS author_photo_url,
             (u.approved_at IS NOT NULL) AS author_approved
        FROM comments c
        JOIN users u   ON u.id = c.author_user_id
        JOIN persons p ON p.id = u.person_id
       WHERE c.deleted_at IS NULL
         AND c.post_id = ${ev.announcementPostId}
         AND (u.approved_at IS NOT NULL OR c.author_user_id = ${viewer})
       ORDER BY c.created_at ASC
    `);
    comments = rows as unknown as CommentOnEvent[];
  }

  // Relationship labels for each commenter.
  const nodes = await loadAllPersons();
  const byId = new Map<number, { id: number; fid: number | null }>();
  for (const n of nodes) byId.set(n.id, { id: n.id, fid: n.fid });
  function relLabel(targetPersonId: number): string | null {
    if (!viewerPersonId) return null;
    if (viewerPersonId === targetPersonId) return translate(lang, 'feed.you');
    const r = relationship(byId, viewerPersonId, targetPersonId, lang);
    if (r.mrca == null) return translate(lang, 'profile.not_related');
    const your = translate(lang, 'profile.your');
    return your ? `${your} ${r.directional}` : r.directional;
  }

  const canDeleteEvent =
    viewerUserId != null &&
    (viewerRole === 'admin' || viewerUserId === ev.creator.userId);

  return (
    <div className="mx-auto max-w-[820px] px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/events"
        className="font-display mb-6 inline-block text-sm font-medium text-ink-muted hover:text-terracotta-deep"
      >
        ← {await tServer('events.back')}
      </Link>

      {/* HEADER */}
      <EventHeader ev={ev} lang={lang} canDelete={canDeleteEvent} />

      {/* COMMENTS */}
      <section className="mt-8 border border-border bg-cream p-5">
        <h2 className="font-display mb-4 text-xl font-medium text-ink">
          {await tServer('events.comments.title')}
        </h2>
        {comments.length === 0 ? (
          <p className="font-display text-sm italic text-ink-muted">
            {await tServer('events.comments.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {comments.map((c) => {
              const cRel = relLabel(c.author_person_id);
              const canDeleteC =
                viewerUserId != null &&
                (viewerRole === 'admin' ||
                  viewerUserId === c.author_user_id ||
                  viewerUserId === ev.creator.userId);
              return (
                <li key={c.id} className="flex gap-3 border-b border-dotted border-border pb-4 last:border-b-0 last:pb-0">
                  <Link href={`/profile/${c.author_person_id}`} className="shrink-0">
                    <span
                      className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-gold font-display text-sm font-semibold text-cream"
                      style={{
                        background: c.author_photo_url
                          ? `url(${c.author_photo_url}) center/cover`
                          : 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))',
                      }}
                    >
                      {c.author_photo_url ? null : c.author_first_name[0]?.toUpperCase()}
                    </span>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <Link
                        href={`/profile/${c.author_person_id}`}
                        className="font-display text-sm font-semibold text-ink hover:text-terracotta-deep"
                      >
                        {c.author_first_name}
                      </Link>
                      {cRel ? (
                        <span className="text-[11px] italic text-ink-muted">{cRel}</span>
                      ) : null}
                      <span className="ms-auto font-display text-[11px] text-ink-muted">
                        {fmtTime(c.created_at, lang)}
                      </span>
                    </div>
                    {c.body ? (
                      <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">
                        {c.body}
                      </p>
                    ) : null}
                    {c.photo_urls && c.photo_urls.length > 0 ? (
                      <PhotoGrid urls={c.photo_urls} />
                    ) : null}
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

        {viewerUserId && ev.announcementPostId ? (
          <div className="mt-6 border-t border-dotted border-border pt-4">
            <CommentForm
              postId={ev.announcementPostId}
              viewer={{
                displayName: viewerDisplay || 'You',
                photoUrl: viewerPhoto,
              }}
            />
          </div>
        ) : !viewerUserId ? (
          <div className="mt-5 border-t border-dotted border-border pt-4 text-center text-sm italic text-ink-muted font-display">
            {await tServer('events.comments.signed_out')}{' '}
            <Link href="/login" className="not-italic font-medium text-terracotta-deep hover:underline">
              {await tServer('nav.login')}
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}

async function EventHeader({
  ev,
  lang,
  canDelete,
}: {
  ev: FamilyEvent;
  lang: 'en' | 'ar';
  canDelete: boolean;
}) {
  const start = new Date(ev.startsAt);
  const end = ev.endsAt ? new Date(ev.endsAt) : null;
  const monthLabel = start
    .toLocaleString(lang === 'ar' ? 'ar' : 'en-US', { month: 'short' })
    .toUpperCase();

  return (
    <article className="border border-border bg-cream p-6 sm:p-8">
      <div className="flex items-start gap-5">
        <div className="flex w-20 shrink-0 flex-col items-center bg-olive-deep py-3 text-cream">
          <div className="font-display text-[11px] uppercase tracking-[1.5px] text-gold-light">
            {monthLabel}
          </div>
          <div className="font-display text-3xl font-medium leading-none">
            {start.getDate()}
          </div>
          <div className="font-display mt-0.5 text-[10px] text-gold-light">
            {start.getFullYear()}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {ev.title}
          </h1>
          <div className="font-display mt-1 text-sm text-ink-muted">
            {fmtEventTime(ev.startsAt, lang)}
            {end ? ` – ${fmtEventTime(ev.endsAt!, lang)}` : ''}
          </div>
          {ev.location ? (
            <div className="font-display mt-1 text-sm text-ink-muted">📍 {ev.location}</div>
          ) : null}
          <div className="font-display mt-3 text-[11px] italic text-ink-muted">
            {await tServer('events.organized_by')}{' '}
            <Link
              href={`/profile/${ev.creator.personId}`}
              className="not-italic text-terracotta-deep hover:underline"
            >
              {ev.creator.firstName}
            </Link>
          </div>
        </div>
        {canDelete ? (
          <div className="shrink-0">
            <DeleteEventButton eventId={ev.id} />
          </div>
        ) : null}
      </div>
      {ev.posterUrl ? (
        <div className="relative mt-5 aspect-[16/9] overflow-hidden border border-border bg-parchment-deep sm:aspect-[3/2]">
          <Image
            src={ev.posterUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="object-contain"
            quality={80}
            priority
          />
        </div>
      ) : null}
      {ev.description ? (
        <p className="mt-5 whitespace-pre-wrap border-t border-dotted border-border pt-5 text-[15px] leading-relaxed text-ink-soft">
          {ev.description}
        </p>
      ) : null}
    </article>
  );
}
