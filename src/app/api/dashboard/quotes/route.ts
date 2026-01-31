import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { ensureUserOrgs, isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/quotes
 * List quotes for the current user's tools (from Supabase).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgs = await ensureUserOrgs(user.id, user.email ?? undefined);
    const cookieStore = await cookies();
    const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;
    const isSuperAdmin = isSuperAdminEmail(user.email ?? undefined);

    let toolMap: Map<string, { name: string; slug: string }>;
    if (isSuperAdmin) {
      try {
        const admin = createSupabaseServer();
        const { data: allTools } = await admin.from('tools').select('id, name, slug');
        toolMap = new Map((allTools ?? []).map((t: { id: string; name: string; slug: string }) => [t.id, { name: t.name, slug: t.slug }]));
      } catch {
        const { data: userTools } = await supabase.from('tools').select('id, name, slug').eq('org_id', selectedOrgId ?? '');
        toolMap = new Map((userTools ?? []).map((t: { id: string; name: string; slug: string }) => [t.id, { name: t.name, slug: t.slug }]));
      }
    } else {
      const { data: userTools } = await supabase
        .from('tools')
        .select('id, name, slug')
        .eq('org_id', selectedOrgId ?? '');
      toolMap = new Map((userTools ?? []).map((t: { id: string; name: string; slug: string }) => [t.id, { name: t.name, slug: t.slug }]));
    }
    const toolIds = new Set(toolMap.keys());

    let quotes: unknown[];
    let error: { message: string } | null = null;
    if (isSuperAdmin) {
      try {
        const admin = createSupabaseServer();
        const result = await admin
          .from('quotes')
          .select('id, quote_id, tool_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, created_at')
          .order('created_at', { ascending: false })
          .limit(500);
        quotes = result.data ?? [];
        error = result.error;
      } catch {
        const result = await supabase
          .from('quotes')
          .select('id, quote_id, tool_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, created_at')
          .order('created_at', { ascending: false })
          .limit(500);
        quotes = result.data ?? [];
        error = result.error;
      }
    } else {
      const result = await supabase
        .from('quotes')
        .select('id, quote_id, tool_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      quotes = result.data ?? [];
      error = result.error;
    }

    if (error) {
      console.error('Dashboard quotes fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to user's tools (RLS on quotes filters by tool ownership)
    const filtered = (quotes ?? []).filter((q: any) => !q.tool_id || toolIds.has(q.tool_id));

    const withToolInfo = filtered.map((q: any) => {
      const tool = q.tool_id ? toolMap.get(q.tool_id) : null;
      return {
        ...q,
        toolName: tool?.name ?? 'Legacy',
        toolSlug: tool?.slug ?? null,
      };
    });

    return NextResponse.json({ quotes: withToolInfo });
  } catch (err) {
    console.error('Dashboard quotes error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
