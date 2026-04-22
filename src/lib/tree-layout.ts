import type { TreeNode } from './tree-data';

export type LayoutPos = { x: number; y: number };
export type LayoutMode = 'vertical' | 'horizontal';

export type LayoutResult = {
  positions: Map<number, LayoutPos>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

/**
 * Ported from the prototype: BFS for depth, DFS for horizontal spread.
 * Leaves get `leafCount * SIBLING_GAP`, parents get the midpoint of their
 * first/last child.
 */
export function layoutTree(
  nodes: TreeNode[],
  rootId: number,
  mode: LayoutMode
): LayoutResult {
  const byId = new Map<number, TreeNode>();
  const kidsMap = new Map<number, number[]>();
  for (const n of nodes) byId.set(n.id, n);
  for (const n of nodes) {
    if (n.fid == null) continue;
    const arr = kidsMap.get(n.fid);
    if (arr) arr.push(n.id);
    else kidsMap.set(n.fid, [n.id]);
  }

  // BFS depth
  const depth = new Map<number, number>();
  depth.set(rootId, 0);
  const queue: number[] = [rootId];
  while (queue.length) {
    const id = queue.shift() as number;
    const kids = kidsMap.get(id) || [];
    for (const k of kids) {
      depth.set(k, (depth.get(id) as number) + 1);
      queue.push(k);
    }
  }

  const isVert = mode === 'vertical';
  // Vertical: siblings spread on X, so their labels are stacked side-by-side.
  // 60px handles the longest leaf names (Christopher, Alesandro, Lesandro, …).
  const SIBLING_GAP = isVert ? 60 : 22;
  const GEN_GAP = isVert ? 110 : 170;

  const pos = new Map<number, LayoutPos>();
  let leafCount = 0;

  function place(id: number): number {
    const kids = kidsMap.get(id) || [];
    if (kids.length === 0) {
      const s = leafCount * SIBLING_GAP;
      const d = depth.get(id) as number;
      pos.set(id, isVert ? { x: s, y: d * GEN_GAP } : { x: d * GEN_GAP, y: s });
      leafCount++;
      return s;
    }
    let first: number | null = null;
    let last: number | null = null;
    for (const k of kids) {
      const s = place(k);
      if (first === null) first = s;
      last = s;
    }
    const s = ((first as number) + (last as number)) / 2;
    const d = depth.get(id) as number;
    pos.set(id, isVert ? { x: s, y: d * GEN_GAP } : { x: d * GEN_GAP, y: s });
    return s;
  }

  place(rootId);

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of pos.values()) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return { positions: pos, bounds: { minX, maxX, minY, maxY } };
}
