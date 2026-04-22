'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n/context';
import { claimAction, type ClaimState } from '@/lib/claim-actions';

const initial: ClaimState = { status: 'idle' };

type Props = {
  personId: number;
  initialFirstName: string;
  /** Shown in the modal header: what person is being claimed. */
  fullName: string;
};

export function ClaimButton({ personId, initialFirstName, fullName }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(claimAction, initial);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // When the server action reports success, sign in on the client with the
  // password the user just typed, then route to their new profile.
  useEffect(() => {
    if (state.status !== 'ok') return;
    const password = passwordRef.current?.value ?? '';
    if (!password) {
      router.push('/login');
      return;
    }
    setSigningIn(true);
    (async () => {
      const res = await signIn('credentials', {
        email: state.email,
        password,
        redirect: false,
      });
      if (res && !res.error) {
        setOpen(false);
        // Hard nav so the header + server components re-render with the session.
        window.location.href = `/profile/${state.personId}`;
      } else {
        setSignInError('login_failed');
        setSigningIn(false);
      }
    })();
  }, [state, router]);

  const errorKey =
    state.status === 'error'
      ? {
          already_claimed: 'claim.error.already_claimed',
          email_taken: 'claim.error.email_taken',
          bad_email: 'claim.error.bad_email',
          bad_password: 'claim.error.bad_password',
          bad_name: 'claim.error.bad_name',
          not_found: 'claim.error.not_found',
          generic: 'claim.error.generic',
        }[state.code]
      : signInError === 'login_failed'
      ? 'claim.error.login_failed'
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display rounded-sm border border-olive-deep bg-olive-deep px-4 py-1.5 text-sm text-cream transition-colors hover:border-terracotta-deep hover:bg-terracotta-deep"
      >
        {t('profile.action.claim')}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-5"
          style={{ background: 'rgba(31, 26, 18, 0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto border border-[var(--color-border-dark)] bg-parchment p-10 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 end-4 text-2xl text-ink-muted hover:text-terracotta"
              aria-label="Close"
            >
              ×
            </button>
            <div className="font-display mb-1 text-2xl font-medium text-ink">
              {t('claim.title')}
            </div>
            <div className="font-display mb-4 text-sm italic text-ink-muted">
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

            <form action={formAction} className="mt-6 flex flex-col gap-4">
              <input type="hidden" name="personId" value={personId} />

              <label className="font-display block text-sm italic text-ink-muted">
                {t('claim.firstName')}
                <input
                  type="text"
                  name="firstName"
                  required
                  defaultValue={initialFirstName}
                  maxLength={100}
                  autoFocus
                  className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                />
              </label>

              <label className="font-display block text-sm italic text-ink-muted">
                {t('claim.lastName')}
                <input
                  type="text"
                  name="lastName"
                  required
                  defaultValue="Koja"
                  maxLength={100}
                  className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                />
              </label>

              <label className="font-display block text-sm italic text-ink-muted">
                {t('claim.email')}
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                />
              </label>

              <label className="font-display block text-sm italic text-ink-muted">
                {t('claim.phone')}
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                />
              </label>

              <label className="font-display block text-sm italic text-ink-muted">
                {t('claim.password')}
                <input
                  ref={passwordRef}
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="mt-1 block w-full border border-[var(--color-border-dark)] bg-cream px-3.5 py-2.5 text-sm text-ink focus:outline-1 focus:outline-olive"
                />
              </label>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="font-display flex-1 rounded-sm border border-[var(--color-border-dark)] px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-parchment-deep"
                >
                  {t('claim.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={pending || signingIn}
                  className="font-display flex-1 rounded-sm border border-olive-deep bg-olive-deep px-5 py-2.5 text-sm font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep disabled:opacity-60"
                >
                  {pending || signingIn ? '…' : t('claim.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
