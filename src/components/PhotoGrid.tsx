import Image from 'next/image';

/**
 * Renders 1..6 photos in a responsive grid. Single photo keeps a 3:2
 * container with object-contain so panoramas and portraits letterbox
 * cleanly; multi-photo grids go 1:1 with object-cover. All photos use
 * Next's image optimizer, so mobile gets ~640px WebP/AVIF variants
 * instead of the 4096px source from Supabase.
 *
 * Pass `priority` for above-the-fold posts to skip lazy-loading on the
 * first image (LCP win for the feed's top card).
 */
export function PhotoGrid({
  urls,
  priority = false,
}: {
  urls: string[];
  priority?: boolean;
}) {
  if (!urls || urls.length === 0) return null;
  const count = urls.length;
  const gridClass =
    count === 1 ? 'grid grid-cols-1' : count === 2 ? 'grid grid-cols-2' : 'grid grid-cols-3';

  // Single photo: boxy enough to feel composed, loose enough to letterbox.
  const aspectClass = count === 1 ? 'aspect-[3/2]' : 'aspect-square';
  const fitClass = count === 1 ? 'object-contain' : 'object-cover';
  // Give the browser a width hint so it picks the right srcset bucket.
  const sizesAttr =
    count === 1
      ? '(max-width: 768px) 100vw, 720px'
      : count === 2
      ? '(max-width: 768px) 50vw, 360px'
      : '(max-width: 768px) 33vw, 240px';

  return (
    <div className={`mt-3 ${gridClass} gap-1`}>
      {urls.map((u, i) => (
        <a
          key={`${u}-${i}`}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          className={`relative block overflow-hidden border border-border bg-parchment-deep ${aspectClass}`}
        >
          <Image
            src={u}
            alt=""
            fill
            sizes={sizesAttr}
            className={fitClass}
            priority={priority && i === 0}
            quality={75}
          />
        </a>
      ))}
    </div>
  );
}
