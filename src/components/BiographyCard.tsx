'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  updatePersonFieldAction,
  type UpdateFieldState,
} from '@/lib/person-actions';

const initial: UpdateFieldState = { status: 'idle' };

type Props = {
  personId: number;
  bio: string | null;
  /** Viewer has permission to edit this field (3-gen rule, admin, or self). */
  editable: boolean;
  /** Viewer IS the person whose bio this is. */
  isOwner: boolean;
};

export function BiographyCard({ personId, bio, editable, isOwner }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updatePersonFieldAction, initial);

  useEffect(() => {
    if (state.status === 'ok') {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const hasBio = bio != null && bio.trim().length > 0;

  // Nothing to show to non-owners when empty — hide the whole card.
  if (!hasBio && !isOwner) return null;

  // Editors who aren't the owner also shouldn't see the "Add stories..." prompt
  // (it's written in first person). Collapse to an empty state with an Edit
  // button only.
  const prompt = isOwner ? t('profile.bio.owner_prompt') : t('profile.bio.editor_prompt');

  return (
    <section className="border border-border bg-cream p-6">
      <div className="mb-3.5 flex items-center justify-between border-b border-border pb-2">
        <h3 className="font-display text-xl font-medium text-ink">
          {t('profile.biography')}
        </h3>
        {editable && hasBio ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-display flex items-center gap-1 rounded-sm border border-[var(--color-border-dark)] bg-parchment-deep px-2.5 py-0.5 text-xs font-medium text-terracotta-deep hover:bg-cream"
          >
            <EditIcon />
            {t('edit.action')}
          </button>
        ) : null}
      </div>

      {hasBio ? (
        <p className="whitespace-pre-wrap py-3 text-[15px] leading-relaxed text-ink-soft">
          {bio}
        </p>
      ) : (
        <div className="flex flex-col items-start gap-3 py-3">
          <p className="font-display text-[14px] italic leading-relaxed text-ink-muted">
            {prompt}
          </p>
          {editable ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="font-display flex items-center gap-1 rounded-sm border border-olive-deep bg-olive-deep px-3 py-1 text-xs font-medium text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep"
            >
              <EditIcon />
              {t('edit.action')}
            </button>
          ) : null}
        </div>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-5"
          style={{ background: 'rgba(31, 26, 18, 0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto border border-[var(--color-border-dark)] bg-parchment p-10 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 end-4 text-2xl text-ink-muted hover:text-terracotta"
              aria-label="Close"
            >
              ×
            </button>
            <div className="font-display mb-4 text-2xl font-medium text-ink">
              {t('profile.biography')}
            </div>

            {state.status === 'error' ? (
              <div className="mb-4 border-s-[3px] border-terracotta bg-parchment-deep px-4 py-3 text-sm text-terracotta-deep">
                {state.message === 'forbidden'
                  ? t('edit.error.forbidden')
                  : t('edit.error.generic')}
              </div>
            ) : null}

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="personId" value={personId} />
              <input type="hidden" name="field" value="bio" />
              <textarea
                name="value"
                defaultValue={bio ?? ''}
                rows={8}
                autoFocus
                placeholder={prompt}
                className="block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm leading-relaxed text-ink focus:outline-1 focus:outline-olive"
              />
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="font-display flex-1 rounded-sm border border-[var(--color-border-dark)] px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep"
                >
                  {t('edit.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="font-display flex-1 rounded-sm border border-olive-deep bg-olive-deep px-5 py-2.5 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
                >
                  {pending ? '…' : t('edit.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function EditIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden
    >
      <path d="M11 2l3 3-8 8H3v-3l8-8zm1-1l2 2 1.5-1.5-2-2L12 1z" />
    </svg>
  );
}
