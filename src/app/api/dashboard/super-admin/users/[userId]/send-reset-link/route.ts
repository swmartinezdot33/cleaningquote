import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';
import { getSiteUrl } from '@/lib/canonical-url';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** POST - Send Supabase password reset email to user (super admin only). */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const admin = createSupabaseServer();
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const email = userData?.user?.email;

  if (!email) {
    return NextResponse.json({ error: 'User has no email' }, { status: 400 });
  }

  const baseUrl = getSiteUrl();
  const redirectTo = `${baseUrl}/auth/set-password`;

  const res = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { msg?: string }).msg ?? (err as { error_description?: string }).error_description ?? 'Failed to send reset email' },
      { status: res.status >= 500 ? 500 : 400 }
    );
  }

  return NextResponse.json({ ok: true, email });
}
