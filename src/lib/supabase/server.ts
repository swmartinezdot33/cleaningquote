import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Server-side Supabase client with service role key.
 * Use for admin operations (e.g. migrations, getToolBySlug from API).
 * Do not expose to the client.
 */
export function createSupabaseServer() {
  // #region agent log
  const hasUrl = !!supabaseUrl && supabaseUrl.length > 0;
  const hasKey = !!supabaseServiceKey && supabaseServiceKey.length > 0;
  const urlLen = supabaseUrl?.length ?? 0;
  const keyLen = supabaseServiceKey?.length ?? 0;
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'supabase/server.ts:createSupabaseServer', message: 'createSupabaseServer called', data: { hasUrl, hasKey, urlLen, keyLen, urlEndsWithNewline: supabaseUrl?.endsWith('\n'), keyEndsWithNewline: supabaseServiceKey?.endsWith('\n') }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1' }) }).catch(() => {});
  // #endregion
  if (!supabaseUrl || !supabaseServiceKey) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'supabase/server.ts:throw', message: 'missing url or key', data: { hasUrl, hasKey }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1' }) }).catch(() => {});
    // #endregion
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: {
      // Disable Next.js fetch cache - always get fresh data from Supabase
      fetch: (url, options = {}) => {
        return fetch(url, { ...options, cache: 'no-store' });
      },
    },
  });
}

/** Check if Supabase is configured (for feature flags / conditional UI). */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey);
}
