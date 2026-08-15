/**
 * Supabase server client — bound to the current request's auth cookies.
 *
 * Use in Server Components, Route Handlers, Server Actions and the service
 * layer (e.g. `src/services/userService.ts`).
 *
 * WARNING: server-only. Do NOT import this module from Client Components —
 * `next/headers` cannot be bundled into a client graph.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from './supabase';

/**
 * Creates a Supabase client whose auth session comes from the current
 * request's cookies. Call `auth.getUser()` to resolve the signed-in user.
 *
 * @example
 *   const supabase = createServerSupabaseClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export function createServerSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: session refresh is handled by middleware or on
          // the next request.
        }
      },
    },
  });
}
