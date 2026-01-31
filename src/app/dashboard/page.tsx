import Link from 'next/link';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { ensureUserOrgs, isSuperAdminEmail } from '@/lib/org-auth';
import { CloneToolButton } from '@/components/CloneToolButton';
import type { Tool } from '@/lib/supabase/types';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const orgs = await ensureUserOrgs(user.id, user.email ?? undefined);
  const cookieStore = await cookies();
  const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;
  const isSuperAdmin = isSuperAdminEmail(user.email ?? undefined);

  let list: Tool[];
  let orgByToolId: Record<string, string> = {};
  if (isSuperAdmin) {
    const admin = createSupabaseServer();
    const { data: allTools } = await admin
      .from('tools')
      .select('*')
      .order('created_at', { ascending: false });
    list = (allTools ?? []) as Tool[];
    const orgIds = [...new Set(list.map((t) => t.org_id))];
    const { data: orgsData } = await admin.from('organizations').select('id, name').in('id', orgIds);
    const orgMap = new Map((orgsData ?? []).map((o: { id: string; name: string }) => [o.id, o.name]));
    orgByToolId = Object.fromEntries(list.map((t) => [t.id, orgMap.get(t.org_id) ?? 'Unknown']));
  } else {
    const { data: tools } = await supabase
      .from('tools')
      .select('*')
      .eq('org_id', selectedOrgId ?? '')
      .order('created_at', { ascending: false });
    list = (tools ?? []) as Tool[];
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Your quoting tools</h1>
        <Link
          href="/dashboard/tools/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Create quoting tool
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">You don’t have any quoting tools yet.</p>
          <Link
            href="/dashboard/tools/new"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Create your first quoting tool
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((tool) => (
            <li key={tool.id}>
              <div className="block rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/dashboard/tools/${tool.id}`} className="block flex-1 min-w-0">
                    <h2 className="font-semibold text-foreground">{tool.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">/{tool.slug}</p>
                  </Link>
                  <CloneToolButton toolId={tool.id} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground/80">
                  Survey:{' '}
                  <Link
                    href={`/t/${tool.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    /t/{tool.slug}
                  </Link>
                  {isSuperAdmin && orgByToolId[tool.id] && (
                    <span className="ml-2 text-muted-foreground/60">({orgByToolId[tool.id]})</span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
