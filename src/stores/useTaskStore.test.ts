import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/db'
import { useTaskStore, todosOf, doneOf } from './useTaskStore'

const DAY = '2026-06-12'
const store = () => useTaskStore.getState()

async function addTitled(...titles: string[]) {
  for (const title of titles) {
    await store().addTask({ title, categoryId: 'cat1' })
  }
}

describe('useTaskStore', () => {
  beforeEach(async () => {
    await db.tasks.clear()
    useTaskStore.setState({ dayKey: null, tasks: [], selectedId: null, pendingDelete: null })
    await store().loadDay(DAY)
  })

  it('adds tasks with sequential order for the loaded day', async () => {
    await addTitled('a', 'b', 'c')
    const { tasks } = store()
    expect(tasks.map((t) => t.title)).toEqual(['a', 'b', 'c'])
    expect(tasks.map((t) => t.order)).toEqual([0, 1, 2])
    expect(tasks.every((t) => t.plannedDate === DAY && t.status === 'todo')).toBe(true)
  })

  it('toggleDone sets status and completedAt, and reopen clears them', async () => {
    await addTitled('a')
    const id = store().tasks[0].id
    await store().toggleDone(id)
    expect(store().tasks[0].status).toBe('done')
    expect(store().tasks[0].completedAt).toBeTruthy()
    await store().toggleDone(id)
    expect(store().tasks[0].status).toBe('todo')
    expect(store().tasks[0].completedAt).toBeUndefined()
  })

  it('deleteTask removes from DB and undoDelete restores', async () => {
    await addTitled('a', 'b')
    const id = store().tasks[0].id
    await store().deleteTask(id)
    expect(store().tasks).toHaveLength(1)
    expect(store().pendingDelete?.title).toBe('a')
    expect(await db.tasks.get(id)).toBeUndefined()

    await store().undoDelete()
    expect(store().pendingDelete).toBeNull()
    expect(store().tasks.map((t) => t.title)).toEqual(['a', 'b'])
    expect(await db.tasks.get(id)).toBeDefined()
  })

  it('reorderTodo moves a task and persists order across reload', async () => {
    await addTitled('a', 'b', 'c')
    const [a, , c] = store().tasks
    await store().reorderTodo(a.id, c.id) // drag 'a' onto 'c'
    expect(store().tasks.map((t) => t.title)).toEqual(['b', 'c', 'a'])

    await store().loadDay(DAY) // simulate refresh
    expect(store().tasks.map((t) => t.title)).toEqual(['b', 'c', 'a'])
  })

  it('moveBy swaps with the neighbor and ignores out-of-range moves', async () => {
    await addTitled('a', 'b')
    const [a] = store().tasks
    await store().moveBy(a.id, 1)
    expect(store().tasks.map((t) => t.title)).toEqual(['b', 'a'])
    await store().moveBy(a.id, 1) // already last — no-op
    expect(store().tasks.map((t) => t.title)).toEqual(['b', 'a'])
  })

  it('duplicateTask inserts the copy right after the original as todo', async () => {
    await addTitled('a', 'b')
    const [a] = store().tasks
    await store().toggleDone(a.id)
    await store().duplicateTask(a.id)
    const titles = store().tasks.map((t) => `${t.title}:${t.status}`)
    expect(titles).toContain('a:done')
    expect(titles).toContain('a:todo')
    expect(store().tasks).toHaveLength(3)
  })

  it('moveToDate moves the task to the end of the target day plan', async () => {
    await addTitled('a', 'b')
    const [a] = store().tasks
    await store().moveToDate(a.id, '2026-06-13')
    expect(store().tasks.map((t) => t.title)).toEqual(['b'])
    const moved = await db.tasks.get(a.id)
    expect(moved?.plannedDate).toBe('2026-06-13')
  })

  it('todosOf/doneOf split and sort correctly', async () => {
    await addTitled('a', 'b', 'c')
    const [a, b] = store().tasks
    await store().toggleDone(a.id)
    await store().toggleDone(b.id)
    expect(todosOf(store().tasks).map((t) => t.title)).toEqual(['c'])
    expect(doneOf(store().tasks)).toHaveLength(2)
  })
})
