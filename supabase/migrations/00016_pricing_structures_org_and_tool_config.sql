-- Pricing structures become org-level; each tool selects one via tool_config.

-- Add org_id to pricing_structures and backfill from tool's org
alter table public.pricing_structures
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

update public.pricing_structures ps
  set org_id = t.org_id
  from public.tools t
  where ps.tool_id = t.id and ps.org_id is null;

-- New org-level structures will have org_id set; tool_id optional (legacy)
alter table public.pricing_structures
  drop constraint if exists pricing_structures_tool_id_name_key;

alter table public.pricing_structures
  alter column tool_id drop not null;

create index if not exists pricing_structures_org_id_idx on public.pricing_structures(org_id);
create unique index if not exists pricing_structures_org_name_key on public.pricing_structures(org_id, name) where org_id is not null;

-- RLS: allow select/insert/update/delete by org membership (existing policies are tool-based; add org-based)
drop policy if exists "Org members can view tool pricing structures" on public.pricing_structures;
drop policy if exists "Org admins can insert pricing structures" on public.pricing_structures;
drop policy if exists "Org admins can update pricing structures" on public.pricing_structures;
drop policy if exists "Org admins can delete pricing structures" on public.pricing_structures;

create policy "Org members can view org pricing structures"
  on public.pricing_structures for select
  using (
    org_id is not null and exists (
      select 1 from public.organization_members om
      where om.org_id = pricing_structures.org_id and om.user_id = auth.uid()
    )
    or (tool_id is not null and exists (
      select 1 from public.tools t
      join public.organization_members om on om.org_id = t.org_id and om.user_id = auth.uid()
      where t.id = pricing_structures.tool_id
    ))
  );

create policy "Org admins can insert pricing structures"
  on public.pricing_structures for insert
  with check (
    org_id is not null and exists (
      select 1 from public.organizations o
      where o.id = pricing_structures.org_id and public.user_is_org_admin(o.id, auth.uid())
    )
  );

create policy "Org admins can update pricing structures"
  on public.pricing_structures for update
  using (
    (org_id is not null and exists (
      select 1 from public.organizations o
      where o.id = pricing_structures.org_id and public.user_is_org_admin(o.id, auth.uid())
    ))
    or (tool_id is not null and exists (
      select 1 from public.tools t
      where t.id = pricing_structures.tool_id and public.user_is_org_admin(t.org_id, auth.uid())
    ))
  );

create policy "Org admins can delete pricing structures"
  on public.pricing_structures for delete
  using (
    (org_id is not null and exists (
      select 1 from public.organizations o
      where o.id = pricing_structures.org_id and public.user_is_org_admin(o.id, auth.uid())
    ))
    or (tool_id is not null and exists (
      select 1 from public.tools t
      where t.id = pricing_structures.tool_id and public.user_is_org_admin(t.org_id, auth.uid())
    ))
  );

-- One pricing structure per tool (stored in tool_config)
alter table public.tool_config
  add column if not exists pricing_structure_id uuid references public.pricing_structures(id) on delete set null;

create index if not exists tool_config_pricing_structure_id_idx on public.tool_config(pricing_structure_id);
comment on column public.tool_config.pricing_structure_id is 'When set, quotes for this tool use this pricing structure; otherwise tool default (pricing_table).';
