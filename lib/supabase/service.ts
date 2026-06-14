import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client.
 *
 * Uses the service-role key which bypasses RLS. MUST only be called from
 * server-side code (API routes, server actions). Never expose this client
 * or the service-role key to the browser.
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables',
    )
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
