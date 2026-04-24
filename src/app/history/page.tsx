import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@/auth';
import { loadHistoryPosts } from '@/lib/history-data';
import { deleteHistoryPostAction } from '@/lib/history-actions';
import { loadAllPersons } from '@/lib/tree-data';
import { computeProfileSlugs, profileHref } from '@/lib/profile-slugs';
import { getLanguage, tServer } from '@/lib/i18n/server';
import { HistoryComposer } from '@/components/HistoryComposer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Family History' };

function fmtDate(iso: string, lang: 'en' | 'ar'): string {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function HistoryPage() {
  const session = await auth();
  const sessionUser = session?.user as { role?: 'member' | 'admin' } | undefined;
  const isAdmin = sessionUser?.role === 'admin';

  const [posts, lang, nodes, titleLabel, subLabel, tipLabel, emailLabel, emptyLabel, removeLabel, addedByLabel] =
    await Promise.all([
      loadHistoryPosts(),
      getLanguage(),
      loadAllPersons(),
      tServer('history.title'),
      tServer('history.sub'),
      tServer('history.tip'),
      tServer('history.email'),
      tServer('history.empty'),
      tServer('history.remove'),
      tServer('history.added_by'),
    ]);
  const { slugByDbId } = computeProfileSlugs(nodes);

  return (
    <div className="mx-auto max-w-[820px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
        {titleLabel}
      </h1>
      <p className="font-display mt-2 mb-5 text-base italic leading-relaxed text-ink-muted sm:text-lg">
        {subLabel}
      </p>

      <div className="mb-8 border-s-[3px] border-gold bg-parchment-deep px-4 py-3 text-sm leading-relaxed text-ink-soft">
        <span className="font-display italic">{tipLabel} </span>
        <a
          href="mailto:admin@kojafamily.com"
          className="font-medium not-italic text-terracotta-deep underline-offset-4 hover:underline"
        >
          {emailLabel}
        </a>
      </div>

      {isAdmin ? <HistoryComposer /> : null}

      {posts.length === 0 ? (
        <div className="border border-border bg-cream p-10 text-center">
          <p className="font-display italic text-ink-muted">{emptyLabel}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((p) => (
            <article
              key={p.id}
              className="border border-border bg-cream p-5 sm:p-6"
            >
              <header className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl font-medium text-ink sm:text-3xl">
                  {p.title}
                </h2>
                <span className="font-display text-xs italic text-ink-muted">
                  {fmtDate(p.createdAt, lang)}
                </span>
              </header>
              {p.photoUrl ? (
                <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden border border-border bg-parchment-deep sm:aspect-[3/2]">
                  <Image
                    src={p.photoUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 760px"
                    className="object-contain"
                    quality={80}
                  />
                </div>
              ) : null}
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
                {p.body}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-dotted border-border pt-2">
                <span className="font-display text-[11px] italic text-ink-muted">
                  {p.authorPersonId && p.authorFirstName ? (
                    <>
                      {addedByLabel}{' '}
                      <Link
                        href={profileHref(p.authorPersonId, slugByDbId)}
                        className="not-italic text-terracotta-deep hover:underline"
                      >
                        {p.authorFirstName}
                      </Link>
                    </>
                  ) : null}
                </span>
                {isAdmin ? (
                  <form action={deleteHistoryPostAction}>
                    <input type="hidden" name="postId" value={p.id} />
                    <button
                      type="submit"
                      aria-label={removeLabel}
                      title={removeLabel}
                      className="font-display rounded-sm border border-[var(--color-border-dark)] px-2.5 py-1 text-xs text-ink-muted hover:border-terracotta-deep hover:text-terracotta-deep"
                    >
                      × {removeLabel}
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
