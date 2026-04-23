'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  updatePersonFieldAction,
  type UpdateFieldState,
} from '@/lib/person-actions';

const initial: UpdateFieldState = { status: 'idle' };

export type EditFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'bool'
  | 'year'
  | 'location';

type Props = {
  personId: number;
  field: string;
  label: string;
  /** Text shown when the field is not in edit mode. */
  value: string;
  type?: EditFieldType;
  /** Raw stored value, pre-filled into the input on open. For location,
   *  the value is "state, country" (parsed on open). */
  rawValue?: string;
  editable: boolean;
  /** Override the "(not set)" fallback when value is empty. Pass "" to
   *  render a blank cell (e.g. the deceased row when alive). */
  placeholder?: string;
};

const CURRENT_YEAR = new Date().getFullYear();
const EARLIEST_YEAR = 1800;

export function EditableField({
  personId,
  field,
  label,
  value,
  type = 'text',
  rawValue,
  editable,
  placeholder,
}: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updatePersonFieldAction, initial);

  const initialRaw = rawValue ?? '';
  const isSet = initialRaw != null && String(initialRaw).trim().length > 0;

  // Controlled year <select> so iOS Safari's native wheel picker
  // doesn't leave the form with an uncommitted value after the user
  // taps Done. Syncs from initialRaw each time the modal opens.
  const [yearDraft, setYearDraft] = useState(initialRaw);
  useEffect(() => {
    if (open && type === 'year') setYearDraft(initialRaw);
  }, [open, initialRaw, type]);

  // Location uses local state to compose "state, country" into the
  // single hidden "value" field the server action expects.
  const [locState, setLocState] = useState('');
  const [locCountry, setLocCountry] = useState('');
  useEffect(() => {
    if (type !== 'location') return;
    const raw = rawValue ?? '';
    const parts = raw.split(',').map((s) => s.trim());
    setLocState(parts[0] ?? '');
    setLocCountry(parts[1] ?? '');
  }, [rawValue, type, open]);
  const locationJoined = useMemo(() => {
    const bits = [locState, locCountry].map((s) => s.trim()).filter((s) => s.length > 0);
    return bits.join(', ');
  }, [locState, locCountry]);

  useEffect(() => {
    if (state.status === 'ok') {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  // A row with no value set at all:
  //   - hidden entirely if the viewer can't edit it
  //   - shown with an "Edit" action button if the viewer can edit it
  // (Placeholder prop wins over is-set heuristic when the caller
  //  explicitly passed a blank placeholder, e.g. the deceased row.)
  const hasPlaceholder = placeholder !== undefined;
  const isEmpty =
    !isSet && (value == null || value.trim().length === 0 || value === t('profile.not_set'));

  if (isEmpty && !editable && !hasPlaceholder) {
    return null;
  }

  if (!editable) {
    return (
      <div className="flex items-center justify-between border-b border-dotted border-border py-2 text-sm last:border-b-0">
        <span className="font-display italic text-ink-muted">{label}</span>
        <span className="font-medium text-ink text-end">{value || placeholder || '\u00A0'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-b border-dotted border-border py-2 text-sm last:border-b-0">
      <span className="font-display italic text-ink-muted">{label}</span>
      {isEmpty ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-display flex items-center gap-1 rounded-sm border border-[var(--color-border-dark)] bg-parchment-deep px-2.5 py-0.5 text-xs font-medium text-terracotta-deep hover:bg-cream"
        >
          <EditIcon />
          {t('edit.action')}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-end font-medium text-ink transition-colors hover:text-terracotta-deep"
        >
          <span className="border-b border-dashed border-border-dark hover:border-terracotta">
            {value || placeholder || '\u00A0'}
          </span>
          <EditIcon />
        </button>
      )}

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
              ) : type === 'year' ? (
                <label className="font-display block text-sm italic text-ink-muted">
                  {t('edit.year.label')}
                  <select
                    name="value"
                    value={yearDraft}
                    onChange={(e) => setYearDraft(e.target.value)}
                    autoFocus
                    className="font-display mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-base text-ink focus:outline-1 focus:outline-olive"
                  >
                    <option value="">—</option>
                    {Array.from(
                      { length: CURRENT_YEAR - EARLIEST_YEAR + 1 },
                      (_, i) => CURRENT_YEAR - i
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              ) : type === 'location' ? (
                <>
                  <input type="hidden" name="value" value={locationJoined} />
                  <label className="font-display block text-sm italic text-ink-muted">
                    {t('edit.location.state')}
                    <input
                      type="text"
                      value={locState}
                      onChange={(e) => setLocState(e.target.value)}
                      autoFocus
                      maxLength={80}
                      placeholder={t('claim.state.placeholder')}
                      className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                    />
                  </label>
                  <label className="font-display block text-sm italic text-ink-muted">
                    {t('edit.location.country')}
                    <input
                      type="text"
                      value={locCountry}
                      onChange={(e) => setLocCountry(e.target.value)}
                      maxLength={80}
                      placeholder={t('claim.country.placeholder')}
                      className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                    />
                  </label>
                </>
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
      className="text-terracotta-deep/70"
      aria-hidden
    >
      <path d="M11 2l3 3-8 8H3v-3l8-8zm1-1l2 2 1.5-1.5-2-2L12 1z" />
    </svg>
  );
}
