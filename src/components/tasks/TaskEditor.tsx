import { useState } from 'react'
import type { Category, Task } from '../../types/models'

interface Props {
  task: Task
  categories: Category[]
  onSave: (patch: Partial<Task>) => void
  onCancel: () => void
}

/** Inline editor (F-1.4): title, category, notes, estimate, scheduled date/time. */
export function TaskEditor({ task, categories, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(task.title)
  const [categoryId, setCategoryId] = useState(task.categoryId)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [estimate, setEstimate] = useState(task.estimatePomos?.toString() ?? '')
  const [plannedDate, setPlannedDate] = useState(task.plannedDate)
  const [scheduledTime, setScheduledTime] = useState(task.scheduledTime ?? '')

  const save = () => {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      categoryId,
      notes: notes.trim() || undefined,
      estimatePomos: estimate ? Math.max(1, parseInt(estimate, 10)) : undefined,
      plannedDate,
      scheduledTime: scheduledTime || undefined,
    })
  }

  const field =
    'rounded-md border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800'

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-blue-300 bg-white p-3 dark:border-blue-700 dark:bg-gray-900"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') save()
        if (e.key === 'Escape') onCancel()
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        aria-label="Title"
        className={field}
      />
      <div className="flex flex-wrap gap-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Category"
          className={field}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={20}
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          placeholder="Est. 🍅"
          aria-label="Estimate in Pomodoros"
          className={`${field} w-20`}
        />
        <input
          type="date"
          value={plannedDate}
          onChange={(e) => setPlannedDate(e.target.value)}
          aria-label="Planned date"
          className={field}
        />
        <input
          type="time"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          aria-label="Scheduled time"
          className={field}
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        aria-label="Notes"
        rows={2}
        className={field}
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={save}
          className="rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </div>
  )
}
