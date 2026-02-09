import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndToolWithClient } from '@/lib/dashboard-auth';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';
import { getSession } from '@/lib/ghl/session';
import * as configStore from '@/lib/config/store';
import { slugToSafe } from '@/lib/supabase/tools';

function locationIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get('x-ghl-location-id')?.trim() || null;
  const query = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  return header ?? query ?? null;
}

const SUPABASE_REQUIRED_MSG =
  'Supabase is required for configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: SUPABASE_REQUIRED_MSG },
      { status: 503 }
    );
  }
  const result = await getDashboardUserAndToolWithClient(toolId);
  if (result instanceof NextResponse) return result;

  const { tool, supabase } = result;
  const user = (result as { user: { id: string; email?: string } }).user;

  let targetOrgId = tool.org_id;
  try {
    const body = await request.json().catch(() => ({}));
    const requestedOrgId = body.target_org_id;
    if (requestedOrgId && isSuperAdminEmail(user.email)) {
      const admin = createSupabaseServer();
      const { data: org } = await admin.from('organizations').select('id').eq('id', requestedOrgId).single();
      if (org) targetOrgId = requestedOrgId;
    }
  } catch {
    // ignore
  }

  let baseSlug = slugToSafe(tool.slug + '-copy') || tool.slug + '-copy';
  let slug = baseSlug;
  let attempts = 0;
  while (attempts < 20) {
    const { data: existing } = await supabase
      .from('tools')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    attempts++;
    slug = `${baseSlug}-${attempts}`;
  }

  const name = `Copy of ${tool.name}`;

  // GHL-only: user.id may not be a valid auth.users id; use first org member for tool.user_id
  let creatorUserId = user.id;
  if (user.id === 'ghl' || !user.email) {
    const admin = createSupabaseServer();
    const { data: member } = await admin
      .from('organization_members')
      .select('user_id')
      .eq('org_id', targetOrgId)
      .limit(1)
      .maybeSingle();
    const resolved = (member as { user_id: string } | null)?.user_id;
    if (!resolved) {
      return NextResponse.json(
        { error: 'No org member found for this organization' },
        { status: 403 }
      );
    }
    creatorUserId = resolved;
  }

  const insertClient = createSupabaseServer();
  const { data: newTool, error: insertErr } = await insertClient
    .from('tools')
    .insert({ org_id: targetOrgId, user_id: creatorUserId, name, slug } as any)
    .select()
    .single();

  if (insertErr || !newTool) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'Failed to create cloned tool' },
      { status: 500 }
    );
  }

  const newId = (newTool as { id: string }).id;

  try {
    await configStore.copyToolConfig(toolId, newId);
  } catch (err) {
    console.warn('Clone: config copy partial failure (tool created):', err);
  }

  // Set cloned tool to current GHL location so it appears in this location's Tools list.
  const requestLocationId = locationIdFromRequest(request);
  const session = await getSession();
  const locationIdForTool = requestLocationId ?? session?.locationId ?? null;
  if (locationIdForTool) {
    try {
      await configStore.setToolConfigGhlLocationId(newId, locationIdForTool);
    } catch {
      // non-fatal; clone already succeeded
    }
  }

  return NextResponse.json({ tool: newTool });
}
