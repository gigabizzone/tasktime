import { useEffect, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useTaskStore, todosOf, doneOf } from '../../stores/useTaskStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useCategories } from '../../lib/useCategories'
import { todayKey } from '../../lib/dates'
import { QuickAdd } from './QuickAdd'
import { FilterChips } from './FilterChips'
import { TaskCard } from './TaskCard'
import { UndoToast } from './UndoToast'
import type { ID } from '../../types/models'

export function TaskPanel() {
  const categories = useCategories()
  const dayStartHour = useSettingsStore((s) => s.settings.dayStartHour)
  const { tasks, selectedId, loadDay, reorderTodo, moveBy, select } = useTaskStore()
  const [filter, setFilter] = useState<ID | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)

  useEffect(() => {
    void loadDay(todayKey(dayStartHour))
  }, [loadDay, dayStartHour])

  // F-1.2 keyboard alternative: Alt+↑ / Alt+↓ moves the selected task.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId || !e.altKey) return
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        void moveBy(selectedId, e.key === 'ArrowUp' ? -1 : 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, moveBy])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const todos = todosOf(tasks)
  const done = doneOf(tasks)
  const visibleTodos = filter ? todos.filter((t) => t.categoryId === filter) : todos

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) void reorderTodo(String(active.id), String(over.id))
  }

  return (
    <section
      className="flex w-[55%] flex-col gap-3 border-r border-gray-200 p-4 dark:border-gray-800"
      onClick={() => select(null)}
    >
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Today's Tasks</h2>
      <QuickAdd categories={categories} />
      <FilterChips categories={categories} active={filter} onChange={setFilter} />

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={visibleTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-1.5">
              {visibleTodos.map((t) => (
                <TaskCard key={t.id} task={t} categories={categories} selected={t.id === selectedId} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {visibleTodos.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            {todos.length === 0
              ? 'No tasks yet — add one above, e.g. "Plan week #management ~1".'
              : 'No tasks in this category.'}
          </p>
        )}

        {done.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setDoneOpen((v) => !v)}
              aria-expanded={doneOpen}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className={`transition-transform ${doneOpen ? 'rotate-90' : ''}`}>▸</span>
              Done ({done.length})
            </button>
            {doneOpen && (
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {done.map((t) => (
                  <TaskCard key={t.id} task={t} categories={categories} selected={t.id === selectedId} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <UndoToast />
    </section>
  )
}
