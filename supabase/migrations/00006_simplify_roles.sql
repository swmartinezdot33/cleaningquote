-- Simplify to 3 user types: Super Admin (env), Admin (full org control), Member (access tools)
-- Migrate all 'owner' to 'admin' and update RLS to use admin only

update public.organization_members set role = 'admin' where role = 'owner';
update public.invitations set role = 'admin' where role = 'owner';

-- user_is_org_admin: only 'admin' has full org control (owner migrated to admin)
create or replace function public.user_is_org_admin(org_uuid uuid, user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = org_uuid and user_id = user_uuid and role = 'admin'
  );
$$;

-- Allow user to add self as admin when org has no members (for new org flow)
drop policy if exists "User can add self as owner when org has no members" on public.organization_members;
create policy "User can add self as admin when org has no members"
  on public.organization_members for insert
  with check (
    user_id = auth.uid() and role = 'admin'
    and public.org_has_no_members(org_id)
  );
