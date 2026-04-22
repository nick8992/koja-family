import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center px-4 py-20 text-center">
      <div
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-gold text-4xl text-gold-light"
        style={{
          background: 'var(--color-olive-deep)',
          boxShadow: 'inset 0 0 0 3px var(--color-olive-deep), 0 4px 20px rgba(0,0,0,0.2)',
          fontFamily: 'Amiri, serif',
        }}
      >
        ?
      </div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
        Lost in the tree
      </h1>
      <p className="font-display mt-3 text-base italic text-ink-muted">
        We couldn&rsquo;t find the page you were looking for.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="font-display rounded-sm border border-olive-deep bg-olive-deep px-6 py-2.5 text-sm font-medium tracking-wide text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep"
        >
          Back to home
        </Link>
        <Link
          href="/tree"
          className="font-display rounded-sm border border-[var(--color-border-dark)] px-6 py-2.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep hover:text-olive-deep"
        >
          Browse the tree
        </Link>
      </div>
    </div>
  );
}
