import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/quotes
 * List quotes for the current user's tools (from Supabase).
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's tools first (RLS: user sees own tools)
    const { data: userTools } = await supabase
      .from('tools')
      .select('id, name, slug')
      .eq('user_id', user.id);
    const toolMap = new Map((userTools ?? []).map((t: { id: string; name: string; slug: string }) => [t.id, { name: t.name, slug: t.slug }]));
    const toolIds = new Set(toolMap.keys());

    // RLS on quotes: users see quotes for their tools (or tool_id is null for legacy)
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('id, quote_id, tool_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

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
