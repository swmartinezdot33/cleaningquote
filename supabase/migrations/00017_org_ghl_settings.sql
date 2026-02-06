-- One HighLevel integration per organization (1 org = 1 HL connection).
-- Token and location ID stored here; each tool keeps its own ghl_config (CRM config) in tool_config.

create table if not exists public.org_ghl_settings (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  ghl_token text,
  ghl_location_id text,
  updated_at timestamptz not null default now()
);

comment on table public.org_ghl_settings is 'Org-level HighLevel connection (token + location). All tools in the org use this; per-tool CRM config remains in tool_config.ghl_config.';

alter table public.org_ghl_settings enable row level security;

drop policy if exists "Org admins can manage org GHL settings" on public.org_ghl_settings;
create policy "Org admins can manage org GHL settings"
  on public.org_ghl_settings for all
  using (public.user_is_org_admin(org_id, auth.uid()))
  with check (public.user_is_org_admin(org_id, auth.uid()));

-- Backfill: for each org that has a tool with GHL set, copy one tool's connection to org_ghl_settings
insert into public.org_ghl_settings (org_id, ghl_token, ghl_location_id, updated_at)
select distinct on (t.org_id) t.org_id, c.ghl_token, c.ghl_location_id, now()
from public.tools t
join public.tool_config c on c.tool_id = t.id
where t.org_id is not null
  and c.ghl_token is not null
  and c.ghl_token <> ''
  and not exists (select 1 from public.org_ghl_settings o where o.org_id = t.org_id)
order by t.org_id, t.created_at;
