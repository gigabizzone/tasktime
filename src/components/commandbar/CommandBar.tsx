import { useEffect, useState } from 'react'
import { parseQuickAdd, matchCategory } from '../../lib/quickAdd'
import { parseNaturalDate, formatScheduleLabel } from '../../lib/naturalDate'
import { useCategories } from '../../lib/useCategories'
import { useTaskStore } from '../../stores/useTaskStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { todayKey } from '../../lib/dates'
import { toast } from '../../stores/useToastStore'

/**
 * F-3.2 quick capture: Ctrl/Cmd+K from anywhere, one line like
 * 'Client logo revision #business @tomorrow 2pm ~2', Enter, done.
 */
export function CommandBar() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const categories = useCategories()
  const addTask = useTaskStore((s) => s.addTask)
  const dayStartHour = useSettingsStore((s) => s.settings.dayStartHour)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null

  const parsed = parseQuickAdd(value)
  const natural = parsed.dateToken ? parseNaturalDate(parsed.dateToken, new Date()) : null
  const category =
    (parsed.categoryToken && matchCategory(parsed.categoryToken, categories)) ||
    categories.find((c) => c.name === 'Others') ||
    categories[0]

  const submit = () => {
    if (!parsed.title || !category) return
    const target = natural?.date ?? todayKey(dayStartHour)
    void addTask(
      {
        title: parsed.title,
        categoryId: category.id,
        estimatePomos: parsed.estimatePomos,
        scheduledTime: natural?.time,
      },
      target,
    )
    toast(natural ? `Scheduled for ${formatScheduleLabel(natural)}` : `Added for today`)
    setValue('')
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex w-full max-w-xl flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Capture a task… e.g. Client logo revision #business @tomorrow 2pm ~2"
          aria-label="Quick capture"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800"
        />
        <div className="flex items-center gap-3 px-1 text-xs text-gray-500 dark:text-gray-400">
          {parsed.title ? (
            <>
              <span className="truncate font-medium text-gray-700 dark:text-gray-200">
                {parsed.title}
              </span>
              {category && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                  {category.name}
                </span>
              )}
              <span>📅 {natural ? formatScheduleLabel(natural) : 'Today'}</span>
              {parsed.estimatePomos && <span>🍅 ×{parsed.estimatePomos}</span>}
              {parsed.dateToken && !natural && (
                <span className="text-amber-500">@"{parsed.dateToken}" not understood — using today</span>
              )}
            </>
          ) : (
            <span>#category sets category · @tomorrow 2pm schedules · ~3 sets estimate</span>
          )}
        </div>
      </div>
    </div>
  )
}
