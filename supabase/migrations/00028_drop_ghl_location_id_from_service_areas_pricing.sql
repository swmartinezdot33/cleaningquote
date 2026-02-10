-- Drop ghl_location_id from service_areas and pricing_structures.
-- Scope is via org_id only; org is resolved from locationId via organizations.ghl_location_id (1 org = 1 GHL location).

drop index if exists public.service_areas_ghl_location_id_idx;
alter table public.service_areas drop column if exists ghl_location_id;

drop index if exists public.pricing_structures_ghl_location_id_idx;
alter table public.pricing_structures drop column if exists ghl_location_id;
