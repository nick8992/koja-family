'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  uploadProfilePhotoAction,
  removeProfilePhotoAction,
} from '@/lib/photo-actions';
import { PhotoCropModal } from './PhotoCropModal';

type Props = {
  personId: number;
  hasPhoto: boolean;
};

export function ProfilePhotoUpload({ personId, hasPhoto }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Release object URL when we switch away from it
  useEffect(() => {
    return () => {
      if (cropSrc && cropSrc.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';
    setError(null);
    // Don't restrict by file.type — iOS Safari sometimes reports empty.
    // react-easy-crop renders via <img>, so if the browser can't decode
    // it we'll see an error on load and surface a friendly message.
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  }

  async function onCropComplete(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('personId', String(personId));
      form.append('file', new File([blob], 'avatar.webp', { type: 'image/webp' }));
      const res = await uploadProfilePhotoAction({ status: 'idle' }, form);
      if (res.status === 'ok') {
        setCropSrc(null);
        router.refresh();
      } else if (res.status === 'error') {
        setError(`photo.error.${res.message}`);
      }
    } catch (err) {
      console.error('[photo] upload threw:', err);
      setError('photo.error.generic');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (busy) return;
    if (!window.confirm(t('photo.remove.confirm'))) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('personId', String(personId));
      const res = await removeProfilePhotoAction({ status: 'idle' }, form);
      if (res.status === 'ok') router.refresh();
      else if (res.status === 'error') setError(`photo.error.${res.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="absolute bottom-1 end-1 flex flex-col gap-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-cream bg-olive-deep text-gold-light shadow-md transition-transform hover:scale-110 disabled:opacity-60"
          title={hasPhoto ? t('photo.change') : t('photo.upload')}
        >
          {busy ? (
            <span className="animate-pulse text-sm">…</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M11 2l3 3-8 8H3v-3l8-8zm1-1l2 2 1.5-1.5-2-2L12 1z" />
            </svg>
          )}
        </button>
        {hasPhoto ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="flex h-6 w-9 items-center justify-center rounded-full border border-border-dark bg-cream text-xs text-ink-muted hover:text-terracotta-deep disabled:opacity-60"
            title={t('photo.remove')}
          >
            ×
          </button>
        ) : null}
        {error ? (
          <div className="absolute end-12 bottom-0 max-w-[220px] rounded-sm border border-terracotta bg-parchment-deep px-3 py-1.5 text-xs text-terracotta-deep shadow-md">
            {t(error)}
          </div>
        ) : null}
      </div>

      {cropSrc ? (
        <PhotoCropModal
          imageSrc={cropSrc}
          busy={busy}
          onComplete={onCropComplete}
          onCancel={() => {
            if (!busy) {
              setCropSrc(null);
              setError(null);
            }
          }}
        />
      ) : null}
    </>
  );
}
