'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { ClaimForm } from './ClaimForm';

type Props = {
  personId: number;
  /** Shown in the modal header: what person is being claimed. */
  fullName: string;
};

export function ClaimButton({ personId, fullName }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display rounded-sm border border-olive-deep bg-olive-deep px-4 py-1.5 text-sm text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep"
      >
        {t('profile.action.claim')}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-5"
          style={{ background: 'rgba(31, 26, 18, 0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto border border-[var(--color-border-dark)] bg-parchment p-10 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 end-4 text-2xl text-ink-muted hover:text-terracotta"
              aria-label="Close"
            >
              ×
            </button>
            <ClaimForm
              personId={personId}
              fullName={fullName}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
