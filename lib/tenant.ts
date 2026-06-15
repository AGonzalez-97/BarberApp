import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * The single tenant UUID used for the MVP.
 * Override via NEXT_PUBLIC_TENANT_ID when deploying a second tenant.
 */
export const TENANT_ID =
  process.env.TENANT_ID ?? process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000001'

/**
 * Returns the tenant ID for the current request.
 *
 * Strategy:
 *   1. Use NEXT_PUBLIC_TENANT_ID env var if set (fast path, no DB round-trip).
 *   2. Fall back to querying `tenant_members` for the authenticated user.
 *   3. If the DB query also fails, fall back to the hardcoded MVP default UUID.
 *
 * For the single-tenant MVP, the env var path is always taken.
 */
export async function getTenantId(supabase: SupabaseClient): Promise<string> {
  if (process.env.TENANT_ID ?? process.env.NEXT_PUBLIC_TENANT_ID) {
    return (process.env.TENANT_ID ?? process.env.NEXT_PUBLIC_TENANT_ID)!
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (data?.tenant_id) {
      return data.tenant_id as string
    }
  }

  // Final fallback: seed tenant UUID from migrations.
  return TENANT_ID
}
