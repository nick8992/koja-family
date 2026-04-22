'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { requestAdditionAction, type RequestState } from '@/lib/request-actions';
import type { TreeNode } from '@/lib/tree-data';

type ErrorCode = 'bad_name' | 'bad_email' | 'bad_father' | 'father_not_found' | 'generic';

const ERROR_KEYS: Record<ErrorCode, string> = {
  bad_name: 'request.error.bad_name',
  bad_email: 'request.error.bad_email',
  bad_father: 'request.error.bad_father',
  father_not_found: 'request.error.father_not_found',
  generic: 'request.error.generic',
};

export function RequestAdditionForm({ nodes }: { nodes: TreeNode[] }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [fatherId, setFatherId] = useState<number | null>(null);
  const [fatherLabel, setFatherLabel] = useState<string>('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<RequestState>({ status: 'idle' });

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

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as TreeNode[];
    const out: TreeNode[] = [];
    for (const n of nodes) {
      // Only males can be listed as father in a patrilineal tree
      if (n.gender !== 'M') continue;
      const name = n.name.toLowerCase();
      if (name.includes(q)) out.push(n);
    }
    return out.slice(0, 12);
  }, [query, nodes]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    if (!fatherId) {
      setState({ status: 'error', code: 'bad_father' });
      return;
    }
    setPending(true);
    setState({ status: 'idle' });
    const fd = new FormData(e.currentTarget);
    fd.set('fatherId', String(fatherId));
    try {
      const res = await requestAdditionAction({ status: 'idle' }, fd);
      setState(res);
    } catch (err) {
      console.error('[request-addition] threw:', err);
      setState({ status: 'error', code: 'generic' });
    } finally {
      setPending(false);
    }
  }

  if (state.status === 'ok') {
    return (
      <div className="border border-border bg-cream p-8 text-center">
        <h2 className="font-display mb-2 text-2xl font-medium text-olive-deep">
          {t('request.success.title')}
        </h2>
        <p className="font-display italic text-ink-muted">
          {t('request.success.body')}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="font-display rounded-sm border border-[var(--color-border-dark)] px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep hover:text-olive-deep"
          >
            {t('request.success.home')}
          </Link>
          <Link
            href="/tree"
            className="font-display rounded-sm border border-olive-deep bg-olive-deep px-5 py-2.5 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep"
          >
            {t('request.success.tree')}
          </Link>
        </div>
      </div>
    );
  }

  const errorKey =
    state.status === 'error' ? ERROR_KEYS[state.code] : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 border border-border bg-cream p-8">
      {errorKey ? (
        <div className="border-s-[3px] border-terracotta bg-parchment-deep px-4 py-3 text-sm text-terracotta-deep">
          {t(errorKey)}
        </div>
      ) : null}

      <div className="flex flex-col gap-2" data-field="father">
        <label className="font-display text-sm italic text-ink-muted">
          {t('request.father')}
        </label>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestOpen(true);
              setFatherId(null);
              setFatherLabel('');
            }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 180)}
            placeholder={t('request.father.placeholder')}
            autoComplete="off"
            className="w-full border border-[var(--color-border-dark)] bg-parchment px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
          />
          {suggestOpen && query.trim() ? (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-[280px] overflow-y-auto border border-[var(--color-border-dark)] bg-cream shadow-lg">
              {suggestions.length === 0 ? (
                <div className="font-display p-4 text-center italic text-ink-muted">
                  {t('tree.search.empty')}
                </div>
              ) : (
                suggestions.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFatherId(n.id);
                      const full = fullNameFor(n.id);
                      setFatherLabel(full);
                      setQuery(full);
                      setSuggestOpen(false);
                    }}
                    className="font-display flex w-full items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-start last:border-b-0 hover:bg-parchment-deep"
                  >
                    <span className="text-[15px] font-medium text-ink">{n.name}</span>
                    <span className="max-w-[55%] truncate text-xs italic text-ink-muted">
                      {fullNameFor(n.id)}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
        {fatherId && fatherLabel ? (
          <p className="text-xs italic text-ink-muted">
            {t('request.father.selected')}: <strong className="not-italic text-terracotta-deep">{fatherLabel}</strong>
          </p>
        ) : (
          <p className="text-xs italic text-ink-muted">
            {t('request.father.hint')}
          </p>
        )}
      </div>

      <label className="font-display flex flex-col gap-2 text-sm italic text-ink-muted">
        {t('request.firstName')}
        <input
          type="text"
          name="firstName"
          required
          maxLength={100}
          className="border border-[var(--color-border-dark)] bg-parchment px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
        />
      </label>

      <fieldset className="flex flex-col gap-2 text-sm text-ink-muted">
        <legend className="font-display italic">{t('request.gender')}</legend>
        <div className="flex gap-6 pt-1">
          <label className="flex items-center gap-2">
            <input type="radio" name="gender" value="M" defaultChecked className="accent-olive-deep" />
            {t('request.gender.m')}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="gender" value="F" className="accent-olive-deep" />
            {t('request.gender.f')}
          </label>
        </div>
      </fieldset>

      <label className="font-display flex flex-col gap-2 text-sm italic text-ink-muted">
        {t('request.email')}
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="border border-[var(--color-border-dark)] bg-parchment px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
        />
      </label>

      <label className="font-display flex flex-col gap-2 text-sm italic text-ink-muted">
        {t('request.note')}
        <textarea
          name="note"
          rows={3}
          maxLength={800}
          placeholder={t('request.note.placeholder')}
          className="border border-[var(--color-border-dark)] bg-parchment px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="font-display mt-2 rounded-sm border border-olive-deep bg-olive-deep px-6 py-3 text-[16px] font-medium tracking-wide text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
      >
        {pending ? '…' : t('request.submit')}
      </button>
    </form>
  );
}
