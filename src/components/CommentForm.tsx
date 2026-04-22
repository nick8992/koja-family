'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  createCommentAction,
  type CreateCommentState,
} from '@/lib/post-actions';

const initial: CreateCommentState = { status: 'idle' };

export function CommentForm({
  postId,
  viewer,
}: {
  postId: number;
  viewer: { displayName: string; photoUrl: string | null };
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createCommentAction, initial);

  useEffect(() => {
    if (state.status === 'ok') {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const errorKey =
    state.status === 'error'
      ? state.message === 'empty'
        ? 'feed.comment.error.empty'
        : state.message === 'too_long'
        ? 'feed.comment.error.too_long'
        : 'feed.composer.error.generic'
      : null;

  return (
    <form ref={formRef} action={formAction} className="mt-3 flex gap-2">
      <input type="hidden" name="postId" value={postId} />
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold font-display text-xs font-semibold text-cream"
        style={{
          background: viewer.photoUrl
            ? `url(${viewer.photoUrl}) center/cover`
            : 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))',
        }}
      >
        {viewer.photoUrl ? null : viewer.displayName[0]?.toUpperCase()}
      </span>
      <div className="flex flex-1 gap-2">
        <input
          type="text"
          name="body"
          required
          maxLength={2000}
          placeholder={t('feed.comment.placeholder')}
          className="flex-1 border border-[var(--color-border-dark)] bg-parchment px-3 py-1.5 text-sm text-ink focus:outline-1 focus:outline-olive"
        />
        <button
          type="submit"
          disabled={pending}
          className="font-display rounded-sm border border-olive-deep bg-olive-deep px-3 py-1.5 text-xs font-medium text-cream disabled:opacity-60"
        >
          {pending ? '…' : t('feed.comment.submit')}
        </button>
      </div>
      {errorKey ? (
        <div className="ms-10 text-xs text-terracotta-deep">{t(errorKey)}</div>
      ) : null}
    </form>
  );
}
