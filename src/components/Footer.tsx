'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-[var(--color-border-dark)] bg-parchment-deep">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:px-8">
        <div className="font-display flex flex-col items-center gap-1 sm:items-start">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="font-arabic text-sm text-ink-soft">ܒܝܬܐ ܕܩܘܓܐ</span>
            <span>·</span>
            <span>
              &copy; {year} {t('footer.copyright')}
            </span>
          </div>
          <div className="font-semibold text-ink-soft">
            {t('footer.creators')}
          </div>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-4 font-display">
          <Link href="/tree" className="hover:text-terracotta-deep">
            {t('nav.tree')}
          </Link>
          <Link href="/relations" className="hover:text-terracotta-deep">
            {t('nav.calc')}
          </Link>
          <Link href="/request-addition" className="hover:text-terracotta-deep">
            {t('footer.request_addition')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
