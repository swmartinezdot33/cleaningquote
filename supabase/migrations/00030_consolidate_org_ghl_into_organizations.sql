-- Consolidate org_ghl_settings into organizations so all GHL location lookups use organizations.ghl_location_id.
-- 1 org = 1 GHL location (sub-account); ghl_location_id is the single source of truth on the org row.

-- Add GHL columns to organizations
alter table public.organizations
  add column if not exists ghl_location_id text,
  add column if not exists ghl_token text,
  add column if not exists ghl_use_oauth boolean default false;

comment on column public.organizations.ghl_location_id is 'GHL sub-account Location ID. One org = one location; used for all lookups (tools, service areas, pricing, auth).';
comment on column public.organizations.ghl_token is 'Legacy manual GHL token. When ghl_use_oauth is true, token comes from OAuth token store by ghl_location_id.';
comment on column public.organizations.ghl_use_oauth is 'When true, GHL token is from OAuth token store (KV) by ghl_location_id; ghl_token is ignored.';

-- Migrate data from org_ghl_settings into organizations (only columns that exist in org_ghl_settings: org_id, ghl_token, ghl_location_id, updated_at)
update public.organizations o
set
  ghl_location_id = s.ghl_location_id,
  ghl_token = s.ghl_token,
  ghl_use_oauth = false,
  updated_at = greatest(o.updated_at, s.updated_at)
from public.org_ghl_settings s
where s.org_id = o.id;

-- Enforce one location per org (same as before)
create unique index if not exists organizations_ghl_location_id_key
  on public.organizations (ghl_location_id)
  where ghl_location_id is not null;

-- Drop the old table; all lookups now use organizations.ghl_location_id
drop table if exists public.org_ghl_settings;
