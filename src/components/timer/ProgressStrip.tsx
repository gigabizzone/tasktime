import { useTodayStats } from '../../lib/useTodayStats'
import { formatMinutes } from '../../lib/format'

/** F-2.8: today at a glance — active minutes, sessions, streak. */
export function ProgressStrip() {
  const { activeMinutes, sessionsCompleted, streak } = useTodayStats()
  return (
    <div className="flex items-center justify-center gap-4 rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
      <span title="Active time today">⏱ {formatMinutes(activeMinutes)}</span>
      <span title="Sessions completed today">✅ {sessionsCompleted} session{sessionsCompleted === 1 ? '' : 's'}</span>
      <span title="Current streak">🔥 {streak}-day streak</span>
    </div>
  )
}
