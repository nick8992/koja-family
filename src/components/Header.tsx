'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import { logoutAction } from '@/lib/auth-actions';
import { LanguageToggle } from './LanguageToggle';

type Session = { email: string; displayName: string; role: 'member' | 'admin' } | null;

const NAV = [
  { key: 'nav.home', href: '/' },
  { key: 'nav.tree', href: '/tree' },
  { key: 'nav.feed', href: '/feed' },
  { key: 'nav.events', href: '/events' },
  { key: 'nav.calc', href: '/relations' },
] as const;

function navIsActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Header({ session }: { session: Session }) {
  const { t } = useLanguage();
  const pathname = usePathname() || '/';

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[var(--color-border-dark)] bg-parchment-deep shadow-sm">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 px-8 py-4">
        <Link href="/" className="flex items-center gap-3.5">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gold text-xl text-gold-light"
            style={{
              background: 'var(--color-olive-deep)',
              boxShadow: 'inset 0 0 0 2px var(--color-olive-deep), 0 2px 8px rgba(0,0,0,0.2)',
              fontFamily: 'Amiri, serif',
            }}
          >
            ܩ
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-2xl font-semibold tracking-wide text-ink">
              {t('brand.title')}
            </span>
            <span className="font-arabic mt-1 text-xs tracking-widest text-ink-muted">
              ܒܝܬܐ ܕܩܘܓܐ
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = navIsActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    'relative rounded-sm px-4 py-2 font-display text-[17px] font-medium tracking-wide transition-colors ' +
                    (active
                      ? 'text-olive-deep'
                      : 'text-ink-soft hover:text-terracotta-deep')
                  }
                >
                  {t(item.key)}
                  {active ? (
                    <span className="absolute bottom-0.5 left-4 right-4 h-0.5 bg-terracotta" />
                  ) : null}
                </Link>
              );
            })}
            {session?.role === 'admin' ? (
              <Link
                href="/admin"
                className={
                  'relative rounded-sm px-4 py-2 font-display text-[17px] font-medium tracking-wide transition-colors ' +
                  (navIsActive(pathname, '/admin')
                    ? 'text-olive-deep'
                    : 'text-ink-soft hover:text-terracotta-deep')
                }
              >
                {t('nav.admin')}
                {navIsActive(pathname, '/admin') ? (
                  <span className="absolute bottom-0.5 left-4 right-4 h-0.5 bg-terracotta" />
                ) : null}
              </Link>
            ) : null}
          </div>

          <LanguageToggle />

          {session ? (
            <div className="ms-2 flex items-center gap-2.5 border-s border-border ps-4">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-gold font-display text-sm font-semibold text-cream"
                style={{ background: 'linear-gradient(135deg, var(--color-olive), var(--color-olive-deep))' }}
              >
                {session.displayName[0]?.toUpperCase()}
              </span>
              <span className="font-display text-sm text-ink-soft hidden sm:inline">
                {session.displayName}
              </span>
              <form action={logoutAction} className="ms-1">
                <button
                  type="submit"
                  className="font-display text-xs text-ink-muted hover:text-terracotta-deep"
                >
                  {t('nav.logout')}
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="ms-2 font-display text-sm font-medium text-ink-soft hover:text-terracotta-deep"
            >
              {t('nav.login')}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
