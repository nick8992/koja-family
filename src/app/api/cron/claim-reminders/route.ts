import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { sendClaimReminderAdmin } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Vercel Cron hits this at the schedule in vercel.json. Find still-pending
// claims that crossed the 24h and 1-week thresholds and haven't had that
// specific reminder sent yet.

type PendingUser = {
  user_id: number;
  email: string;
  first_name: string;
  person_id: number;
  person_full_name: string;
  age_hours: number;
  needs_24h: boolean;
  needs_1wk: boolean;
};

function assertAuthorized(req: Request): { ok: boolean; error?: string } {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // If CRON_SECRET isn't configured we refuse to run — otherwise anyone
    // on the internet could spam the admin with reminder emails.
    return { ok: false, error: 'cron_secret_not_set' };
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${expected}`) {
    return { ok: false, error: 'unauthorized' };
  }
  return { ok: true };
}

export async function GET(req: Request) {
  const check = assertAuthorized(req);
  if (!check.ok) {
    return NextResponse.json({ ok: false, error: check.error }, { status: 401 });
  }

  const rows = await db.execute<PendingUser>(sql`
    WITH RECURSIVE chain AS (
      SELECT p.id, p.father_id, p.first_name, 0 AS depth, p.id AS root_id
        FROM persons p
      UNION ALL
      SELECT parent.id, parent.father_id, parent.first_name, c.depth + 1, c.root_id
        FROM chain c JOIN persons parent ON parent.id = c.father_id
    ),
    full_names AS (
      SELECT root_id AS person_id,
             string_agg(REPLACE(first_name, ' Koja', ''), ' ' ORDER BY depth ASC) AS full_name
        FROM chain GROUP BY root_id
    )
    SELECT u.id                                             AS user_id,
           u.email,
           p.first_name,
           p.id                                             AS person_id,
           COALESCE(fn.full_name || ' Koja', p.first_name)  AS person_full_name,
           EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 3600 AS age_hours,
           (u.created_at < NOW() - INTERVAL '24 hours'
            AND NOT EXISTS (SELECT 1 FROM admin_notifications an
                             WHERE an.user_id = u.id AND an.kind = 'claim_24h'))
             AS needs_24h,
           (u.created_at < NOW() - INTERVAL '7 days'
            AND NOT EXISTS (SELECT 1 FROM admin_notifications an
                             WHERE an.user_id = u.id AND an.kind = 'claim_1wk'))
             AS needs_1wk
      FROM users u
      JOIN persons p ON p.id = u.person_id
 LEFT JOIN full_names fn ON fn.person_id = p.id
     WHERE u.approved_at IS NULL
       AND u.rejected_at IS NULL
       AND u.is_active = TRUE
  `);
  const pending = rows as unknown as PendingUser[];

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  const out: { userId: number; kind: '24h' | '1wk'; sent: boolean }[] = [];

  for (const row of pending) {
    if (row.needs_1wk) {
      await sendClaimReminderAdmin({
        kind: '1wk',
        claimantDisplayName: row.first_name,
        claimantEmail: row.email,
        personId: row.person_id,
        personFullName: row.person_full_name,
        ageHours: Number(row.age_hours),
        siteOrigin: origin,
      });
      await db.execute(sql`
        INSERT INTO admin_notifications (user_id, kind, message)
        VALUES (${row.user_id}, 'claim_1wk', ${`1-week reminder sent for #${row.person_id}`})
      `);
      out.push({ userId: row.user_id, kind: '1wk', sent: true });
    } else if (row.needs_24h) {
      await sendClaimReminderAdmin({
        kind: '24h',
        claimantDisplayName: row.first_name,
        claimantEmail: row.email,
        personId: row.person_id,
        personFullName: row.person_full_name,
        ageHours: Number(row.age_hours),
        siteOrigin: origin,
      });
      await db.execute(sql`
        INSERT INTO admin_notifications (user_id, kind, message)
        VALUES (${row.user_id}, 'claim_24h', ${`24h reminder sent for #${row.person_id}`})
      `);
      out.push({ userId: row.user_id, kind: '24h', sent: true });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: pending.length,
    sent: out.length,
    details: out,
  });
}
