-- Zone labels and colors for service area polygons (one entry per zone, same order as polygon array).
alter table public.service_areas
  add column if not exists zone_display jsonb default '[]'::jsonb;

comment on column public.service_areas.zone_display is 'Per-zone display: array of { label?: string, color?: string } (hex), same length as polygon array.';
