import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import type { ToolInsert } from '@/lib/supabase/types';
import * as configStore from '@/lib/config/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SUPABASE_REQUIRED_MSG =
  'Supabase is required for configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.';

/**
 * POST /api/admin/migration/to-multitenant
 *
 * Creates first user + first tool and copies global tool_config to the new tool (Supabase only).
 * Protected: send x-admin-password or x-migration-secret (MIGRATION_SECRET env) or set RUN_MIGRATION=true.
 */
export async function POST(request: NextRequest) {
  try {
    const runMigration = process.env.RUN_MIGRATION === 'true';
    const secret = request.headers.get('x-migration-secret');
    const password = request.headers.get('x-admin-password');
    const migrationSecret = process.env.MIGRATION_SECRET;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const allowed =
      runMigration ||
      (migrationSecret && secret === migrationSecret) ||
      (adminPassword && password === adminPassword);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Unauthorized. Set RUN_MIGRATION=true or provide x-migration-secret / x-admin-password.' },
        { status: 401 }
      );
    }

    const email = process.env.MIGRATION_USER_EMAIL;
    const passwordVal = process.env.MIGRATION_USER_PASSWORD;
    const slug = process.env.MIGRATION_DEFAULT_SLUG || 'default';

    if (!email || !passwordVal) {
      return NextResponse.json(
        { error: 'MIGRATION_USER_EMAIL and MIGRATION_USER_PASSWORD must be set.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServer();

    const { data: existingToolsRaw, error: listError } = await supabase.from('tools').select('id, user_id');
    const existingTools = (existingToolsRaw ?? []) as Array<{ id: string; user_id: string }>;
    if (listError) {
      return NextResponse.json({ error: 'Failed to list tools: ' + listError.message }, { status: 500 });
    }

    let toolId: string;
    if (existingTools.length > 0 && !runMigration) {
      return NextResponse.json(
        { message: 'Tools already exist. Set RUN_MIGRATION=true to re-copy global config into first tool.', tools: existingTools.length },
        { status: 200 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: SUPABASE_REQUIRED_MSG, success: false },
        { status: 503 }
      );
    }

    if (existingTools.length > 0 && runMigration) {
      toolId = existingTools[0].id;
    } else {
      let userId: string;
      const { data: listUsers } = await supabase.auth.admin.listUsers();
      const found = listUsers?.users?.find((u) => u.email === email);
      if (found) {
        userId = found.id;
      } else {
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: passwordVal,
          email_confirm: true,
        });
        if (createError) {
          return NextResponse.json({ error: 'Failed to create user: ' + createError.message }, { status: 500 });
        }
        userId = userData.user.id;
      }

      const orgSlug = slug + '-' + Date.now().toString(36).slice(-6);
      const { data: orgDataRaw, error: orgError } = await supabase
        .from('organizations')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ name: 'Personal', slug: orgSlug } as any)
        .select('id')
        .single();
      if (orgError || !orgDataRaw) {
        return NextResponse.json({ error: 'Failed to create org: ' + (orgError?.message ?? 'unknown') }, { status: 500 });
      }
      const orgData = orgDataRaw as { id: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('organization_members').insert({ org_id: orgData.id, user_id: userId, role: 'admin' } as any);

      const insertPayload: ToolInsert = {
        org_id: orgData.id,
        name: 'Default quoting tool',
        slug,
        updated_at: new Date().toISOString(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: toolData, error: toolError } = await supabase.from('tools').insert(insertPayload as any).select('id').single();

      if (toolError) {
        return NextResponse.json({ error: 'Failed to create tool: ' + toolError.message }, { status: 500 });
      }
      toolId = (toolData as { id: string }).id;
    }

    let copied = 0;
    try {
      await configStore.copyGlobalConfigToTool(toolId);
      copied = 1;
    } catch (err) {
      console.error('to-multitenant: config copy failed:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Migration complete. Copied global config to tool (Supabase).',
      toolId,
      slug: process.env.MIGRATION_DEFAULT_SLUG || 'default',
      keysCopied: copied,
    });
  } catch (err) {
    console.error('to-multitenant migration error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
