'use server';

import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import type { SessionUser } from './permissions';
import { fanOutAnnouncementNotifications } from './notifications';

async function requireSessionUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user as SessionUser | undefined;
  if (!u || !u.id) throw new Error('not_signed_in');
  return u;
}

export type CreateEventState =
  | { status: 'idle' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

export async function createEventAction(
  _prev: CreateEventState,
  formData: FormData
): Promise<CreateEventState> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return { status: 'error', message: 'not_signed_in' };
  }
  if (!user.approved && user.role !== 'admin') {
    return { status: 'error', message: 'forbidden' };
  }

  const title = String(formData.get('title') ?? '').trim();
  if (title.length < 1 || title.length > 200) {
    return { status: 'error', message: 'bad_title' };
  }
  const startsAtStr = String(formData.get('startsAt') ?? '').trim();
  if (!startsAtStr) return { status: 'error', message: 'bad_starts_at' };
  const startsAt = new Date(startsAtStr);
  if (Number.isNaN(startsAt.getTime())) {
    return { status: 'error', message: 'bad_starts_at' };
  }
  const endsAtStr = String(formData.get('endsAt') ?? '').trim();
  let endsAt: Date | null = null;
  if (endsAtStr) {
    const d = new Date(endsAtStr);
    if (Number.isNaN(d.getTime())) {
      return { status: 'error', message: 'bad_ends_at' };
    }
    endsAt = d;
  }
  const location = String(formData.get('location') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;

  // Creating an event also posts an announcement to the feed so the family
  // sees it scrolling by, not only on the /events page. Both writes happen
  // in one transaction so a feed-post failure won't leave a silent event.
  const whenLabel = startsAt.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  // The feed renders a "View event →" button for posts linked to an event,
  // so the body doesn't need to spell out a URL.
  const bodyLines = [
    title,
    '',
    `When: ${whenLabel}`,
  ];
  if (location) bodyLines.push(`Where: ${location}`);
  if (description) {
    bodyLines.push('');
    bodyLines.push(description);
  }
  const postBody = bodyLines.join('\n');

  try {
    await db.transaction(async (tx) => {
      // Insert the announcement post first so we can link the event to it.
      const postRows = await tx.execute<{ id: number }>(sql`
        INSERT INTO posts (author_user_id, body, kind)
        VALUES (${Number(user.id)}, ${postBody}, 'announcement')
        RETURNING id
      `);
      const postId = (postRows as unknown as { id: number }[])[0].id;
      await tx.execute(sql`
        INSERT INTO events (creator_user_id, title, description, starts_at, ends_at, location, announcement_post_id)
        VALUES (
          ${Number(user.id)},
          ${title},
          ${description},
          ${startsAt.toISOString()}::timestamptz,
          ${endsAt ? endsAt.toISOString() : null}::timestamptz,
          ${location},
          ${postId}
        )
      `);
    });
  } catch (err) {
    console.error('[event] create tx failed:', err);
    return { status: 'error', message: 'generic' };
  }

  // Fan out an announcement notification for approved creators. Same rule
  // as announcement posts — unapproved creators' events are only visible
  // to themselves so there's nothing to notify the family about.
  if (user.approved && user.personId) {
    try {
      const personRows = await db.execute<{ first_name: string }>(
        sql`SELECT first_name FROM persons WHERE id = ${user.personId} LIMIT 1`
      );
      const actor = (personRows as unknown as { first_name: string }[])[0];
      if (actor) {
        await fanOutAnnouncementNotifications({
          actorUserId: Number(user.id),
          actorPersonId: user.personId,
          actorFirstName: actor.first_name,
          bodyPreview: title,
          link: '/events',
        });
      }
    } catch (err) {
      console.warn('[notifications] event fan-out failed:', err);
    }
  }

  revalidatePath('/events');
  revalidatePath('/feed');
  revalidatePath('/');
  return { status: 'ok' };
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const user = await requireSessionUser();
  const eventId = Number(formData.get('eventId'));
  if (!Number.isInteger(eventId) || eventId < 1) return;

  const rows = await db.execute<{ creator_user_id: number }>(sql`
    SELECT creator_user_id FROM events WHERE id = ${eventId} AND deleted_at IS NULL
  `);
  const ev = (rows as unknown as { creator_user_id: number }[])[0];
  if (!ev) return;
  if (ev.creator_user_id !== Number(user.id) && user.role !== 'admin') return;

  await db.execute(sql`UPDATE events SET deleted_at = NOW() WHERE id = ${eventId}`);
  revalidatePath('/events');
  revalidatePath('/');
}
