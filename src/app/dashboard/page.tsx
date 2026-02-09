import Link from 'next/link';
import { getSession } from '@/lib/ghl/session';
import { getTokenForLocation } from '@/lib/ghl/token-store';
import * as configStore from '@/lib/config/store';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';

type ToolRow = { id: string; name: string; slug: string; org_id: string };

async function getToolsForLocation(locationId: string): Promise<ToolRow[]> {
  const orgIds = await configStore.getOrgIdsByGHLLocationId(locationId);
  if (orgIds.length === 0 || !isSupabaseConfigured()) return [];
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('tools')
    .select('id, name, slug, org_id')
    .in('org_id', orgIds)
    .order('name');
  if (error) return [];
  return (data ?? []) as ToolRow[];
}

/**
 * GHL-only dashboard. Shows tools for the current location and quick links.
 */
export default async function DashboardPage() {
  const ghlSession = await getSession();

  if (!ghlSession) {
    return null;
  }

  const token = await getTokenForLocation(ghlSession.locationId);
  const tools = await getToolsForLocation(ghlSession.locationId);

  if (token) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Tools</h1>
        <p className="text-muted-foreground">You&apos;re connected to your location.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={`/dashboard/tools/${tool.id}`}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/40 hover:border-primary/40"
            >
              <h2 className="font-semibold text-foreground">{tool.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">/t/{tool.slug}</p>
            </Link>
          ))}
          <Link
            href="/dashboard/tools/new"
            className="flex min-h-[88px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 hover:text-foreground"
          >
            + Create quoting tool
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="text-muted-foreground">Reconnect to load your CRM data.</p>
      <Link
        href="/dashboard/setup"
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Connect location
      </Link>
    </div>
  );
}
