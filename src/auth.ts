import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

type DbUser = {
  id: number;
  person_id: number;
  email: string;
  password_hash: string;
  role: 'member' | 'admin';
  is_active: boolean;
  rejected_at: string | null;
  approved_at: string | null;
  first_name: string;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').trim().toLowerCase();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;

        const rows = await db.execute<DbUser>(sql`
          SELECT u.id, u.person_id, u.email, u.password_hash, u.role,
                 u.is_active, u.rejected_at, u.approved_at,
                 p.first_name
            FROM users u
            JOIN persons p ON p.id = u.person_id
           WHERE LOWER(u.email) = ${email}
           LIMIT 1
        `);
        const arr = rows as unknown as DbUser[];
        const user = arr[0];
        if (!user) return null;
        if (!user.is_active) return null;
        if (user.rejected_at) return null;

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;

        // Fire-and-forget: record the login time
        db.execute(sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`).catch(
          () => {}
        );

        return {
          id: String(user.id),
          email: user.email,
          name: user.first_name,
          role: user.role,
          personId: user.person_id,
          approved: user.approved_at != null,
        } as unknown as import('next-auth').User;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          personId?: number;
          role?: 'member' | 'admin';
          approved?: boolean;
        };
        token.userId = Number(u.id);
        token.personId = u.personId ?? null;
        token.role = u.role ?? 'member';
        token.approved = !!u.approved;
        token.displayName = u.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as typeof token & {
        userId?: number;
        personId?: number | null;
        role?: 'member' | 'admin';
        approved?: boolean;
        displayName?: string | null;
      };
      session.user = {
        ...session.user,
        id: String(t.userId ?? ''),
        personId: t.personId ?? null,
        role: t.role ?? 'member',
        approved: !!t.approved,
        displayName: t.displayName ?? session.user?.email ?? '',
      } as typeof session.user & {
        id: string;
        personId: number | null;
        role: 'member' | 'admin';
        approved: boolean;
        displayName: string;
      };
      return session;
    },
  },
});
