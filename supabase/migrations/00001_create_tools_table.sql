-- Multi-tenant: tools table (one per quoting tool, owned by a user)
create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(slug)
);

-- Index for listing tools by user
create index if not exists tools_user_id_idx on public.tools(user_id);
create unique index if not exists tools_slug_idx on public.tools(slug);

-- RLS: users can only see and modify their own tools
alter table public.tools enable row level security;

create policy "Users can view own tools"
  on public.tools for select
  using (auth.uid() = user_id);

create policy "Users can insert own tools"
  on public.tools for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tools"
  on public.tools for update
  using (auth.uid() = user_id);

create policy "Users can delete own tools"
  on public.tools for delete
  using (auth.uid() = user_id);

-- Public read by slug (for resolving /t/[slug] without auth)
create policy "Anyone can read tool by slug for public pages"
  on public.tools for select
  using (true);

comment on table public.tools is 'Quoting tools; each row is one white-label quoting tool owned by a user.';
