import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-50 p-8 text-stone-900">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Koja Family</h1>
        <p className="mt-2 text-stone-600">
          Phase 1 scaffold. The real UI lands in Phase 2.
        </p>
      </div>
      <div className="flex gap-4 text-sm">
        <Link
          href="/debug/db-check"
          className="rounded border border-stone-300 px-4 py-2 hover:bg-stone-100"
        >
          Verify database connection →
        </Link>
      </div>
    </main>
  );
}
