import type { Metadata } from 'next';
import { Fraunces, Manrope, Noto_Naskh_Arabic } from 'next/font/google';
import { sql } from 'drizzle-orm';
import './globals.css';
import { auth } from '@/auth';
import { db } from '@/db';
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

  let headerSession: {
    email: string;
    displayName: string;
    role: 'member' | 'admin';
  } | null = null;

  if (session?.user) {
    const u = session.user as {
      email?: string;
      name?: string | null;
      displayName?: string;
      personId?: number | null;
      role?: 'member' | 'admin';
    };
    // The JWT snapshotted the user's first_name at login time; pull the
    // latest value so the header updates immediately when the user edits
    // their own name.
    let displayName = u.displayName || u.name || u.email || '';
    if (u.personId) {
      const rows = await db.execute<{ first_name: string }>(
        sql`SELECT first_name FROM persons WHERE id = ${u.personId} LIMIT 1`
      );
      const arr = rows as unknown as { first_name: string }[];
      if (arr[0]?.first_name) displayName = arr[0].first_name;
    }
    headerSession = {
      email: u.email ?? '',
      displayName,
      role: u.role ?? 'member',
    };
  }

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
