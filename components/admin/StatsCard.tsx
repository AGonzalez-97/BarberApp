interface StatsCardProps {
  label: string
  value: string
  subtitle?: string
  /** When true, renders the card larger and more prominent (used for "Hoy") */
  featured?: boolean
}

/**
 * StatsCard — reusable admin dashboard card.
 *
 * Displays a single metric with a label, formatted value, and optional subtitle.
 * The `featured` variant is larger and higher-contrast — used for today's stats
 * that Leo needs to read at a glance, possibly in bright outdoor light.
 */
export default function StatsCard({
  label,
  value,
  subtitle,
  featured = false,
}: StatsCardProps) {
  if (featured) {
    return (
      <div className="rounded-2xl bg-gray-900 p-5 text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <p className="mt-2 text-4xl font-bold leading-none tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="mt-2 text-sm text-gray-300">{subtitle}</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  )
}
