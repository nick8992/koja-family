import type { Metadata, Viewport } from 'next';
import { Fraunces, Manrope, Noto_Naskh_Arabic } from 'next/font/google';
import { sql } from 'drizzle-orm';
import './globals.css';
import { auth } from '@/auth';
import { db } from '@/db';
import { getLanguage } from '@/lib/i18n/server';
import { LanguageProvider } from '@/lib/i18n/context';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { loadUnreadCount } from '@/lib/notifications';

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
  metadataBase: new URL('https://kojafamily.com'),
  title: {
    default: 'Koja Family',
    template: '%s · Koja Family',
  },
  description:
    'A private gathering place for the descendants of Hanna Koja — seven generations, one lineage.',
  openGraph: {
    title: 'Koja Family',
    description:
      'A private gathering place for the descendants of Hanna Koja — seven generations, one lineage.',
    url: 'https://kojafamily.com',
    siteName: 'Koja Family',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koja Family',
    description:
      'A private gathering place for the descendants of Hanna Koja.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow user pinch-zoom for accessibility, but don't carry in-page pinch
  // state between navigations (e.g. from /tree to /profile/X).
  maximumScale: 5,
  viewportFit: 'cover',
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
    personId: number | null;
    photoUrl: string | null;
    unreadNotifications: number;
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
    // their own name (or uploads a new photo).
    let displayName = u.displayName || u.name || u.email || '';
    let photoUrl: string | null = null;
    if (u.personId) {
      const rows = await db.execute<{ first_name: string; profile_photo_url: string | null }>(
        sql`SELECT first_name, profile_photo_url FROM persons WHERE id = ${u.personId} LIMIT 1`
      );
      const arr = rows as unknown as {
        first_name: string;
        profile_photo_url: string | null;
      }[];
      if (arr[0]?.first_name) displayName = arr[0].first_name;
      photoUrl = arr[0]?.profile_photo_url ?? null;
    }
    let unread = 0;
    if (session.user) {
      const userId = Number((session.user as { id?: string }).id ?? 0);
      if (userId) {
        try {
          unread = await loadUnreadCount(userId);
        } catch (err) {
          console.warn('[layout] loadUnreadCount failed:', err);
        }
      }
    }

    headerSession = {
      email: u.email ?? '',
      displayName,
      role: u.role ?? 'member',
      personId: u.personId ?? null,
      photoUrl,
      unreadNotifications: unread,
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
            <Footer />
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
