import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET - Public org contact info by tool ID (for out-of-service page, Contact Us).
 * Returns org display name, contact email, and contact phone for the tool's organization.
 */
export async function GET(request: NextRequest) {
  try {
    const toolId = request.nextUrl.searchParams.get('toolId');
    if (!toolId || typeof toolId !== 'string' || !toolId.trim()) {
      return NextResponse.json({ error: 'toolId query param required' }, { status: 400 });
    }
    const id = toolId.trim();
    const supabase = createSupabaseServer();

    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('org_id')
      .eq('id', id)
      .single();

    if (toolErr || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const orgId = (tool as { org_id: string }).org_id;
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('name, contact_email, contact_phone')
      .eq('id', orgId)
      .single();

    if (orgErr || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const row = org as { name: string; contact_email: string | null; contact_phone: string | null };
    return NextResponse.json({
      orgName: row.name ?? '',
      contactEmail: row.contact_email ?? null,
      contactPhone: row.contact_phone ?? null,
    });
  } catch (e) {
    console.error('GET /api/tools/by-id/org-contact:', e);
    return NextResponse.json({ error: 'Failed to load org contact' }, { status: 500 });
  }
}
