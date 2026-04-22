import Link from 'next/link';
import { loadAllPersons, type TreeNode } from '@/lib/tree-data';
import { relationship } from '@/lib/relationships';

export const dynamic = 'force-dynamic';

type Case = {
  aName: string;
  bName: string;
  expectedDirectional: string;
  expectedSymmetric: string;
  notes: string;
};

// Hand-computed expectations from the tree structure — these are the
// regression tests Nicholas asked for. Each case names two people and the
// label the calculator should produce in English.
const CASES: Case[] = [
  {
    aName: 'Hanna Koja',
    bName: 'Sepa',
    expectedDirectional: 'son',
    expectedSymmetric: 'father & son',
    notes: 'Hanna → his son Sepa',
  },
  {
    aName: 'Sepa',
    bName: 'Oraha',
    expectedDirectional: 'brother',
    expectedSymmetric: 'brothers',
    notes: 'Hanna\u2019s two sons',
  },
  {
    aName: 'Gorial',
    bName: 'Matty',
    expectedDirectional: 'son',
    expectedSymmetric: 'father & son',
    notes: 'Direct father/son',
  },
  {
    aName: 'Hanna Koja',
    bName: 'Matty',
    expectedDirectional: 'great-grandson',
    expectedSymmetric: 'great-grandfather & great-grandson',
    notes: 'Matty is 3 generations below Hanna',
  },
  {
    aName: 'Nicholas',
    bName: 'Matthew',
    expectedDirectional: '3rd cousin',
    expectedSymmetric: '3rd cousins',
    notes: 'Both 4 steps up to MRCA Astifo (#15)',
  },
  {
    aName: 'Nicholas',
    bName: 'Nabel',
    expectedDirectional: 'uncle',
    expectedSymmetric: 'uncle & nephew',
    notes: 'Nabel is Nicholas\u2019s father Fadi\u2019s brother',
  },
  {
    aName: 'Nicholas',
    bName: 'Badri',
    expectedDirectional: 'grandfather',
    expectedSymmetric: 'grandfather & grandson',
    notes: 'Badri is Nicholas\u2019s grandfather (via Fadi)',
  },
  {
    aName: 'Nicholas',
    bName: 'Hanna Koja',
    expectedDirectional: 'great-great-great-great-great-grandfather',
    expectedSymmetric:
      'great-great-great-great-great-grandfather & great-great-great-great-great-grandson',
    notes: 'Nicholas is 7 generations below Hanna',
  },
  {
    aName: 'Nicholas',
    bName: 'Daniel',
    expectedDirectional: '5th cousin',
    expectedSymmetric: '5th cousins',
    notes: 'MRCA is Oraha (#3), both 6 steps up',
  },
  {
    aName: 'Nicholas',
    bName: 'Fredan',
    expectedDirectional: '5th cousin',
    expectedSymmetric: '5th cousins',
    notes: 'MRCA is Oraha (#3), both 6 steps up',
  },
];

function findByName(nodes: TreeNode[], name: string): TreeNode | null {
  return nodes.find((n) => n.name === name) ?? null;
}

export default async function RelationsCheck() {
  const nodes = await loadAllPersons();
  const byId = new Map<number, TreeNode>();
  for (const n of nodes) byId.set(n.id, n);

  const rows = CASES.map((c) => {
    const a = findByName(nodes, c.aName);
    const b = findByName(nodes, c.bName);
    if (!a || !b) {
      return {
        ...c,
        aId: a?.id ?? null,
        bId: b?.id ?? null,
        actualDirectional: 'NOT FOUND',
        actualSymmetric: 'NOT FOUND',
        pass: false,
        mrcaName: null as string | null,
      };
    }
    const rel = relationship(byId, a.id, b.id, 'en');
    const pass =
      rel.directional === c.expectedDirectional &&
      rel.label === c.expectedSymmetric;
    return {
      ...c,
      aId: a.id,
      bId: b.id,
      actualDirectional: rel.directional,
      actualSymmetric: rel.label,
      pass,
      mrcaName: rel.mrca != null ? byId.get(rel.mrca)?.name ?? null : null,
    };
  });

  const passing = rows.filter((r) => r.pass).length;

  return (
    <main className="mx-auto max-w-5xl px-8 py-10 text-ink">
      <Link href="/" className="text-sm text-ink-muted hover:underline">
        ← home
      </Link>
      <h1 className="mt-4 font-display text-4xl font-medium">Relationship calculator — regression cases</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {passing} of {rows.length} pairs match their expected labels.
      </p>
      <table className="mt-8 w-full text-sm">
        <thead className="font-display text-left text-xs uppercase tracking-wider text-ink-muted">
          <tr>
            <th className="py-2 pe-3">Pair</th>
            <th className="py-2 pe-3">MRCA</th>
            <th className="py-2 pe-3">Expected (dir / sym)</th>
            <th className="py-2 pe-3">Actual (dir / sym)</th>
            <th className="py-2">OK</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.aName}-${r.bName}`} className="border-t border-border align-top">
              <td className="py-3 pe-3">
                <div className="font-display font-medium">
                  {r.aName} ({r.aId ?? '—'}) &amp; {r.bName} ({r.bId ?? '—'})
                </div>
                <div className="mt-0.5 text-xs italic text-ink-muted">{r.notes}</div>
              </td>
              <td className="py-3 pe-3 text-xs text-ink-muted">{r.mrcaName ?? '—'}</td>
              <td className="py-3 pe-3 font-mono text-xs">
                <div>{r.expectedDirectional}</div>
                <div className="text-ink-muted">{r.expectedSymmetric}</div>
              </td>
              <td className="py-3 pe-3 font-mono text-xs">
                <div>{r.actualDirectional}</div>
                <div className="text-ink-muted">{r.actualSymmetric}</div>
              </td>
              <td
                className={
                  'py-3 font-mono text-xs ' +
                  (r.pass ? 'text-olive-deep' : 'text-terracotta-deep')
                }
              >
                {r.pass ? '✓' : '✗'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
