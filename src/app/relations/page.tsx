import { loadAllPersons } from '@/lib/tree-data';
import { tServer } from '@/lib/i18n/server';
import { RelationsCalculator } from '@/components/RelationsCalculator';

export const dynamic = 'force-dynamic';

export default async function RelationsPage() {
  const nodes = await loadAllPersons();

  return (
    <div className="mx-auto max-w-[900px] px-8 py-10">
      <h1 className="font-display text-5xl font-medium leading-none tracking-tight text-ink">
        {await tServer('calc.title')}
      </h1>
      <p className="font-display mt-2 mb-8 text-lg italic text-ink-muted">
        {await tServer('calc.sub')}
      </p>
      <RelationsCalculator nodes={nodes} />
    </div>
  );
}
