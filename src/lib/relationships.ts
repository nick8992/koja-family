import { type Lang, translate, ordinal } from './i18n/dictionary';

export type Relationship = {
  /** Symmetric label, e.g. "grandfather & grandson", "3rd cousins" */
  label: string;
  /** B-relative-to-A label, e.g. "uncle", "3rd cousin once removed" */
  directional: string;
  /** Steps from A up to MRCA */
  a: number;
  /** Steps from B up to MRCA */
  b: number;
  /** Most Recent Common Ancestor id, or null if no shared ancestor */
  mrca: number | null;
};

type ByIdLike = {
  get(id: number): { id: number; fid: number | null } | undefined;
};

function ancestorsOf(byId: ByIdLike, id: number): number[] {
  const chain: number[] = [];
  let cur: number | null | undefined = id;
  let safety = 0;
  while (cur != null && safety++ < 100) {
    chain.push(cur);
    cur = byId.get(cur)?.fid ?? null;
  }
  return chain;
}

export function relationship(byId: ByIdLike, aId: number, bId: number, lang: Lang): Relationship {
  if (aId === bId) {
    return {
      label: lang === 'ar' ? 'نفس الشخص' : 'the same person',
      directional: translate(lang, 'rel.self'),
      a: 0,
      b: 0,
      mrca: aId,
    };
  }
  const ancA = ancestorsOf(byId, aId);
  const ancB = ancestorsOf(byId, bId);
  const idxB = new Map<number, number>();
  ancB.forEach((id, i) => idxB.set(id, i));

  let mrca: number | null = null;
  let a = 0;
  let b = 0;
  for (let i = 0; i < ancA.length; i++) {
    const found = idxB.get(ancA[i]);
    if (found !== undefined) {
      mrca = ancA[i];
      a = i;
      b = found;
      break;
    }
  }

  if (mrca == null) {
    return {
      label: translate(lang, 'rel.not_related'),
      directional: translate(lang, 'rel.not_related'),
      a: -1,
      b: -1,
      mrca: null,
    };
  }

  return {
    label: relLabelSymmetric(a, b, lang),
    directional: relLabelDirectional(a, b, lang),
    a,
    b,
    mrca,
  };
}

/**
 * Return a directional label: how is B related to A?
 * a = steps from A up to MRCA; b = steps from B up to MRCA.
 */
export function relLabelDirectional(a: number, b: number, lang: Lang): string {
  if (a === 0 && b === 0) return translate(lang, 'rel.self');
  const greats = (n: number) => translate(lang, 'rel.great_prefix').repeat(Math.max(0, n));

  // Direct ancestor/descendant line
  if (b === 0) {
    if (a === 1) return translate(lang, 'rel.father');
    if (a === 2) return translate(lang, 'rel.grandfather');
    return greats(a - 2) + translate(lang, 'rel.grandfather');
  }
  if (a === 0) {
    if (b === 1) return translate(lang, 'rel.son');
    if (b === 2) return translate(lang, 'rel.grandson');
    return greats(b - 2) + translate(lang, 'rel.grandson');
  }

  // Siblings
  if (a === 1 && b === 1) return translate(lang, 'rel.brother');

  // Uncle / nephew
  if (b === 1) {
    if (a === 2) return translate(lang, 'rel.uncle');
    return greats(a - 2) + translate(lang, 'rel.uncle');
  }
  if (a === 1) {
    if (b === 2) return translate(lang, 'rel.nephew');
    return greats(b - 2) + translate(lang, 'rel.nephew');
  }

  // Cousins
  const cousinLevel = Math.min(a, b) - 1;
  const removed = Math.abs(a - b);

  if (lang === 'ar') {
    let base = translate(lang, 'rel.cousin');
    if (cousinLevel > 1) base += ' من الدرجة ' + ordinal(cousinLevel, lang);
    if (removed === 0) return base;
    if (removed === 1) return base + ' ' + translate(lang, 'rel.once_removed');
    if (removed === 2) return base + ' ' + translate(lang, 'rel.twice_removed');
    return base + ' ' + translate(lang, 'rel.times_removed', { n: removed });
  }

  const base = `${ordinal(cousinLevel, lang)} ${translate(lang, 'rel.cousin')}`;
  if (removed === 0) return base;
  if (removed === 1) return base + ' ' + translate(lang, 'rel.once_removed');
  if (removed === 2) return base + ' ' + translate(lang, 'rel.twice_removed');
  return base + ' ' + removed + ' ' + translate(lang, 'rel.times_removed');
}

/**
 * Symmetric form for the "X and Y are ___" calculator header.
 */
export function relLabelSymmetric(a: number, b: number, lang: Lang): string {
  const and = lang === 'ar' ? ' و ' : ' & ';
  if (a === 0 && b === 0) return lang === 'ar' ? 'نفس الشخص' : 'the same person';
  const greats = (n: number) => translate(lang, 'rel.great_prefix').repeat(Math.max(0, n));

  if (a === 0) {
    if (b === 1) return translate(lang, 'rel.father') + and + translate(lang, 'rel.son');
    if (b === 2) return translate(lang, 'rel.grandfather') + and + translate(lang, 'rel.grandson');
    const g = greats(b - 2);
    return g + translate(lang, 'rel.grandfather') + and + g + translate(lang, 'rel.grandson');
  }
  if (b === 0) {
    if (a === 1) return translate(lang, 'rel.father') + and + translate(lang, 'rel.son');
    if (a === 2) return translate(lang, 'rel.grandfather') + and + translate(lang, 'rel.grandson');
    const g = greats(a - 2);
    return g + translate(lang, 'rel.grandfather') + and + g + translate(lang, 'rel.grandson');
  }
  if (a === 1 && b === 1) return lang === 'ar' ? 'شقيقان' : 'brothers';

  if (a === 1 || b === 1) {
    const deep = Math.max(a, b);
    const g = deep === 2 ? '' : greats(deep - 2);
    return g + translate(lang, 'rel.uncle') + and + g + translate(lang, 'rel.nephew');
  }

  const dir = relLabelDirectional(a, b, lang);
  if (lang === 'ar') return dir;
  return dir.includes('removed') ? dir : dir + 's';
}
