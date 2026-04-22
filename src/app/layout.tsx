import type { Metadata } from 'next';
import { Fraunces, Manrope, Noto_Naskh_Arabic } from 'next/font/google';
import './globals.css';
import { auth } from '@/auth';
import { getLanguage } from '@/lib/i18n/server';
import { LanguageProvider } from '@/lib/i18n/context';
import { Header } from '@/components/Header';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const notoArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-naskh-arabic',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Koja Family',
  description: 'A private gathering place for the descendants of Hanna Koja.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLanguage();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const session = await auth();

  const headerSession = session?.user
    ? {
        email: session.user.email ?? '',
        displayName:
          (session.user as { displayName?: string }).displayName ||
          session.user.name ||
          session.user.email ||
          '',
        role: ((session.user as { role?: 'member' | 'admin' }).role ?? 'member') as
          | 'member'
          | 'admin',
      }
    : null;

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${fraunces.variable} ${manrope.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LanguageProvider lang={lang}>
          <div id="app-root">
            <Header session={headerSession} />
            <main className="flex-1">{children}</main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
