import { useQueue } from '../../lib/useQueue'
import { useCategories } from '../../lib/useCategories'
import { useTimerStore } from '../../stores/useTimerStore'

/** F-2.5 "Up next": today's remaining sessions in plan order. */
export function SessionQueue() {
  const queue = useQueue()
  const categories = useCategories()
  const currentTaskId = useTimerStore((s) => s.taskId)
  const assignTask = useTimerStore((s) => s.assignTask)
  const status = useTimerStore((s) => s.status)

  const upcoming = queue.filter((e) => e.taskId !== currentTaskId).slice(0, 5)
  if (upcoming.length === 0) return null

  return (
    <div className="w-full max-w-xs">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Up next
      </h3>
      <ul className="flex flex-col gap-1">
        {upcoming.map((e) => {
          const color = categories.find((c) => c.id === e.task.categoryId)?.color ?? '#6B7280'
          return (
            <li key={e.taskId}>
              <button
                onClick={() => assignTask(e.taskId)}
                disabled={status !== 'idle'}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-300 dark:hover:bg-gray-800"
                title={status === 'idle' ? 'Load into timer' : 'Finish the current session first'}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="min-w-0 flex-1 truncate">{e.task.title}</span>
                <span className="text-xs text-gray-400">
                  {e.task.estimatePomos ? `${e.remaining}× ` : ''}🍅
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
