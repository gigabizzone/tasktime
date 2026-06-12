import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { db } from '../db/db'
import type { Task } from '../types/models'

interface TaskState {
  dayKey: string | null // day currently loaded
  tasks: Task[] // ordered tasks for dayKey
  loadDay: (dayKey: string) => Promise<void>
  addTask: (title: string, categoryId: string) => Promise<void>
}

async function fetchDay(dayKey: string): Promise<Task[]> {
  return db.tasks.where('[plannedDate+order]').between([dayKey, -Infinity], [dayKey, Infinity]).toArray()
}

export const useTaskStore = create<TaskState>((set, get) => ({
  dayKey: null,
  tasks: [],

  loadDay: async (dayKey) => {
    set({ dayKey, tasks: await fetchDay(dayKey) })
  },

  // Minimal M1 version — quick-add tokens (#category, ~estimate, @date) land in M2.
  addTask: async (title, categoryId) => {
    const { dayKey, tasks } = get()
    if (!dayKey) return
    const task: Task = {
      id: nanoid(),
      title: title.trim(),
      categoryId,
      status: 'todo',
      plannedDate: dayKey,
      order: tasks.length > 0 ? Math.max(...tasks.map((t) => t.order)) + 1 : 0,
      createdAt: new Date().toISOString(),
    }
    await db.tasks.add(task)
    set({ tasks: await fetchDay(dayKey) })
  },
}))
