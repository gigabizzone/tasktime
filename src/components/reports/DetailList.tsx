import { useMemo } from 'react'
import { isActiveFocus, inRange, type RangeType } from '../../lib/reports'
import { toDayKey } from '../../lib/dates'
import { formatMinutes } from '../../lib/format'
import type { Category, ID, Session, Task, WeekStart } from '../../types/models'

interface Props {
  selected: ID
  category: Category | undefined
  sessions: Session[]
  tasks: Task[]
  type: RangeType
  anchor: Date
  opts: { weekStartsOn: WeekStart; dayStartHour: number }
}

/** Tasks within the selected category for the range, with active minutes — the
 *  detail list a donut slice filters to (F-4.3). */
export function DetailList({ selected, category, sessions, tasks, type, anchor, opts }: Props) {
  const rows = useMemo(() => {
    const minutesByTask = new Map<ID, number>()
    for (const s of sessions) {
      if (s.categoryId !== selected || !isActiveFocus(s)) continue
      if (!inRange(toDayKey(new Date(s.startedAt), opts.dayStartHour), type, anchor, opts.weekStartsOn)) continue
      minutesByTask.set(s.taskId, (minutesByTask.get(s.taskId) ?? 0) + s.actualMinutes)
    }
    const titleOf = new Map(tasks.map((t) => [t.id, t.title]))
    return [...minutesByTask.entries()]
      .map(([taskId, minutes]) => ({ taskId, minutes, title: titleOf.get(taskId) ?? '(deleted task)' }))
      .sort((a, b) => b.minutes - a.minutes)
  }, [selected, sessions, tasks, type, anchor, opts])

  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {category?.name ?? 'Category'} · detail
      </h4>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No focus time on this category in range.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {rows.map((r) => (
            <li
              key={r.taskId}
              className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1 dark:bg-gray-900"
            >
              <span className="min-w-0 flex-1 truncate">{r.title}</span>
              <span className="tabular-nums text-gray-500">{formatMinutes(r.minutes)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
