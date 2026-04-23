'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  createAlbumPhotoUploadUrlAction,
  saveAlbumPhotoAction,
} from '@/lib/album-actions';

const MAX_DIMENSION = 4096;
const TARGET_TYPE = 'image/webp';
const TARGET_QUALITY = 0.85;
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

async function compressImage(file: File): Promise<Blob> {
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

export function AlbumComposer() {
  const { t } = useLanguage();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setSelected(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  function clearSelection() {
    setSelected(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError(null);

    try {
      let blob: Blob;
      let contentType = TARGET_TYPE;
      try {
        blob = await compressImage(selected);
      } catch {
        if (selected.size > MAX_UPLOAD_BYTES) throw new Error('too_big');
        blob = selected;
        contentType = selected.type || 'image/jpeg';
      }
      if (blob.size > MAX_UPLOAD_BYTES) throw new Error('too_big');

      const fd = new FormData();
      fd.append('contentType', contentType);
      const issue = await createAlbumPhotoUploadUrlAction({ status: 'idle' }, fd);
      if (issue.status !== 'ok') {
        throw new Error(
          issue.status === 'error' ? `photo.error.${issue.message}` : 'photo.error.generic'
        );
      }

      const putRes = await fetch(issue.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType, 'x-upsert': 'false' },
        body: blob,
      });
      if (!putRes.ok) throw new Error('photo.error.upload_failed');

      const save = new FormData();
      save.append('url', issue.publicUrl);
      save.append('caption', caption.trim());
      const saved = await saveAlbumPhotoAction({ status: 'idle' }, save);
      if (saved.status !== 'ok') {
        throw new Error(
          saved.status === 'error' ? `photo.error.${saved.message}` : 'photo.error.generic'
        );
      }

      clearSelection();
      setCaption('');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.message.startsWith('photo.error.')
          ? err.message
          : err instanceof Error && err.message === 'too_big'
          ? 'photo.error.too_big'
          : 'photo.error.generic'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 border border-border bg-cream p-5 sm:p-6"
    >
      <div className="mb-2 font-display text-lg font-medium text-ink">
        {t('album.form.title')}
      </div>
      <p className="font-display mb-4 text-sm italic leading-relaxed text-ink-muted">
        {t('album.form.sub')}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />

      {previewUrl ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="h-48 w-full rounded-sm border border-border object-cover sm:h-40 sm:w-40"
          />
          <button
            type="button"
            onClick={clearSelection}
            disabled={busy}
            className="font-display self-start rounded-sm border border-[var(--color-border-dark)] px-3 py-1.5 text-xs text-ink-soft hover:bg-parchment-deep disabled:opacity-60"
          >
            {t('album.form.replace')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="font-display mb-4 flex w-full items-center justify-center gap-2 rounded-sm border-2 border-dashed border-border-dark bg-parchment-deep px-4 py-6 text-sm text-ink-muted hover:border-terracotta-deep hover:text-terracotta-deep disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M14 4h-3l-1-2H6L5 4H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zm-6 7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
          </svg>
          {t('album.form.pick')}
        </button>
      )}

      <label className="font-display block text-sm italic text-ink-muted">
        {t('album.form.caption')}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={t('album.form.caption.placeholder')}
          className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm not-italic text-ink focus:outline-1 focus:outline-olive"
        />
      </label>

      {error ? (
        <div className="mt-3 border-s-[3px] border-terracotta bg-parchment-deep px-3 py-2 text-xs text-terracotta-deep">
          {t(error)}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={!selected || busy}
          className="font-display rounded-sm border border-olive-deep bg-olive-deep px-5 py-2 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
        >
          {busy ? '…' : t('album.form.save')}
        </button>
      </div>
    </form>
  );
}
