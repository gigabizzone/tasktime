import { addDays, addMonths, addWeeks, addYears, format, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import type { RangeType } from '../../lib/reports'
import type { WeekStart } from '../../types/models'

interface Props {
  type: RangeType
  anchor: Date
  weekStartsOn: WeekStart
  onType: (type: RangeType) => void
  onAnchor: (anchor: Date) => void
}

const TABS: RangeType[] = ['day', 'week', 'month', 'year']

export function rangeLabel(type: RangeType, anchor: Date, weekStartsOn: WeekStart): string {
  switch (type) {
    case 'day':
      return format(anchor, 'EEE, MMM d, yyyy')
    case 'week': {
      const s = startOfWeek(anchor, { weekStartsOn })
      const e = endOfWeek(anchor, { weekStartsOn })
      return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
    }
    case 'month':
      return format(anchor, 'MMMM yyyy')
    case 'year':
      return format(anchor, 'yyyy')
  }
}

function step(type: RangeType, anchor: Date, dir: 1 | -1): Date {
  switch (type) {
    case 'day':
      return addDays(anchor, dir)
    case 'week':
      return addWeeks(anchor, dir)
    case 'month':
      return addMonths(anchor, dir)
    case 'year':
      return addYears(anchor, dir)
  }
}

export function RangeNav({ type, anchor, weekStartsOn, onType, onAnchor }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 text-sm dark:bg-gray-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => onType(t)}
            aria-pressed={type === t}
            className={`rounded-md px-3 py-1 capitalize ${
              type === t ? 'bg-white font-medium shadow dark:bg-gray-700' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onAnchor(step(type, anchor, -1))}
          aria-label="Previous"
          className="rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          ‹
        </button>
        <span className="min-w-44 text-center text-sm font-semibold">
          {rangeLabel(type, anchor, weekStartsOn)}
        </span>
        <button
          onClick={() => onAnchor(step(type, anchor, 1))}
          aria-label="Next"
          className="rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          ›
        </button>
      </div>

      <button
        onClick={() => onAnchor(new Date())}
        className="rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
      >
        Today
      </button>

      <input
        type="date"
        value={format(anchor, 'yyyy-MM-dd')}
        onChange={(e) => e.target.value && onAnchor(parseISO(e.target.value))}
        aria-label="Pick a date"
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
    </div>
  )
}
