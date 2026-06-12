import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Category, Task } from '../../types/models'
import { useTaskStore } from '../../stores/useTaskStore'
import { useTimerStore } from '../../stores/useTimerStore'
import { PomoDots } from './PomoDots'
import { TaskEditor } from './TaskEditor'

interface Props {
  task: Task
  categories: Category[]
  selected: boolean
}

export function TaskCard({ task, categories, selected }: Props) {
  const { updateTask, toggleDone, duplicateTask, moveToDate, deleteTask, select } = useTaskStore()
  const assignTask = useTimerStore((s) => s.assignTask)
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showMoveDate, setShowMoveDate] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const done = task.status === 'done'
  const category = categories.find((c) => c.id === task.categoryId)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: done || editing,
  })

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false)
        setShowMoveDate(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  if (editing) {
    return (
      <li>
        <TaskEditor
          task={task}
          categories={categories}
          onSave={(patch) => {
            void updateTask(task.id, patch)
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
      onClick={() => select(task.id)}
      className={`group relative flex items-center gap-2 rounded-lg border bg-white px-2 py-2 text-sm dark:bg-gray-900 ${
        isDragging ? 'z-10 opacity-70 shadow-lg' : ''
      } ${
        selected
          ? 'border-blue-400 ring-1 ring-blue-400'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <span
        className="h-6 w-1 shrink-0 rounded"
        style={{ backgroundColor: category?.color ?? '#6B7280' }}
        title={category?.name}
      />
      <input
        type="checkbox"
        checked={done}
        onChange={() => void toggleDone(task.id)}
        aria-label={`Complete ${task.title}`}
        className="h-4 w-4 shrink-0 accent-blue-500"
      />
      {!done && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="cursor-grab touch-none text-gray-300 hover:text-gray-500 dark:text-gray-600"
        >
          ☰
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
        className={`min-w-0 flex-1 truncate text-left ${done ? 'text-gray-400 line-through' : ''}`}
        title="Click to edit"
      >
        {task.title}
        {task.scheduledTime && (
          <span className="ml-2 text-xs text-gray-400">⏰ {task.scheduledTime}</span>
        )}
      </button>
      <PomoDots taskId={task.id} estimate={task.estimatePomos} />
      {!done && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            assignTask(task.id)
          }}
          aria-label={`Start a session for ${task.title}`}
          title="Assign to timer"
          className="rounded p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-blue-500 focus:opacity-100"
        >
          ▶
        </button>
      )}
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          aria-label="Task menu"
          aria-expanded={menuOpen}
          className="rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          ⋯
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-7 z-20 flex w-44 flex-col rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem
              label="Edit"
              onClick={() => {
                setMenuOpen(false)
                setEditing(true)
              }}
            />
            <MenuItem
              label="Duplicate"
              onClick={() => {
                setMenuOpen(false)
                void duplicateTask(task.id)
              }}
            />
            <MenuItem label="Move to date…" onClick={() => setShowMoveDate((v) => !v)} />
            {showMoveDate && (
              <input
                type="date"
                autoFocus
                aria-label="Move to date"
                className="mx-2 my-1 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                onChange={(e) => {
                  if (e.target.value) {
                    setMenuOpen(false)
                    setShowMoveDate(false)
                    void moveToDate(task.id, e.target.value)
                  }
                }}
              />
            )}
            <MenuItem
              label="Delete"
              destructive
              onClick={() => {
                setMenuOpen(false)
                void deleteTask(task.id)
              }}
            />
          </div>
        )}
      </div>
    </li>
  )
}

function MenuItem({
  label,
  onClick,
  destructive,
}: {
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
        destructive ? 'text-red-600 dark:text-red-400' : ''
      }`}
    >
      {label}
    </button>
  )
}
