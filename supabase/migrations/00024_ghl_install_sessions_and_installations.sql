-- GHL per-location OAuth: install_sessions (state → location_id mapping) and ghl_location_installations (tokens per location).
-- Used by connect flow: state lookup in callback; dual-write from callback and token-store.

-- Install sessions: short-lived mapping from OAuth state (uuid) to location_id/company_id.
-- Callback resolves locationId by state first, then cookie fallback.
create table if not exists public.install_sessions (
  id uuid primary key default gen_random_uuid(),
  state uuid not null unique,
  location_id text not null,
  company_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_install_sessions_state on public.install_sessions (state);
create index if not exists idx_install_sessions_expires_at on public.install_sessions (expires_at);

comment on table public.install_sessions is 'OAuth install context: state uuid maps to location_id/company_id so callback can assign tokens to the correct location. TTL: delete where expires_at < now().';

-- GHL location installations: one row per location (subaccount). OAuth + Location Access Token stored per location.
create table if not exists public.ghl_location_installations (
  location_id text primary key,
  company_id text,
  oauth_connected boolean not null default false,
  location_oauth_access_token text,
  location_oauth_refresh_token text,
  location_oauth_expires_at timestamptz,
  location_oauth_scope text,
  oauth_raw_response jsonb,
  location_access_token text,
  location_refresh_token text,
  location_expires_at timestamptz,
  location_token_raw_response jsonb,
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'revoked', 'error'))
);

comment on table public.ghl_location_installations is 'Per-location GHL OAuth and Location Access Token. Dual-write with KV for fast resolution; DB is source of truth for oauth_connected and audit.';

-- Allow server/API to manage install_sessions and ghl_location_installations (no RLS on install_sessions for server use; ghl_location_installations can be restricted later).
alter table public.install_sessions enable row level security;
alter table public.ghl_location_installations enable row level security;

-- Server/service role can do everything; anon and authenticated have no access by default (API uses service role).
create policy "Service role full access install_sessions"
  on public.install_sessions for all
  using (true)
  with check (true);

create policy "Service role full access ghl_location_installations"
  on public.ghl_location_installations for all
  using (true)
  with check (true);
