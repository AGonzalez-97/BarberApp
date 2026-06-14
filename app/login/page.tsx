'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to manage your salon</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 min-h-[44px]"
            placeholder="leo@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 min-h-[44px]"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gray-900 px-4 py-4 text-base font-semibold text-white min-h-[44px] hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
