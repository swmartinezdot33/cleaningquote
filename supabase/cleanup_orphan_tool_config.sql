-- Cleanup orphan tool_config rows: delete configs whose tool_id is not in the tools table.
-- Keep: (1) rows where tool_id IS NULL (global config), (2) rows where tool_id exists in tools.
-- Run in Supabase SQL Editor: Project → SQL Editor → New query

-- Preview: see which rows would be deleted (configs for missing tools)
SELECT id, tool_id, widget_settings->>'title' AS title_preview
FROM public.tool_config
WHERE tool_id IS NOT NULL
  AND tool_id NOT IN (SELECT id FROM public.tools);

-- Delete orphan config rows (uncomment and run after reviewing the SELECT above)
-- DELETE FROM public.tool_config
-- WHERE tool_id IS NOT NULL
--   AND tool_id NOT IN (SELECT id FROM public.tools);
