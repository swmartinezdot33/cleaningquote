-- Org office address: shown as a pin on service area maps and previews.
alter table public.organizations
  add column if not exists office_address text;

comment on column public.organizations.office_address is 'Office address; displayed as a pin on service area maps and previews.';
