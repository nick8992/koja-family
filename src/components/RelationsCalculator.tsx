'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { relationship } from '@/lib/relationships';
import type { TreeNode } from '@/lib/tree-data';

type Slot = 'a' | 'b';

const TRY_CASES: [string, string][] = [
  ['Nicholas', 'Matthew'],
  ['Hanna', 'Fredan'],
  ['Sepa', 'Oraha'],
  ['Daniel', 'Andreo'],
];

export function RelationsCalculator({ nodes }: { nodes: TreeNode[] }) {
  const { t, lang } = useLanguage();
  const [aText, setAText] = useState('');
  const [bText, setBText] = useState('');
  const [aId, setAId] = useState<number | null>(null);
  const [bId, setBId] = useState<number | null>(null);
  const [suggestFor, setSuggestFor] = useState<Slot | null>(null);

  const byId = useMemo(() => {
    const m = new Map<number, TreeNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  function fullNameFor(id: number): string {
    const parts: string[] = [];
    let cur: number | null | undefined = id;
    let safety = 0;
    while (cur != null && safety++ < 100) {
      const n = byId.get(cur);
      if (!n) break;
      parts.push(n.name.replace(/ Koja$/, ''));
      cur = n.fid;
    }
    const last = parts[parts.length - 1];
    return parts.join(' ') + (last === 'Hanna' ? '' : ' Koja');
  }

  function suggest(query: string): TreeNode[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: TreeNode[] = [];
    for (const n of nodes) if (n.name.toLowerCase().includes(q)) out.push(n);
    return out.slice(0, 10);
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-calc-slot]')) return;
      setSuggestFor(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function applyTry(nameA: string, nameB: string) {
    const a = nodes.find((n) => n.name === nameA);
    const b = nodes.find((n) => n.name === nameB);
    if (!a || !b) return;
    setAText(a.name);
    setBText(b.name);
    setAId(a.id);
    setBId(b.id);
    setSuggestFor(null);
  }

  const result = aId != null && bId != null ? relationship(byId, aId, bId, lang) : null;
  const nameA = aId ? byId.get(aId)?.name : '';
  const nameB = bId ? byId.get(bId)?.name : '';
  const mrcaName = result?.mrca ? byId.get(result.mrca)?.name : null;

  const gensWord = (n: number) =>
    lang === 'ar'
      ? `${n} ${n === 1 ? 'جيل' : n === 2 ? 'جيلان' : 'أجيال'}`
      : `${n} generation${n === 1 ? '' : 's'}`;

  return (
    <div className="border border-border bg-cream p-10">
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[1fr_auto_1fr]">
        <CalcPicker
          slot="a"
          label={t('calc.first')}
          text={aText}
          setText={setAText}
          setId={setAId}
          suggestOpen={suggestFor === 'a'}
          setSuggestFor={setSuggestFor}
          suggest={suggest}
          fullNameFor={fullNameFor}
          placeholder={t('calc.placeholder')}
        />
        <div className="pt-7 text-center font-display text-5xl italic text-terracotta">&amp;</div>
        <CalcPicker
          slot="b"
          label={t('calc.second')}
          text={bText}
          setText={setBText}
          setId={setBId}
          suggestOpen={suggestFor === 'b'}
          setSuggestFor={setSuggestFor}
          suggest={suggest}
          fullNameFor={fullNameFor}
          placeholder={t('calc.placeholder')}
        />
      </div>

      <div className="my-6 flex items-center justify-center gap-3 text-border-dark">
        <span className="text-lg text-gold">✦</span>
      </div>

      <div className="border border-dashed border-[var(--color-border-dark)] bg-parchment p-8 text-center">
        {!result ? (
          <div className="font-display text-sm text-ink-muted">{t('calc.empty')}</div>
        ) : (
          <>
            <div className="font-display mb-1 text-sm text-ink-muted">
              {nameA} {t('calc.and')} {nameB} {t('calc.are')}
            </div>
            <div className="font-display my-2 text-4xl font-medium italic text-terracotta-deep">
              {result.label}
            </div>
            {result.mrca != null ? (
              <div className="font-display mt-4 flex flex-wrap justify-center gap-6 text-sm text-ink-muted">
                <span>
                  {t('calc.mrca')}:{' '}
                  <strong className="not-italic font-medium text-olive-deep">{mrcaName}</strong>
                </span>
                <span>
                  {nameA}:{' '}
                  <strong className="not-italic font-medium text-olive-deep">
                    {gensWord(result.a)}
                  </strong>
                </span>
                <span>
                  {nameB}:{' '}
                  <strong className="not-italic font-medium text-olive-deep">
                    {gensWord(result.b)}
                  </strong>
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-6 border-t border-dotted border-border pt-6 text-sm italic text-ink-muted font-display">
        <strong className="not-italic font-medium">{t('calc.try')}</strong>
        <span className="ms-2 inline-flex flex-wrap gap-2">
          {TRY_CASES.map(([a, b]) => (
            <button
              type="button"
              key={`${a}-${b}`}
              onClick={() => applyTry(a, b)}
              className="rounded-sm border border-[var(--color-border-dark)] px-3 py-1 text-sm font-medium not-italic text-ink-soft hover:bg-parchment-deep hover:text-olive-deep"
            >
              {a} &amp; {b}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}

function CalcPicker({
  slot,
  label,
  text,
  setText,
  setId,
  suggestOpen,
  setSuggestFor,
  suggest,
  fullNameFor,
  placeholder,
}: {
  slot: Slot;
  label: string;
  text: string;
  setText: (s: string) => void;
  setId: (id: number | null) => void;
  suggestOpen: boolean;
  setSuggestFor: (s: Slot | null) => void;
  suggest: (q: string) => TreeNode[];
  fullNameFor: (id: number) => string;
  placeholder: string;
}) {
  const matches = suggest(text);
  return (
    <div className="relative flex flex-col gap-2" data-calc-slot={slot}>
      <label className="font-display text-sm italic text-ink-muted">{label}</label>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setId(null);
          setSuggestFor(slot);
        }}
        onFocus={() => setSuggestFor(slot)}
        placeholder={placeholder}
        autoComplete="off"
        className="font-display border border-[var(--color-border-dark)] bg-parchment px-3.5 py-3 text-lg text-ink focus:outline-1 focus:outline-olive"
      />
      {suggestOpen && matches.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto border border-border bg-parchment shadow-lg">
          {matches.map((n) => (
            <button
              type="button"
              key={n.id}
              className="font-display block w-full border-b border-dotted border-border px-3.5 py-2 text-start text-sm last:border-b-0 hover:bg-parchment-deep"
              onClick={() => {
                setText(n.name);
                setId(n.id);
                setSuggestFor(null);
              }}
            >
              {n.name}{' '}
              <span className="text-xs text-ink-muted">
                · {fullNameFor(n.id).slice(0, 40)}
                {fullNameFor(n.id).length > 40 ? '…' : ''}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
