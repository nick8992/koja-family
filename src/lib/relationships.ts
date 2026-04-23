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

export type Gender = 'M' | 'F';

type ByIdLike = {
  get(id: number): { id: number; fid: number | null; gender?: Gender } | undefined;
};

function maleOrFemale(mascKey: string, femKey: string, g: Gender | undefined, lang: Lang): string {
  return translate(lang, g === 'F' ? femKey : mascKey);
}

// --- Arabic-specific phrasing for the ancestor/descendant chain ---
//
// English chains repeat "great" for each additional generation ("great
// great great grandfather"). Arabic doesn't phrase it that way — past
// the direct grandparent it uses an ordinal: الجدّ الثاني, الجدّ الثالث,
// الجدّ السادس (the 6th grandfather) and so on. These helpers handle
// that cleanly for both masculine and feminine forms.

const AR_ORD_MASC: Record<number, string> = {
  1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس',
  6: 'السادس', 7: 'السابع', 8: 'الثامن', 9: 'التاسع', 10: 'العاشر',
  11: 'الحادي عشر', 12: 'الثاني عشر', 13: 'الثالث عشر', 14: 'الرابع عشر',
  15: 'الخامس عشر', 16: 'السادس عشر', 17: 'السابع عشر', 18: 'الثامن عشر',
  19: 'التاسع عشر', 20: 'العشرون',
};
const AR_ORD_FEM: Record<number, string> = {
  1: 'الأولى', 2: 'الثانية', 3: 'الثالثة', 4: 'الرابعة', 5: 'الخامسة',
  6: 'السادسة', 7: 'السابعة', 8: 'الثامنة', 9: 'التاسعة', 10: 'العاشرة',
  11: 'الحادية عشرة', 12: 'الثانية عشرة', 13: 'الثالثة عشرة', 14: 'الرابعة عشرة',
  15: 'الخامسة عشرة', 16: 'السادسة عشرة', 17: 'السابعة عشرة', 18: 'الثامنة عشرة',
  19: 'التاسعة عشرة', 20: 'العشرون',
};

function arOrdinalGendered(n: number, feminine: boolean): string {
  const table = feminine ? AR_ORD_FEM : AR_ORD_MASC;
  return table[n] ?? `الـ${n}`;
}

/**
 * Arabic phrasing for ancestor / descendant at `depth` generations.
 * depth=2: plain grandfather / granddaughter.
 * depth>=3: الجدّ الـ(depth-1) style — so 7 gens up → الجدّ السادس,
 * matching how a native Arabic speaker naturally refers to distant
 * ancestors and descendants.
 */
function arAncestorLine(depth: number, feminine: boolean, isDescendant: boolean): string {
  if (depth === 2) {
    if (isDescendant) return feminine ? 'حفيدة' : 'حفيد';
    return feminine ? 'جدّة' : 'جدّ';
  }
  const base = isDescendant
    ? feminine
      ? 'الحفيدة'
      : 'الحفيد'
    : feminine
      ? 'الجدّة'
      : 'الجدّ';
  return `${base} ${arOrdinalGendered(depth - 1, feminine)}`;
}

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

  const aGender = byId.get(aId)?.gender;
  const bGender = byId.get(bId)?.gender;
  return {
    label: relLabelSymmetric(a, b, lang, aGender, bGender),
    directional: relLabelDirectional(a, b, lang, bGender),
    a,
    b,
    mrca,
  };
}

/**
 * Return a directional label: how is B related to A?
 * a = steps from A up to MRCA; b = steps from B up to MRCA.
 * B's gender (when known) selects masculine / feminine nouns.
 */
export function relLabelDirectional(
  a: number,
  b: number,
  lang: Lang,
  bGender?: Gender
): string {
  if (a === 0 && b === 0) return translate(lang, 'rel.self');
  const greats = (n: number) => translate(lang, 'rel.great_prefix').repeat(Math.max(0, n));

  // Direct ancestor/descendant line
  if (b === 0) {
    if (a === 1) return maleOrFemale('rel.father', 'rel.mother', bGender, lang);
    if (lang === 'ar') return arAncestorLine(a, bGender === 'F', false);
    if (a === 2) return maleOrFemale('rel.grandfather', 'rel.grandmother', bGender, lang);
    return greats(a - 2) + maleOrFemale('rel.grandfather', 'rel.grandmother', bGender, lang);
  }
  if (a === 0) {
    if (b === 1) return maleOrFemale('rel.son', 'rel.daughter', bGender, lang);
    if (lang === 'ar') return arAncestorLine(b, bGender === 'F', true);
    if (b === 2) return maleOrFemale('rel.grandson', 'rel.granddaughter', bGender, lang);
    return greats(b - 2) + maleOrFemale('rel.grandson', 'rel.granddaughter', bGender, lang);
  }

  // Siblings
  if (a === 1 && b === 1) return maleOrFemale('rel.brother', 'rel.sister', bGender, lang);

  // Uncle / nephew
  if (b === 1) {
    if (a === 2) return maleOrFemale('rel.uncle', 'rel.aunt', bGender, lang);
    return greats(a - 2) + maleOrFemale('rel.uncle', 'rel.aunt', bGender, lang);
  }
  if (a === 1) {
    if (b === 2) return maleOrFemale('rel.nephew', 'rel.niece', bGender, lang);
    return greats(b - 2) + maleOrFemale('rel.nephew', 'rel.niece', bGender, lang);
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
 * A's gender labels A's role, B's gender labels B's role (so a father &
 * daughter render as "father & daughter", not "father & son").
 */
export function relLabelSymmetric(
  a: number,
  b: number,
  lang: Lang,
  aGender?: Gender,
  bGender?: Gender
): string {
  const and = lang === 'ar' ? ' و ' : ' & ';
  if (a === 0 && b === 0) return lang === 'ar' ? 'نفس الشخص' : 'the same person';
  const greats = (n: number) => translate(lang, 'rel.great_prefix').repeat(Math.max(0, n));

  // a=0 → A is the ancestor, B is the descendant
  if (a === 0) {
    if (b === 1) {
      return (
        maleOrFemale('rel.father', 'rel.mother', aGender, lang) +
        and +
        maleOrFemale('rel.son', 'rel.daughter', bGender, lang)
      );
    }
    if (lang === 'ar') {
      return (
        arAncestorLine(b, aGender === 'F', false) +
        and +
        arAncestorLine(b, bGender === 'F', true)
      );
    }
    const gAnc = maleOrFemale('rel.grandfather', 'rel.grandmother', aGender, lang);
    const gDesc = maleOrFemale('rel.grandson', 'rel.granddaughter', bGender, lang);
    if (b === 2) return gAnc + and + gDesc;
    const g = greats(b - 2);
    return g + gAnc + and + g + gDesc;
  }
  // b=0 → B is the ancestor, A is the descendant
  if (b === 0) {
    if (a === 1) {
      return (
        maleOrFemale('rel.father', 'rel.mother', bGender, lang) +
        and +
        maleOrFemale('rel.son', 'rel.daughter', aGender, lang)
      );
    }
    if (lang === 'ar') {
      return (
        arAncestorLine(a, bGender === 'F', false) +
        and +
        arAncestorLine(a, aGender === 'F', true)
      );
    }
    const gAnc = maleOrFemale('rel.grandfather', 'rel.grandmother', bGender, lang);
    const gDesc = maleOrFemale('rel.grandson', 'rel.granddaughter', aGender, lang);
    if (a === 2) return gAnc + and + gDesc;
    const g = greats(a - 2);
    return g + gAnc + and + g + gDesc;
  }
  if (a === 1 && b === 1) {
    // siblings — pair by the two genders
    if (aGender === 'F' && bGender === 'F') {
      return lang === 'ar' ? 'شقيقتان' : 'sisters';
    }
    if (aGender !== 'F' && bGender !== 'F') {
      return lang === 'ar' ? 'شقيقان' : 'brothers';
    }
    return (
      maleOrFemale('rel.brother', 'rel.sister', aGender, lang) +
      and +
      maleOrFemale('rel.brother', 'rel.sister', bGender, lang)
    );
  }

  if (a === 1 || b === 1) {
    // The deeper branch is the nephew/niece side; the shallower is uncle/aunt.
    const uncleSideGender = a === 1 ? aGender : bGender;
    const nephewSideGender = a === 1 ? bGender : aGender;
    const deep = Math.max(a, b);
    const g = deep === 2 ? '' : greats(deep - 2);
    return (
      g +
      maleOrFemale('rel.uncle', 'rel.aunt', uncleSideGender, lang) +
      and +
      g +
      maleOrFemale('rel.nephew', 'rel.niece', nephewSideGender, lang)
    );
  }

  const dir = relLabelDirectional(a, b, lang, bGender);
  if (lang === 'ar') return dir;
  return dir.includes('removed') ? dir : dir + 's';
}
