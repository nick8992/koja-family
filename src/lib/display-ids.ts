import type { TreeNode } from './tree-data';

/**
 * Compute a stable display-id map keyed by DB id.
 *
 * The order is a plain BFS from the root(s), visiting each parent's
 * children in the sibling order they appear in `nodes` (which should
 * already be sorted by COALESCE(sibling_order, id)). The result:
 *
 *   1 = root
 *   2..k = root's children, left-to-right
 *   k+1.. = grandchildren, grouped under each parent in the same L-to-R
 *
 * Adding someone to the left of an existing person — or anywhere above
 * them in the tree — bumps their display id up, which is exactly the
 * behavior we want. DB ids never move, so FKs, profile URLs, and
 * internal refs all stay stable.
 */
export function computeDisplayIds(nodes: readonly TreeNode[]): Map<number, number> {
  const childrenByFather = new Map<number | null, number[]>();
  for (const n of nodes) {
    const key = n.fid;
    const arr = childrenByFather.get(key);
    if (arr) arr.push(n.id);
    else childrenByFather.set(key, [n.id]);
  }

  const out = new Map<number, number>();
  const rootIds = childrenByFather.get(null) ?? [];
  const queue: number[] = [...rootIds];
  let next = 1;
  while (queue.length > 0) {
    const id = queue.shift() as number;
    if (out.has(id)) continue;
    out.set(id, next++);
    const kids = childrenByFather.get(id);
    if (kids) queue.push(...kids);
  }
  return out;
}
