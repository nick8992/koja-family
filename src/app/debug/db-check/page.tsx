import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { persons, users } from '@/db/schema';

export const dynamic = 'force-dynamic';

type Counts = { persons: number; users: number };
type Generation = { depth: number; count: number };

async function loadData() {
  const [countsRow] = await db.execute<Counts>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM persons) AS persons,
      (SELECT COUNT(*)::int FROM users)   AS users
  `);

  const firstTwenty = await db
    .select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
      fatherId: persons.fatherId,
      notes: persons.notes,
    })
    .from(persons)
    .orderBy(persons.id)
    .limit(20);

  const generations = await db.execute<Generation>(sql`
    WITH RECURSIVE chain AS (
      SELECT id, 0 AS depth FROM persons WHERE father_id IS NULL
      UNION ALL
      SELECT p.id, c.depth + 1 FROM persons p JOIN chain c ON p.father_id = c.id
    )
    SELECT depth, COUNT(*)::int AS count FROM chain GROUP BY depth ORDER BY depth
  `);

  const admin = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      personId: users.personId,
      approvedAt: users.approvedAt,
    })
    .from(users)
    .where(sql`role = 'admin'`);

  return { counts: countsRow, firstTwenty, generations, admin };
}

export default async function DbCheckPage() {
  let data: Awaited<ReturnType<typeof loadData>> | null = null;
  let error: string | null = null;
  try {
    data = await loadData();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="mx-auto max-w-4xl p-8 text-stone-900">
      <Link href="/" className="text-sm text-stone-600 hover:underline">
        ← home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Database check</h1>
      <p className="mt-1 text-sm text-stone-600">
        Phase 1 verification. If all four sections below look right, Phase 1 is complete.
      </p>

      {error ? (
        <div className="mt-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <strong>Connection failed:</strong> {error}
        </div>
      ) : data ? (
        <>
          <section className="mt-8">
            <h2 className="text-xl font-semibold">1. Row counts</h2>
            <table className="mt-2 text-sm">
              <tbody>
                <tr>
                  <td className="pr-4 text-stone-600">persons</td>
                  <td className="font-mono">{data.counts.persons}</td>
                  <td className="pl-4 text-stone-500">(expected 335)</td>
                </tr>
                <tr>
                  <td className="pr-4 text-stone-600">users</td>
                  <td className="font-mono">{data.counts.users}</td>
                  <td className="pl-4 text-stone-500">(expected 1)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">2. Generation distribution</h2>
            <p className="text-xs text-stone-500">
              Expected: 1 / 2 / 6 / 13 / 30 / 85 / 129 / 69 (depths 0–7)
            </p>
            <table className="mt-2 text-sm">
              <thead className="text-stone-500">
                <tr>
                  <th className="pr-6 text-left">Depth</th>
                  <th className="text-left">Count</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {data.generations.map((g) => (
                  <tr key={g.depth}>
                    <td className="pr-6">{g.depth}</td>
                    <td>{g.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">3. Admin user</h2>
            {data.admin.length === 0 ? (
              <p className="text-sm text-red-700">No admin user found.</p>
            ) : (
              <table className="mt-2 text-sm">
                <tbody>
                  {data.admin.map((u) => (
                    <tr key={u.id}>
                      <td className="pr-6 text-stone-600">#{u.id}</td>
                      <td className="pr-6 font-mono">{u.email}</td>
                      <td className="pr-6">{u.role}</td>
                      <td className="pr-6 text-stone-500">person_id={u.personId}</td>
                      <td className="text-stone-500">
                        {u.approvedAt ? 'approved' : 'pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">4. First 20 persons</h2>
            <table className="mt-2 text-sm">
              <thead className="text-stone-500">
                <tr>
                  <th className="pr-4 text-left">ID</th>
                  <th className="pr-4 text-left">First name</th>
                  <th className="pr-4 text-left">Last name</th>
                  <th className="pr-4 text-left">Father</th>
                  <th className="text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {data.firstTwenty.map((p) => (
                  <tr key={p.id} className="border-t border-stone-200">
                    <td className="pr-4">{p.id}</td>
                    <td className="pr-4">{p.firstName}</td>
                    <td className="pr-4">{p.lastName}</td>
                    <td className="pr-4 text-stone-500">
                      {p.fatherId ?? '—'}
                    </td>
                    <td className="whitespace-pre-wrap text-stone-500">
                      {p.notes ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </main>
  );
}
