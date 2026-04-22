'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  updatePersonFieldAction,
  type UpdateFieldState,
} from '@/lib/person-actions';

const initial: UpdateFieldState = { status: 'idle' };

export type EditFieldType = 'text' | 'textarea' | 'date' | 'bool';

type Props = {
  personId: number;
  field: string;
  label: string;
  value: string;
  type?: EditFieldType;
  /** Raw stored value, for pre-filling the input (may differ from display). */
  rawValue?: string;
  editable: boolean;
};

export function EditableField({
  personId,
  field,
  label,
  value,
  type = 'text',
  rawValue,
  editable,
}: Props) {
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

  const initialRaw = rawValue ?? (value === t('profile.not_set') ? '' : value);

  if (!editable) {
    return (
      <div className="flex items-center justify-between border-b border-dotted border-border py-2 text-sm last:border-b-0">
        <span className="font-display italic text-ink-muted">{label}</span>
        <span className="font-medium text-ink text-end">{value}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-b border-dotted border-border py-2 text-sm last:border-b-0">
      <span className="font-display italic text-ink-muted">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-1.5 text-end font-medium text-ink transition-colors hover:text-terracotta-deep"
      >
        <span className="border-b border-dashed border-transparent group-hover:border-terracotta">
          {value}
        </span>
        <EditIcon />
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
              {t('edit.title')} {label}
            </div>

            {state.status === 'error' ? (
              <div className="mb-4 mt-4 border-s-[3px] border-terracotta bg-parchment-deep px-4 py-3 text-sm text-terracotta-deep">
                {state.message === 'forbidden'
                  ? t('edit.error.forbidden')
                  : t('edit.error.generic')}
              </div>
            ) : null}

            <form action={formAction} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="personId" value={personId} />
              <input type="hidden" name="field" value={field} />

              {type === 'textarea' ? (
                <label className="font-display block text-sm italic text-ink-muted">
                  {label}
                  <textarea
                    name="value"
                    defaultValue={initialRaw}
                    rows={6}
                    autoFocus
                    className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                  />
                </label>
              ) : type === 'date' ? (
                <label className="font-display block text-sm italic text-ink-muted">
                  {label}
                  <input
                    type="date"
                    name="value"
                    defaultValue={initialRaw}
                    autoFocus
                    className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                  />
                </label>
              ) : type === 'bool' ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="value"
                    value="true"
                    defaultChecked={initialRaw === 'true'}
                    className="accent-olive-deep"
                  />
                  {label}
                </label>
              ) : (
                <label className="font-display block text-sm italic text-ink-muted">
                  {label}
                  <input
                    type="text"
                    name="value"
                    defaultValue={initialRaw}
                    autoFocus
                    className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                  />
                </label>
              )}

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
    </div>
  );
}

function EditIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      className="opacity-0 transition-opacity group-hover:opacity-100"
      aria-hidden
    >
      <path d="M11 2l3 3-8 8H3v-3l8-8zm1-1l2 2 1.5-1.5-2-2L12 1z" />
    </svg>
  );
}
