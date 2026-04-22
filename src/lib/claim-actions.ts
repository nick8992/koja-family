'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { sendClaimAdminNotification, sendClaimWelcome } from './email';

export type ClaimState =
  | { status: 'idle' }
  | { status: 'ok'; personId: number; email: string }
  | {
      status: 'error';
      code:
        | 'already_claimed'
        | 'email_taken'
        | 'bad_email'
        | 'bad_password'
        | 'bad_name'
        | 'not_found'
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

  const rawEmail = String(formData.get('email') ?? '');
  const email = normalizeEmail(rawEmail);
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const password = String(formData.get('password') ?? '');

  if (!email) return { status: 'error', code: 'bad_email' };
  if (password.length < 8) return { status: 'error', code: 'bad_password' };

  // Person exists?
  const personRows = await db.execute<{ id: number; first_name: string }>(sql`
    SELECT id, first_name FROM persons WHERE id = ${personId} LIMIT 1
  `);
  const personArr = personRows as unknown as { id: number; first_name: string }[];
  if (personArr.length === 0) return { status: 'error', code: 'not_found' };
  const firstName = personArr[0].first_name;

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

  // All writes in a single pinned-connection transaction so an error at
  // any step rolls back cleanly. (postgres.js pools connections, so a
  // raw BEGIN/COMMIT would hit different connections in serverless.)
  // Note: we do NOT update persons.first_name/last_name on claim — the
  // person's existing name stays as-is. Claimant can correct spelling
  // via the profile edit flow after sign-in.
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        INSERT INTO users (person_id, email, phone, password_hash, role)
        VALUES (${personId}, ${email}, ${phone}, ${passwordHash}, 'member')
      `);
      await tx.execute(sql`
        INSERT INTO admin_notifications (user_id, kind, message)
        SELECT id, 'new_claim',
               ${`${firstName} claimed person #${personId}`}
          FROM users WHERE email = ${email}
      `);
    });
  } catch (err) {
    console.error('[claim] tx failed:', err);
    return { status: 'error', code: 'generic' };
  }

  // Emails are best-effort. The sendSafe wrapper inside ./email swallows
  // failures, but wrap defensively so an exception here can't 500 the page.
  try {
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
  } catch (err) {
    console.warn('[claim] notification step threw (ignored):', err);
  }

  revalidatePath(`/profile/${personId}`);
  revalidatePath('/tree');
  revalidatePath('/');
  revalidatePath('/admin');

  // Don't auto-sign-in from the server action (fragile in production with
  // custom domains). The client will call next-auth's signIn() directly.
  return { status: 'ok', personId, email };
}
