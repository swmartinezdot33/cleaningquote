import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Create Supabase server client for route handlers and server components.
 * Uses cookies from next/headers for session. Call from Server Components or Route Handlers.
 */
export async function createSupabaseServerSSR() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = { ...options } as Record<string, unknown>;
            if (name.startsWith('sb-')) {
              opts.sameSite = 'none';
              opts.secure = true;
            }
            cookieStore.set(name, value, opts);
          });
        } catch {
          // Ignore in Server Component when middleware handles session
        }
      },
    },
  });
}
