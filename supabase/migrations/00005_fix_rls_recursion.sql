-- Fix infinite recursion in organization_members RLS policies.
-- Policies that SELECT from organization_members to check membership cause recursion.
-- Use a SECURITY DEFINER function to bypass RLS for the membership check.

create or replace function public.user_is_org_member(org_uuid uuid, user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = org_uuid and user_id = user_uuid
  );
$$;

create or replace function public.user_is_org_admin(org_uuid uuid, user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = org_uuid and user_id = user_uuid and role in ('owner', 'admin')
  );
$$;

create or replace function public.org_has_no_members(org_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (select 1 from public.organization_members where org_id = org_uuid);
$$;

-- Drop and recreate organization_members policies using the helper
drop policy if exists "Members can view org members" on public.organization_members;
drop policy if exists "Owners and admins can insert members" on public.organization_members;
drop policy if exists "User can add self as owner when org has no members" on public.organization_members;
drop policy if exists "Owners and admins can update/delete members" on public.organization_members;
drop policy if exists "Owners and admins can update members" on public.organization_members;
drop policy if exists "Owners and admins can delete members" on public.organization_members;

create policy "Members can view org members"
  on public.organization_members for select
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Owners and admins can insert members"
  on public.organization_members for insert
  with check (public.user_is_org_admin(org_id, auth.uid()));

create policy "User can add self as owner when org has no members"
  on public.organization_members for insert
  with check (
    user_id = auth.uid() and role = 'owner'
    and public.org_has_no_members(org_id)
  );

create policy "Owners and admins can update members"
  on public.organization_members for update
  using (public.user_is_org_admin(org_id, auth.uid()));

create policy "Owners and admins can delete members"
  on public.organization_members for delete
  using (public.user_is_org_admin(org_id, auth.uid()));

-- Update organizations policies to use the helper (avoids recursion via org_members)
drop policy if exists "Members can view org" on public.organizations;
drop policy if exists "Owners and admins can update org" on public.organizations;

create policy "Members can view org"
  on public.organizations for select
  using (public.user_is_org_member(id, auth.uid()));

create policy "Owners and admins can update org"
  on public.organizations for update
  using (public.user_is_org_admin(id, auth.uid()));

-- Update tools policies to use the helper
drop policy if exists "Org members can view tools" on public.tools;
drop policy if exists "Org members can insert tools" on public.tools;
drop policy if exists "Org members can update tools" on public.tools;
drop policy if exists "Org members can delete tools" on public.tools;

create policy "Org members can view tools"
  on public.tools for select
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can insert tools"
  on public.tools for insert
  with check (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can update tools"
  on public.tools for update
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can delete tools"
  on public.tools for delete
  using (public.user_is_org_member(org_id, auth.uid()));

-- Update invitations policy
drop policy if exists "Org admins can manage invitations" on public.invitations;

create policy "Org admins can manage invitations"
  on public.invitations for all
  using (public.user_is_org_admin(org_id, auth.uid()));

-- Update quotes policy (uses tools + org_members join - simplify with helper)
drop policy if exists "Org members can view quotes for org tools" on public.quotes;
drop policy if exists "Org members can view quotes" on public.quotes;

create policy "Org members can view quotes"
  on public.quotes for select
  using (
    tool_id is null
    or exists (
      select 1 from public.tools t
      where t.id = quotes.tool_id and public.user_is_org_member(t.org_id, auth.uid())
    )
  );
