import { useState } from 'react'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { addHours, format, parseISO } from 'date-fns'
import { nanoid } from 'nanoid'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import * as ops from '../../db/taskOps'
import { syncIfLoaded } from '../../stores/useTaskStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { parseQuickAdd, matchCategory } from '../../lib/quickAdd'
import { toast } from '../../stores/useToastStore'
import { TaskEditor } from '../tasks/TaskEditor'
import type { Category, Task } from '../../types/models'

interface Props {
  dayKey: string
  tasks: Task[]
  categories: Category[]
  isPast: boolean
  onClose: () => void
}

/** F-3.3 day drill-down: the day's editable plan + session history for past days. */
export function DayPanel({ dayKey, tasks, categories, isPast, onClose }: Props) {
  const [title, setTitle] = useState('')
  const todos = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')

  const add = async () => {
    const parsed = parseQuickAdd(title)
    if (!parsed.title) return
    const category =
      (parsed.categoryToken && matchCategory(parsed.categoryToken, categories)) ||
      categories.find((c) => c.name === 'Others') ||
      categories[0]
    if (!category) return
    await ops.addTaskOn(dayKey, {
      title: parsed.title,
      categoryId: category.id,
      estimatePomos: parsed.estimatePomos,
    })
    syncIfLoaded(dayKey)
    setTitle('')
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{format(parseISO(dayKey), 'EEEE, MMM d')}</h3>
        <button onClick={onClose} aria-label="Close day panel" className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void add()}
        placeholder="+ Add a task to this day"
        aria-label={`Add task on ${dayKey}`}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900"
      />

      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-1.5">
          {todos.map((t) => (
            <DayTaskRow key={t.id} task={t} categories={categories} dayKey={dayKey} />
          ))}
          {todos.length === 0 && (
            <li className="py-2 text-center text-xs text-gray-400">No open tasks this day.</li>
          )}
        </ul>
      </SortableContext>

      {done.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-gray-400">Done ({done.length})</summary>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {done.map((t) => (
              <DayTaskRow key={t.id} task={t} categories={categories} dayKey={dayKey} />
            ))}
          </ul>
        </details>
      )}

      <SessionHistory dayKey={dayKey} show={isPast} />
      <ManualSessionEntry dayKey={dayKey} tasks={tasks} />
    </aside>
  )
}

function DayTaskRow({ task, categories, dayKey }: { task: Task; categories: Category[]; dayKey: string }) {
  const [editing, setEditing] = useState(false)
  const done = task.status === 'done'
  const color = categories.find((c) => c.id === task.categoryId)?.color ?? '#6B7280'
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: done || editing,
  })

  if (editing) {
    return (
      <li>
        <TaskEditor
          task={task}
          categories={categories}
          onSave={(patch) => {
            void ops.updateTask(task.id, patch).then(() => {
              syncIfLoaded(dayKey)
              if (patch.plannedDate && patch.plannedDate !== dayKey) syncIfLoaded(patch.plannedDate)
            })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 ${
        isDragging ? 'z-10 opacity-70 shadow-lg' : ''
      }`}
    >
      <span className="h-5 w-1 shrink-0 rounded" style={{ backgroundColor: color }} />
      <input
        type="checkbox"
        checked={done}
        onChange={() => {
          void ops.setDone(task.id, !done).then(() => syncIfLoaded(dayKey))
        }}
        aria-label={`Complete ${task.title}`}
        className="h-4 w-4 shrink-0 accent-blue-500"
      />
      {!done && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder or onto a date"
          className="cursor-grab touch-none text-gray-300 hover:text-gray-500 dark:text-gray-600"
        >
          ☰
        </button>
      )}
      <button
        onClick={() => setEditing(true)}
        className={`min-w-0 flex-1 truncate text-left ${done ? 'text-gray-400 line-through' : ''}`}
        title="Click to edit"
      >
        {task.title}
        {task.scheduledTime && <span className="ml-1.5 text-xs text-gray-400">⏰ {task.scheduledTime}</span>}
      </button>
      <button
        onClick={() => {
          void ops.deleteTask(task.id).then(() => {
            syncIfLoaded(dayKey)
            toast(`Deleted "${task.title}"`, {
              label: 'Undo',
              run: () => void ops.restoreTask(task).then(() => syncIfLoaded(dayKey)),
            })
          })
        }}
        aria-label={`Delete ${task.title}`}
        className="rounded p-1 text-gray-300 hover:text-red-500"
      >
        ✕
      </button>
    </li>
  )
}

/** Past-day session history: which task, duration, completed/abandoned, interruptions. */
function SessionHistory({ dayKey, show }: { dayKey: string; show: boolean }) {
  const dayStartHour = useSettingsStore((s) => s.settings.dayStartHour)
  const rows = useLiveQuery(async () => {
    const start = addHours(parseISO(dayKey), dayStartHour)
    const end = addHours(start, 24)
    const sessions = await db.sessions
      .where('startedAt')
      .between(start.toISOString(), end.toISOString())
      .toArray()
    const focus = sessions.filter((s) => s.type === 'focus').sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    const tasks = await db.tasks.bulkGet([...new Set(focus.map((s) => s.taskId))])
    const titles = new Map(tasks.filter(Boolean).map((t) => [t!.id, t!.title]))
    return focus.map((s) => ({ ...s, title: titles.get(s.taskId) ?? '(deleted task)' }))
  }, [dayKey, dayStartHour])

  if (!show || !rows || rows.length === 0) return null

  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Session history
      </h4>
      <ul className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
        {rows.map((s) => (
          <li key={s.id} className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1 dark:bg-gray-900">
            <span className="tabular-nums text-gray-400">{format(parseISO(s.startedAt), 'HH:mm')}</span>
            <span className="min-w-0 flex-1 truncate">{s.title}</span>
            <span className="tabular-nums">{s.actualMinutes}m</span>
            <span title={s.completed ? 'Completed' : s.counted ? 'Partial, counted' : 'Abandoned'}>
              {s.completed ? '✓' : s.counted ? '◐' : '✗'}
            </span>
            {s.interruptions.length > 0 && (
              <span className="text-amber-500" title={`${s.interruptions.length} interruptions`}>
                ⚡{s.interruptions.length}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** F-3.5: manual entry for forgotten offline work — date, task, minutes. */
function ManualSessionEntry({ dayKey, tasks }: { dayKey: string; tasks: Task[] }) {
  const [open, setOpen] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [minutes, setMinutes] = useState('25')
  const [time, setTime] = useState('12:00')

  const submit = async () => {
    const task = tasks.find((t) => t.id === taskId)
    const mins = parseInt(minutes, 10)
    if (!task || !mins || mins < 1) return
    const [h, m] = time.split(':').map(Number)
    const start = parseISO(dayKey)
    start.setHours(h, m, 0, 0)
    await db.sessions.add({
      id: nanoid(),
      taskId: task.id,
      categoryId: task.categoryId,
      type: 'focus',
      plannedMinutes: mins,
      actualMinutes: mins,
      startedAt: start.toISOString(),
      endedAt: new Date(start.getTime() + mins * 60_000).toISOString(),
      completed: true,
      counted: true,
      interruptions: [],
    })
    toast(`Logged ${mins}m on "${task.title}"`)
    setOpen(false)
  }

  return (
    <div className="mt-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        + Log session manually
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 p-2 text-sm dark:border-gray-700">
          {tasks.length === 0 ? (
            <span className="text-xs text-gray-400">Add a task to this day first.</span>
          ) : (
            <>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                aria-label="Task"
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="">Pick a task…</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  aria-label="Minutes"
                  className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  aria-label="Start time"
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
                <button
                  onClick={() => void submit()}
                  className="ml-auto rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600"
                >
                  Log
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
