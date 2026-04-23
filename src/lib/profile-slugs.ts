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

/**
 * Pull the A-Z letters out of a name and normalize to "Titlecase".
 * Nicholas → Nicholas, "Abu-Sami" → Abusami, accented chars dropped.
 */
function titleCaseFirstName(name: string): string {
  const letters: string[] = [];
  for (const ch of name.trim()) {
    if (/^[A-Za-z]$/.test(ch)) letters.push(ch);
  }
  if (letters.length === 0) return 'X';
  const s = letters.join('');
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function baseSlugFor(node: TreeNode, byId: Map<number, TreeNode>): string {
  // First name spelled out, then the father's initial, then the
  // grandfather's initial — e.g. Nicholas Fadi Badri → NicholasFB.
  // Root and the root's direct children fall back gracefully since
  // they lack one or both of those ancestors.
  const self = titleCaseFirstName(node.name);
  if (node.fid == null) return self;
  const father = byId.get(node.fid);
  const f = father ? initialOf(father.name) : '';
  if (!father || father.fid == null) return `${self}${f}`;
  const grandfather = byId.get(father.fid);
  const g = grandfather ? initialOf(grandfather.name) : '';
  return `${self}${f}${g}`;
}

export type SlugMaps = {
  slugByDbId: Map<number, string>;
  dbIdBySlug: Map<string, number>;
};

/**
 * Build readable slugs for every person on the tree.
 *
 *   Hanna (root)                     → Hanna
 *   Sepa (son of Hanna)              → SepaH
 *   Nicholas Fadi Badri Oraha        → NicholasFB
 *
 * Format is first-name + father's-initial + grandfather's-initial.
 * Root and root's direct children drop the missing initials. The slug
 * is rebuilt from the tree every render — so if someone is renamed
 * the URL tracks the new name, and renaming a father cascades into
 * every child's middle initial (and the grandfather slot of every
 * grandchild) on the next request.
 *
 * Collisions resolve by DB id: the oldest (lowest id) keeps the bare
 * slug, the next gets a trailing `2`, then `3`, etc. Lookup is
 * case-insensitive — /profile/nicholasfb still lands.
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
      // Key the reverse lookup by lowercase so /profile/nicholasfk,
      // /profile/NicholasFK, and /profile/NICHOLASFK all resolve.
      dbIdBySlug.set(slug.toLowerCase(), id);
    });
  }
  return { slugByDbId, dbIdBySlug };
}

/**
 * Accept either a numeric DB id (old bookmarks, FKs, emails) or a
 * slug in any case, and return the DB id the caller should load.
 * Returns null for unknown inputs.
 */
export function resolveProfileParam(
  param: string,
  dbIdBySlug: Map<string, number>
): number | null {
  if (/^\d+$/.test(param)) {
    const n = Number(param);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return dbIdBySlug.get(param.toLowerCase()) ?? null;
}

/** Build a link to a profile, preferring its canonical slug. */
export function profileHref(
  id: number,
  slugByDbId: Map<number, string> | null | undefined
): string {
  const slug = slugByDbId?.get(id);
  return `/profile/${slug ?? id}`;
}
