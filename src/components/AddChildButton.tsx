'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  addPersonAction,
  type AddPersonState,
} from '@/lib/person-actions';

const initial: AddPersonState = { status: 'idle' };

type Props = {
  /** `null` = admin-only "add root-level sibling of Hanna". Otherwise a real father id. */
  fatherId: number | null;
  /** Rendered on the trigger button, e.g. "Add child" or "Add sibling of Hanna". */
  label: string;
  /** Shown in the modal header: "Add a child to {parentName}" or similar. */
  parentLabel: string;
  /** Visual style variant. */
  variant?: 'primary' | 'ghost';
};

export function AddChildButton({ fatherId, label, parentLabel, variant = 'ghost' }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addPersonAction, initial);

  useEffect(() => {
    if (state.status === 'ok') {
      setOpen(false);
      router.push(`/profile/${state.newId}`);
    }
  }, [state, router]);

  const errorKey =
    state.status === 'error'
      ? state.message === 'forbidden'
        ? 'addperson.error.forbidden'
        : state.message === 'bad_name'
        ? 'addperson.error.bad_name'
        : state.message === 'bad_gender'
        ? 'addperson.error.bad_gender'
        : state.message === 'not_signed_in'
        ? 'addperson.error.not_signed_in'
        : 'addperson.error.generic'
      : null;

  const btnClass =
    variant === 'primary'
      ? 'font-display rounded-sm border border-olive-deep bg-olive-deep px-4 py-1.5 text-sm font-medium tracking-wide text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep'
      : 'font-display rounded-sm border border-[var(--color-border-dark)] px-4 py-1.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep hover:text-olive-deep';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnClass}>
        {label}
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
            <div className="font-display mb-1 text-2xl font-medium text-ink">
              {t('addperson.title')}
            </div>
            <div className="font-display mb-6 text-sm italic text-ink-muted">
              {t('addperson.sub')}{' '}
              <strong className="not-italic text-terracotta-deep">{parentLabel}</strong>
            </div>

            {errorKey ? (
              <div className="mb-4 border-s-[3px] border-terracotta bg-parchment-deep px-4 py-3 text-sm text-terracotta-deep">
                {t(errorKey)}
              </div>
            ) : null}

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="fatherId" value={fatherId == null ? 'null' : fatherId} />

              <label className="font-display block text-sm italic text-ink-muted">
                {t('addperson.firstName')}
                <input
                  type="text"
                  name="firstName"
                  required
                  maxLength={100}
                  autoFocus
                  className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                />
              </label>

              <fieldset className="flex flex-col gap-2">
                <legend className="font-display text-sm italic text-ink-muted">
                  {t('addperson.gender')}
                </legend>
                <div className="flex gap-6 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="gender"
                      value="M"
                      defaultChecked
                      className="accent-olive-deep"
                    />
                    {t('addperson.gender.m')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="gender"
                      value="F"
                      className="accent-olive-deep"
                    />
                    {t('addperson.gender.f')}
                  </label>
                </div>
              </fieldset>

              <label className="font-display block text-sm italic text-ink-muted">
                {t('addperson.notes')}
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={400}
                  className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                />
              </label>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="font-display flex-1 rounded-sm border border-[var(--color-border-dark)] px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep"
                >
                  {t('addperson.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="font-display flex-1 rounded-sm border border-olive-deep bg-olive-deep px-5 py-2.5 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
                >
                  {pending ? '…' : t('addperson.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
