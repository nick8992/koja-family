'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  createGalleryPhotoUploadUrlAction,
  saveGalleryPhotoAction,
  removeGalleryPhotoAction,
} from '@/lib/gallery-actions';
import type { GalleryPhoto } from '@/lib/gallery-data';

type Props = {
  personId: number;
  photos: GalleryPhoto[];
  canEdit: boolean;
  viewerUserId: number | null;
  viewerRole: 'member' | 'admin' | null;
};

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

export function GalleryCard({
  personId,
  photos,
  canEdit,
  viewerUserId,
  viewerRole,
}: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasPhotos = photos.length > 0;
  if (!hasPhotos && !canEdit) return null;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setProgress({ done: 0, total: files.length });

    let failures = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let blob: Blob;
        let contentType = TARGET_TYPE;
        try {
          blob = await compressImage(file);
        } catch {
          if (file.size > MAX_UPLOAD_BYTES) {
            throw new Error('too_big');
          }
          blob = file;
          contentType = file.type || 'image/jpeg';
        }
        if (blob.size > MAX_UPLOAD_BYTES) throw new Error('too_big');

        const fd = new FormData();
        fd.append('personId', String(personId));
        fd.append('contentType', contentType);
        const issue = await createGalleryPhotoUploadUrlAction({ status: 'idle' }, fd);
        if (issue.status !== 'ok') {
          failures++;
          setError(
            issue.status === 'error'
              ? `photo.error.${issue.message}`
              : 'photo.error.generic'
          );
          continue;
        }

        const putRes = await fetch(issue.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType, 'x-upsert': 'false' },
          body: blob,
        });
        if (!putRes.ok) {
          failures++;
          setError('photo.error.upload_failed');
          continue;
        }

        const save = new FormData();
        save.append('personId', String(personId));
        save.append('url', issue.publicUrl);
        const savedRes = await saveGalleryPhotoAction({ status: 'idle' }, save);
        if (savedRes.status !== 'ok') {
          failures++;
          setError(
            savedRes.status === 'error'
              ? `photo.error.${savedRes.message}`
              : 'photo.error.generic'
          );
          continue;
        }
      } catch (err) {
        failures++;
        setError(
          err instanceof Error && err.message === 'too_big'
            ? 'photo.error.too_big'
            : 'photo.error.generic'
        );
      } finally {
        setProgress((p) => (p ? { done: p.done + 1, total: p.total } : null));
      }
    }

    setUploading(false);
    setProgress(null);
    if (failures < files.length) router.refresh();
  }

  return (
    <section className="mt-6 border border-border bg-cream p-6">
      <div className="mb-3.5 flex items-center justify-between border-b border-border pb-2">
        <h3 className="font-display text-xl font-medium text-ink">
          {t('gallery.title')}
        </h3>
        {canEdit ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="font-display flex items-center gap-1.5 rounded-sm border border-olive-deep bg-olive-deep px-3 py-1.5 text-xs font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
          >
            <PlusIcon />
            {uploading && progress
              ? `${progress.done}/${progress.total}`
              : t('gallery.add')}
          </button>
        ) : null}
      </div>

      {canEdit ? (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPick}
        />
      ) : null}

      {error ? (
        <div className="mb-3 border-s-[3px] border-terracotta bg-parchment-deep px-3 py-2 text-xs text-terracotta-deep">
          {t(error)}
        </div>
      ) : null}

      {hasPhotos ? (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((p) => {
            const mine =
              viewerUserId != null &&
              (viewerRole === 'admin' ||
                p.uploadedByUser === viewerUserId ||
                canEdit);
            return (
              <GalleryTile
                key={p.id}
                photo={p}
                canRemove={mine}
                onRemoved={() => router.refresh()}
                removeLabel={t('gallery.remove')}
                confirmLabel={t('gallery.remove.confirm')}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function GalleryTile({
  photo,
  canRemove,
  onRemoved,
  removeLabel,
  confirmLabel,
}: {
  photo: GalleryPhoto;
  canRemove: boolean;
  onRemoved: () => void;
  removeLabel: string;
  confirmLabel: string;
}) {
  async function handleRemove(e: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm(confirmLabel)) {
      e.preventDefault();
      return;
    }
    // Let the action run, then refresh when it returns via revalidate.
    setTimeout(onRemoved, 300);
  }
  return (
    <div className="relative aspect-square overflow-hidden border border-border bg-parchment-deep">
      <a
        href={photo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full"
      >
        <Image
          src={photo.url}
          alt={photo.caption ?? ''}
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 180px"
          className="object-cover transition-transform hover:scale-[1.03]"
          quality={70}
        />
      </a>
      {canRemove ? (
        <form
          action={removeGalleryPhotoAction}
          onSubmit={handleRemove}
          className="absolute top-1 end-1"
        >
          <input type="hidden" name="photoId" value={photo.id} />
          <button
            type="submit"
            aria-label={removeLabel}
            title={removeLabel}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-cream hover:bg-terracotta-deep"
          >
            ×
          </button>
        </form>
      ) : null}
    </div>
  );
}

function PlusIcon({ large = false }: { large?: boolean }) {
  const s = large ? 22 : 12;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={large ? 2 : 1.5}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
