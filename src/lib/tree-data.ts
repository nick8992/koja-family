import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type ClaimStatus = 'unclaimed' | 'pending' | 'approved' | 'rejected';

export type TreeNode = {
  id: number;
  fid: number | null;
  name: string;
  note: string | null;
  claim: ClaimStatus;
  isDeceased: boolean;
};

type Row = {
  id: number;
  father_id: number | null;
  first_name: string;
  notes: string | null;
  claim_status: ClaimStatus;
  is_deceased: boolean | null;
};

export async function loadAllPersons(): Promise<TreeNode[]> {
  const rows = await db.execute<Row>(sql`
    SELECT id, father_id, first_name, notes, is_deceased, claim_status
    FROM person_with_claim
    ORDER BY id
  `);

  return (rows as unknown as Row[]).map((r) => ({
    id: r.id,
    fid: r.father_id,
    name: r.first_name,
    note: r.notes,
    claim: r.claim_status,
    isDeceased: !!r.is_deceased,
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
