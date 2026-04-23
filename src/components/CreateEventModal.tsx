'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  createEventAction,
  type CreateEventState,
} from '@/lib/event-actions';
import { FeedPhotoUploader, type UploadedPhoto } from '@/components/FeedPhotoUploader';

const initial: CreateEventState = { status: 'idle' };

export function CreateEventModal() {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [poster, setPoster] = useState<UploadedPhoto[]>([]);
  const [state, formAction, pending] = useActionState(createEventAction, initial);

  useEffect(() => {
    if (state.status === 'ok') {
      setOpen(false);
      formRef.current?.reset();
      setPoster([]);
      router.refresh();
    }
  }, [state, router]);

  const errorKey =
    state.status === 'error'
      ? {
          forbidden: 'events.error.forbidden',
          bad_title: 'events.error.bad_title',
          bad_starts_at: 'events.error.bad_starts_at',
          bad_ends_at: 'events.error.bad_ends_at',
          not_signed_in: 'events.error.not_signed_in',
        }[state.message] ?? 'events.error.generic'
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display rounded-sm border border-olive-deep bg-olive-deep px-4 py-2 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep"
      >
        + {t('events.schedule')}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: 'rgba(31, 26, 18, 0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto border border-[var(--color-border-dark)] bg-parchment p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => !pending && setOpen(false)}
              className="absolute top-3 end-4 text-2xl text-ink-muted hover:text-terracotta"
              aria-label="Close"
            >
              ×
            </button>
            <div className="font-display mb-1 text-2xl font-medium text-ink">
              {t('events.schedule.title')}
            </div>
            <p className="font-display mb-5 text-sm italic text-ink-muted">
              {t('events.schedule.sub')}
            </p>
            {errorKey ? (
              <div className="mb-4 border-s-[3px] border-terracotta bg-parchment-deep px-4 py-3 text-sm text-terracotta-deep">
                {t(errorKey)}
              </div>
            ) : null}
            <form ref={formRef} action={formAction} className="flex flex-col gap-4">
              <label className="font-display block text-sm italic text-ink-muted">
                {t('events.form.title')}
                <input
                  type="text"
                  name="title"
                  required
                  maxLength={200}
                  autoFocus
                  className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="font-display block text-sm italic text-ink-muted">
                  {t('events.form.startsAt')}
                  <input
                    type="datetime-local"
                    name="startsAt"
                    required
                    className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                  />
                </label>
                <label className="font-display block text-sm italic text-ink-muted">
                  {t('events.form.endsAt')}
                  <input
                    type="datetime-local"
                    name="endsAt"
                    className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                  />
                </label>
              </div>

              <label className="font-display block text-sm italic text-ink-muted">
                {t('events.form.location')}
                <input
                  type="text"
                  name="location"
                  maxLength={300}
                  placeholder={t('events.form.location.placeholder')}
                  className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                />
              </label>

              <label className="font-display block text-sm italic text-ink-muted">
                {t('events.form.description')}
                <textarea
                  name="description"
                  rows={4}
                  maxLength={2000}
                  placeholder={t('events.form.description.placeholder')}
                  className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                />
              </label>

              <div className="font-display block text-sm italic text-ink-muted">
                {t('events.form.poster')}
                <div className="mt-1">
                  <FeedPhotoUploader value={poster} onChange={setPoster} max={1} />
                </div>
                <input
                  type="hidden"
                  name="posterUrl"
                  value={poster[0]?.url ?? ''}
                />
              </div>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => !pending && setOpen(false)}
                  className="font-display flex-1 rounded-sm border border-[var(--color-border-dark)] px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep disabled:opacity-60"
                  disabled={pending}
                >
                  {t('events.form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="font-display flex-1 rounded-sm border border-olive-deep bg-olive-deep px-5 py-2.5 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
                >
                  {pending ? '…' : t('events.form.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
