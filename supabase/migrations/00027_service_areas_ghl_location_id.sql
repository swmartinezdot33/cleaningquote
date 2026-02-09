-- Add ghl_location_id to service_areas (same type as tool_config and pricing_structures).
-- Use for filtering or scoping service areas by GHL location when shown in the dashboard.
alter table public.service_areas
  add column if not exists ghl_location_id text;

comment on column public.service_areas.ghl_location_id is 'GHL location ID this service area is associated with; used for location-scoped visibility (e.g. Service Areas page in GHL iframe).';

create index if not exists service_areas_ghl_location_id_idx on public.service_areas(ghl_location_id) where ghl_location_id is not null;
