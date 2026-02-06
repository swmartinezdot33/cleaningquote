import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET - Public org contact info by tool slug (for out-of-service when only slug in URL).
 * Resolves first tool with this slug, then returns that org's contact info.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!slug?.trim()) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }
    const supabase = createSupabaseServer();

    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('org_id')
      .eq('slug', slug.trim())
      .limit(1)
      .maybeSingle();

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
    console.error('GET /api/tools/[slug]/org-contact:', e);
    return NextResponse.json({ error: 'Failed to load org contact' }, { status: 500 });
  }
}
