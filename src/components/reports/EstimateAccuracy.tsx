import type { EstimateRow } from '../../lib/reports'
import type { Category } from '../../types/models'

interface Props {
  rows: EstimateRow[]
  categories: Category[]
}

/** F-4.5: planned vs. actual Pomodoros — a horizontal comparison list. */
export function EstimateAccuracy({ rows, categories }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400">No estimated tasks in this range.</p>
  }
  const colorOf = (id: string) => categories.find((c) => c.id === id)?.color ?? '#6B7280'
  const max = Math.max(...rows.map((r) => Math.max(r.estimate, r.actual)), 1)

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => {
        const delta = r.actual - r.estimate
        return (
          <li key={r.taskId} className="flex items-center gap-3 text-sm">
            <span className="h-3 w-1 shrink-0 rounded" style={{ backgroundColor: colorOf(r.categoryId) }} />
            <span className="w-40 shrink-0 truncate">{r.title}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-1" title={`Planned ${r.estimate}`}>
                <span className="w-10 shrink-0 text-right text-xs text-gray-400">plan</span>
                <span className="h-2 rounded bg-gray-300 dark:bg-gray-600" style={{ width: `${(r.estimate / max) * 100}%` }} />
              </div>
              <div className="flex items-center gap-1" title={`Actual ${r.actual}`}>
                <span className="w-10 shrink-0 text-right text-xs text-gray-400">actual</span>
                <span className="h-2 rounded" style={{ width: `${(r.actual / max) * 100}%`, backgroundColor: colorOf(r.categoryId) }} />
              </div>
            </div>
            <span
              className={`w-14 shrink-0 text-right text-xs tabular-nums ${
                delta > 0 ? 'text-red-500' : delta < 0 ? 'text-emerald-500' : 'text-gray-400'
              }`}
            >
              {delta === 0 ? 'on plan' : `${delta > 0 ? '+' : ''}${delta}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
