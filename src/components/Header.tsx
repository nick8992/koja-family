'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { logoutAction } from '@/lib/auth-actions';
import { LanguageToggle } from './LanguageToggle';

type Session = {
  email: string;
  displayName: string;
  role: 'member' | 'admin';
  personId: number | null;
  photoUrl: string | null;
  unreadNotifications: number;
} | null;

const NAV = [
  { key: 'nav.home', href: '/' },
  { key: 'nav.tree', href: '/tree' },
  { key: 'nav.feed', href: '/feed' },
  { key: 'nav.events', href: '/events' },
  { key: 'nav.album', href: '/album' },
  { key: 'nav.calc', href: '/relations' },
] as const;

function navIsActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Header({ session }: { session: Session }) {
  const { t } = useLanguage();
  const pathname = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = session?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[var(--color-border-dark)] bg-parchment-deep shadow-sm">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6 md:gap-8 md:px-8 md:py-4">
        {/* Brand */}
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 sm:gap-3"
          onClick={() => setMenuOpen(false)}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gold text-lg text-gold-light sm:h-10 sm:w-10 md:h-11 md:w-11 md:text-xl"
            style={{
              background: 'var(--color-olive-deep)',
              boxShadow: 'inset 0 0 0 2px var(--color-olive-deep), 0 2px 8px rgba(0,0,0,0.2)',
              fontFamily: 'Amiri, serif',
            }}
          >
            ܩ
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="font-display truncate text-lg font-semibold tracking-wide text-ink sm:text-xl md:text-2xl">
              {t('brand.title')}
            </span>
            <span className="font-arabic hidden text-xs tracking-widest text-ink-muted md:inline">
              ܒܝܬܐ ܕܩܘܓܐ
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = navIsActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  'relative rounded-sm px-3 py-2 font-display text-[16px] font-medium tracking-wide transition-colors lg:px-4 lg:text-[17px] ' +
                  (active ? 'text-olive-deep' : 'text-ink-soft hover:text-terracotta-deep')
                }
              >
                {t(item.key)}
                {active ? (
                  <span className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-terracotta lg:left-4 lg:right-4" />
                ) : null}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              href="/admin"
              className={
                'relative rounded-sm px-3 py-2 font-display text-[16px] font-medium tracking-wide transition-colors lg:px-4 lg:text-[17px] ' +
                (navIsActive(pathname, '/admin')
                  ? 'text-olive-deep'
                  : 'text-ink-soft hover:text-terracotta-deep')
              }
            >
              {t('nav.admin')}
              {navIsActive(pathname, '/admin') ? (
                <span className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-terracotta lg:left-4 lg:right-4" />
              ) : null}
            </Link>
          ) : null}
        </nav>

        {/* Right cluster: lang (desktop only) + auth + mobile hamburger */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:block">
            <LanguageToggle />
          </div>

          {session ? (
            <AuthSide session={session} />
          ) : (
            <Link
              href="/login"
              className="font-display text-sm font-medium text-ink-soft hover:text-terracotta-deep"
            >
              {t('nav.login')}
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[var(--color-border-dark)] text-ink-soft transition-colors hover:bg-parchment md:hidden"
          >
            {menuOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4h12M2 8h12M2 12h12" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="border-t border-border bg-parchment-deep md:hidden">
          <nav className="mx-auto flex max-w-[1400px] flex-col px-4 py-2">
            {NAV.map((item) => {
              const active = navIsActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={
                    'font-display border-b border-dotted border-border px-2 py-3 text-base font-medium transition-colors ' +
                    (active ? 'text-olive-deep' : 'text-ink-soft hover:text-terracotta-deep')
                  }
                >
                  {t(item.key)}
                </Link>
              );
            })}
            {isAdmin ? (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className={
                  'font-display border-b border-dotted border-border px-2 py-3 text-base font-medium transition-colors ' +
                  (navIsActive(pathname, '/admin')
                    ? 'text-olive-deep'
                    : 'text-ink-soft hover:text-terracotta-deep')
                }
              >
                {t('nav.admin')}
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function AuthSide({ session }: { session: NonNullable<Session> }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-2 border-s border-border ps-2 sm:ps-3">
      <Link
        href="/notifications"
        aria-label={t('nav.notifications')}
        title={t('nav.notifications')}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:text-terracotta-deep sm:h-9 sm:w-9"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M10 2a4.5 4.5 0 0 0-4.5 4.5c0 2.5-.75 4.5-1.75 5.5h12.5c-1-1-1.75-3-1.75-5.5A4.5 4.5 0 0 0 10 2Z" />
          <path d="M8 15a2 2 0 0 0 4 0" />
        </svg>
        {session.unreadNotifications > 0 ? (
          <span className="absolute -top-0.5 end-0 inline-flex min-w-[16px] items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-semibold leading-4 text-cream">
            {session.unreadNotifications > 9 ? '9+' : session.unreadNotifications}
          </span>
        ) : null}
      </Link>
      {session.personId ? (
        <Link
          href={`/profile/${session.personId}`}
          className="flex items-center gap-2"
          title="Your profile"
        >
          <span
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-gold font-display text-sm font-semibold text-cream sm:h-9 sm:w-9"
            style={{
              background: session.photoUrl
                ? `url(${session.photoUrl}) center/cover`
                : 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))',
            }}
          >
            {session.photoUrl ? null : session.displayName[0]?.toUpperCase()}
          </span>
          <span className="font-display hidden text-sm text-ink-soft hover:text-terracotta-deep sm:inline">
            {session.displayName}
          </span>
        </Link>
      ) : (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-gold font-display text-sm font-semibold text-cream sm:h-9 sm:w-9"
          style={{ background: 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))' }}
        >
          {session.displayName[0]?.toUpperCase()}
        </span>
      )}
      <form
        action={logoutAction}
        onSubmit={(e) => {
          if (!window.confirm(t('nav.logout.confirm'))) e.preventDefault();
        }}
      >
        <button
          type="submit"
          className="font-display text-xs text-ink-muted hover:text-terracotta-deep"
        >
          {t('nav.logout')}
        </button>
      </form>
    </div>
  );
}
