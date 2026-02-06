-- Add status to quotes: 'quote' (default) or 'disqualified' so disqualified leads are logged but filterable
alter table public.quotes
  add column if not exists status text not null default 'quote';

comment on column public.quotes.status is 'quote = normal quote; disqualified = lead disqualified by survey (e.g. option skip-to Disqualify lead).';
