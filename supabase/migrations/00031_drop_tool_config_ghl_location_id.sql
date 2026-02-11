-- Drop ghl_location_id from tool_config.
-- Tools are scoped by org_id only; org is resolved from locationId via organizations.ghl_location_id (1 org = 1 GHL location).

alter table public.tool_config drop column if exists ghl_location_id;
