-- Quotes table: primary storage for submitted quotes (Supabase as source of truth)
-- KV is used only for cache/performance when displaying quote pages

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_id text not null unique,
  tool_id uuid references public.tools(id) on delete set null,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  service_type text,
  frequency text,
  price_low integer,
  price_high integer,
  square_feet text,
  bedrooms integer,
  full_baths integer,
  half_baths integer,
  summary_text text,
  payload jsonb not null default '{}',
  ghl_contact_id text,
  ghl_object_id text,
  created_at timestamptz not null default now()
);

create index if not exists quotes_quote_id_idx on public.quotes(quote_id);
create index if not exists quotes_tool_id_idx on public.quotes(tool_id);
create index if not exists quotes_created_at_idx on public.quotes(created_at desc);

-- RLS: dashboard users can only see quotes for their own tools
alter table public.quotes enable row level security;

create policy "Users can view quotes for own tools"
  on public.quotes for select
  using (
    tool_id is null
    or exists (
      select 1 from public.tools t
      where t.id = quotes.tool_id and t.user_id = auth.uid()
    )
  );

-- Allow service role to insert (quote form is public, no auth)
-- Policy not needed for service role - it bypasses RLS
-- Anonymous inserts via anon key: allow insert when tool exists (or null for legacy)
create policy "Allow insert for valid tool or legacy"
  on public.quotes for insert
  with check (
    tool_id is null
    or exists (select 1 from public.tools where id = tool_id)
  );

comment on table public.quotes is 'Primary storage for quotes; KV used only for cache.';
