-- Slug must remain globally unique for /t/[slug] public URLs
drop index if exists public.tools_org_slug_idx;
create unique index if not exists tools_slug_key on public.tools(slug);
