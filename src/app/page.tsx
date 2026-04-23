import Link from 'next/link';
import Image from 'next/image';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { loadFeed } from '@/lib/feed-data';
import { loadUpcomingEvents } from '@/lib/event-data';
import { getLanguage, tServer } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n/dictionary';

export const dynamic = 'force-dynamic';

type Stats = {
  total: number;
  generations: number;
  members: number;
  pending: number;
};

async function loadStats(): Promise<Stats> {
  const [row] = await db.execute<Stats>(sql`
    WITH RECURSIVE chain AS (
      SELECT id, 0 AS depth FROM persons WHERE father_id IS NULL
      UNION ALL
      SELECT p.id, c.depth + 1 FROM persons p JOIN chain c ON p.father_id = c.id
    )
    SELECT
      (SELECT COUNT(*)::int FROM persons) AS total,
      (SELECT MAX(depth) FROM chain)::int AS generations,
      (SELECT COUNT(*)::int FROM users WHERE approved_at IS NOT NULL) AS members,
      (SELECT COUNT(*)::int FROM users WHERE approved_at IS NULL AND rejected_at IS NULL) AS pending
  `);
  return row;
}

export default async function HomePage() {
  const session = await auth();
  const viewerUserId = session?.user?.id ? Number(session.user.id) : null;
  const lang = await getLanguage();
  const [stats, feed, events] = await Promise.all([
    loadStats(),
    loadFeed(viewerUserId, 3),
    loadUpcomingEvents(viewerUserId, 3),
  ]);

  return (
    <>
      {/* HERO */}
      <section
        className="relative border-b border-border px-4 pt-6 pb-8 text-center sm:px-8 sm:pt-20 sm:pb-16"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(58,79,42,0.08), transparent 60%), var(--color-parchment)',
        }}
      >
        <div
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-gold text-3xl text-gold-light sm:mb-6 sm:h-24 sm:w-24 sm:text-4xl"
          style={{
            background: 'var(--color-olive-deep)',
            boxShadow: 'inset 0 0 0 3px var(--color-olive-deep), 0 4px 20px rgba(0,0,0,0.25)',
            fontFamily: 'Amiri, serif',
          }}
        >
          ܩ
        </div>
        <h1 className="font-display mb-2 text-[clamp(2rem,6vw,4.5rem)] font-medium leading-none tracking-tight text-ink sm:mb-4">
          {await tServer('home.hero.title')}
        </h1>
        <p className="font-arabic mb-3 text-2xl text-terracotta-deep sm:mb-6 sm:text-3xl" dir="rtl">
          {await tServer('home.hero.arabic')}
        </p>
        <p className="font-display mx-auto mb-3 max-w-2xl text-base italic leading-snug text-ink-muted sm:mb-5 sm:text-xl sm:leading-relaxed">
          {await tServer('home.hero.tagline', { n: stats.total })}
        </p>
        <p className="font-display mx-auto mb-2 max-w-2xl text-[13px] leading-snug text-ink-soft sm:mb-3 sm:text-[15px] sm:leading-relaxed">
          {await tServer('home.hero.expand')}
        </p>
        <p className="font-display mx-auto mb-4 max-w-2xl text-[13px] leading-snug text-ink-soft sm:mb-8 sm:text-[15px] sm:leading-relaxed">
          <span className="italic text-ink-muted">
            {await tServer('home.hero.not_on_tree')}
          </span>{' '}
          <Link
            href="/request-addition"
            className="font-medium not-italic text-terracotta-deep underline-offset-4 hover:underline"
          >
            {await tServer('home.hero.request_link')}
          </Link>
        </p>
        <div className="inline-flex gap-2 sm:gap-3">
          <Link
            href="/tree"
            className="font-display rounded-sm border border-olive-deep bg-olive-deep px-4 py-2 text-sm font-medium tracking-wide text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep sm:px-7 sm:py-3 sm:text-[17px]"
          >
            {await tServer('home.hero.cta1')}
          </Link>
          <Link
            href="/feed"
            className="font-display rounded-sm border border-[var(--color-border-dark)] px-4 py-2 text-sm font-medium tracking-wide text-ink-soft transition-colors hover:bg-parchment-deep hover:text-olive-deep sm:px-7 sm:py-3 sm:text-[17px]"
          >
            {await tServer('home.hero.cta2')}
          </Link>
        </div>
        <div className="mt-4 flex items-center justify-center gap-3 text-border-dark sm:mt-10">
          <span className="h-px max-w-[120px] flex-1" style={{ background: 'linear-gradient(to right, transparent, var(--color-border-dark), transparent)' }} />
          <span className="text-lg text-gold">✦</span>
          <span className="text-lg text-gold">◆</span>
          <span className="text-lg text-gold">✦</span>
          <span className="h-px max-w-[120px] flex-1" style={{ background: 'linear-gradient(to right, transparent, var(--color-border-dark), transparent)' }} />
        </div>
      </section>

      {/* LANDING GRID */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-8 py-16 md:grid-cols-[2fr_1fr]">
        <div>
          <div className="font-display mb-2 flex items-center gap-4 text-3xl font-medium text-ink">
            {await tServer('home.feed.title')}
            <span className="h-px flex-1 bg-border" />
          </div>
          <p className="font-display mb-8 italic text-ink-muted">
            {await tServer('home.feed.sub')}
          </p>
          {feed.posts.length === 0 ? (
            <div className="rounded-sm border border-border bg-cream p-8 text-center">
              <p className="font-display italic text-ink-muted">
                {await tServer('home.feed.empty')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {feed.posts.map((post) => (
                <Link
                  key={post.id}
                  href="/feed"
                  className="block border border-border bg-cream p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-gold font-display text-sm font-semibold text-cream"
                      style={{
                        background: post.author.photoUrl
                          ? `url(${post.author.photoUrl}) center/cover`
                          : 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))',
                      }}
                    >
                      {post.author.photoUrl ? null : post.author.firstName[0]?.toUpperCase()}
                    </span>
                    <span className="font-display text-sm font-semibold text-ink">
                      {post.author.firstName}
                      {post.author.fatherFirstName || post.author.grandfatherFirstName ? (
                        <span className="font-normal text-ink-muted">
                          {post.author.fatherFirstName ? ` ${post.author.fatherFirstName}` : ''}
                          {post.author.grandfatherFirstName ? ` ${post.author.grandfatherFirstName}` : ''}
                        </span>
                      ) : null}
                    </span>
                    <span className="ms-auto font-display text-xs text-ink-muted">
                      {new Date(post.createdAt).toLocaleDateString(
                        lang === 'ar' ? 'ar' : 'en'
                      )}
                    </span>
                  </div>
                  {post.body ? (
                    <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-soft">
                      {post.body}
                    </p>
                  ) : null}
                  {post.photoUrls.length > 0 ? (
                    <div className="relative mt-3 aspect-[16/9] overflow-hidden border border-border bg-parchment-deep">
                      <Image
                        src={post.photoUrls[0]}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 520px"
                        className="object-cover"
                        quality={70}
                      />
                      {post.photoUrls.length > 1 ? (
                        <span className="font-display absolute bottom-2 end-2 rounded-sm bg-ink/80 px-2 py-0.5 text-xs text-cream">
                          +{post.photoUrls.length - 1}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              ))}
              <Link
                href="/feed"
                className="font-display self-start text-sm italic text-terracotta-deep hover:underline"
              >
                {await tServer('home.feed.more')}
              </Link>
            </div>
          )}
        </div>
        <aside>
          <div className="font-display mb-2 flex items-center gap-4 text-3xl font-medium text-ink">
            {await tServer('home.events.title')}
            <span className="h-px flex-1 bg-border" />
          </div>
          <p className="font-display mb-8 italic text-ink-muted">
            {await tServer('home.events.sub')}
          </p>
          {events.length === 0 ? (
            <div className="rounded-sm border border-border bg-cream p-6 text-center">
              <p className="font-display italic text-ink-muted">
                {await tServer('home.events.empty')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {events.map((ev) => {
                const d = new Date(ev.startsAt);
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="flex gap-3 border border-border bg-cream p-3.5 transition-colors hover:border-terracotta"
                  >
                    <div className="flex w-14 shrink-0 flex-col items-center justify-center bg-olive-deep px-1 py-2 text-cream">
                      <div className="font-display text-[10px] uppercase tracking-[1.5px] text-gold-light">
                        {d.toLocaleString(lang === 'ar' ? 'ar' : 'en', { month: 'short' })}
                      </div>
                      <div className="font-display text-2xl font-medium leading-none">
                        {d.getDate()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-display truncate text-base font-medium text-ink">
                        {ev.title}
                      </div>
                      {ev.location ? (
                        <div className="truncate text-xs text-ink-muted">
                          {ev.location}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="font-display mb-2 mt-10 flex items-center gap-4 text-3xl font-medium text-ink">
            {await tServer('home.stats.title')}
            <span className="h-px flex-1 bg-border" />
          </div>
          <p className="font-display mb-6 italic text-ink-muted">
            {await tServer('home.stats.sub')}
          </p>
          <div className="border border-border bg-cream p-5">
            <StatRow label={await tServer('home.stats.total')} value={stats.total} />
            <StatRow label={await tServer('home.stats.generations')} value={stats.generations} />
            <StatRow label={await tServer('home.stats.members')} value={stats.members} />
            <StatRow
              label={await tServer('home.stats.pending')}
              value={stats.pending}
              accent={stats.pending > 0}
              last
            />
          </div>
        </aside>
      </div>
    </>
  );
}

function StatRow({
  label,
  value,
  accent = false,
  last = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={
        'font-display flex items-center justify-between py-2 ' +
        (last ? '' : 'border-b border-dotted border-border')
      }
    >
      <span className="italic text-ink-muted">{label}</span>
      <strong
        className={'text-lg font-semibold ' + (accent ? 'text-terracotta-deep' : 'text-ink')}
      >
        {value}
      </strong>
    </div>
  );
}
