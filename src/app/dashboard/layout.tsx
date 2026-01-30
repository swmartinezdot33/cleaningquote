import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { BrandLogo } from '@/components/BrandLogo';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
            >
              Tools
            </Link>
            <Link
              href="/dashboard/quotes"
              className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
            >
              Quotes
            </Link>
            <Link
              href="/dashboard/profile"
              className="text-sm font-medium text-foreground hover:text-primary hover:underline"
            >
              {user.user_metadata?.full_name || user.user_metadata?.display_name || user.email}
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-medium text-primary hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
