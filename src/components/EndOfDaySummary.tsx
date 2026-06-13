import { useMemo, useState } from 'react'
import { useReportData } from '../lib/useReportData'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useViewStore } from '../stores/useViewStore'
import { todayKey } from '../lib/dates'
import { formatMinutes } from '../lib/format'
import { IconClose } from './ui/Icons'

const KEY = 'focusflow-eod-dismissed'
const SHOW_AFTER_HOUR = 18

/** Value-add #3: gentle end-of-day card once the afternoon's work is in. */
export function EndOfDaySummary() {
  const dayStartHour = useSettingsStore((s) => s.settings.dayStartHour)
  const today = todayKey(dayStartHour)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(KEY) === today)
  const anchor = useMemo(() => new Date(), [])
  const data = useReportData('day', anchor)
  const setView = useViewStore((s) => s.setView)

  const hour = new Date().getHours()
  if (dismissed || hour < SHOW_AFTER_HOUR || data.summary.activeMinutes <= 0) return null

  const top = data.categoryTotals[0]
  const topName = top ? data.categories.find((c) => c.id === top.categoryId)?.name : undefined
  const topPct = top ? Math.round((top.minutes / data.summary.activeMinutes) * 100) : 0

  const close = () => {
    localStorage.setItem(KEY, today)
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-4 left-4 z-30 max-w-xs">
      <div className="card flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-bold">Today’s focus 🌙</h3>
          <button onClick={close} className="btn-ghost px-1.5 py-1" aria-label="Dismiss">
            <IconClose width={15} height={15} />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>{formatMinutes(data.summary.activeMinutes)}</strong> active ·{' '}
          <strong>{data.summary.sessionsCompleted}</strong> session{data.summary.sessionsCompleted === 1 ? '' : 's'}
          {topName && (
            <>
              {' '}· {topName} <strong>{topPct}%</strong>
            </>
          )}
        </p>
        <button
          onClick={() => {
            close()
            setView('tasks')
            requestAnimationFrame(() => document.getElementById('quick-add-input')?.focus())
          }}
          className="btn-soft w-fit text-xs"
        >
          Plan tomorrow →
        </button>
      </div>
    </div>
  )
}
