'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] error boundary:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center px-4 py-20 text-center">
      <div
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-gold text-4xl text-gold-light"
        style={{
          background: 'var(--color-terracotta-deep)',
          boxShadow: 'inset 0 0 0 3px var(--color-terracotta-deep), 0 4px 20px rgba(0,0,0,0.2)',
          fontFamily: 'Amiri, serif',
        }}
      >
        !
      </div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
        Something broke
      </h1>
      <p className="font-display mt-3 text-base italic text-ink-muted">
        Try again — if it keeps happening, email{' '}
        <a
          href="mailto:admin@kojafamily.com"
          className="not-italic text-terracotta-deep hover:underline"
        >
          admin@kojafamily.com
        </a>
        .
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-ink-muted">
          Error reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="font-display rounded-sm border border-olive-deep bg-olive-deep px-6 py-2.5 text-sm font-medium tracking-wide text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep"
        >
          Try again
        </button>
        <Link
          href="/"
          className="font-display rounded-sm border border-[var(--color-border-dark)] px-6 py-2.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep hover:text-olive-deep"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
