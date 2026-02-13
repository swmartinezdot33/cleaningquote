-- Cache geocoded coordinates per org for "View all customers" on the service area map.
-- Keyed by org + normalized address so we geocode once and reuse.

create table if not exists public.org_customer_map_cache (
  org_id uuid not null references public.organizations(id) on delete cascade,
  address_hash text not null,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now(),
  primary key (org_id, address_hash)
);

create index if not exists org_customer_map_cache_org_id_idx on public.org_customer_map_cache(org_id);
comment on table public.org_customer_map_cache is 'Cached lat/lng per org and address for service area map customer pins. Avoids client-side geocoding.';

alter table public.org_customer_map_cache enable row level security;

create policy "Org members can view org cache"
  on public.org_customer_map_cache for select
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = org_customer_map_cache.org_id and om.user_id = auth.uid()
  ));

create policy "Org admins can insert and update org cache"
  on public.org_customer_map_cache for all
  using (exists (
    select 1 from public.organization_members om
    where om.org_id = org_customer_map_cache.org_id and om.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.organization_members om
    where om.org_id = org_customer_map_cache.org_id and om.user_id = auth.uid()
  ));
