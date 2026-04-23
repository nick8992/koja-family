'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import type { SessionUser } from './permissions';

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user as SessionUser | undefined;
  if (!u || !u.id) throw new Error('not_signed_in');
  if (u.role !== 'admin') throw new Error('forbidden');
  return u;
}

export type DeletePersonState =
  | { status: 'idle' }
  | { status: 'ok'; batchId: string; count: number }
  | { status: 'error'; message: string };

/**
 * Soft-deletes a person and every descendant in their subtree. All rows
 * get the same deletion_batch_id so the admin can undo the whole cascade
 * as a unit. Refuses to delete the root (father_id IS NULL). Stores who
 * performed the delete so an audit trail is visible on the admin page.
 */
export async function deletePersonCascadeAction(
  _prev: DeletePersonState,
  formData: FormData
): Promise<DeletePersonState> {
  let user: SessionUser;
  try {
    user = await requireAdmin();
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'forbidden',
    };
  }

  const personId = Number(formData.get('personId'));
  if (!Number.isInteger(personId) || personId < 1) {
    return { status: 'error', message: 'bad_person' };
  }

  // Guard: refuse to delete the root. Removing Hanna would break the
  // whole tree and isn't something admins should do from the UI.
  const rootCheck = await db.execute<{ father_id: number | null }>(sql`
    SELECT father_id FROM persons WHERE id = ${personId} AND deleted_at IS NULL LIMIT 1
  `);
  const rootRow = (rootCheck as unknown as { father_id: number | null }[])[0];
  if (!rootRow) return { status: 'error', message: 'not_found' };
  if (rootRow.father_id == null) {
    return { status: 'error', message: 'cannot_delete_root' };
  }

  const batchId = randomUUID();
  try {
    const rows = await db.execute<{ count: string }>(sql`
      WITH RECURSIVE subtree AS (
        SELECT id FROM persons WHERE id = ${personId} AND deleted_at IS NULL
        UNION ALL
        SELECT p.id
          FROM persons p
          JOIN subtree s ON p.father_id = s.id
         WHERE p.deleted_at IS NULL
      ),
      upd AS (
        UPDATE persons
           SET deleted_at = NOW(),
               deleted_by_user = ${Number(user.id)},
               deletion_batch_id = ${batchId},
               updated_at = NOW()
         WHERE id IN (SELECT id FROM subtree)
         RETURNING id
      )
      SELECT COUNT(*)::text AS count FROM upd
    `);
    const count = Number((rows as unknown as { count: string }[])[0]?.count ?? 0);
    if (count === 0) return { status: 'error', message: 'not_found' };

    revalidatePath('/tree');
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath(`/profile/${personId}`);
    return { status: 'ok', batchId, count };
  } catch (err) {
    console.error('[delete-person] cascade failed:', err);
    return { status: 'error', message: 'generic' };
  }
}

export type UndoDeletionState =
  | { status: 'idle' }
  | { status: 'ok'; count: number }
  | { status: 'error'; message: string };

/**
 * Restores every row flagged with the given deletion_batch_id. This
 * brings the whole cascade back at once, so an accidental delete of a
 * grandparent doesn't leave descendants orphaned.
 */
export async function undoPersonDeletionAction(
  _prev: UndoDeletionState,
  formData: FormData
): Promise<UndoDeletionState> {
  try {
    await requireAdmin();
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'forbidden',
    };
  }

  const batchId = String(formData.get('batchId') ?? '').trim();
  if (!batchId || batchId.length > 64) {
    return { status: 'error', message: 'bad_batch' };
  }

  try {
    const rows = await db.execute<{ count: string }>(sql`
      WITH upd AS (
        UPDATE persons
           SET deleted_at = NULL,
               deleted_by_user = NULL,
               deletion_batch_id = NULL,
               updated_at = NOW()
         WHERE deletion_batch_id = ${batchId}
         RETURNING id
      )
      SELECT COUNT(*)::text AS count FROM upd
    `);
    const count = Number((rows as unknown as { count: string }[])[0]?.count ?? 0);
    if (count === 0) return { status: 'error', message: 'not_found' };

    revalidatePath('/tree');
    revalidatePath('/');
    revalidatePath('/admin');
    return { status: 'ok', count };
  } catch (err) {
    console.error('[undo-deletion] failed:', err);
    return { status: 'error', message: 'generic' };
  }
}

export type DeletionBatch = {
  batchId: string;
  deletedAt: string;
  deletedByUser: number | null;
  deletedByName: string | null;
  rootName: string;
  count: number;
};

export async function loadRecentDeletions(limit = 30): Promise<DeletionBatch[]> {
  try {
    await requireAdmin();
  } catch {
    return [];
  }
  // One row per batch: earliest deleted_at as the batch time, any row's
  // deleted_by as the actor, and COUNT(*) as the cascade size. The root
  // of each batch is the row whose father is NOT in the same batch
  // (i.e. the topmost deleted person in that cascade).
  const rows = await db.execute<{
    batch_id: string;
    deleted_at: string;
    deleted_by_user: number | null;
    deleted_by_name: string | null;
    root_name: string;
    count: string;
  }>(sql`
    WITH batches AS (
      SELECT deletion_batch_id AS batch_id,
             MAX(deleted_at)   AS deleted_at,
             COUNT(*)::text    AS count
        FROM persons
       WHERE deletion_batch_id IS NOT NULL
         AND deleted_at IS NOT NULL
       GROUP BY deletion_batch_id
    ),
    roots AS (
      SELECT DISTINCT ON (p.deletion_batch_id)
             p.deletion_batch_id AS batch_id,
             p.first_name        AS root_name,
             p.deleted_by_user
        FROM persons p
       WHERE p.deletion_batch_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM persons parent
            WHERE parent.id = p.father_id
              AND parent.deletion_batch_id = p.deletion_batch_id
         )
       ORDER BY p.deletion_batch_id, p.id
    )
    SELECT b.batch_id, b.deleted_at, b.count,
           r.root_name, r.deleted_by_user,
           per.first_name AS deleted_by_name
      FROM batches b
      JOIN roots r ON r.batch_id = b.batch_id
      LEFT JOIN users u ON u.id = r.deleted_by_user
      LEFT JOIN persons per ON per.id = u.person_id
     ORDER BY b.deleted_at DESC
     LIMIT ${limit}
  `);
  return (rows as unknown as {
    batch_id: string;
    deleted_at: string;
    deleted_by_user: number | null;
    deleted_by_name: string | null;
    root_name: string;
    count: string;
  }[]).map((r) => ({
    batchId: r.batch_id,
    deletedAt: r.deleted_at,
    deletedByUser: r.deleted_by_user,
    deletedByName: r.deleted_by_name,
    rootName: r.root_name,
    count: Number(r.count),
  }));
}
