-- CRM: service_schedules, appointments, activities, notes

-- Frequency and status enums for schedules
create type schedule_frequency as enum ('weekly', 'biweekly', 'four_week');
create type schedule_status as enum ('active', 'paused', 'cancelled');
create type appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
create type activity_type as enum ('quote', 'stage_change', 'appointment', 'note', 'call', 'email');

-- 1. Service schedules (per property)
create table if not exists public.service_schedules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  frequency schedule_frequency not null,
  preferred_day text,
  preferred_time_slot text,
  price_per_visit integer,
  status schedule_status not null default 'active',
  start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_schedules_property_id_idx on public.service_schedules(property_id);
create index if not exists service_schedules_org_id_idx on public.service_schedules(org_id);
create index if not exists service_schedules_status_idx on public.service_schedules(status);

comment on table public.service_schedules is 'Recurring cleaning schedules per property.';

-- 2. Appointments (per property)
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  service_type text,
  scheduled_at timestamptz not null,
  duration_minutes integer default 120,
  status appointment_status not null default 'scheduled',
  ghl_appointment_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_property_id_idx on public.appointments(property_id);
create index if not exists appointments_contact_id_idx on public.appointments(contact_id);
create index if not exists appointments_org_id_idx on public.appointments(org_id);
create index if not exists appointments_scheduled_at_idx on public.appointments(scheduled_at);
create index if not exists appointments_status_idx on public.appointments(status);

comment on table public.appointments is 'Cleaning appointments. Per property (where to clean); contact_id for who to call.';

-- 3. Activities (contact-level timeline)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  type activity_type not null,
  title text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists activities_contact_id_idx on public.activities(contact_id);
create index if not exists activities_org_id_idx on public.activities(org_id);
create index if not exists activities_created_at_idx on public.activities(created_at desc);
create index if not exists activities_type_idx on public.activities(type);

comment on table public.activities is 'Timeline of events per contact (quote, stage change, appointment, note, etc.).';

-- 4. Notes (contact-level)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists notes_contact_id_idx on public.notes(contact_id);
create index if not exists notes_org_id_idx on public.notes(org_id);
create index if not exists notes_created_at_idx on public.notes(created_at desc);

comment on table public.notes is 'Free-form notes per contact.';

-- RLS for service_schedules
alter table public.service_schedules enable row level security;

create policy "Org members can view service_schedules"
  on public.service_schedules for select
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can insert service_schedules"
  on public.service_schedules for insert
  with check (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can update service_schedules"
  on public.service_schedules for update
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can delete service_schedules"
  on public.service_schedules for delete
  using (public.user_is_org_member(org_id, auth.uid()));

-- RLS for appointments
alter table public.appointments enable row level security;

create policy "Org members can view appointments"
  on public.appointments for select
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can insert appointments"
  on public.appointments for insert
  with check (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can update appointments"
  on public.appointments for update
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can delete appointments"
  on public.appointments for delete
  using (public.user_is_org_member(org_id, auth.uid()));

-- RLS for activities
alter table public.activities enable row level security;

create policy "Org members can view activities"
  on public.activities for select
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can insert activities"
  on public.activities for insert
  with check (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can update activities"
  on public.activities for update
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can delete activities"
  on public.activities for delete
  using (public.user_is_org_member(org_id, auth.uid()));

-- RLS for notes
alter table public.notes enable row level security;

create policy "Org members can view notes"
  on public.notes for select
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can insert notes"
  on public.notes for insert
  with check (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can update notes"
  on public.notes for update
  using (public.user_is_org_member(org_id, auth.uid()));

create policy "Org members can delete notes"
  on public.notes for delete
  using (public.user_is_org_member(org_id, auth.uid()));
