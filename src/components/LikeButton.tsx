'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import { toggleLikeAction } from '@/lib/post-actions';

type Props = {
  postId: number;
  likeCount: number;
  viewerLiked: boolean;
  signedIn: boolean;
};

export function LikeButton({ postId, likeCount, viewerLiked, signedIn }: Props) {
  const { t } = useLanguage();

  if (!signedIn) {
    return (
      <Link
        href="/login"
        className="font-display flex items-center gap-1.5 text-xs text-ink-muted hover:text-terracotta-deep"
      >
        <Heart filled={false} />
        <span>{likeCount}</span>
      </Link>
    );
  }

  return (
    <form action={toggleLikeAction} className="inline">
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        aria-pressed={viewerLiked}
        aria-label={viewerLiked ? t('feed.like.unlike') : t('feed.like')}
        className={
          'font-display flex items-center gap-1.5 text-xs transition-colors ' +
          (viewerLiked
            ? 'text-terracotta-deep'
            : 'text-ink-muted hover:text-terracotta-deep')
        }
      >
        <Heart filled={viewerLiked} />
        <span>{likeCount}</span>
      </button>
    </form>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M8 13.5s-5-3.2-5-7A3 3 0 0 1 8 4a3 3 0 0 1 5 2.5c0 3.8-5 7-5 7z" />
    </svg>
  );
}
