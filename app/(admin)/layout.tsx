import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'
import IOSInstallBanner from '@/components/IOSInstallBanner'

/**
 * Admin layout — server component.
 *
 * Second defense layer after middleware: verifies the session via
 * createServerClient (cookie-based). Redirects to /login if the session
 * is missing or expired. This catches edge cases where middleware is
 * bypassed (e.g., direct server action calls, misconfigured CDN).
 *
 * Layout structure:
 *   - Outer container fills the full viewport height (h-dvh).
 *   - Main content area is scrollable and has bottom padding to avoid
 *     overlap with the fixed AdminNav bar (pb-20 = 80px).
 *   - AdminNav is fixed to the bottom of the screen.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-gray-50">
      {/* Scrollable content area — pb-20 reserves space for the fixed nav */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Fixed bottom navigation — renders as a Client Component */}
      <AdminNav />

      {/* iOS PWA install prompt — shown above the nav */}
      <IOSInstallBanner />
    </div>
  )
}
