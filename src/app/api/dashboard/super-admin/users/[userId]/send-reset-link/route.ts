import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** POST - Generate password reset link for user (super admin only). Returns link to copy/send. */
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

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const actionLink = linkData?.properties?.action_link;

  if (!actionLink || typeof actionLink !== 'string') {
    return NextResponse.json(
      { error: 'Could not get reset link' },
      { status: 500 }
    );
  }

  return NextResponse.json({ link: actionLink, email });
}
