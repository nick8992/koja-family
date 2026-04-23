'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import { createPostAction, type CreatePostState } from '@/lib/post-actions';
import {
  FeedPhotoUploader,
  type UploadedPhoto,
} from './FeedPhotoUploader';

const initial: CreatePostState = { status: 'idle' };

type Props = {
  viewer: {
    displayName: string;
    photoUrl: string | null;
    approved: boolean;
  };
};

export function PostComposer({ viewer }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [state, formAction, pending] = useActionState(createPostAction, initial);

  useEffect(() => {
    if (state.status === 'ok') {
      formRef.current?.reset();
      setPhotos([]);
      router.refresh();
    }
  }, [state, router]);

  const errorKey =
    state.status === 'error'
      ? state.message === 'empty'
        ? 'feed.composer.error.empty'
        : state.message === 'too_long'
        ? 'feed.composer.error.too_long'
        : state.message === 'not_signed_in'
        ? 'feed.composer.error.not_signed_in'
        : 'feed.composer.error.generic'
      : null;

  return (
    <div className="mb-6 border border-border bg-cream p-5">
      {!viewer.approved ? (
        <div className="mb-3 border-s-[3px] border-gold bg-parchment-deep px-4 py-2.5 text-xs italic text-ink-muted font-display">
          {t('feed.pending.notice')}
        </div>
      ) : null}
      <form ref={formRef} action={formAction} className="flex gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-gold font-display text-[17px] font-semibold text-cream"
          style={{
            background: viewer.photoUrl
              ? `url(${viewer.photoUrl}) center/cover`
              : 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))',
          }}
        >
          {viewer.photoUrl ? null : viewer.displayName[0]?.toUpperCase()}
        </span>
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            name="body"
            maxLength={4000}
            rows={3}
            placeholder={t('feed.composer.placeholder')}
            className="w-full resize-y border border-[var(--color-border-dark)] bg-parchment p-3 text-sm text-ink focus:outline-1 focus:outline-olive"
          />
          {photos.map((p) => (
            <input key={p.id} type="hidden" name="photoUrls" value={p.url} />
          ))}
          <div className="mt-2">
            <FeedPhotoUploader value={photos} onChange={setPhotos} />
          </div>
          {errorKey ? (
            <div className="mt-2 border-s-[3px] border-terracotta bg-parchment-deep px-3 py-2 text-xs text-terracotta-deep">
              {t(errorKey)}
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-3">
            <select
              name="kind"
              defaultValue="general"
              className="font-display border border-[var(--color-border-dark)] bg-parchment px-3 py-1.5 text-sm text-ink"
            >
              <option value="general">{t('feed.kind.general')}</option>
              <option value="story">{t('feed.kind.story')}</option>
              <option value="business">{t('feed.kind.business')}</option>
              <option value="announcement">{t('feed.kind.announcement')}</option>
            </select>
            <button
              type="submit"
              disabled={pending}
              className="font-display rounded-sm border border-olive-deep bg-olive-deep px-5 py-2 text-sm font-medium text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
            >
              {pending ? '…' : t('feed.post')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
