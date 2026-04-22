import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { tServer } from '@/lib/i18n/server';
import { LoginForm } from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/');
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-8 py-16">
      <h1 className="font-display mb-2 text-4xl font-medium text-ink">
        {await tServer('login.title')}
      </h1>
      <p className="font-display mb-8 italic text-ink-muted">
        {await tServer('login.sub')}
      </p>
      <div className="border border-border bg-cream p-8">
        <LoginForm />
      </div>
    </div>
  );
}
