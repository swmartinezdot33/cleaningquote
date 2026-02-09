-- Add ghl_location_id to pricing_structures (same type as tool_config.ghl_location_id).
-- Use for filtering or scoping pricing structures by GHL location when shown in the dashboard.
alter table public.pricing_structures
  add column if not exists ghl_location_id text;

comment on column public.pricing_structures.ghl_location_id is 'GHL location ID this structure is associated with; used for location-scoped visibility (e.g. Pricing page in GHL iframe).';

create index if not exists pricing_structures_ghl_location_id_idx on public.pricing_structures(ghl_location_id) where ghl_location_id is not null;
