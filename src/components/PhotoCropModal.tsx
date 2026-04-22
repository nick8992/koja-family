'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useLanguage } from '@/lib/i18n/context';

type Props = {
  /** Object URL or data URL of the picked image. */
  imageSrc: string;
  /** Called when the user confirms. Receives a WebP blob of the cropped square. */
  onComplete: (blob: Blob) => void | Promise<void>;
  /** Called when the user cancels or closes the modal. */
  onCancel: () => void;
  /** True while the parent is uploading — disables buttons + shows spinner. */
  busy?: boolean;
};

const OUTPUT_SIZE = 512; // px — square output, rendered inside the circular avatar

async function cropToWebpBlob(
  imageSrc: string,
  area: Area
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no_canvas_context');
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob_failed'))),
      'image/webp',
      0.88
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image_load_failed'));
    img.src = src;
  });
}

export function PhotoCropModal({ imageSrc, onComplete, onCancel, busy = false }: Props) {
  const { t } = useLanguage();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixelArea, setPixelArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_a: Area, pixels: Area) => {
    setPixelArea(pixels);
  }, []);

  useEffect(() => {
    // Allow closing with Escape
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy && !saving) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, busy, saving]);

  async function handleSave() {
    if (!pixelArea || saving || busy) return;
    setSaving(true);
    try {
      const blob = await cropToWebpBlob(imageSrc, pixelArea);
      await onComplete(blob);
    } catch (err) {
      console.error('[photo-crop] save failed:', err);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(31, 26, 18, 0.85)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && !saving) onCancel();
      }}
    >
      <div className="relative flex w-full max-w-md flex-col gap-4 border border-[var(--color-border-dark)] bg-parchment p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="font-display text-xl font-medium text-ink">
            {t('photo.crop.title')}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy || saving}
            className="text-2xl text-ink-muted hover:text-terracotta disabled:opacity-60"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="font-display text-xs italic text-ink-muted">
          {t('photo.crop.hint')}
        </p>

        <div
          className="relative w-full overflow-hidden rounded-sm border border-[var(--color-border-dark)] bg-ink"
          style={{ height: 340 }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            minZoom={1}
            maxZoom={4}
            zoomSpeed={0.3}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="font-display text-xs italic text-ink-muted">
            {t('photo.crop.zoom')}
          </span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-olive-deep"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy || saving}
            className="font-display flex-1 rounded-sm border border-[var(--color-border-dark)] px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep disabled:opacity-60"
          >
            {t('photo.crop.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || saving || !pixelArea}
            className="font-display flex-1 rounded-sm border border-olive-deep bg-olive-deep px-5 py-2.5 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
          >
            {saving || busy ? '…' : t('photo.crop.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
