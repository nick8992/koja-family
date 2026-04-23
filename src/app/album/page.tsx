import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@/auth';
import { loadAlbum } from '@/lib/album-data';
import { removeAlbumPhotoAction } from '@/lib/album-actions';
import { tServer } from '@/lib/i18n/server';
import { AlbumComposer } from '@/components/AlbumComposer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Family Album' };

type Session = {
  id?: string;
  role?: 'member' | 'admin';
  approved?: boolean;
} | undefined;

export default async function AlbumPage() {
  const session = await auth();
  const user = session?.user as Session;

  // State 1: not signed in
  if (!user?.id) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 text-center sm:px-8">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {await tServer('album.title')}
        </h1>
        <p className="font-display mt-4 text-base italic leading-relaxed text-ink-muted">
          {await tServer('album.gate.signed_out')}
        </p>
        <Link
          href="/tree"
          className="font-display mt-8 inline-block rounded-sm border border-olive-deep bg-olive-deep px-7 py-3 text-[16px] font-medium tracking-wide text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep"
        >
          {await tServer('album.gate.claim_cta')}
        </Link>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const isApproved = !!user.approved;

  // State 2: signed in, not approved
  if (!isApproved && !isAdmin) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 text-center sm:px-8">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {await tServer('album.title')}
        </h1>
        <p className="font-display mt-4 text-base italic leading-relaxed text-ink-muted">
          {await tServer('album.gate.pending')}
        </p>
      </div>
    );
  }

  // State 3: approved (or admin) → full album
  let photos: Awaited<ReturnType<typeof loadAlbum>> = [];
  try {
    photos = await loadAlbum();
  } catch (err) {
    console.error('[album] loadAlbum failed:', err);
  }
  const [titleLabel, subLabel, emptyLabel, addedByLabel, addedByUnknownLabel, removeLabel] =
    await Promise.all([
      tServer('album.title'),
      tServer('album.sub'),
      tServer('album.empty'),
      tServer('album.added_by'),
      tServer('album.added_by_unknown'),
      tServer('album.remove'),
    ]);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
          {titleLabel}
        </h1>
        <p className="font-display mt-2 text-base italic leading-relaxed text-ink-muted sm:text-lg">
          {subLabel}
        </p>
      </div>

      <AlbumComposer />

      {photos.length === 0 ? (
        <div className="border border-border bg-cream p-10 text-center">
          <p className="font-display italic text-ink-muted">{emptyLabel}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <article
              key={p.id}
              className="flex flex-col overflow-hidden border border-border bg-cream"
            >
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-[4/3] w-full bg-parchment-deep"
              >
                <Image
                  src={p.url}
                  alt={p.caption ?? ''}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                  className="object-cover"
                  quality={75}
                />
              </a>
              <div className="flex flex-1 flex-col p-4">
                {p.caption ? (
                  <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                    {p.caption}
                  </p>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-dotted border-border pt-2">
                  <span className="font-display text-[11px] italic text-ink-muted">
                    {p.uploaderPersonId && p.uploaderFirstName ? (
                      <>
                        {addedByLabel}{' '}
                        <Link
                          href={`/profile/${p.uploaderPersonId}`}
                          className="not-italic text-terracotta-deep hover:underline"
                        >
                          {p.uploaderFirstName}
                        </Link>
                      </>
                    ) : (
                      addedByUnknownLabel
                    )}
                  </span>
                  {isAdmin ? (
                    <form action={removeAlbumPhotoAction}>
                      <input type="hidden" name="photoId" value={p.id} />
                      <button
                        type="submit"
                        aria-label={removeLabel}
                        title={removeLabel}
                        className="flex h-6 w-6 items-center justify-center rounded-sm border border-[var(--color-border-dark)] text-xs text-ink-muted hover:border-terracotta-deep hover:text-terracotta-deep"
                      >
                        ×
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
