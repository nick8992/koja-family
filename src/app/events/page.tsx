import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { loadUpcomingEvents, type FamilyEvent } from '@/lib/event-data';
import { getLanguage, tServer } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n/dictionary';
import { CreateEventModal } from '@/components/CreateEventModal';
import { DeleteEventButton } from '@/components/DeleteEventButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Events' };

function fmtEventTime(iso: string, lang: 'en' | 'ar'): string {
  const d = new Date(iso);
  const locale = lang === 'ar' ? 'ar' : 'en-US';
  return d.toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function monthKey(d: Date): string {
  return d.toLocaleString('default', { month: 'short' }).toUpperCase();
}

export default async function EventsPage() {
  const session = await auth();
  const sessionUser = session?.user as
    | {
        id?: string;
        role?: 'member' | 'admin';
        approved?: boolean;
      }
    | undefined;
  const viewerUserId = sessionUser?.id ? Number(sessionUser.id) : null;
  const canCreate =
    !!sessionUser && (sessionUser.role === 'admin' || !!sessionUser.approved);

  const lang = await getLanguage();
  const events = await loadUpcomingEvents(viewerUserId);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
            {await tServer('events.title')}
          </h1>
          <p className="font-display mt-2 text-base italic text-ink-muted sm:text-lg">
            {await tServer('events.sub')}
          </p>
        </div>
        {canCreate ? (
          <CreateEventModal />
        ) : !sessionUser ? (
          <Link
            href="/login"
            className="font-display rounded-sm border border-[var(--color-border-dark)] px-4 py-2 text-sm font-medium text-ink-soft hover:bg-parchment-deep"
          >
            {await tServer('nav.login')}
          </Link>
        ) : null}
      </div>

      {events.length === 0 ? (
        <div className="border border-border bg-cream p-10 text-center">
          <p className="font-display italic text-ink-muted">
            {await tServer('events.empty')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-4">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                lang={lang}
                viewerUserId={viewerUserId}
                viewerRole={sessionUser?.role ?? null}
                organizedByLabel={translate(lang, 'events.organized_by')}
                pendingNotice={translate(lang, 'events.pending.notice')}
              />
            ))}
          </div>
          <aside>
            <MonthCalendar events={events} lang={lang} />
          </aside>
        </div>
      )}
    </div>
  );
}

function EventCard({
  ev,
  lang,
  viewerUserId,
  viewerRole,
  organizedByLabel,
  pendingNotice,
}: {
  ev: FamilyEvent;
  lang: 'en' | 'ar';
  viewerUserId: number | null;
  viewerRole: 'member' | 'admin' | null;
  organizedByLabel: string;
  pendingNotice: string;
}) {
  const d = new Date(ev.startsAt);
  const canDelete =
    viewerUserId != null &&
    (viewerRole === 'admin' || viewerUserId === ev.creator.userId);

  return (
    <article className="grid grid-cols-[80px_1fr] gap-5 border border-border bg-cream p-5">
      <div className="flex flex-col items-center justify-center bg-olive-deep py-2.5 text-cream">
        <div className="font-display text-[11px] uppercase tracking-[1.5px] text-gold-light">
          {monthKey(d)}
        </div>
        <div className="font-display text-3xl font-medium leading-none">
          {d.getDate()}
        </div>
        <div className="font-display mt-0.5 text-[10px] text-gold-light">
          {d.getFullYear()}
        </div>
      </div>
      <div>
        {ev.pendingForViewer ? (
          <div className="mb-2 inline-block border-s-[3px] border-gold bg-parchment-deep px-3 py-1 text-[11px] italic text-ink-muted font-display">
            {pendingNotice}
          </div>
        ) : null}
        <div className="font-display text-xl font-medium text-ink">{ev.title}</div>
        <div className="font-display mt-1 text-xs text-ink-muted">
          {fmtEventTime(ev.startsAt, lang)}
          {ev.location ? ` · 📍 ${ev.location}` : ''}
        </div>
        {ev.description ? (
          <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {ev.description}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-between">
          <div className="font-display text-[11px] italic text-ink-muted">
            {organizedByLabel}{' '}
            <Link
              href={`/profile/${ev.creator.personId}`}
              className="not-italic text-terracotta-deep hover:underline"
            >
              {ev.creator.firstName}
            </Link>
          </div>
          {canDelete ? <DeleteEventButton eventId={ev.id} /> : null}
        </div>
      </div>
    </article>
  );
}

function MonthCalendar({ events, lang }: { events: FamilyEvent[]; lang: 'en' | 'ar' }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = first.getDay();
  const eventDays = new Set<number>();
  for (const e of events) {
    const d = new Date(e.startsAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      eventDays.add(d.getDate());
    }
  }
  const days =
    lang === 'ar'
      ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const locale = lang === 'ar' ? 'ar' : 'en-US';
  const monthLabel = first.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <div className="border border-border bg-cream p-5">
      <div className="font-display mb-4 text-xl font-medium text-ink">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => (
          <div
            key={i}
            className="font-display py-1 text-[10px] uppercase tracking-wider text-ink-muted"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: startDay }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const hasEvent = eventDays.has(day);
          const isToday = day === now.getDate();
          return (
            <div
              key={day}
              className={
                'font-display relative flex aspect-square items-center justify-center text-sm ' +
                (hasEvent
                  ? 'bg-olive-deep text-cream'
                  : 'bg-parchment text-ink-soft') +
                (isToday ? ' outline-2 outline-terracotta' : '')
              }
            >
              {day}
              {hasEvent ? (
                <span className="absolute bottom-0.5 end-1 text-[8px] text-gold-light">●</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
