import { Suspense } from 'react'
import { BookingFlow } from '@/components/booking/BookingFlow'

export default function BookPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Suspense fallback={<BookingLoadingSkeleton />}>
        <BookingFlow />
      </Suspense>
    </main>
  )
}

function BookingLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    </div>
  )
}
