import { nanoid } from 'nanoid'
import { db } from './db'
import type { ID, Task } from '../types/models'

export interface NewTaskInput {
  title: string
  categoryId: ID
  estimatePomos?: number
  scheduledTime?: string
}

export async function fetchDay(dayKey: string): Promise<Task[]> {
  return db.tasks.where('plannedDate').equals(dayKey).sortBy('order')
}

async function nextOrder(dayKey: string): Promise<number> {
  const tasks = await fetchDay(dayKey)
  return tasks.length > 0 ? Math.max(...tasks.map((t) => t.order)) + 1 : 0
}

export async function addTaskOn(dayKey: string, input: NewTaskInput): Promise<Task> {
  const task: Task = {
    id: nanoid(),
    title: input.title.trim(),
    categoryId: input.categoryId,
    status: 'todo',
    estimatePomos: input.estimatePomos,
    scheduledTime: input.scheduledTime,
    plannedDate: dayKey,
    order: await nextOrder(dayKey),
    createdAt: new Date().toISOString(),
  }
  await db.tasks.add(task)
  return task
}

/** Moving to another day appends at the end of the target day's plan. */
export async function updateTask(id: ID, patch: Partial<Task>): Promise<void> {
  if (patch.plannedDate) {
    const existing = await db.tasks.get(id)
    if (existing && existing.plannedDate !== patch.plannedDate) {
      patch.order = await nextOrder(patch.plannedDate)
    }
  }
  await db.tasks.update(id, patch)
}

export async function setDone(id: ID, done: boolean): Promise<void> {
  await db.tasks.update(id, {
    status: done ? 'done' : 'todo',
    completedAt: done ? new Date().toISOString() : undefined,
  })
}

export async function deleteTask(id: ID): Promise<void> {
  await db.tasks.delete(id)
}

export async function restoreTask(task: Task): Promise<void> {
  await db.tasks.add(task)
}

/** Rewrite `order` as 0..n-1 following the given sequence. */
export async function persistOrder(ordered: Task[]): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    for (let i = 0; i < ordered.length; i++) {
      await db.tasks.update(ordered[i].id, { order: i })
    }
  })
}

/** Unfinished tasks planned before `dayKey` — the carry-over candidates (F-1.6). */
export async function pastUnfinished(dayKey: string): Promise<Task[]> {
  return db.tasks
    .where('plannedDate')
    .below(dayKey)
    .filter((t) => t.status !== 'done')
    .sortBy('plannedDate')
}

export async function carryOverTasks(ids: ID[], toDay: string): Promise<void> {
  for (const id of ids) {
    await updateTask(id, { plannedDate: toDay })
  }
}
