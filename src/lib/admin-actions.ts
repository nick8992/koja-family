'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { sendClaimApproved } from './email';

export type AdminActionState = { ok: boolean; error?: string };

async function requireAdmin(): Promise<void> {
  const session = await auth();
  const u = session?.user as { role?: string } | undefined;
  if (u?.role !== 'admin') throw new Error('forbidden');
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

const COLUMN_IS_DATE = new Set(['birth_date', 'death_date']);
const COLUMN_IS_BOOL = new Set(['is_deceased', 'phone_public']);

export async function approveClaimAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = Number(formData.get('userId'));
  if (!Number.isInteger(userId) || userId < 1) return;

  // Fetch user + claimant info for email
  const userRows = await db.execute<{
    id: number;
    email: string;
    first_name: string;
    person_id: number;
    approved_at: string | null;
    rejected_at: string | null;
  }>(sql`
    SELECT u.id, u.email, p.first_name, u.person_id, u.approved_at, u.rejected_at
      FROM users u JOIN persons p ON p.id = u.person_id
     WHERE u.id = ${userId}
     LIMIT 1
  `);
  const user = (userRows as unknown as {
    id: number;
    email: string;
    first_name: string;
    person_id: number;
    approved_at: string | null;
    rejected_at: string | null;
  }[])[0];
  if (!user) return;
  if (user.approved_at) return; // already approved
  if (user.rejected_at) return; // already rejected

  const pendingRows = await db.execute<{
    id: number;
    person_id: number;
    field_name: string;
    new_value: string | null;
  }>(sql`
    SELECT id, person_id, field_name, new_value
      FROM pending_edits
     WHERE user_id = ${userId} AND status = 'pending'
  `);
  const pending = pendingRows as unknown as {
    id: number;
    person_id: number;
    field_name: string;
    new_value: string | null;
  }[];

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE users SET approved_at = NOW(), rejected_at = NULL, is_active = TRUE
         WHERE id = ${userId}
      `);

      for (const p of pending) {
        const oldRows = await tx.execute(
          sql`SELECT ${sql.raw(p.field_name)} AS v FROM persons WHERE id = ${p.person_id}`
        );
        const oldValue =
          (oldRows as unknown as { v: unknown }[])[0]?.v == null
            ? null
            : String((oldRows as unknown as { v: unknown }[])[0].v);

        if (COLUMN_IS_BOOL.has(p.field_name)) {
          const b = p.new_value === 'true' || p.new_value === '1';
          await tx.execute(sql`
            UPDATE persons SET ${sql.raw(p.field_name)} = ${b}, updated_at = NOW()
             WHERE id = ${p.person_id}
          `);
        } else if (COLUMN_IS_DATE.has(p.field_name)) {
          await tx.execute(sql`
            UPDATE persons SET ${sql.raw(p.field_name)} = ${p.new_value}::date, updated_at = NOW()
             WHERE id = ${p.person_id}
          `);
        } else {
          await tx.execute(sql`
            UPDATE persons SET ${sql.raw(p.field_name)} = ${p.new_value}, updated_at = NOW()
             WHERE id = ${p.person_id}
          `);
        }
        await tx.execute(sql`
          INSERT INTO edit_history (person_id, edited_by_user, field_name, old_value, new_value)
          VALUES (${p.person_id}, ${userId}, ${p.field_name}, ${oldValue}, ${p.new_value})
        `);
        await tx.execute(sql`
          UPDATE pending_edits SET status = 'applied', resolved_at = NOW()
           WHERE id = ${p.id}
        `);
      }
    });
  } catch (err) {
    console.error('[approve] tx failed:', err);
    throw err;
  }

  const origin = await getOrigin();
  await sendClaimApproved({
    to: user.email,
    displayName: user.first_name,
    siteOrigin: origin,
  });

  revalidatePath('/admin');
  revalidatePath(`/profile/${user.person_id}`);
  revalidatePath('/tree');
  revalidatePath('/');
}

export async function rejectClaimAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = Number(formData.get('userId'));
  if (!Number.isInteger(userId) || userId < 1) return;

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE users SET rejected_at = NOW(), is_active = FALSE
         WHERE id = ${userId} AND approved_at IS NULL
      `);
      await tx.execute(sql`
        UPDATE pending_edits SET status = 'discarded', resolved_at = NOW()
         WHERE user_id = ${userId} AND status = 'pending'
      `);
    });
  } catch (err) {
    console.error('[reject] tx failed:', err);
    throw err;
  }

  revalidatePath('/admin');
  revalidatePath('/tree');
  revalidatePath('/');
}
