'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ClaimForm } from '@/components/ClaimForm';

export type ClaimSearchEntry = {
  id: number;
  slug: string;
  /** Space-separated lineage chain for substring search (Nicholas Fadi Badri …). */
  label: string;
};

type Props = {
  persons: ClaimSearchEntry[];
};

const DISMISS_KEY = 'kojaClaimPopupDismissed';
const DELAY_MS = 5000;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function AccountClaimPopup({ persons }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ClaimSearchEntry | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* Private mode / storage disabled — just show it. */
    }
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const out: ClaimSearchEntry[] = [];
    for (const p of persons) {
      const haystack = normalize(p.label);
      if (tokens.every((t) => haystack.includes(t))) {
        out.push(p);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [persons, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      style={{ background: 'rgba(31, 26, 18, 0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto border border-[var(--color-border-dark)] bg-parchment p-6 shadow-2xl sm:p-8">
        {/* Top bar: language toggle + close */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <LanguageToggle />
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('claimPopup.close')}
            className="text-2xl text-ink-muted hover:text-terracotta"
          >
            ×
          </button>
        </div>

        {selected ? (
          <>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="font-display mb-3 text-xs italic text-ink-muted hover:text-terracotta-deep"
            >
              ← {t('claimPopup.backToSearch')}
            </button>
            <ClaimForm
              personId={selected.id}
              fullName={selected.label}
              hideHeader
              onCancel={() => setSelected(null)}
            />
          </>
        ) : (
          <>
            <div className="font-display mb-1 text-xl font-medium text-ink sm:text-2xl">
              {t('claimPopup.title')}
            </div>
            <p className="font-display mb-4 text-sm italic leading-relaxed text-ink-muted">
              {t('claimPopup.sub')}
            </p>

            <label className="font-display block text-sm italic text-ink-muted">
              {t('claimPopup.searchLabel')}
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('claimPopup.searchPlaceholder')}
                className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm not-italic text-ink focus:outline-1 focus:outline-olive"
              />
            </label>

            {query.trim().length >= 2 ? (
              matches.length > 0 ? (
                <ul className="mt-3 flex flex-col divide-y divide-dotted divide-border border border-border bg-cream">
                  {matches.map((p) => (
                    <li key={p.slug}>
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        className="block w-full px-3 py-2 text-start text-sm text-ink-soft hover:bg-parchment-deep hover:text-terracotta-deep"
                      >
                        <span className="font-display font-medium text-ink">
                          {p.label.split(' ')[0]}
                        </span>
                        <span className="ms-1 text-xs italic text-ink-muted">
                          {p.label.split(' ').slice(1).join(' ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 border border-border bg-cream px-3 py-2 text-xs italic text-ink-muted">
                  {t('claimPopup.noMatches')}
                </p>
              )
            ) : null}

            <div className="mt-5 border-t border-dotted border-border pt-4 text-xs leading-relaxed text-ink-soft">
              <p className="mb-2">{t('claimPopup.disclaimer')}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/tree"
                  onClick={dismiss}
                  className="font-display rounded-sm border border-[var(--color-border-dark)] px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-parchment-deep hover:text-olive-deep"
                >
                  {t('claimPopup.treeCta')}
                </Link>
                <Link
                  href="/request-addition"
                  onClick={dismiss}
                  className="font-display rounded-sm border border-olive-deep bg-olive-deep px-3 py-1.5 text-xs font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep"
                >
                  {t('claimPopup.requestCta')}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
