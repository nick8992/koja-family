'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  uploadProfilePhotoAction,
  removeProfilePhotoAction,
} from '@/lib/photo-actions';

type Props = {
  personId: number;
  hasPhoto: boolean;
};

const MAX_DIMENSION = 2000;
const TARGET_TYPE = 'image/webp';
const TARGET_QUALITY = 0.85;
const MAX_BYTES = 5 * 1024 * 1024;

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height });
  const ctx = (canvas as unknown as { getContext(type: '2d'): CanvasRenderingContext2D | null })
    .getContext('2d');
  if (!ctx) throw new Error('no_canvas_context');
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: TARGET_TYPE, quality: TARGET_QUALITY });
  }
  return await new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob_failed'))),
      TARGET_TYPE,
      TARGET_QUALITY
    );
  });
}

export function ProfilePhotoUpload({ personId, hasPhoto }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!file.type.startsWith('image/')) {
        setError('photo.error.bad_type');
        return;
      }
      let uploadBlob: Blob = file;
      if (file.size > MAX_BYTES || /(heic|heif)/i.test(file.type)) {
        uploadBlob = await compressImage(file);
      }
      if (uploadBlob.size > MAX_BYTES) {
        uploadBlob = await compressImage(
          new File([uploadBlob], 'x.webp', { type: TARGET_TYPE })
        );
      }
      const form = new FormData();
      form.append('personId', String(personId));
      form.append(
        'file',
        new File([uploadBlob], `photo.${TARGET_TYPE.split('/')[1]}`, {
          type: uploadBlob.type || TARGET_TYPE,
        })
      );
      const res = await uploadProfilePhotoAction({ status: 'idle' }, form);
      if (res.status === 'ok') {
        router.refresh();
      } else if (res.status === 'error') {
        setError(`photo.error.${res.message}`);
      }
    } catch (err) {
      console.error('[photo] upload threw:', err);
      setError('photo.error.generic');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onRemove() {
    if (busy) return;
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

  const errorLabel = error
    ? t(error).startsWith('photo.error.')
      ? t('photo.error.generic')
      : t(error)
    : null;

  return (
    <div className="absolute bottom-1 end-1 flex flex-col gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
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
      {errorLabel ? (
        <div className="absolute end-12 bottom-0 max-w-[200px] rounded-sm border border-terracotta bg-parchment-deep px-3 py-1.5 text-xs text-terracotta-deep shadow-md">
          {errorLabel}
        </div>
      ) : null}
    </div>
  );
}
