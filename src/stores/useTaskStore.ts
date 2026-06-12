import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { db } from '../db/db'
import * as ops from '../db/taskOps'
import type { ID, Task } from '../types/models'

export type { NewTaskInput } from '../db/taskOps'

interface TaskState {
  dayKey: string | null
  tasks: Task[] // all tasks for dayKey (todo + done)
  selectedId: ID | null
  /** Task removed from the DB but still restorable via the undo toast. */
  pendingDelete: Task | null
  loadDay: (dayKey: string) => Promise<void>
  /** Add to the loaded day, or to `targetDay` (quick-capture scheduling). */
  addTask: (input: ops.NewTaskInput, targetDay?: string) => Promise<void>
  updateTask: (id: ID, patch: Partial<Task>) => Promise<void>
  toggleDone: (id: ID) => Promise<void>
  duplicateTask: (id: ID) => Promise<void>
  moveToDate: (id: ID, dayKey: string) => Promise<void>
  deleteTask: (id: ID) => Promise<void>
  undoDelete: () => Promise<void>
  /** Move the dragged task to the position of the task it was dropped over. */
  reorderTodo: (activeId: ID, overId: ID) => Promise<void>
  /** Keyboard reorder: move a task up (-1) or down (+1) among todos. */
  moveBy: (id: ID, delta: -1 | 1) => Promise<void>
  select: (id: ID | null) => void
}

const UNDO_WINDOW_MS = 5000
let undoTimer: ReturnType<typeof setTimeout> | undefined

export function todosOf(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== 'done')
}

export function doneOf(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
}

/** Refresh the in-memory snapshot when an external edit touched the loaded day. */
export function syncIfLoaded(dayKey: string): void {
  const s = useTaskStore.getState()
  if (s.dayKey === dayKey) void s.loadDay(dayKey)
}

export const useTaskStore = create<TaskState>((set, get) => {
  const refresh = async () => {
    const { dayKey } = get()
    if (dayKey) set({ tasks: await ops.fetchDay(dayKey) })
  }

  return {
    dayKey: null,
    tasks: [],
    selectedId: null,
    pendingDelete: null,

    loadDay: async (dayKey) => {
      set({ dayKey, tasks: await ops.fetchDay(dayKey), selectedId: null })
    },

    addTask: async (input, targetDay) => {
      const day = targetDay ?? get().dayKey
      if (!day || !input.title.trim()) return
      await ops.addTaskOn(day, input)
      if (day === get().dayKey) await refresh()
    },

    updateTask: async (id, patch) => {
      await ops.updateTask(id, patch)
      await refresh()
    },

    toggleDone: async (id) => {
      const task = get().tasks.find((t) => t.id === id)
      if (!task) return
      await ops.setDone(id, task.status !== 'done')
      await refresh()
    },

    duplicateTask: async (id) => {
      const { dayKey, tasks } = get()
      const orig = tasks.find((t) => t.id === id)
      if (!dayKey || !orig) return
      const copy: Task = {
        ...orig,
        id: nanoid(),
        status: 'todo',
        completedAt: undefined,
        createdAt: new Date().toISOString(),
        order: orig.order + 0.5, // insert right after the original, then renumber
      }
      await db.tasks.add(copy)
      await ops.persistOrder(await ops.fetchDay(dayKey))
      await refresh()
    },

    moveToDate: async (id, targetDayKey) => {
      await get().updateTask(id, { plannedDate: targetDayKey })
    },

    deleteTask: async (id) => {
      const { tasks, selectedId } = get()
      const task = tasks.find((t) => t.id === id)
      if (!task) return
      clearTimeout(undoTimer)
      await ops.deleteTask(id)
      await refresh()
      set({ pendingDelete: task, selectedId: selectedId === id ? null : selectedId })
      undoTimer = setTimeout(() => set({ pendingDelete: null }), UNDO_WINDOW_MS)
    },

    undoDelete: async () => {
      const { pendingDelete } = get()
      if (!pendingDelete) return
      clearTimeout(undoTimer)
      await ops.restoreTask(pendingDelete)
      await refresh()
      set({ pendingDelete: null })
    },

    reorderTodo: async (activeId, overId) => {
      const { dayKey, tasks } = get()
      if (!dayKey || activeId === overId) return
      const todos = todosOf(tasks)
      const from = todos.findIndex((t) => t.id === activeId)
      const to = todos.findIndex((t) => t.id === overId)
      if (from === -1 || to === -1) return
      const next = [...todos]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      // Optimistic update so the drop doesn't flicker, then persist.
      const done = tasks.filter((t) => t.status === 'done')
      set({ tasks: [...next, ...done] })
      await ops.persistOrder([...next, ...done])
      await refresh()
    },

    moveBy: async (id, delta) => {
      const todos = todosOf(get().tasks)
      const idx = todos.findIndex((t) => t.id === id)
      const target = todos[idx + delta]
      if (idx === -1 || !target) return
      await get().reorderTodo(id, target.id)
    },

    select: (id) => set({ selectedId: id }),
  }
})
