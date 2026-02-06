import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';
import { slugToSafe } from '@/lib/supabase/tools';

export const dynamic = 'force-dynamic';

/** PATCH - Update organization (super admin only) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { orgId } = await params;
  const body = await request.json().catch(() => ({}));

  const updates: { name?: string; slug?: string; contact_email?: string | null; contact_phone?: string | null } = {};
  if (typeof body.name === 'string' && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body.slug === 'string') {
    const slug = slugToSafe(body.slug);
    if (slug) updates.slug = slug;
  }
  if (body.contact_email !== undefined) {
    updates.contact_email = typeof body.contact_email === 'string' ? body.contact_email.trim() || null : null;
  }
  if (body.contact_phone !== undefined) {
    updates.contact_phone = typeof body.contact_phone === 'string' ? body.contact_phone.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
  }

  const admin = createSupabaseServer();
  const { data: org, error } = await admin
    .from('organizations')
    // @ts-expect-error organizations update type
    .update(updates)
    .eq('id', orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ org });
}

/** DELETE - Delete organization (super admin only). Cascades: members, invitations, tools. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { orgId } = await params;
  if (!orgId) {
    return NextResponse.json({ error: 'Org ID required' }, { status: 400 });
  }

  const admin = createSupabaseServer();
  const { error } = await admin.from('organizations').delete().eq('id', orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ deleted: true });
}
