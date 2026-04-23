'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n/context';
import { claimAction, type ClaimState } from '@/lib/claim-actions';

type Props = {
  personId: number;
  fullName: string;
  onCancel?: () => void;
  /** Header visuals — the popup hides them since it has its own title. */
  hideHeader?: boolean;
};

type ErrorCode =
  | 'already_claimed'
  | 'email_taken'
  | 'bad_email'
  | 'bad_password'
  | 'bad_name'
  | 'not_found'
  | 'login_failed'
  | 'generic';

const ERROR_KEYS: Record<ErrorCode, string> = {
  already_claimed: 'claim.error.already_claimed',
  email_taken: 'claim.error.email_taken',
  bad_email: 'claim.error.bad_email',
  bad_password: 'claim.error.bad_password',
  bad_name: 'claim.error.bad_name',
  not_found: 'claim.error.not_found',
  login_failed: 'claim.error.login_failed',
  generic: 'claim.error.generic',
};

export function ClaimForm({ personId, fullName, onCancel, hideHeader = false }: Props) {
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get('password') ?? '');

    let result: ClaimState;
    try {
      result = await claimAction({ status: 'idle' }, fd);
    } catch (err) {
      console.error('[claim] action threw:', err);
      setError('generic');
      setPending(false);
      return;
    }

    if (result.status === 'error') {
      setError(result.code);
      setPending(false);
      return;
    }
    if (result.status !== 'ok') {
      setError('generic');
      setPending(false);
      return;
    }

    const signInRes = await signIn('credentials', {
      email: result.email,
      password,
      redirect: false,
    });
    if (signInRes && !signInRes.error) {
      // Hard nav so the root layout re-runs and picks up the new session.
      window.location.href = `/profile/${result.personId}`;
      return;
    }
    setError('login_failed');
    setPending(false);
  }

  const errorKey = error ? ERROR_KEYS[error] : null;

  return (
    <div>
      {hideHeader ? null : (
        <div className="font-display mb-1 text-2xl font-medium text-ink">
          {t('claim.title')}
        </div>
      )}
      <div
        className={
          'font-display text-sm italic text-ink-muted ' + (hideHeader ? 'mb-3' : 'mb-4')
        }
      >
        {t('claim.sub')}{' '}
        <strong className="not-italic text-terracotta-deep">{fullName}</strong>
      </div>
      <div className="border-s-[3px] border-gold bg-parchment-deep px-4 py-3 text-sm italic text-ink-muted font-display">
        {t('claim.notice')}
      </div>

      {errorKey ? (
        <div className="mt-4 border-s-[3px] border-terracotta bg-parchment-deep px-4 py-3 text-sm text-terracotta-deep">
          {t(errorKey)}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="personId" value={personId} />

        <label className="font-display block text-sm italic text-ink-muted">
          {t('claim.email')}
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            autoFocus
            className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
          />
        </label>

        <label className="font-display block text-sm italic text-ink-muted">
          {t('claim.phone')}
          <input
            type="tel"
            name="phone"
            required
            autoComplete="tel"
            className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
          />
        </label>

        <label className="font-display block text-sm italic text-ink-muted">
          {t('claim.birthYear')}
          <input
            type="number"
            name="birthYear"
            inputMode="numeric"
            min={1800}
            max={new Date().getFullYear()}
            required
            className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="font-display block text-sm italic text-ink-muted">
            {t('claim.state')}
            <input
              type="text"
              name="state"
              required
              maxLength={80}
              placeholder={t('claim.state.placeholder')}
              className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
            />
          </label>
          <label className="font-display block text-sm italic text-ink-muted">
            {t('claim.country')}
            <input
              type="text"
              name="country"
              required
              maxLength={80}
              placeholder={t('claim.country.placeholder')}
              className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
            />
          </label>
        </div>

        <label className="font-display block text-sm italic text-ink-muted">
          {t('claim.password')}
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
          />
        </label>

        <div className="mt-2 flex gap-3">
          {onCancel ? (
            <button
              type="button"
              onClick={() => !pending && onCancel()}
              disabled={pending}
              className="font-display flex-1 rounded-sm border border-[var(--color-border-dark)] px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep disabled:opacity-60"
            >
              {t('claim.cancel')}
            </button>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="font-display flex-1 rounded-sm border border-olive-deep bg-olive-deep px-5 py-2.5 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
          >
            {pending ? '…' : t('claim.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
