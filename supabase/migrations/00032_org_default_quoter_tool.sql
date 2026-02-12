-- Allow organization to designate one tool as the default quoter (opened when user clicks "New Quote" on the Quotes page).
alter table public.organizations
  add column if not exists default_quoter_tool_id uuid references public.tools(id) on delete set null;

comment on column public.organizations.default_quoter_tool_id is 'Tool whose quote form opens in the New Quote modal. First tool created in the org is set automatically; can be changed in that tool''s Settings.';
