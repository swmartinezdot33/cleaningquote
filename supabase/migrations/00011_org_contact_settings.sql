-- Org contact settings for out-of-service page and Contact Us (per-org)
-- If you see "Could not find the 'contact_email' column of 'organizations' in the schema",
-- run this migration in Supabase Dashboard → SQL Editor (or use: supabase db push).
alter table public.organizations
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

comment on column public.organizations.contact_email is 'Contact email shown on out-of-service and quote flows for this org.';
comment on column public.organizations.contact_phone is 'Contact phone shown on out-of-service and quote flows for this org.';
