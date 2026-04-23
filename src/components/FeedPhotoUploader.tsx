'use client';

import { useRef, useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { uploadFeedPhotoAction } from '@/lib/photo-actions';

export type UploadedPhoto = { id: string; url: string };

type Props = {
  value: UploadedPhoto[];
  onChange: (next: UploadedPhoto[]) => void;
  /** Max number of photos. Defaults to 6. */
  max?: number;
  compact?: boolean;
};

const MAX_DIMENSION = 2000;
const TARGET_TYPE = 'image/webp';
const TARGET_QUALITY = 0.85;

async function compressFeedImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const s = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
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

export function FeedPhotoUploader({ value, onChange, max = 6, compact = false }: Props) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, max - value.length);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, remaining);
    if (fileRef.current) fileRef.current.value = '';
    if (files.length === 0) return;
    setBusy(true);
    setError(null);

    const accepted: UploadedPhoto[] = [];
    for (const file of files) {
      try {
        const blob = await compressFeedImage(file);
        const fd = new FormData();
        fd.append(
          'file',
          new File([blob], 'feed.webp', { type: TARGET_TYPE })
        );
        const res = await uploadFeedPhotoAction({ status: 'idle' }, fd);
        if (res.status === 'ok') {
          accepted.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            url: res.url,
          });
        } else if (res.status === 'error') {
          setError(`photo.error.${res.message}`);
        }
      } catch (err) {
        console.warn('[feed-photos] compress/upload failed:', err);
        setError('photo.error.generic');
      }
    }
    if (accepted.length > 0) onChange([...value, ...accepted]);
    setBusy(false);
  }

  function removeAt(id: string) {
    onChange(value.filter((p) => p.id !== id));
  }

  const btnClass = compact
    ? 'flex h-7 items-center gap-1 rounded-sm border border-[var(--color-border-dark)] bg-cream px-2 text-[11px] text-ink-soft hover:bg-parchment-deep disabled:opacity-60'
    : 'flex h-8 items-center gap-1.5 rounded-sm border border-[var(--color-border-dark)] bg-cream px-3 text-xs text-ink-soft hover:bg-parchment-deep disabled:opacity-60';

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPick}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || remaining === 0}
          onClick={() => fileRef.current?.click()}
          className={btnClass}
          title={remaining === 0 ? t('photo.max_reached') : t('photo.add')}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M14 4h-3l-1-2H6L5 4H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zm-6 7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
          </svg>
          {busy ? '…' : `${t('photo.add')} (${value.length}/${max})`}
        </button>
        {error ? (
          <span className="text-xs text-terracotta-deep">{t(error)}</span>
        ) : null}
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((p) => (
            <div key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt=""
                className="h-20 w-20 rounded-sm border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(p.id)}
                aria-label={t('photo.remove_thumb')}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border-dark bg-cream text-xs text-ink-muted hover:text-terracotta-deep"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
