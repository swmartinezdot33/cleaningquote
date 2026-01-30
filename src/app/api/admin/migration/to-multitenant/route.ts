import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { ToolInsert } from '@/lib/supabase/types';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GLOBAL_KEYS_TO_COPY = [
  'pricing:file:2026',
  'pricing:network:path',
  'pricing:data:table',
  'ghl:api:token',
  'ghl:location:id',
  'ghl:config',
  'widget:settings',
  'survey:questions',
  'survey:questions:v2',
  'service:area:polygon',
  'service:area:network:link',
  'admin:form-settings',
  'admin:initial-cleaning-config',
  'admin:tracking-codes',
  'admin:google-maps-api-key',
];

const METADATA_SUFFIX = 'pricing:file:2026:metadata';

function toolKey(toolId: string, key: string): string {
  return `tool:${toolId}:${key}`;
}

/**
 * POST /api/admin/migration/to-multitenant
 *
 * Option B migration: create first user + first tool and copy global KV keys to tool-scoped keys.
 * Protected: send x-admin-password or x-migration-secret (MIGRATION_SECRET env) or set RUN_MIGRATION=true.
 * Body/query not required; uses env MIGRATION_USER_EMAIL, MIGRATION_USER_PASSWORD, MIGRATION_DEFAULT_SLUG (default: "default").
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
        { message: 'Tools already exist. Set RUN_MIGRATION=true to re-copy KV into first tool.', tools: existingTools.length },
        { status: 200 }
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

      const insertPayload: ToolInsert = {
        user_id: userId,
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
    for (const key of GLOBAL_KEYS_TO_COPY) {
      try {
        const value = await kv.get(key);
        if (value !== null && value !== undefined) {
          await kv.set(toolKey(toolId, key), value);
          copied++;
        }
      } catch {
        // skip
      }
    }
    try {
      const meta = await kv.get(METADATA_SUFFIX);
      if (meta !== null && meta !== undefined) {
        await kv.set(toolKey(toolId, METADATA_SUFFIX), meta);
        copied++;
      }
    } catch {
      // skip
    }

    return NextResponse.json({
      success: true,
      message: 'Migration complete. Copied ' + copied + ' keys to tool.',
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
