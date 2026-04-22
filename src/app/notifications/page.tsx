import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  loadNotifications,
  markAllNotificationsRead,
  type NotificationItem,
} from '@/lib/notifications';
import { getLanguage, tServer } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n/dictionary';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Notifications' };

function fmtTime(iso: string, lang: 'en' | 'ar'): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.max(0, Math.round((now - then) / 1000));
  if (secs < 60) return lang === 'ar' ? 'الآن' : 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return lang === 'ar' ? `منذ ${mins} دقيقة` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return lang === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return lang === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar' : 'en');
}

export default async function NotificationsPage() {
  const session = await auth();
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!sessionUser?.id) redirect('/login');

  const userId = Number(sessionUser.id);
  const [notifications, lang] = await Promise.all([
    loadNotifications(userId),
    getLanguage(),
  ]);
  // Mark everything read the moment the viewer lands here.
  try {
    await markAllNotificationsRead(userId);
  } catch (err) {
    console.warn('[notifications] markAllRead failed:', err);
  }

  const emptyLabel = translate(lang, 'notifications.empty');

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
        {await tServer('notifications.title')}
      </h1>
      <p className="font-display mt-2 mb-6 text-base italic text-ink-muted sm:text-lg">
        {await tServer('notifications.sub')}
      </p>

      {notifications.length === 0 ? (
        <div className="border border-border bg-cream p-10 text-center">
          <p className="font-display italic text-ink-muted">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <NotificationRow key={n.id} n={n} lang={lang} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationRow({
  n,
  lang,
}: {
  n: NotificationItem;
  lang: 'en' | 'ar';
}) {
  const initial = n.actorFirstName?.[0]?.toUpperCase() ?? '?';
  const body = (
    <div className="flex items-start gap-3">
      <Link
        href={n.actorPersonId ? `/profile/${n.actorPersonId}` : '#'}
        className="shrink-0"
      >
        <span
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-gold font-display text-base font-semibold text-cream"
          style={{
            background: n.actorPhotoUrl
              ? `url(${n.actorPhotoUrl}) center/cover`
              : 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))',
          }}
        >
          {n.actorPhotoUrl ? null : initial}
        </span>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[14px] leading-snug text-ink">{n.message}</p>
        <p className="mt-1 text-xs text-ink-muted">{fmtTime(n.createdAt, lang)}</p>
      </div>
    </div>
  );
  return (
    <li
      className={
        'border bg-cream p-4 ' +
        (n.readAt == null ? 'border-terracotta/40 bg-parchment-deep' : 'border-border')
      }
    >
      {n.link ? (
        <Link href={n.link} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
