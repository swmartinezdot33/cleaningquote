-- Add pricing file metadata to tool_config (uploadedAt, size, contentType)
alter table public.tool_config
  add column if not exists pricing_file_metadata jsonb;

comment on column public.tool_config.pricing_file_metadata is 'Pricing Excel file metadata: { uploadedAt, size, contentType }';
