import { useTimerStore } from '../../stores/useTimerStore'
import { formatMinutes } from '../../lib/format'

/** Value-add #6: after the machine sleeps, ask whether to keep or trim the away time. */
export function IdlePrompt() {
  const idleAwayMs = useTimerStore((s) => s.idleAwayMs)
  const resolveIdle = useTimerStore((s) => s.resolveIdle)
  if (idleAwayMs === null) return null

  const minutes = Math.max(1, Math.round(idleAwayMs / 60_000))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="card flex w-full max-w-sm flex-col gap-3 p-5" role="dialog" aria-label="You were away">
        <h2 className="text-lg font-bold">You were away ~{formatMinutes(minutes)}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Your device went to sleep during this session. Keep that time as focus, or trim it out?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => resolveIdle(false)} className="btn-soft">Trim it</button>
          <button onClick={() => resolveIdle(true)} className="btn-primary">Keep it</button>
        </div>
      </div>
    </div>
  )
}
