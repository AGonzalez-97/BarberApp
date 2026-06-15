import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'
import IOSInstallBanner from '@/components/IOSInstallBanner'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email !== adminEmail) {
    redirect('/login')
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Admin'

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Top greeting bar */}
      <header className="shrink-0 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2">
        <p className="text-xs text-gray-400 dark:text-gray-500">Hola, <span className="font-medium text-gray-600 dark:text-gray-300">{displayName}</span></p>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <AdminNav />
      <IOSInstallBanner />
    </div>
  )
}
