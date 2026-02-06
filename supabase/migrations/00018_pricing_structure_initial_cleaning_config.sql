-- Per-structure initial cleaning and multiplier settings (people, pets, initial cleaning).
-- When set, quotes using this pricing structure use these values; otherwise fall back to tool config.
alter table public.pricing_structures
  add column if not exists initial_cleaning_config jsonb;

comment on column public.pricing_structures.initial_cleaning_config is 'Optional. When set, quotes using this structure use these multipliers and initial cleaning rules; else tool_config.initial_cleaning_config is used.';
