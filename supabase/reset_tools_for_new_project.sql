-- Reset DB for repurposed project: drop tools table and recreate clean.
-- Run this in Supabase SQL Editor: https://miczlipcerofqxeqoqfh.supabase.co (Project → SQL Editor → New query)

-- Drop existing tools table and all its policies/indexes
drop table if exists public.tools cascade;

-- Recreate tools table (multi-tenant quoting tools)
create table public.tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(slug)
);

create index tools_user_id_idx on public.tools(user_id);
create unique index tools_slug_idx on public.tools(slug);

alter table public.tools enable row level security;

create policy "Users can view own tools"
  on public.tools for select using (auth.uid() = user_id);

create policy "Users can insert own tools"
  on public.tools for insert with check (auth.uid() = user_id);

create policy "Users can update own tools"
  on public.tools for update using (auth.uid() = user_id);

create policy "Users can delete own tools"
  on public.tools for delete using (auth.uid() = user_id);

create policy "Anyone can read tool by slug for public pages"
  on public.tools for select using (true);

comment on table public.tools is 'Quoting tools; each row is one white-label quoting tool owned by a user.';
