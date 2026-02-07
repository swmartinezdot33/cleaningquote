-- CRM: contacts, properties, and link quotes to properties
-- Contact → Properties → Quotes: one contact can have multiple properties; each property can have multiple quotes

-- Stage enum for pipeline
create type crm_stage as enum ('lead', 'quoted', 'booked', 'customer', 'churned');

-- 1. Contacts table (person/company, no address - addresses live on properties)
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  ghl_contact_id text,
  stage crm_stage not null default 'lead',
  source text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dedupe: one contact per org+email when email is present
create unique index if not exists contacts_org_email_unique on public.contacts(org_id, email) where email is not null and email <> '';

create index if not exists contacts_org_id_idx on public.contacts(org_id);
create index if not exists contacts_email_idx on public.contacts(email);
create index if not exists contacts_phone_idx on public.contacts(phone);
create index if not exists contacts_stage_idx on public.contacts(stage);
create index if not exists contacts_created_at_idx on public.contacts(created_at desc);

comment on table public.contacts is 'CRM contacts (person/company). One contact can have multiple properties.';

-- 2. Properties table (physical locations belonging to a contact)
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  nickname text,
  stage crm_stage not null default 'lead',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists properties_contact_id_idx on public.properties(contact_id);
create index if not exists properties_org_id_idx on public.properties(org_id);
create index if not exists properties_stage_idx on public.properties(stage);

comment on table public.properties is 'Physical locations belonging to a contact. Each property can have multiple quotes.';

-- 3. Add property_id to quotes
alter table public.quotes add column if not exists property_id uuid references public.properties(id) on delete set null;
create index if not exists quotes_property_id_idx on public.quotes(property_id);

-- RLS for contacts
alter table public.contacts enable row level security;

create policy "Org members can view contacts"
  on public.contacts for select
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can insert contacts"
  on public.contacts for insert
  with check (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can update contacts"
  on public.contacts for update
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can delete contacts"
  on public.contacts for delete
  using (public.user_is_org_member(org_id, auth.uid()));

-- RLS for properties
alter table public.properties enable row level security;

create policy "Org members can view properties"
  on public.properties for select
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can insert properties"
  on public.properties for insert
  with check (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can update properties"
  on public.properties for update
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can delete properties"
  on public.properties for delete
  using (public.user_is_org_member(org_id, auth.uid()));

-- Service role bypasses RLS for quote inserts (public form); allow setting property_id on update
-- Quotes RLS already allows org members to select; property_id is additive
