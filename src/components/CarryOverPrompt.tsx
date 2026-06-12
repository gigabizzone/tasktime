import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { pastUnfinished, carryOverTasks } from '../db/taskOps'
import { syncIfLoaded } from '../stores/useTaskStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { todayKey } from '../lib/dates'
import { toast } from '../stores/useToastStore'
import { useCategories } from '../lib/useCategories'
import type { ID, Task } from '../types/models'

const STORAGE_KEY = 'focusflow-carryover-day'

/** F-1.6: on first open of a new day, offer to roll over unfinished tasks. */
export function CarryOverPrompt() {
  const dayStartHour = useSettingsStore((s) => s.settings.dayStartHour)
  const categories = useCategories()
  const today = todayKey(dayStartHour)
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [picking, setPicking] = useState(false)
  const [checked, setChecked] = useState<Set<ID>>(new Set())

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === today) return
    localStorage.setItem(STORAGE_KEY, today)
    void pastUnfinished(today).then((found) => {
      if (found.length > 0) {
        setTasks(found)
        setChecked(new Set(found.map((t) => t.id)))
      }
    })
  }, [today])

  if (!tasks) return null

  const move = async (ids: ID[]) => {
    await carryOverTasks(ids, today)
    syncIfLoaded(today)
    toast(`Moved ${ids.length} task${ids.length === 1 ? '' : 's'} to today`)
    setTasks(null)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-sm font-semibold">
          You have {tasks.length} unfinished task{tasks.length === 1 ? '' : 's'} from previous days
        </h3>

        {picking && (
          <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
            {tasks.map((t) => {
              const color = categories.find((c) => c.id === t.categoryId)?.color ?? '#6B7280'
              return (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={checked.has(t.id)}
                      onChange={(e) => {
                        const next = new Set(checked)
                        if (e.target.checked) next.add(t.id)
                        else next.delete(t.id)
                        setChecked(next)
                      }}
                      className="h-4 w-4 accent-blue-500"
                    />
                    <span className="h-4 w-1 rounded" style={{ backgroundColor: color }} />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-gray-400">{format(parseISO(t.plannedDate), 'MMM d')}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex flex-wrap justify-end gap-2 text-sm">
          <button
            onClick={() => setTasks(null)}
            className="rounded-md px-3 py-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Dismiss
          </button>
          {picking ? (
            <button
              onClick={() => void move([...checked])}
              disabled={checked.size === 0}
              className="rounded-md bg-blue-500 px-3 py-1.5 font-medium text-white hover:bg-blue-600 disabled:opacity-40"
            >
              Move selected ({checked.size})
            </button>
          ) : (
            <>
              <button
                onClick={() => setPicking(true)}
                className="rounded-md px-3 py-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
              >
                Pick individually
              </button>
              <button
                onClick={() => void move(tasks.map((t) => t.id))}
                className="rounded-md bg-blue-500 px-3 py-1.5 font-medium text-white hover:bg-blue-600"
              >
                Move all to today
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
