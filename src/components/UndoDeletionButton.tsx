'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  undoPersonDeletionAction,
  type UndoDeletionState,
} from '@/lib/person-deletion-actions';

const initial: UndoDeletionState = { status: 'idle' };

export function UndoDeletionButton({ batchId }: { batchId: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    undoPersonDeletionAction,
    initial
  );

  useEffect(() => {
    if (state.status === 'ok') {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="batchId" value={batchId} />
      <button
        type="submit"
        disabled={pending}
        className="font-display rounded-sm border border-olive-deep bg-olive-deep px-3 py-1.5 text-xs font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
      >
        {pending ? '…' : t('admin.undoDeletion.button')}
      </button>
    </form>
  );
}
