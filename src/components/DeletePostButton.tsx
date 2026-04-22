'use client';

import { useLanguage } from '@/lib/i18n/context';
import { deletePostAction, deleteCommentAction } from '@/lib/post-actions';

export function DeletePostButton({ postId }: { postId: number }) {
  const { t } = useLanguage();
  return (
    <form
      action={deletePostAction}
      onSubmit={(e) => {
        if (!window.confirm(t('feed.post.delete.confirm'))) e.preventDefault();
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        className="font-display text-xs text-ink-muted hover:text-terracotta-deep"
      >
        {t('feed.post.delete')}
      </button>
    </form>
  );
}

export function DeleteCommentButton({ commentId }: { commentId: number }) {
  const { t } = useLanguage();
  return (
    <form
      action={deleteCommentAction}
      onSubmit={(e) => {
        if (!window.confirm(t('feed.comment.delete.confirm'))) e.preventDefault();
      }}
    >
      <input type="hidden" name="commentId" value={commentId} />
      <button
        type="submit"
        className="font-display text-xs text-ink-muted hover:text-terracotta-deep"
      >
        {t('feed.comment.delete')}
      </button>
    </form>
  );
}
