'use server';

import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { canAddChildUnder, type SessionUser } from './permissions';

export type AddPersonState =
  | { status: 'idle' }
  | { status: 'ok'; newId: number }
  | { status: 'error'; message: string };

export type AddPersonInput = {
  fatherId: number | null;
  firstName: string;
  gender: 'M' | 'F';
  notes?: string | null;
};

async function requireSessionUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user as SessionUser | undefined;
  if (!u || !u.id) throw new Error('not_signed_in');
  return u;
}

export async function addPersonAction(
  _prev: AddPersonState,
  formData: FormData
): Promise<AddPersonState> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return { status: 'error', message: 'not_signed_in' };
  }

  const fatherIdRaw = formData.get('fatherId');
  const fatherId =
    fatherIdRaw == null || fatherIdRaw === '' || fatherIdRaw === 'null'
      ? null
      : Number(fatherIdRaw);
  if (fatherId != null && !Number.isInteger(fatherId)) {
    return { status: 'error', message: 'bad_father' };
  }

  const firstName = String(formData.get('firstName') ?? '').trim();
  if (firstName.length < 1 || firstName.length > 100) {
    return { status: 'error', message: 'bad_name' };
  }

  const genderRaw = String(formData.get('gender') ?? '');
  if (genderRaw !== 'M' && genderRaw !== 'F') {
    return { status: 'error', message: 'bad_gender' };
  }
  const gender = genderRaw;

  const notesRaw = String(formData.get('notes') ?? '').trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;

  const allowed = await canAddChildUnder(user, fatherId);
  if (!allowed) {
    return { status: 'error', message: 'forbidden' };
  }

  const rows = await db.execute<{ id: number }>(sql`
    INSERT INTO persons (first_name, gender, father_id, notes)
    VALUES (${firstName}, ${gender}, ${fatherId}, ${notes})
    RETURNING id
  `);
  const arr = rows as unknown as { id: number }[];
  if (arr.length === 0) {
    return { status: 'error', message: 'insert_failed' };
  }
  const newId = arr[0].id;

  if (fatherId != null) revalidatePath(`/profile/${fatherId}`);
  revalidatePath('/tree');
  revalidatePath('/');

  return { status: 'ok', newId };
}
