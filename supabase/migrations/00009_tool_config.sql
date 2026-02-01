-- Tool config: source of truth for pricing, survey, widget, GHL, form, tracking, etc.
-- One row per tool (tool_id = uuid) or one global row (tool_id = null) for legacy admin.
-- Replaces Vercel KV for config; KV remains for cache and ephemeral data (e.g. inbox meta).

create table if not exists public.tool_config (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid unique references public.tools(id) on delete cascade,
  -- At most one row with tool_id null (global config)
  widget_settings jsonb,
  form_settings jsonb,
  tracking_codes jsonb,
  initial_cleaning_config jsonb,
  google_maps_key text,
  service_area_type text default 'none',
  service_area_polygon jsonb,
  service_area_network_link text,
  survey_questions jsonb,
  pricing_table jsonb,
  pricing_network_path text,
  pricing_file_base64 text,
  ghl_token text,
  ghl_location_id text,
  ghl_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one global config row (tool_id is null)
create unique index tool_config_global_once on public.tool_config ((true)) where tool_id is null;

create index if not exists tool_config_tool_id_idx on public.tool_config(tool_id);

comment on table public.tool_config is 'Per-tool and global config (pricing, survey, widget, GHL, etc.). Source of truth; KV used only for cache.';

-- RLS: only service role (used from API) can access; service role bypasses RLS by default
alter table public.tool_config enable row level security;
