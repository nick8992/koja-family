'use client';

import { useLanguage } from '@/lib/i18n/context';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div
      className="keep-ltr inline-flex overflow-hidden rounded-sm border border-[var(--color-border-dark)]"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        className={
          'px-3 py-1.5 font-display text-xs font-medium tracking-wider transition-colors ' +
          (lang === 'en'
            ? 'bg-olive-deep text-cream'
            : 'text-ink-muted hover:text-ink')
        }
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ar')}
        className={
          'font-arabic px-3 py-1.5 text-sm font-medium transition-colors ' +
          (lang === 'ar'
            ? 'bg-olive-deep text-cream'
            : 'text-ink-muted hover:text-ink')
        }
      >
        عربي
      </button>
    </div>
  );
}
