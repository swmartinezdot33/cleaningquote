import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';
import { fetchZctaPolygon } from '@/lib/service-area/zipCodeToPolygon';

export const dynamic = 'force-dynamic';

/** GET - Return polygon for one US 5-digit ZIP (for adding to map in Draw/Edit modal). Query: zip=27601 */
export async function GET(
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
    return NextResponse.json({ error: 'Only org admins can use this' }, { status: 403 });
  }

  const zip = request.nextUrl.searchParams.get('zip');
  const zip5 = typeof zip === 'string' ? zip.trim().replace(/^(\d{5}).*/, '$1') : '';
  if (!/^\d{5}$/.test(zip5)) {
    return NextResponse.json({ error: 'Valid 5-digit US ZIP code required' }, { status: 400 });
  }

  const polygon = await fetchZctaPolygon(zip5);
  if (!polygon) {
    return NextResponse.json(
      { error: `Could not load boundary for ZIP ${zip5}. Check that it's a valid US ZIP.` },
      { status: 404 }
    );
  }

  return NextResponse.json({ polygon, zip: zip5 });
}
