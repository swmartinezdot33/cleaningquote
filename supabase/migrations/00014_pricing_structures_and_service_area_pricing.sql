-- Multiple pricing structures per tool; service area assignments can choose which structure to use.

create table if not exists public.pricing_structures (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools(id) on delete cascade,
  name text not null,
  pricing_table jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tool_id, name)
);

create index if not exists pricing_structures_tool_id_idx on public.pricing_structures(tool_id);
comment on table public.pricing_structures is 'Named pricing tables per tool; service areas can be assigned one for quote calculation.';

alter table public.pricing_structures enable row level security;

drop policy if exists "Org members can view tool pricing structures" on public.pricing_structures;
create policy "Org members can view tool pricing structures"
  on public.pricing_structures for select
  using (exists (
    select 1 from public.tools t
    join public.organization_members om on om.org_id = t.org_id and om.user_id = auth.uid()
    where t.id = pricing_structures.tool_id
  ));

drop policy if exists "Org admins can insert pricing structures" on public.pricing_structures;
create policy "Org admins can insert pricing structures"
  on public.pricing_structures for insert
  with check (exists (
    select 1 from public.tools t
    where t.id = pricing_structures.tool_id and public.user_is_org_admin(t.org_id, auth.uid())
  ));

drop policy if exists "Org admins can update pricing structures" on public.pricing_structures;
create policy "Org admins can update pricing structures"
  on public.pricing_structures for update
  using (exists (
    select 1 from public.tools t
    where t.id = pricing_structures.tool_id and public.user_is_org_admin(t.org_id, auth.uid())
  ));

drop policy if exists "Org admins can delete pricing structures" on public.pricing_structures;
create policy "Org admins can delete pricing structures"
  on public.pricing_structures for delete
  using (exists (
    select 1 from public.tools t
    where t.id = pricing_structures.tool_id and public.user_is_org_admin(t.org_id, auth.uid())
  ));

-- Allow each tool–service-area assignment to optionally use a specific pricing structure.
alter table public.tool_service_areas
  add column if not exists pricing_structure_id uuid references public.pricing_structures(id) on delete set null;

create index if not exists tool_service_areas_pricing_structure_id_idx on public.tool_service_areas(pricing_structure_id);
comment on column public.tool_service_areas.pricing_structure_id is 'When set, quotes for addresses in this service area use this pricing structure; otherwise tool default.';
