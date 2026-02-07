import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { fireWebhook } from '@/lib/webhook';

const ALLOWED_EVENTS = ['quote_summary_viewed'];

/**
 * POST /api/webhook/event
 * Client-triggered webhook event (e.g. quote summary viewed). Resolves toolId from toolSlug if needed,
 * then forwards to the tool's webhook URL if enabled. No auth required — used by public quote flow.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolId: bodyToolId, toolSlug, event, ...payload } = body;

    if (!event || typeof event !== 'string' || !ALLOWED_EVENTS.includes(event)) {
      return NextResponse.json({ error: 'Invalid or missing event' }, { status: 400 });
    }

    let toolId: string | undefined =
      typeof bodyToolId === 'string' && bodyToolId.trim() ? bodyToolId.trim() : undefined;
    if (!toolId && typeof toolSlug === 'string' && toolSlug.trim()) {
      const supabase = createSupabaseServer();
      const { data } = await supabase
        .from('tools')
        .select('id')
        .eq('slug', toolSlug.trim())
        .maybeSingle();
      toolId = (data as { id: string } | null)?.id ?? undefined;
    }
    if (!toolId) {
      return NextResponse.json({ error: 'toolId or toolSlug required' }, { status: 400 });
    }

    await fireWebhook(toolId, event, payload);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to process webhook event' }, { status: 500 });
  }
}
