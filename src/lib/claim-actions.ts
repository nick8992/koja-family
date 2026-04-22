'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { AuthError } from 'next-auth';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { signIn } from '@/auth';
import { sendClaimAdminNotification, sendClaimWelcome } from './email';

export type ClaimState =
  | { status: 'idle' }
  | { status: 'ok' }
  | {
      status: 'error';
      code:
        | 'already_claimed'
        | 'email_taken'
        | 'bad_email'
        | 'bad_password'
        | 'bad_name'
        | 'not_found'
        | 'login_failed'
        | 'generic';
    };

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

export async function claimAction(
  _prev: ClaimState,
  formData: FormData
): Promise<ClaimState> {
  const personId = Number(formData.get('personId'));
  if (!Number.isInteger(personId) || personId < 1) {
    return { status: 'error', code: 'not_found' };
  }

  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? 'Koja').trim() || 'Koja';
  const rawEmail = String(formData.get('email') ?? '');
  const email = normalizeEmail(rawEmail);
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const password = String(formData.get('password') ?? '');

  if (firstName.length < 1 || firstName.length > 100) {
    return { status: 'error', code: 'bad_name' };
  }
  if (!email) return { status: 'error', code: 'bad_email' };
  if (password.length < 8) return { status: 'error', code: 'bad_password' };

  // Person exists?
  const personRows = await db.execute<{ id: number; first_name: string }>(sql`
    SELECT id, first_name FROM persons WHERE id = ${personId} LIMIT 1
  `);
  const personArr = personRows as unknown as { id: number; first_name: string }[];
  if (personArr.length === 0) return { status: 'error', code: 'not_found' };

  // Already claimed?
  const existingClaim = await db.execute<{ id: number }>(
    sql`SELECT id FROM users WHERE person_id = ${personId} LIMIT 1`
  );
  if ((existingClaim as unknown as unknown[]).length > 0) {
    return { status: 'error', code: 'already_claimed' };
  }

  // Email free?
  const existingEmail = await db.execute<{ id: number }>(
    sql`SELECT id FROM users WHERE LOWER(email) = ${email} LIMIT 1`
  );
  if ((existingEmail as unknown as unknown[]).length > 0) {
    return { status: 'error', code: 'email_taken' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Update person row with claimer-provided name (handles Nicolas -> Nicholas
  // correction) and insert user row in a transaction.
  await db.execute(sql`BEGIN`);
  try {
    await db.execute(sql`
      UPDATE persons
         SET first_name = ${firstName},
             last_name  = ${lastName},
             updated_at = NOW()
       WHERE id = ${personId}
    `);
    await db.execute(sql`
      INSERT INTO users (person_id, email, phone, password_hash, role)
      VALUES (${personId}, ${email}, ${phone}, ${passwordHash}, 'member')
    `);
    // Record a notification row for the admin queue (read by /admin later).
    await db.execute(sql`
      INSERT INTO admin_notifications (user_id, kind, message)
      SELECT id, 'new_claim',
             ${`${firstName} claimed person #${personId}`}
        FROM users WHERE email = ${email}
    `);
    await db.execute(sql`COMMIT`);
  } catch (err) {
    await db.execute(sql`ROLLBACK`);
    console.error('[claim] tx failed:', err);
    return { status: 'error', code: 'generic' };
  }

  // Notify (best-effort)
  const origin = await getOrigin();
  const fullNameRows = await db.execute<{ full: string }>(sql`
    WITH RECURSIVE chain AS (
      SELECT id, father_id, first_name, 0 AS depth FROM persons WHERE id = ${personId}
      UNION ALL
      SELECT p.id, p.father_id, p.first_name, c.depth + 1
        FROM chain c JOIN persons p ON p.id = c.father_id
    )
    SELECT string_agg(REPLACE(first_name, ' Koja', ''), ' ' ORDER BY depth ASC) AS full FROM chain
  `);
  const personFullName =
    (fullNameRows as unknown as { full: string }[])[0]?.full?.concat(' Koja') ?? firstName;

  await sendClaimAdminNotification({
    claimantDisplayName: firstName,
    claimantEmail: email,
    claimantPhone: phone,
    personId,
    personFullName,
    siteOrigin: origin,
  });
  await sendClaimWelcome({
    to: email,
    displayName: firstName,
    siteOrigin: origin,
  });

  revalidatePath(`/profile/${personId}`);
  revalidatePath('/tree');
  revalidatePath('/');
  revalidatePath('/admin');

  // Auto-sign them in — signIn throws a redirect on success that Next catches.
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: `/profile/${personId}`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: 'error', code: 'login_failed' };
    }
    throw err;
  }

  return { status: 'ok' };
}
