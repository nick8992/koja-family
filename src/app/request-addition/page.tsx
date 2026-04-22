import Link from 'next/link';
import { loadAllPersons } from '@/lib/tree-data';
import { tServer } from '@/lib/i18n/server';
import { RequestAdditionForm } from '@/components/RequestAdditionForm';

export const dynamic = 'force-dynamic';

export default async function RequestAdditionPage() {
  const nodes = await loadAllPersons();

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-8 sm:py-10">
      <Link
        href="/"
        className="font-display mb-6 inline-block text-sm font-medium text-ink-muted hover:text-terracotta-deep"
      >
        ← {await tServer('request.back')}
      </Link>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
        {await tServer('request.title')}
      </h1>
      <p className="font-display mt-2 mb-8 text-base italic text-ink-muted sm:text-lg">
        {await tServer('request.sub')}
      </p>
      <RequestAdditionForm nodes={nodes} />
    </div>
  );
}
