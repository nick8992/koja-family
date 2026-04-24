import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type ClaimStatus = 'unclaimed' | 'pending' | 'approved' | 'rejected';

export type Gender = 'M' | 'F';

export type TreeNode = {
  id: number;
  fid: number | null;
  name: string;
  gender: Gender;
  note: string | null;
  claim: ClaimStatus;
  isDeceased: boolean;
  photoUrl: string | null;
};

type Row = {
  id: number;
  father_id: number | null;
  first_name: string;
  gender: string | null;
  notes: string | null;
  claim_status: ClaimStatus;
  is_deceased: boolean | null;
  profile_photo_url: string | null;
};

export async function loadAllPersons(): Promise<TreeNode[]> {
  const rows = await db.execute<Row>(sql`
    SELECT id, father_id, first_name, gender, notes, is_deceased, claim_status, profile_photo_url
    FROM person_with_claim
    ORDER BY COALESCE(sibling_order, id), id
  `);

  return (rows as unknown as Row[]).map((r) => ({
    id: r.id,
    fid: r.father_id,
    name: r.first_name,
    gender: r.gender === 'F' ? 'F' : 'M',
    note: r.notes,
    claim: r.claim_status,
    isDeceased: !!r.is_deceased,
    photoUrl: r.profile_photo_url,
  }));
}

/**
 * Patrilineal chain from `id` up to the root, as an ordered list of TreeNodes
 * (index 0 = self, last = root). Used for the lineage strip and for
 * computing directional relationships.
 */
export function ancestorChainIds(byId: Map<number, TreeNode>, id: number): number[] {
  const chain: number[] = [];
  let cur: number | null | undefined = id;
  let safety = 0;
  while (cur != null && safety++ < 100) {
    chain.push(cur);
    cur = byId.get(cur)?.fid ?? null;
  }
  return chain;
}

/**
 * For UI convenience: strip a redundant " Koja" off a display name so the root
 * "Hanna Koja" doesn't get " Koja" appended a second time in lineage strings.
 * Matches the prototype's `fullName()` helper behavior.
 */
export function displayName(n: string): string {
  return n.replace(/ Koja$/, '');
}

/**
 * Walk up from Hanna (id=1) through father_id links and return the
 * topmost ancestor's first name + " Koja" suffix — the current "head"
 * of the family tree, however deep the line goes. Used in the hero
 * tagline and the tree page subtitle so they stay accurate as more
 * ancestors are added.
 */
export async function loadRootDisplayName(): Promise<string> {
  const rows = await db.execute<{ first_name: string }>(sql`
    WITH RECURSIVE up AS (
      SELECT id, first_name, father_id
        FROM persons
       WHERE id = 1 AND deleted_at IS NULL
      UNION ALL
      SELECT p.id, p.first_name, p.father_id
        FROM persons p
        JOIN up ON p.id = up.father_id
       WHERE p.deleted_at IS NULL
    )
    SELECT first_name FROM up WHERE father_id IS NULL LIMIT 1
  `);
  const arr = rows as unknown as { first_name: string }[];
  const first = arr[0]?.first_name?.trim();
  if (!first) return 'Hanna Koja';
  return /\bKoja\b/i.test(first) ? first : `${first} Koja`;
}
