import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { tServer } from '@/lib/i18n/server';
import { approveClaimAction, rejectClaimAction } from '@/lib/admin-actions';

export const dynamic = 'force-dynamic';

type PendingClaim = {
  user_id: number;
  email: string;
  phone: string | null;
  created_at: string;
  person_id: number;
  person_name: string;
  pending_edits: number;
};

type RecentEdit = {
  id: number;
  person_id: number;
  person_name: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  edited_at: string;
  editor_name: string | null;
};

async function loadPendingClaims(): Promise<PendingClaim[]> {
  const rows = await db.execute<PendingClaim>(sql`
    SELECT u.id AS user_id, u.email, u.phone, u.created_at,
           p.id AS person_id, p.first_name AS person_name,
           (SELECT COUNT(*)::int FROM pending_edits pe
             WHERE pe.user_id = u.id AND pe.status = 'pending') AS pending_edits
      FROM users u
      JOIN persons p ON p.id = u.person_id
     WHERE u.approved_at IS NULL AND u.rejected_at IS NULL
     ORDER BY u.created_at DESC
     LIMIT 50
  `);
  return rows as unknown as PendingClaim[];
}

async function loadRecentEdits(): Promise<RecentEdit[]> {
  const rows = await db.execute<RecentEdit>(sql`
    SELECT eh.id, eh.person_id, p.first_name AS person_name,
           eh.field_name, eh.old_value, eh.new_value, eh.edited_at,
           ep.first_name AS editor_name
      FROM edit_history eh
      JOIN persons p ON p.id = eh.person_id
 LEFT JOIN users u ON u.id = eh.edited_by_user
 LEFT JOIN persons ep ON ep.id = u.person_id
     ORDER BY eh.edited_at DESC
     LIMIT 20
  `);
  return rows as unknown as RecentEdit[];
}

export default async function AdminPage() {
  const session = await auth();
  const sessionUser = session?.user as { role?: string } | undefined;
  if (sessionUser?.role !== 'admin') {
    redirect('/');
  }

  const [pending, recent] = await Promise.all([loadPendingClaims(), loadRecentEdits()]);

  const i = {
    title: await tServer('admin.title'),
    sub: await tServer('admin.sub'),
    pendingTitle: await tServer('admin.pending.title'),
    pendingEmpty: await tServer('admin.pending.empty'),
    approve: await tServer('admin.approve'),
    reject: await tServer('admin.reject'),
    recentTitle: await tServer('admin.recent.title'),
    recentEmpty: await tServer('admin.recent.empty'),
    colPerson: await tServer('admin.col.person'),
    colClaimant: await tServer('admin.col.claimant'),
    colEmail: await tServer('admin.col.email'),
    colPhone: await tServer('admin.col.phone'),
    colWhen: await tServer('admin.col.when'),
    colField: await tServer('admin.col.field'),
    colOld: await tServer('admin.col.old'),
    colNew: await tServer('admin.col.new'),
    colBy: await tServer('admin.col.by'),
  };

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-10">
      <h1 className="font-display text-5xl font-medium tracking-tight text-ink">{i.title}</h1>
      <p className="font-display mt-2 mb-10 text-lg italic text-ink-muted">{i.sub}</p>

      {/* PENDING CLAIMS */}
      <section className="mb-12">
        <h2 className="font-display mb-4 flex items-center gap-4 text-3xl font-medium text-ink">
          {i.pendingTitle}
          <span className="h-px flex-1 bg-border" />
          <span className="font-display text-sm italic text-ink-muted">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="font-display italic text-ink-muted">{i.pendingEmpty}</p>
        ) : (
          <div className="overflow-x-auto border border-border bg-cream">
            <table className="w-full text-sm">
              <thead className="border-b border-border font-display text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <Th>{i.colPerson}</Th>
                  <Th>{i.colClaimant}</Th>
                  <Th>{i.colEmail}</Th>
                  <Th>{i.colPhone}</Th>
                  <Th>{i.colWhen}</Th>
                  <Th className="text-end">&nbsp;</Th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c) => (
                  <tr key={c.user_id} className="border-t border-dotted border-border">
                    <td className="px-3 py-3">
                      <Link
                        href={`/profile/${c.person_id}`}
                        className="font-display font-medium text-terracotta-deep hover:underline"
                      >
                        {c.person_name}
                      </Link>
                      <div className="text-xs text-ink-muted">#{c.person_id}</div>
                    </td>
                    <td className="px-3 py-3 font-display">
                      {c.pending_edits > 0 ? (
                        <span className="text-xs text-ink-muted">
                          {c.pending_edits} pending edit{c.pending_edits === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-muted">no edits yet</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{c.email}</td>
                    <td className="px-3 py-3 font-mono text-xs">{c.phone ?? '—'}</td>
                    <td className="px-3 py-3 text-xs text-ink-muted">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-end">
                      <div className="inline-flex gap-2">
                        <form action={approveClaimAction}>
                          <input type="hidden" name="userId" value={c.user_id} />
                          <button
                            type="submit"
                            className="font-display rounded-sm border border-olive-deep bg-olive-deep px-3 py-1.5 text-xs font-medium text-cream hover:border-terracotta-deep hover:bg-terracotta-deep"
                          >
                            {i.approve}
                          </button>
                        </form>
                        <form action={rejectClaimAction}>
                          <input type="hidden" name="userId" value={c.user_id} />
                          <button
                            type="submit"
                            className="font-display rounded-sm border border-[var(--color-border-dark)] px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-parchment-deep hover:text-terracotta-deep"
                          >
                            {i.reject}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RECENT EDITS */}
      <section>
        <h2 className="font-display mb-4 flex items-center gap-4 text-3xl font-medium text-ink">
          {i.recentTitle}
          <span className="h-px flex-1 bg-border" />
        </h2>
        {recent.length === 0 ? (
          <p className="font-display italic text-ink-muted">{i.recentEmpty}</p>
        ) : (
          <div className="overflow-x-auto border border-border bg-cream">
            <table className="w-full text-sm">
              <thead className="border-b border-border font-display text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <Th>{i.colWhen}</Th>
                  <Th>{i.colPerson}</Th>
                  <Th>{i.colField}</Th>
                  <Th>{i.colOld}</Th>
                  <Th>{i.colNew}</Th>
                  <Th>{i.colBy}</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-dotted border-border align-top">
                    <td className="px-3 py-2 text-xs text-ink-muted">
                      {new Date(r.edited_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/profile/${r.person_id}`}
                        className="font-display font-medium text-terracotta-deep hover:underline"
                      >
                        {r.person_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.field_name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink-muted max-w-[180px] truncate">
                      {r.old_value ?? '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs max-w-[180px] truncate">
                      {r.new_value ?? '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                      {r.editor_name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-start ${className}`}>{children}</th>;
}
