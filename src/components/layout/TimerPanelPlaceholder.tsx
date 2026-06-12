import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useTimerStore } from '../../stores/useTimerStore'

export function TimerPanelPlaceholder() {
  const plannedMinutes = useTimerStore((s) => s.plannedMinutes)
  const taskId = useTimerStore((s) => s.taskId)
  const task = useLiveQuery(() => (taskId ? db.tasks.get(taskId) : undefined), [taskId])
  const category = useLiveQuery(
    () => (task ? db.categories.get(task.categoryId) : undefined),
    [task?.categoryId],
  )

  return (
    <section className="flex w-[45%] flex-col items-center justify-center gap-4 p-4">
      <div
        className="flex h-48 w-48 flex-col items-center justify-center gap-1 rounded-full border-8 px-6 text-center"
        style={{ borderColor: category?.color ?? 'var(--color-gray-200)' }}
      >
        <span className="text-3xl font-semibold tabular-nums">{plannedMinutes}:00</span>
        {task && (
          <span className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{task.title}</span>
        )}
      </div>
      <p className="text-sm text-gray-400">
        {task ? 'Timer controls arrive in M3' : 'Pomodoro timer arrives in M3 — press ▶ on a task to assign it'}
      </p>
    </section>
  )
}
