'use client';

import { useLanguage } from '@/lib/i18n/context';
import { deleteEventAction } from '@/lib/event-actions';

export function DeleteEventButton({ eventId }: { eventId: number }) {
  const { t } = useLanguage();
  return (
    <form
      action={deleteEventAction}
      onSubmit={(e) => {
        if (!window.confirm(t('events.delete.confirm'))) e.preventDefault();
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <button
        type="submit"
        className="font-display text-xs text-ink-muted hover:text-terracotta-deep"
      >
        {t('events.delete')}
      </button>
    </form>
  );
}
