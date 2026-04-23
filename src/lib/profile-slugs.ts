import type { TreeNode } from './tree-data';

function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'X';
  // Only take letters — drops accents, digits, and punctuation.
  for (const ch of trimmed) {
    const up = ch.toUpperCase();
    if (/^[A-Z]$/.test(up)) return up;
  }
  return 'X';
}

function baseSlugFor(node: TreeNode, byId: Map<number, TreeNode>): string {
  const self = initialOf(node.name);
  // Family surname — always "K" (Koja) at the end.
  if (node.fid == null) return `${self}K`;
  const father = byId.get(node.fid);
  const f = father ? initialOf(father.name) : '';
  return `${self}${f}K`;
}

export type SlugMaps = {
  slugByDbId: Map<number, string>;
  dbIdBySlug: Map<string, number>;
};

/**
 * Build first-letter-initial slugs for every person on the tree.
 *
 *   Nicholas Fadi Koja → NFK
 *   Ronald Fadi Badri Oraha → RFK  (self + father + K)
 *   Hanna (root)      → HK
 *
 * Collisions (same self + father initial) resolve by age: the oldest
 * (lowest DB id) keeps the bare slug, the next gets a trailing `2`,
 * then `3`, etc. The map is rebuilt from the current tree every
 * request, so newly added relatives fall into line automatically.
 */
export function computeProfileSlugs(nodes: readonly TreeNode[]): SlugMaps {
  const byId = new Map<number, TreeNode>();
  for (const n of nodes) byId.set(n.id, n);

  const groups = new Map<string, number[]>();
  const sortedByAge = [...nodes].sort((a, b) => a.id - b.id);
  for (const n of sortedByAge) {
    const base = baseSlugFor(n, byId);
    const arr = groups.get(base);
    if (arr) arr.push(n.id);
    else groups.set(base, [n.id]);
  }

  const slugByDbId = new Map<number, string>();
  const dbIdBySlug = new Map<string, number>();
  for (const [base, ids] of groups) {
    ids.forEach((id, idx) => {
      const slug = idx === 0 ? base : `${base}${idx + 1}`;
      slugByDbId.set(id, slug);
      dbIdBySlug.set(slug, id);
    });
  }
  return { slugByDbId, dbIdBySlug };
}

/**
 * Accept either a numeric DB id (old bookmarks, FKs, emails) or a
 * slug, and return the DB id the caller should load. Returns null for
 * unknown inputs.
 */
export function resolveProfileParam(
  param: string,
  dbIdBySlug: Map<string, number>
): number | null {
  if (/^\d+$/.test(param)) {
    const n = Number(param);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return dbIdBySlug.get(param.toUpperCase()) ?? null;
}

/** Build a link to a profile, preferring its canonical slug. */
export function profileHref(
  id: number,
  slugByDbId: Map<number, string> | null | undefined
): string {
  const slug = slugByDbId?.get(id);
  return `/profile/${slug ?? id}`;
}
