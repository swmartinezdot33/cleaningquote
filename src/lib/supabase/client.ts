import { parse, serialize } from 'cookie';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Browser Supabase client with anon key (uses cookies for session sync with SSR).
 * Auth cookies use SameSite=None; Secure so sign-in works when embedded in an iframe (e.g. GHL).
 */
export function createSupabaseBrowser() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const parsed = parse(document.cookie);
        return Object.entries(parsed).map(([name, value]) => ({ name, value: value ?? '' }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const opts = { ...options } as Record<string, unknown>;
          if (name.startsWith('sb-')) {
            opts.sameSite = 'none';
            opts.secure = true;
          }
          document.cookie = serialize(name, value, opts);
        });
      },
    },
  });
}
