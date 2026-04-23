'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  deletePersonCascadeAction,
  type DeletePersonState,
} from '@/lib/person-deletion-actions';

const initial: DeletePersonState = { status: 'idle' };

type Props = {
  personId: number;
  personName: string;
  /** Number of direct children — used in the confirmation copy. */
  directChildrenCount: number;
};

export function DeletePersonButton({
  personId,
  personName,
  directChildrenCount,
}: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deletePersonCascadeAction,
    initial
  );
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state.status === 'ok') {
      // After a successful cascade delete the profile no longer exists.
      // Send the admin back to the tree (or to /admin where they can undo).
      router.push('/admin');
    }
  }, [state, router]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="font-display rounded-sm border border-terracotta bg-cream px-3 py-1.5 text-xs font-medium text-terracotta-deep hover:bg-terracotta hover:text-cream"
      >
        {t('admin.deletePerson.button')}
      </button>
    );
  }

  const warning =
    directChildrenCount > 0
      ? t('admin.deletePerson.confirm.withChildren', {
          name: personName,
          n: directChildrenCount,
        })
      : t('admin.deletePerson.confirm.leaf', { name: personName });

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-sm border-2 border-terracotta bg-parchment-deep p-3 text-start"
    >
      <input type="hidden" name="personId" value={personId} />
      <p className="font-display text-xs leading-relaxed text-ink-soft">{warning}</p>
      {state.status === 'error' ? (
        <p className="text-xs text-terracotta-deep">
          {t('admin.deletePerson.error')} ({state.message})
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="font-display flex-1 rounded-sm border border-[var(--color-border-dark)] bg-cream px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-parchment-deep disabled:opacity-60"
        >
          {t('admin.deletePerson.cancel')}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="font-display flex-1 rounded-sm border border-terracotta-deep bg-terracotta-deep px-3 py-1.5 text-xs font-medium text-cream hover:bg-terracotta disabled:opacity-60"
        >
          {pending ? '…' : t('admin.deletePerson.confirm.button')}
        </button>
      </div>
    </form>
  );
}
