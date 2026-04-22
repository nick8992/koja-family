import 'server-only';
import { cookies } from 'next/headers';
import { type Lang, translate } from './dictionary';

export const LANG_COOKIE = 'koja_lang';

export async function getLanguage(): Promise<Lang> {
  const store = await cookies();
  const raw = store.get(LANG_COOKIE)?.value;
  return raw === 'ar' ? 'ar' : 'en';
}

export async function tServer(
  key: string,
  vars?: Record<string, string | number>
): Promise<string> {
  const lang = await getLanguage();
  return translate(lang, key, vars);
}
