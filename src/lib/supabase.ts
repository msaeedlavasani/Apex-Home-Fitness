/**
 * Supabase client configuration — browser (client-side) client.
 *
 * Environment variables (required; see .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL       — e.g. https://<project-ref>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  — anon (public) API key
 *
 * This module is safe to import from Client Components.
 * The server-side client (which reads the request's auth cookies via
 * `next/headers`) lives in `./supabase-server.ts` and must only be used in
 * Server Components, Route Handlers and Server Actions — importing
 * `next/headers` from a Client Component graph is a build error.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** Reads and validates the Supabase environment configuration. */
export function getSupabaseConfig(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      '[supabase] Missing configuration. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
    );
  }

  return { url, anonKey };
}

/**
 * Creates a Supabase client for use in Client Components.
 * Auth sessions are persisted via browser cookies by `@supabase/ssr`.
 *
 * @example
 *   const supabase = createBrowserSupabaseClient();
 *   const { data } = await supabase.auth.signInWithPassword({ email, password });
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
