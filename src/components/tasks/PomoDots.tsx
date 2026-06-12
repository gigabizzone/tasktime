import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { ID } from '../../types/models'

/** Estimate vs completed Pomodoros, e.g. ●●○ = 2 of 3 done. */
export function PomoDots({ taskId, estimate }: { taskId: ID; estimate?: number }) {
  const completed =
    useLiveQuery(
      () =>
        db.sessions
          .where('taskId')
          .equals(taskId)
          .filter((s) => s.type === 'focus' && (s.completed || s.counted))
          .count(),
      [taskId],
    ) ?? 0

  if (!estimate && completed === 0) return null
  const total = Math.max(estimate ?? 0, completed)

  return (
    <span
      className="text-xs tracking-tight text-gray-400"
      title={`${completed} of ${estimate ?? completed} Pomodoros done`}
    >
      {Array.from({ length: total }, (_, i) => (i < completed ? '●' : '○')).join('')}
    </span>
  )
}
