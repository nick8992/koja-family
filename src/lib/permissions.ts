import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type SessionUser = {
  id: string;
  personId: number | null;
  role: 'member' | 'admin';
  approved: boolean;
  displayName: string;
};

/**
 * Can the given user edit the target person row? Matches the SQL-side
 * `user_can_edit` function: admin bypass, otherwise self + 3 generations up.
 */
export async function canEditPerson(
  userId: number,
  targetPersonId: number
): Promise<boolean> {
  const rows = await db.execute<{ ok: boolean }>(sql`
    SELECT user_can_edit(${userId}, ${targetPersonId}) AS ok
  `);
  const arr = rows as unknown as { ok: boolean }[];
  return arr.length > 0 && arr[0].ok === true;
}

/**
 * Can the user add a child to the given parent?
 *  - fatherId = null  → only admins (new root-level sibling of Hanna)
 *  - fatherId set     → same rule as editing that node
 */
export async function canAddChildUnder(
  user: SessionUser,
  fatherId: number | null
): Promise<boolean> {
  if (user.role === 'admin') return true;
  if (!user.approved) return false;
  if (fatherId == null) return false;
  return canEditPerson(Number(user.id), fatherId);
}
