'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  createHistoryPostAction,
  type CreateHistoryState,
} from '@/lib/history-actions';
import { FeedPhotoUploader, type UploadedPhoto } from '@/components/FeedPhotoUploader';

const initial: CreateHistoryState = { status: 'idle' };

export function HistoryComposer() {
  const { t } = useLanguage();
  const router = useRouter();
  const [photo, setPhoto] = useState<UploadedPhoto[]>([]);
  const [state, formAction, pending] = useActionState(createHistoryPostAction, initial);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.status === 'ok') {
      setOpen(false);
      setPhoto([]);
      router.refresh();
    }
  }, [state, router]);

  const errorKey =
    state.status === 'error'
      ? {
          forbidden: 'history.error.forbidden',
          not_signed_in: 'history.error.not_signed_in',
          bad_title: 'history.error.bad_title',
          bad_body: 'history.error.bad_body',
        }[state.message] ?? 'history.error.generic'
      : null;

  if (!open) {
    return (
      <div className="mb-8 border border-border bg-cream p-5 sm:p-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-display rounded-sm border border-olive-deep bg-olive-deep px-4 py-2 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep"
        >
          + {t('history.compose')}
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mb-8 flex flex-col gap-4 border border-border bg-cream p-5 sm:p-6"
    >
      <div className="font-display text-lg font-medium text-ink">{t('history.compose')}</div>

      <label className="font-display block text-sm italic text-ink-muted">
        {t('history.form.title')}
        <input
          type="text"
          name="title"
          required
          maxLength={200}
          autoFocus
          className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm not-italic text-ink focus:outline-1 focus:outline-olive"
        />
      </label>

      <label className="font-display block text-sm italic text-ink-muted">
        {t('history.form.body')}
        <textarea
          name="body"
          required
          rows={10}
          maxLength={20000}
          placeholder={t('history.form.body.placeholder')}
          className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm not-italic leading-relaxed text-ink focus:outline-1 focus:outline-olive"
        />
      </label>

      <div className="font-display block text-sm italic text-ink-muted">
        {t('history.form.photo')}
        <div className="mt-1">
          <FeedPhotoUploader value={photo} onChange={setPhoto} max={1} />
        </div>
        <input type="hidden" name="photoUrl" value={photo[0]?.url ?? ''} />
      </div>

      {errorKey ? (
        <div className="border-s-[3px] border-terracotta bg-parchment-deep px-3 py-2 text-xs text-terracotta-deep">
          {t(errorKey)}
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPhoto([]);
          }}
          disabled={pending}
          className="font-display flex-1 rounded-sm border border-[var(--color-border-dark)] px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep disabled:opacity-60"
        >
          {t('history.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="font-display flex-1 rounded-sm border border-olive-deep bg-olive-deep px-5 py-2.5 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
        >
          {pending ? '…' : t('history.form.save')}
        </button>
      </div>
    </form>
  );
}
