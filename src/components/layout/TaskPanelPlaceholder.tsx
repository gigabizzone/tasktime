import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useTaskStore } from '../../stores/useTaskStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { todayKey } from '../../lib/dates'

export function TaskPanelPlaceholder() {
  const categories = useLiveQuery(() => db.categories.filter((c) => !c.archived).toArray(), []) ?? []
  const dayStartHour = useSettingsStore((s) => s.settings.dayStartHour)
  const { tasks, loadDay, addTask } = useTaskStore()
  const [title, setTitle] = useState('')

  useEffect(() => {
    void loadDay(todayKey(dayStartHour))
  }, [loadDay, dayStartHour])

  const othersId = categories.find((c) => c.name === 'Others')?.id

  const submit = () => {
    if (!title.trim() || !othersId) return
    void addTask(title, othersId)
    setTitle('')
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]))

  return (
    <section className="flex w-[55%] flex-col gap-3 border-r border-gray-200 p-4 dark:border-gray-800">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Today's Tasks</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="+ Add a task and press Enter (tokens like #business arrive in M2)"
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900"
      />
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-0.5 text-xs dark:border-gray-700"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </span>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5 overflow-y-auto">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <span
              className="h-5 w-1 shrink-0 rounded"
              style={{ backgroundColor: categoryById.get(t.categoryId)?.color ?? '#6B7280' }}
            />
            {t.title}
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-400">No tasks yet — add one above.</li>
        )}
      </ul>
    </section>
  )
}
