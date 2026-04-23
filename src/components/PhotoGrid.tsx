/**
 * Renders 1..6 photos in a responsive grid. Single photo fills the width;
 * two sit side-by-side; 3+ go into a 3-column grid. Full images open in a
 * new tab on click.
 */
export function PhotoGrid({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;
  const count = urls.length;
  const gridClass =
    count === 1
      ? 'grid grid-cols-1'
      : count === 2
      ? 'grid grid-cols-2'
      : 'grid grid-cols-3';

  return (
    <div className={`mt-3 ${gridClass} gap-1`}>
      {urls.map((u, i) => (
        <a
          key={`${u}-${i}`}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block overflow-hidden border border-border bg-parchment-deep"
          style={{ aspectRatio: count === 1 ? undefined : '1 / 1' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={u}
            alt=""
            loading="lazy"
            className={
              count === 1
                ? 'w-full max-h-[520px] object-contain'
                : 'h-full w-full object-cover'
            }
          />
        </a>
      ))}
    </div>
  );
}
