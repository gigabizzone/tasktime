import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { db } from '../db/db'
import type { ID, Task } from '../types/models'

export interface NewTaskInput {
  title: string
  categoryId: ID
  estimatePomos?: number
}

interface TaskState {
  dayKey: string | null
  tasks: Task[] // all tasks for dayKey (todo + done)
  selectedId: ID | null
  /** Task removed from the DB but still restorable via the undo toast. */
  pendingDelete: Task | null
  loadDay: (dayKey: string) => Promise<void>
  addTask: (input: NewTaskInput) => Promise<void>
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

async function fetchDay(dayKey: string): Promise<Task[]> {
  return db.tasks.where('plannedDate').equals(dayKey).sortBy('order')
}

export function todosOf(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== 'done')
}

export function doneOf(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
}

/** Rewrite `order` as 0..n-1 following the given sequence, then reload state. */
async function persistOrder(ordered: Task[]): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    for (let i = 0; i < ordered.length; i++) {
      await db.tasks.update(ordered[i].id, { order: i })
    }
  })
}

export const useTaskStore = create<TaskState>((set, get) => ({
  dayKey: null,
  tasks: [],
  selectedId: null,
  pendingDelete: null,

  loadDay: async (dayKey) => {
    set({ dayKey, tasks: await fetchDay(dayKey), selectedId: null })
  },

  addTask: async ({ title, categoryId, estimatePomos }) => {
    const { dayKey, tasks } = get()
    if (!dayKey || !title.trim()) return
    const task: Task = {
      id: nanoid(),
      title: title.trim(),
      categoryId,
      status: 'todo',
      estimatePomos,
      plannedDate: dayKey,
      order: tasks.length > 0 ? Math.max(...tasks.map((t) => t.order)) + 1 : 0,
      createdAt: new Date().toISOString(),
    }
    await db.tasks.add(task)
    set({ tasks: await fetchDay(dayKey) })
  },

  updateTask: async (id, patch) => {
    const { dayKey } = get()
    if (!dayKey) return
    if (patch.plannedDate && patch.plannedDate !== dayKey) {
      // Moving to another day: append at the end of that day's plan.
      const targetTasks = await fetchDay(patch.plannedDate)
      patch.order = targetTasks.length > 0 ? Math.max(...targetTasks.map((t) => t.order)) + 1 : 0
    }
    await db.tasks.update(id, patch)
    set({ tasks: await fetchDay(dayKey) })
  },

  toggleDone: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const done = task.status !== 'done'
    await get().updateTask(id, {
      status: done ? 'done' : 'todo',
      completedAt: done ? new Date().toISOString() : undefined,
    })
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
    await persistOrder(await fetchDay(dayKey))
    set({ tasks: await fetchDay(dayKey) })
  },

  moveToDate: async (id, targetDayKey) => {
    await get().updateTask(id, { plannedDate: targetDayKey })
  },

  deleteTask: async (id) => {
    const { dayKey, tasks, selectedId } = get()
    const task = tasks.find((t) => t.id === id)
    if (!dayKey || !task) return
    clearTimeout(undoTimer)
    await db.tasks.delete(id)
    set({
      tasks: await fetchDay(dayKey),
      pendingDelete: task,
      selectedId: selectedId === id ? null : selectedId,
    })
    undoTimer = setTimeout(() => set({ pendingDelete: null }), UNDO_WINDOW_MS)
  },

  undoDelete: async () => {
    const { dayKey, pendingDelete } = get()
    if (!dayKey || !pendingDelete) return
    clearTimeout(undoTimer)
    await db.tasks.add(pendingDelete)
    set({ tasks: await fetchDay(dayKey), pendingDelete: null })
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
    await persistOrder([...next, ...done])
    set({ tasks: await fetchDay(dayKey) })
  },

  moveBy: async (id, delta) => {
    const todos = todosOf(get().tasks)
    const idx = todos.findIndex((t) => t.id === id)
    const target = todos[idx + delta]
    if (idx === -1 || !target) return
    await get().reorderTodo(id, target.id)
  },

  select: (id) => set({ selectedId: id }),
}))
