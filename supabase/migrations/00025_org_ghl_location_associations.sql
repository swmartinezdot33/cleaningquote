-- Associate specific orgs to GHL location IDs so pricing and tools resolve for that location.
-- Raleigh Cleaning Company -> tCqS9npFPtO0DSuYVvzb
-- demo account -> 1uDcMtL7LgPvpYwaQtdq

insert into public.org_ghl_settings (org_id, ghl_token, ghl_location_id, ghl_use_oauth, updated_at)
select o.id, null, 'tCqS9npFPtO0DSuYVvzb', true, now()
from public.organizations o
where o.name ilike '%Raleigh Cleaning Company%'
limit 1
on conflict (org_id) do update set
  ghl_location_id = excluded.ghl_location_id,
  ghl_use_oauth = true,
  updated_at = excluded.updated_at;

insert into public.org_ghl_settings (org_id, ghl_token, ghl_location_id, ghl_use_oauth, updated_at)
select o.id, null, '1uDcMtL7LgPvpYwaQtdq', true, now()
from public.organizations o
where o.name ilike '%demo%'
limit 1
on conflict (org_id) do update set
  ghl_location_id = excluded.ghl_location_id,
  ghl_use_oauth = true,
  updated_at = excluded.updated_at;
