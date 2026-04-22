'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { loginAction, type LoginState } from '@/app/login/actions';

const initial: LoginState = { error: null };

export function LoginForm() {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <div className="border-s-[3px] border-terracotta bg-parchment-deep px-4 py-3 text-sm text-terracotta-deep">
          {t('login.error')}
        </div>
      ) : null}
      <label className="font-display block text-sm italic text-ink-muted">
        {t('login.email')}
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
        />
      </label>
      <label className="font-display block text-sm italic text-ink-muted">
        {t('login.password')}
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="font-display mt-2 rounded-sm border border-olive-deep bg-olive-deep px-7 py-3 text-[17px] font-medium tracking-wide text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
      >
        {pending ? '…' : t('login.submit')}
      </button>
      <p className="mt-4 text-center text-sm italic text-ink-muted font-display">
        {t('login.no_account')}{' '}
        <Link href="/tree" className="not-italic font-medium text-terracotta-deep hover:underline">
          {t('login.claim_link')}
        </Link>
      </p>
    </form>
  );
}
