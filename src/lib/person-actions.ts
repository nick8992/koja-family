'use server';

import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { canAddChildUnder, canEditPerson, type SessionUser } from './permissions';

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

  const allowed = await canAddChildUnder(user, fatherId);
  if (!allowed) {
    return { status: 'error', message: 'forbidden' };
  }

  const rows = await db.execute<{ id: number }>(sql`
    INSERT INTO persons (first_name, gender, father_id)
    VALUES (${firstName}, ${gender}, ${fatherId})
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

// ===========================================================================
// Admin-only: insert a father above an existing person on the tree.
// Creates a new root-level person (father_id = NULL) and points the
// target person at them. Useful for correcting a missing father or
// extending the tree upward from Hanna. Refuses if the target
// already has a father — changing father_id is a destructive edit
// that's out of scope for this button.
// ===========================================================================

export async function addFatherAction(
  _prev: AddPersonState,
  formData: FormData
): Promise<AddPersonState> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return { status: 'error', message: 'not_signed_in' };
  }
  if (user.role !== 'admin') {
    return { status: 'error', message: 'forbidden' };
  }

  const personIdRaw = formData.get('personId');
  const personId = Number(personIdRaw);
  if (!Number.isInteger(personId) || personId < 1) {
    return { status: 'error', message: 'bad_person' };
  }

  const firstName = String(formData.get('firstName') ?? '').trim();
  if (firstName.length < 1 || firstName.length > 100) {
    return { status: 'error', message: 'bad_name' };
  }
  const genderRaw = String(formData.get('gender') ?? 'M');
  const gender = genderRaw === 'F' ? 'F' : 'M';

  const check = await db.execute<{ father_id: number | null }>(sql`
    SELECT father_id FROM persons WHERE id = ${personId} AND deleted_at IS NULL LIMIT 1
  `);
  const row = (check as unknown as { father_id: number | null }[])[0];
  if (!row) return { status: 'error', message: 'not_found' };
  if (row.father_id != null) {
    return { status: 'error', message: 'already_has_father' };
  }

  let newId = 0;
  try {
    await db.transaction(async (tx) => {
      const rows = await tx.execute<{ id: number }>(sql`
        INSERT INTO persons (first_name, gender, father_id)
        VALUES (${firstName}, ${gender}, NULL)
        RETURNING id
      `);
      newId = (rows as unknown as { id: number }[])[0].id;
      await tx.execute(sql`
        UPDATE persons SET father_id = ${newId}, updated_at = NOW()
         WHERE id = ${personId}
      `);
    });
  } catch (err) {
    console.error('[addFather] tx failed:', err);
    return { status: 'error', message: 'insert_failed' };
  }

  revalidatePath(`/profile/${personId}`);
  revalidatePath(`/profile/${newId}`);
  revalidatePath('/tree');
  revalidatePath('/');
  return { status: 'ok', newId };
}

// ===========================================================================
// Update a single field on an existing person.
//   - Approved users: write through to `persons`, append `edit_history`.
//   - Unapproved users: write to `pending_edits`. Their own reads overlay
//     these values. Other users never see them.
// ===========================================================================

export type UpdateFieldState =
  | { status: 'idle' }
  | { status: 'ok'; pending: boolean }
  | { status: 'error'; message: string };

type FieldType = 'text' | 'textarea' | 'date' | 'bool' | 'int';

// Whitelist of editable columns + their input type.
const EDITABLE_FIELDS: Record<string, FieldType> = {
  first_name: 'text',
  current_location: 'text',
  birthplace: 'text',
  birth_year: 'int',
  birth_date: 'date',
  death_year: 'int',
  death_date: 'date',
  is_deceased: 'bool',
  occupation: 'text',
  phone: 'text',
  phone_public: 'bool',
  email: 'text',
  bio: 'textarea',
};

// Admin-only fields. `notes` is unused in the UI but kept in the set
// for completeness. `is_deceased` + `death_date` are admin-only per
// owner preference — marking someone deceased is a weighty call and
// shouldn't be in the 3-gen edit window.
const ADMIN_ONLY_FIELDS = new Set<string>([
  'notes',
  'is_deceased',
  'death_date',
  'death_year',
]);

function coerceForColumn(type: FieldType, raw: string): string | boolean | number | null {
  if (raw === '' || raw == null) return type === 'bool' ? false : null;
  if (type === 'bool') return raw === 'true' || raw === 'on' || raw === '1';
  if (type === 'int') {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  return raw;
}

async function writeField(
  personId: number,
  column: string,
  type: FieldType,
  value: string | boolean | number | null,
  editedByUser: number
): Promise<void> {
  // Capture old value for the audit log.
  const [oldRow] = (await db.execute(
    sql`SELECT ${sql.raw(column)} AS v FROM persons WHERE id = ${personId}`
  )) as unknown as { v: unknown }[];
  const oldValue = oldRow?.v == null ? null : String(oldRow.v);

  if (type === 'bool') {
    await db.execute(sql`
      UPDATE persons SET ${sql.raw(column)} = ${value as boolean}, updated_at = NOW()
       WHERE id = ${personId}
    `);
  } else if (type === 'date') {
    const v = value == null ? null : String(value);
    await db.execute(sql`
      UPDATE persons SET ${sql.raw(column)} = ${v}::date, updated_at = NOW()
       WHERE id = ${personId}
    `);
  } else if (type === 'int') {
    const v = value == null ? null : Number(value);
    await db.execute(sql`
      UPDATE persons SET ${sql.raw(column)} = ${v}, updated_at = NOW()
       WHERE id = ${personId}
    `);
  } else {
    await db.execute(sql`
      UPDATE persons SET ${sql.raw(column)} = ${value as string | null}, updated_at = NOW()
       WHERE id = ${personId}
    `);
  }

  const newValueText = value == null ? null : String(value);
  await db.execute(sql`
    INSERT INTO edit_history (person_id, edited_by_user, field_name, old_value, new_value)
    VALUES (${personId}, ${editedByUser}, ${column}, ${oldValue}, ${newValueText})
  `);
}

async function queuePendingEdit(
  userId: number,
  personId: number,
  column: string,
  value: string | boolean | number | null
): Promise<void> {
  const valueText = value == null ? null : String(value);
  // Replace any previous pending write for the same (user, person, field).
  await db.execute(sql`
    DELETE FROM pending_edits
     WHERE user_id = ${userId} AND person_id = ${personId}
       AND field_name = ${column} AND status = 'pending'
  `);
  await db.execute(sql`
    INSERT INTO pending_edits (user_id, person_id, field_name, new_value)
    VALUES (${userId}, ${personId}, ${column}, ${valueText})
  `);
}

export async function updatePersonFieldAction(
  _prev: UpdateFieldState,
  formData: FormData
): Promise<UpdateFieldState> {
  let user: SessionUser;
  try {
    user = await requireSessionUser();
  } catch {
    return { status: 'error', message: 'not_signed_in' };
  }

  const personId = Number(formData.get('personId'));
  if (!Number.isInteger(personId) || personId < 1) {
    return { status: 'error', message: 'bad_person' };
  }

  const field = String(formData.get('field') ?? '');
  if (!(field in EDITABLE_FIELDS) && !ADMIN_ONLY_FIELDS.has(field)) {
    return { status: 'error', message: 'bad_field' };
  }
  if (ADMIN_ONLY_FIELDS.has(field) && user.role !== 'admin') {
    return { status: 'error', message: 'forbidden' };
  }

  const allowed = await canEditPerson(Number(user.id), personId);
  if (!allowed) return { status: 'error', message: 'forbidden' };

  const type = EDITABLE_FIELDS[field] ?? 'text';
  const raw = String(formData.get('value') ?? '');
  const coerced = coerceForColumn(type, raw);

  if (user.approved) {
    await writeField(personId, field, type, coerced, Number(user.id));
    revalidatePath(`/profile/${personId}`);
    revalidatePath('/tree');
    revalidatePath('/');
    return { status: 'ok', pending: false };
  }

  await queuePendingEdit(Number(user.id), personId, field, coerced);
  revalidatePath(`/profile/${personId}`);
  return { status: 'ok', pending: true };
}
