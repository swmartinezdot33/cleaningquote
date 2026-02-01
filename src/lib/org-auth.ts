import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { Organization, OrganizationMember } from '@/lib/supabase/types';

/** Subscription statuses that grant dashboard access */
const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Check if the given email is a super admin */
export function isSuperAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** Get organizations the current user is a member of */
export async function getUserOrganizations(userId: string): Promise<
  Array<Organization & { role: OrganizationMember['role'] }>
> {
  const supabase = await createSupabaseServerSSR();
  const { data: dataRaw } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', userId);
  const data = (dataRaw ?? []) as Array<{ org_id: string; role: string }>;
  if (!data.length) return [];
  const orgIds = data.map((r) => r.org_id);
  const { data: orgsRaw } = await supabase.from('organizations').select('*').in('id', orgIds);
  const orgs = (orgsRaw ?? []) as Array<{ id: string; name: string; slug: string }>;
  const roleByOrg = new Map(data.map((r) => [r.org_id, r.role]));
  return orgs.map((o) => ({ ...o, role: (roleByOrg.get(o.id) ?? 'member') as OrganizationMember['role'] })) as (Organization & { role: OrganizationMember['role'] })[];
}

/** Get the current user's org memberships (for org switcher) */
export async function getCurrentUserOrgMemberships(): Promise<
  Array<{ org: Organization; role: OrganizationMember['role'] }>
> {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const orgs = await getUserOrganizations(user.id);
  return orgs.map((o) => {
    const { role, ...org } = o;
    return { org: org as Organization, role };
  });
}

/** Check if user can access a tool (member of tool's org, or super admin) */
export async function canAccessTool(
  userId: string,
  userEmail: string | undefined,
  toolOrgId: string
): Promise<boolean> {
  if (isSuperAdminEmail(userEmail)) return true;
  const supabase = await createSupabaseServerSSR();
  const { data } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('org_id', toolOrgId)
    .maybeSingle();
  return !!data;
}

/**
 * Check if user can manage an org (invite, remove, list members, cancel invites).
 * True for super admin (env email) or org admin (organization_members.role = 'admin').
 */
export async function canManageOrg(
  userId: string,
  userEmail: string | undefined,
  orgId: string
): Promise<boolean> {
  if (isSuperAdminEmail(userEmail)) return true;
  const supabase = await createSupabaseServerSSR();
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle();
  return (data as { role?: string } | null)?.role === 'admin';
}

/** Check if org has Stripe and requires an active subscription for access */
export function orgRequiresSubscription(org: Pick<Organization, 'stripe_customer_id' | 'subscription_status'>): boolean {
  return !!org?.stripe_customer_id;
}

/** Check if org has access (no Stripe, or Stripe with active/trialing subscription) */
export function orgHasActiveAccess(org: Pick<Organization, 'stripe_customer_id' | 'subscription_status'> | null): boolean {
  if (!org) return false;
  if (!org.stripe_customer_id) return true;
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(org.subscription_status ?? '');
}

/** Resolve current org from cookie or default to first membership */
export function getSelectedOrgIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/selected_org_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Slug helper for org creation */
function slugToSafe(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Orgs list for dashboard (switcher + selected org). Normal users: their memberships only.
 * Super admins: all orgs so they can switch to any account and view it.
 */
export async function getOrgsForDashboard(userId: string, userEmail: string | undefined): Promise<
  Array<Organization & { role: string }>
> {
  if (isSuperAdminEmail(userEmail)) {
    try {
      const admin = createSupabaseServer();
      const { data: orgsRaw } = await admin
        .from('organizations')
        .select('*')
        .order('name');
      const orgs = (orgsRaw ?? []) as Organization[];
      return orgs.map((o) => ({ ...o, role: 'admin' as const }));
    } catch {
      return ensureUserOrgs(userId, userEmail);
    }
  }
  return ensureUserOrgs(userId, userEmail);
}

/** Ensure user has at least one org; create Personal if none. Returns orgs with roles (includes stripe fields for subscription gating). */
export async function ensureUserOrgs(userId: string, userEmail: string | undefined): Promise<
  Array<Organization & { role: string }>
> {
  const supabase = await createSupabaseServerSSR();
  const { data: membershipsRaw } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', userId);
  const memberships = (membershipsRaw ?? []) as Array<{ org_id: string; role: string }>;

  if (memberships.length > 0) {
    const orgIds = memberships.map((m) => m.org_id);
    const { data: orgsRaw } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds)
      .order('name');
    const orgs = (orgsRaw ?? []) as Organization[];
    const roleByOrg = new Map(memberships.map((m) => [m.org_id, m.role]));
    const withRoles = orgs.map((o) => ({ ...o, role: roleByOrg.get(o.id) ?? 'member' }));
    // CRITICAL: Put orgs where user is admin first, then by name. Ensures admins see their org's tools by default.
    return withRoles.sort((a, b) => {
      const aAdmin = a.role === 'admin' ? 1 : 0;
      const bAdmin = b.role === 'admin' ? 1 : 0;
      if (bAdmin !== aAdmin) return bAdmin - aAdmin;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }

  const emailPart = (userEmail ?? 'user').split('@')[0];
  let slug = slugToSafe(emailPart) || 'personal';
  slug = slug + '-' + Date.now().toString(36).slice(-6);

  const { data: orgRaw, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: 'Personal', slug } as any)
    .select()
    .single();

  if (orgErr || !orgRaw) return [];

  const org = orgRaw as Organization;
  await supabase
    .from('organization_members')
    .insert({ org_id: org.id, user_id: userId, role: 'admin' } as any);

  return [{ ...org, role: 'admin' }];
}
