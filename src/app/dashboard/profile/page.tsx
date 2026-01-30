import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { ProfileForm } from './ProfileForm';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard/profile');
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.display_name as string | undefined) ||
    '';

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your display name, email, and password.
        </p>
      </div>
      <ProfileForm initialDisplayName={displayName} initialEmail={user.email ?? ''} />
    </div>
  );
}
