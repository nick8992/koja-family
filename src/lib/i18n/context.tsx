'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Lang, translate } from './dictionary';

type LanguageContextValue = {
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLang: (lang: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const LANG_COOKIE = 'koja_lang';

export function LanguageProvider({
  lang: initialLang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  const router = useRouter();
  // Track language as local state so switching is instant for every
  // client component using useLanguage() — no full reload, so open
  // modals (e.g. the claim popup) stay open.
  const [lang, setLangState] = useState<Lang>(initialLang);

  // If the server sends a different lang on a subsequent navigation or
  // refresh, adopt it.
  useEffect(() => {
    setLangState(initialLang);
  }, [initialLang]);

  const setLang = useCallback(
    (next: Lang) => {
      document.cookie = `${LANG_COOKIE}=${next}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      // Mirror <html dir/lang> so RTL flips immediately without waiting
      // on server components.
      document.documentElement.lang = next;
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
      setLangState(next);
      // Re-run server components so anything rendered via tServer picks
      // up the new cookie. router.refresh() preserves client state
      // (open dialogs, form input, scroll position).
      router.refresh();
    },
    [router]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      t: (key, vars) => translate(lang, key, vars),
      setLang,
    }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
