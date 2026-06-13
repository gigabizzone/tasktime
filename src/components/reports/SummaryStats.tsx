import { format, parseISO } from 'date-fns'
import type { SummaryStats as Stats } from '../../lib/reports'
import { formatMinutes } from '../../lib/format'

interface Props {
  stats: Stats
  streaks: { current: number; best: number }
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  )
}

/** F-4.4 summary stats row. */
export function SummaryStats({ stats, streaks }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      <Stat label="Active time" value={formatMinutes(stats.activeMinutes)} />
      <Stat label="Sessions" value={String(stats.sessionsCompleted)} hint="completed" />
      <Stat label="Completion" value={`${Math.round(stats.completionRate * 100)}%`} hint={`${stats.sessionsCompleted}/${stats.sessionsStarted} started`} />
      <Stat label="Tasks done" value={String(stats.tasksDone)} />
      <Stat label="Interruptions" value={String(stats.interruptions)} />
      <Stat
        label="Best day"
        value={stats.bestFocusDayKey ? formatMinutes(stats.bestFocusDayMinutes) : '—'}
        hint={stats.bestFocusDayKey ? format(parseISO(stats.bestFocusDayKey), 'EEE, MMM d') : undefined}
      />
      <Stat label="Streak" value={`${streaks.current}d`} hint="current" />
      <Stat label="Best streak" value={`${streaks.best}d`} />
    </div>
  )
}
