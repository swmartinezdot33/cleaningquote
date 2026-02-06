-- Org-level service areas: polygon (and optional network link), many-to-many with tools.
-- Check API uses assigned service areas first; falls back to tool_config polygon/network link.

create table if not exists public.service_areas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  polygon jsonb,
  network_link_url text,
  network_link_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_areas_org_id_idx on public.service_areas(org_id);
comment on table public.service_areas is 'Org-level service area polygons; optional network link to keep polygon up to date.';

create table if not exists public.tool_service_areas (
  tool_id uuid not null references public.tools(id) on delete cascade,
  service_area_id uuid not null references public.service_areas(id) on delete cascade,
  primary key (tool_id, service_area_id)
);

create index if not exists tool_service_areas_tool_id_idx on public.tool_service_areas(tool_id);
create index if not exists tool_service_areas_service_area_id_idx on public.tool_service_areas(service_area_id);
comment on table public.tool_service_areas is 'Assignment of tools to org service areas (many-to-many).';

-- RLS: org members can select; org admins can insert/update/delete for their org
alter table public.service_areas enable row level security;

create policy "Org members can view org service areas"
  on public.service_areas for select
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = service_areas.org_id and om.user_id = auth.uid()
  ));

create policy "Org admins can insert service areas"
  on public.service_areas for insert
  with check (public.user_is_org_admin(org_id, auth.uid()));

create policy "Org admins can update org service areas"
  on public.service_areas for update
  using (public.user_is_org_admin(org_id, auth.uid()));

create policy "Org admins can delete org service areas"
  on public.service_areas for delete
  using (public.user_is_org_admin(org_id, auth.uid()));

alter table public.tool_service_areas enable row level security;

create policy "Org members can view tool service area assignments"
  on public.tool_service_areas for select
  using (exists (
    select 1 from public.tools t
    join public.organization_members om on om.org_id = t.org_id and om.user_id = auth.uid()
    where t.id = tool_service_areas.tool_id
  ));

create policy "Org admins can insert tool service area assignments"
  on public.tool_service_areas for insert
  with check (exists (
    select 1 from public.tools t
    where t.id = tool_service_areas.tool_id and public.user_is_org_admin(t.org_id, auth.uid())
  ));

create policy "Org admins can delete tool service area assignments"
  on public.tool_service_areas for delete
  using (exists (
    select 1 from public.tools t
    where t.id = tool_service_areas.tool_id and public.user_is_org_admin(t.org_id, auth.uid())
  ));
