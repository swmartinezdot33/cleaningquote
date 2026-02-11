# Config load path (tool-only, no stale data)

## When user visits `/t/[slug]` (e.g. `/t/quoter`)

### 1. Server (SSR) – `src/app/t/[slug]/page.tsx`

- Resolve tool: `supabase.from('tools').select('id').eq('slug', slug)` → get `tool.id`.
- Load config: `getToolConfigByToolId(tool.id)`:
  - `getWidgetSettings(toolId)` → config store, `tool_config` where `tool_id = toolId`
  - `getFormSettings(toolId)`, `getSurveyQuestions(toolId)`, `getGHLConfig(toolId)` — same store, same `tool_id`.
- Pass to client: `<Home slug={slug} toolId={tool.id} initialConfig={initialConfig} />`.

### 2. Client – `QuoteFlowPage` (Home)

- **When `slug` is set:** We do **not** use server `initialConfig` for widget/questions/redirect/form. We set `useServerConfig = false`, so:
  - Initial state: widget title/subtitle/color = default/empty, questions = `[]`, `configLoaded = false`.
  - User sees **“Loading form...”** until the client fetch completes.
- **useEffect:** Calls `loadConfigFromSlug(slug)`:
  - Fetches `GET /api/tools/[slug]/config?t=Date.now()` (cache-bust).
  - On success: sets widget, questions, formSettings, redirect from `data`; sets `configLoaded = true`.
- **Result:** For `/t/[slug]`, the only config shown is from the **client-fetched API**. No stale server-rendered config.

### 3. API – `GET /api/tools/[slug]/config`

- Resolve tool: `supabase.from('tools').select('id').eq('slug', slug).single()` → `toolId`.
- Read config: `supabase.from('tool_config').select('*').eq('tool_id', toolId).maybeSingle()`.
- If no row: call `createToolConfigPreset(toolId, DEFAULT_WIDGET, DEFAULT_SURVEY_QUESTIONS)`, then re-read row.
- Normalize widget (camelCase/snake_case), parse survey_questions, guarantee at least default questions.
- Return `{ widget, formSettings, questions, redirect, ... }` with `Cache-Control: no-store` etc.
- **No global fallback:** only the row where `tool_id = toolId` is used.

## When user visits legacy path (no slug)

- Server still passes `initialConfig` from `getToolConfigByToolId(tool.id)` when applicable.
- Client sets `useServerConfig = true`; initial state and legacy loaders use `initialConfig` / legacy APIs.

## Summary

| Path        | Config source              | Stale risk                          |
|------------|----------------------------|-------------------------------------|
| `/t/[slug]`| Client fetch → API → DB    | None; we don’t use server config.   |
| Legacy     | Server initialConfig + legacy APIs | Same as before.                |

Every tool loads only its own config (`tool_config.tool_id = tool.id`). For `/t/[slug]`, we avoid showing wrong data by not using server `initialConfig` and showing loading until the client-fetched config is applied.

**Dashboard and org:** One GHL location = one organization (`organizations.ghl_location_id`). Tools are scoped by `tools.org_id` only. Dashboard context is loaded once via `GET /api/dashboard/context`; all dashboard APIs resolve org from `locationId` via `organizations.ghl_location_id` only.
