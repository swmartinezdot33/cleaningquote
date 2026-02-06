import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import type { Database } from '@/lib/supabase/types';
import { canManageOrg } from '@/lib/org-auth';

type OrgUpdate = Database['public']['Tables']['organizations']['Update'];

export const dynamic = 'force-dynamic';

/** PATCH - Update organization (name, contact email, contact phone). Org admin or super admin only. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can update organization' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: { name?: string; contact_email?: string | null; contact_phone?: string | null } = {};
  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (name) updates.name = name;
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

  const payload: OrgUpdate = { ...updates, updated_at: new Date().toISOString() };
  const { data: org, error } = await supabase
    .from('organizations')
    // @ts-expect-error Supabase generated types sometimes infer update() as never; payload is valid OrgUpdate
    .update(payload)
    .eq('id', orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ org });
}
