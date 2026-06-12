import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useTimerStore, remainingMsOf } from '../../stores/useTimerStore'
import { useViewStore } from '../../stores/useViewStore'
import { useNow } from '../../lib/useNow'
import { formatClock } from '../../lib/format'

/** Compact floating timer shown while a session runs on other views (PRD §7). */
export function TimerPill() {
  const view = useViewStore((s) => s.view)
  const timer = useTimerStore()
  const now = useNow(timer.status === 'running')
  const task = useLiveQuery(
    () => (timer.taskId ? db.tasks.get(timer.taskId) : undefined),
    [timer.taskId],
  )

  if (view === 'tasks' || timer.status === 'idle') return null

  const remaining = Math.max(0, remainingMsOf(timer, now))

  return (
    <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-gray-900 py-1.5 pl-4 pr-2 text-sm text-white shadow-xl dark:bg-gray-100 dark:text-gray-900">
      <button
        onClick={() => useViewStore.getState().setView('tasks')}
        className="flex items-center gap-2"
        title="Back to the timer"
      >
        <span className="font-semibold tabular-nums">{formatClock(remaining)}</span>
        <span className="max-w-40 truncate text-xs opacity-80">
          {timer.type === 'break' ? 'Break' : (task?.title ?? 'Focus')}
        </span>
      </button>
      {timer.status === 'running' ? (
        <button
          onClick={timer.pause}
          title="Pause"
          className="rounded-full px-2 py-0.5 hover:bg-white/20 dark:hover:bg-black/10"
        >
          ⏸
        </button>
      ) : (
        <button
          onClick={timer.resume}
          title="Resume"
          className="rounded-full px-2 py-0.5 hover:bg-white/20 dark:hover:bg-black/10"
        >
          ▶
        </button>
      )}
    </div>
  )
}
