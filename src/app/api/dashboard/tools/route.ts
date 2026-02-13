import { NextRequest, NextResponse } from 'next/server';
import type { ToolInsert } from '@/lib/supabase/types';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { slugToSafe } from '@/lib/supabase/tools';
import { canAccessTool } from '@/lib/org-auth';
import * as configStore from '@/lib/config/store';
import { DEFAULT_WIDGET } from '@/lib/tools/config';
import { DEFAULT_SURVEY_QUESTIONS } from '@/lib/survey/schema';
import { getDashboardLocationAndOrg } from '@/lib/dashboard-location';
import { getSession } from '@/lib/ghl/session';

export const dynamic = 'force-dynamic';

/** GET - List tools for the current GHL location. locationId from request/session → organizations.ghl_location_id → org → tools. */
export async function GET(request: NextRequest) {
  const resolved = await getDashboardLocationAndOrg(request);
  if (resolved instanceof NextResponse) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/dashboard/tools/route.ts:GET',message:'resolved is NextResponse',data:{status:resolved.status,hypothesisId:'H2_H4'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return resolved;
  }
  const { orgIds } = resolved;
  if (orgIds.length === 0) {
    return NextResponse.json({ tools: [] });
  }
  try {
    const supabase = createSupabaseServer();
    const { data, error } = await supabase
      .from('tools')
      .select('id, name, slug, org_id')
      .in('org_id', orgIds)
      .order('name');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/dashboard/tools/route.ts:GET',message:'tools query result',data:{orgIdsLen:orgIds.length,toolsLen:(data??[]).length,error:error?.message?.slice(0,60),hypothesisId:'H3_H4'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (error) {
      return NextResponse.json({ tools: [] });
    }
    const tools = (data ?? []).map((t: { id: string; name: string; slug: string; org_id: string }) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      org_id: t.org_id,
    }));
    return NextResponse.json({ tools });
  } catch {
    return NextResponse.json({ tools: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const orgId = body.org_id;
    if (!orgId || typeof orgId !== 'string') {
      return NextResponse.json({ error: 'Organization is required' }, { status: 400 });
    }

    let allowed = false;
    let creatorUserId: string | null = null;
    if (user) {
      allowed = await canAccessTool(user.id, user.email ?? undefined, orgId);
      if (allowed) creatorUserId = user.id;
    } else {
      const session = await getSession();
      if (session?.locationId) {
        const orgIds = await configStore.getOrgIdsByGHLLocationId(session.locationId);
        if (orgIds.includes(orgId)) {
          allowed = true;
          // Tools table requires user_id; use first org member as creator when GHL-only
          const admin = createSupabaseServer();
          const { data: member } = await admin
            .from('organization_members')
            .select('user_id')
            .eq('org_id', orgId)
            .limit(1)
            .maybeSingle();
          creatorUserId = (member as { user_id: string } | null)?.user_id ?? null;
        }
      }
    }
    if (!allowed || !creatorUserId) {
      return NextResponse.json(
        creatorUserId === null && allowed
          ? { error: 'No org member found for this organization' }
          : { error: 'Unauthorized' },
        { status: creatorUserId === null && allowed ? 403 : 401 }
      );
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const slugRaw = typeof body.slug === 'string' ? body.slug.trim() : '';
    const slug = slugToSafe(slugRaw || name || 'tool');

    if (!slug) {
      return NextResponse.json({ error: 'Name or slug is required' }, { status: 400 });
    }

    const checkClient = user ? supabase : createSupabaseServer();
    const { data: existing } = await checkClient.from('tools').select('id').eq('org_id', orgId).eq('slug', slug).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: `Slug "${slug}" is already in use` }, { status: 400 });
    }

    const insert: ToolInsert = { org_id: orgId, user_id: creatorUserId, name: name || slug, slug };
    const insertClient = createSupabaseServer();
    const { data: tool, error } = await insertClient
      .from('tools')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insert as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!tool) {
      return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
    }

    const toolId = (tool as { id: string }).id;
    try {
      await configStore.createToolConfigPreset(toolId, DEFAULT_WIDGET, DEFAULT_SURVEY_QUESTIONS);
    } catch (configErr) {
      console.error('Tool created but failed to seed default config:', configErr);
      // Still return success; tool exists, user can configure in settings
    }

    // Set as org's default quoter if this is the first tool (org has no default yet)
    try {
      const { data: orgRow } = await insertClient
        .from('organizations')
        .select('default_quoter_tool_id')
        .eq('id', orgId)
        .single();
      if (orgRow && (orgRow as { default_quoter_tool_id: string | null }).default_quoter_tool_id == null) {
        const orgTable = insertClient.from('organizations');
        await orgTable
          // @ts-expect-error - Supabase infers Update as never; Database.organizations.Update is correct
          .update({ default_quoter_tool_id: toolId })
          .eq('id', orgId);
      }
    } catch (defaultErr) {
      console.error('Optional: set default quoter failed', defaultErr);
    }

    return NextResponse.json({ tool });
  } catch (err) {
    console.error('POST /api/dashboard/tools:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
