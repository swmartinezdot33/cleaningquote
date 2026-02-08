-- Allow org-level GHL connection via OAuth (token store) instead of manual token.
-- When ghl_use_oauth is true, we fetch token from KV token store by ghl_location_id.
alter table public.org_ghl_settings
  add column if not exists ghl_use_oauth boolean default false;

comment on column public.org_ghl_settings.ghl_use_oauth is 'When true, token is obtained from OAuth token store (KV) by ghl_location_id; ghl_token is ignored.';
