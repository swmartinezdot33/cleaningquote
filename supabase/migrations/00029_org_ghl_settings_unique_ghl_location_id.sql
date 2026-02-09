-- One org in our DB = one GHL sub-account (location). We use org_id in Supabase, GHL uses LocationID; they are the same entity tied here.
-- Enforce: no two orgs can share the same GHL location ID.
comment on table public.org_ghl_settings is 'Org-level GHL connection. 1 org = 1 GHL location (sub-account): org_id is our id, ghl_location_id is GHL LocationID; same entity.';

-- Unique on ghl_location_id so one location is never linked to more than one org.
create unique index if not exists org_ghl_settings_ghl_location_id_key
  on public.org_ghl_settings (ghl_location_id)
  where ghl_location_id is not null;
