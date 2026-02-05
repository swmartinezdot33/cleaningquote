import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/canonical-url';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'public, max-age=60',
};

/**
 * GET /api/script/config?locationId=XXX
 *
 * Returns tool config for the GHL Quoter Button script.
 * When a GHL location is connected in CleanQuote, this lets the script
 * auto-discover org/tool slugs so users only need one script tag.
 *
 * Response: { baseUrl, orgSlug, toolSlug } or 404 if no tool connected to this location.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId')?.trim();

  if (!locationId) {
    return NextResponse.json(
      { error: 'locationId is required' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const supabase = createSupabaseServer();
    const { data, error } = await supabase
      .from('tool_config')
      .select('tool_id')
      .eq('ghl_location_id', locationId)
      .not('tool_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Script config lookup:', error);
      return NextResponse.json(
        { error: 'Config lookup failed' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    if (!data?.tool_id) {
      return NextResponse.json(
        { error: 'No tool connected to this GHL location' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('slug, org_id')
      .eq('id', data.tool_id)
      .single();

    if (toolErr || !tool) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', tool.org_id)
      .single();

    if (orgErr || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const baseUrl = getSiteUrl();
    const orgSlug = (org as { slug?: string }).slug ?? '';
    const toolSlug = (tool as { slug?: string }).slug ?? 'default';

    return NextResponse.json(
      { baseUrl, orgSlug, toolSlug },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error('Script config error:', err);
    return NextResponse.json(
      { error: 'Config lookup failed' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
