-- Organizations (subaccounts) - each has their own quoting tools
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_slug_idx on public.organizations(slug);

-- Organization members - users belong to orgs with roles
create type org_role as enum ('owner', 'admin', 'member');

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique(org_id, user_id)
);

create index if not exists org_members_org_id_idx on public.organization_members(org_id);
create index if not exists org_members_user_id_idx on public.organization_members(user_id);

-- Invitations - pending invites to join an org
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role org_role not null default 'member',
  token text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invitations_token_idx on public.invitations(token);
create index if not exists invitations_org_id_idx on public.invitations(org_id);
create index if not exists invitations_email_idx on public.invitations(email);

-- Add org_id to tools; slug unique per org (not globally)
alter table public.tools add column if not exists org_id uuid references public.organizations(id) on delete cascade;

-- Migrate existing: create "Personal" org per user with tools, assign tools
do $$
declare
  rec record;
  new_org_id uuid;
  org_slug text;
begin
  for rec in select distinct user_id from public.tools where org_id is null and user_id is not null
  loop
    select coalesce(
      (select email from auth.users where id = rec.user_id),
      'user-' || left(rec.user_id::text, 8)
    ) into org_slug;
    org_slug := lower(regexp_replace(org_slug, '[^a-z0-9]+', '-', 'g'));
    org_slug := trim(both '-' from org_slug);
    if org_slug = '' then org_slug := 'org-' || left(rec.user_id::text, 8); end if;
    -- Ensure unique slug
    org_slug := org_slug || '-' || left(rec.user_id::text, 8);
    
    insert into public.organizations (name, slug) values ('Personal', org_slug)
    on conflict (slug) do nothing;
    select id into new_org_id from public.organizations where slug = org_slug limit 1;
    
    insert into public.organization_members (org_id, user_id, role)
    values (new_org_id, rec.user_id, 'owner')
    on conflict (org_id, user_id) do nothing;
    
    update public.tools set org_id = new_org_id where user_id = rec.user_id and org_id is null;
  end loop;
end $$;

-- Make org_id required
alter table public.tools alter column org_id set not null;

-- Drop old slug uniqueness; add (org_id, slug) unique
alter table public.tools drop constraint if exists tools_slug_key;
create unique index if not exists tools_org_slug_idx on public.tools(org_id, slug);

-- RLS on organizations
alter table public.organizations enable row level security;

create policy "Members can view org"
  on public.organizations for select
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = organizations.id and om.user_id = auth.uid()
  ));

create policy "Owners and admins can update org"
  on public.organizations for update
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = organizations.id and om.user_id = auth.uid() and om.role in ('owner', 'admin')
  ));

create policy "Authenticated users can create org"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- RLS on organization_members
alter table public.organization_members enable row level security;

create policy "Members can view org members"
  on public.organization_members for select
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = organization_members.org_id and om.user_id = auth.uid()
  ));

create policy "Owners and admins can insert members"
  on public.organization_members for insert
  with check (exists (
    select 1 from public.organization_members om
    where om.org_id = organization_members.org_id and om.user_id = auth.uid() and om.role in ('owner', 'admin')
  ));

create policy "User can add self as owner when org has no members"
  on public.organization_members for insert
  with check (
    user_id = auth.uid() and role = 'owner'
    and not exists (select 1 from public.organization_members om where om.org_id = organization_members.org_id)
  );

create policy "Owners and admins can update/delete members"
  on public.organization_members for update
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = organization_members.org_id and om.user_id = auth.uid() and om.role in ('owner', 'admin')
  ));

create policy "Owners and admins can delete members"
  on public.organization_members for delete
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = organization_members.org_id and om.user_id = auth.uid() and om.role in ('owner', 'admin')
  ));

-- RLS on invitations
alter table public.invitations enable row level security;

create policy "Org admins can manage invitations"
  on public.invitations for all
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = invitations.org_id and om.user_id = auth.uid() and om.role in ('owner', 'admin')
  ));

-- Update tools RLS: org members can manage tools
drop policy if exists "Users can view own tools" on public.tools;
drop policy if exists "Users can insert own tools" on public.tools;
drop policy if exists "Users can update own tools" on public.tools;
drop policy if exists "Users can delete own tools" on public.tools;

create policy "Org members can view tools"
  on public.tools for select
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = tools.org_id and om.user_id = auth.uid()
  ));

create policy "Org members can insert tools"
  on public.tools for insert
  with check (exists (
    select 1 from public.organization_members om
    where om.org_id = tools.org_id and om.user_id = auth.uid()
  ));

create policy "Org members can update tools"
  on public.tools for update
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = tools.org_id and om.user_id = auth.uid()
  ));

create policy "Org members can delete tools"
  on public.tools for delete
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = tools.org_id and om.user_id = auth.uid()
  ));

-- Keep public read by slug for quote flow
drop policy if exists "Anyone can read tool by slug for public pages" on public.tools;
create policy "Anyone can read tool by slug"
  on public.tools for select
  using (true);

-- Update quotes RLS to use org membership
drop policy if exists "Users can view quotes for own tools" on public.quotes;

create policy "Org members can view quotes for org tools"
  on public.quotes for select
  using (
    tool_id is null
    or exists (
      select 1 from public.tools t
      join public.organization_members om on om.org_id = t.org_id and om.user_id = auth.uid()
      where t.id = quotes.tool_id
    )
  );

-- Service role bypasses RLS for inserts (quote API uses service role)
-- Keep existing insert policy for anon if needed
drop policy if exists "Allow insert for valid tool or legacy" on public.quotes;
create policy "Allow insert for valid tool or legacy"
  on public.quotes for insert
  with check (
    tool_id is null
    or exists (select 1 from public.tools where id = tool_id)
  );

comment on table public.organizations is 'Subaccounts; each has their own quoting tools and members.';
comment on table public.organization_members is 'Users belonging to organizations with roles.';
comment on table public.invitations is 'Pending invites to join an organization.';
