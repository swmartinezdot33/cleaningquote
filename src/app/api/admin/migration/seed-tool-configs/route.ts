import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import * as configStore from '@/lib/config/store';
import { DEFAULT_WIDGET } from '@/lib/tools/config';
import { DEFAULT_SURVEY_QUESTIONS } from '@/lib/survey/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/migration/seed-tool-configs
 *
 * Creates a tool_config row (preset: widget + survey questions) for every tool
 * that doesn't have one. Safe to run multiple times — only seeds missing configs.
 *
 * Auth: x-admin-password or x-migration-secret (MIGRATION_SECRET env).
 */
export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-migration-secret');
    const password = request.headers.get('x-admin-password');
    const migrationSecret = process.env.MIGRATION_SECRET;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const allowed =
      (migrationSecret && secret === migrationSecret) ||
      (adminPassword && password === adminPassword);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide x-migration-secret or x-admin-password.' },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured.', success: false },
        { status: 503 }
      );
    }

    const supabase = createSupabaseServer();

    const { data: tools, error: toolsErr } = await supabase
      .from('tools')
      .select('id, name, slug')
      .order('created_at', { ascending: true });

    if (toolsErr) {
      return NextResponse.json(
        { error: 'Failed to list tools: ' + toolsErr.message, success: false },
        { status: 500 }
      );
    }

    const toolList = (tools ?? []) as Array<{ id: string; name: string; slug: string }>;
    if (toolList.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tools in database.',
        totalTools: 0,
        seeded: 0,
        alreadyHadConfig: 0,
        tools: [],
      });
    }

    const { data: configRows, error: configErr } = await supabase
      .from('tool_config')
      .select('tool_id')
      .not('tool_id', 'is', null);

    if (configErr) {
      return NextResponse.json(
        { error: 'Failed to list tool_config: ' + configErr.message, success: false },
        { status: 500 }
      );
    }

    const toolIdsWithConfig = new Set(
      (configRows ?? []).map((r: { tool_id: string | null }) => r.tool_id).filter(Boolean)
    );

    const toSeed = toolList.filter((t) => !toolIdsWithConfig.has(t.id));
    const seeded: string[] = [];
    const errors: Array<{ toolId: string; slug: string; error: string }> = [];

    for (const tool of toSeed) {
      try {
        await configStore.createToolConfigPreset(
          tool.id,
          DEFAULT_WIDGET,
          DEFAULT_SURVEY_QUESTIONS
        );
        seeded.push(tool.id);
      } catch (err) {
        errors.push({
          toolId: tool.id,
          slug: tool.slug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message:
        toSeed.length === 0
          ? 'All tools already have config.'
          : `Seeded config for ${seeded.length} tool(s).`,
      totalTools: toolList.length,
      seeded: seeded.length,
      alreadyHadConfig: toolList.length - toSeed.length,
      tools: toolList.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        hadConfig: toolIdsWithConfig.has(t.id),
        seeded: seeded.includes(t.id),
      })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('POST /api/admin/migration/seed-tool-configs:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to seed tool configs',
        success: false,
      },
      { status: 500 }
    );
  }
}
