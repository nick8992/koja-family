import type { Metadata } from 'next';
import { auth } from '@/auth';
import { loadAllPersons } from '@/lib/tree-data';
import { tServer } from '@/lib/i18n/server';
import { FamilyTree } from '@/components/FamilyTree';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Family Tree' };

export default async function TreePage() {
  const nodes = await loadAllPersons();
  const session = await auth();
  const sessionUser = session?.user as { personId?: number | null } | undefined;
  const currentUserPersonId = sessionUser?.personId ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10">
      <h1 className="font-display text-5xl font-medium leading-none tracking-tight text-ink">
        {await tServer('tree.title')}
      </h1>
      <p className="font-display mt-2 mb-8 text-lg italic text-ink-muted">
        {await tServer('tree.sub')}
      </p>
      <FamilyTree nodes={nodes} currentUserPersonId={currentUserPersonId} />
    </div>
  );
}
