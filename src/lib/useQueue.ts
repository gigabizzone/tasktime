import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useTaskStore, todosOf } from '../stores/useTaskStore'
import { buildQueue, type QueueEntry } from './queue'
import type { ID, Task } from '../types/models'

export interface QueueItem extends QueueEntry {
  task: Task
}

/** Today's session queue (F-2.5), resolved to task objects for display. */
export function useQueue(): QueueItem[] {
  const tasks = useTaskStore((s) => s.tasks)
  const counts = useLiveQuery(async () => {
    const sessions = await db.sessions
      .filter((x) => x.type === 'focus' && (x.completed || x.counted))
      .toArray()
    const map = new Map<ID, number>()
    for (const x of sessions) map.set(x.taskId, (map.get(x.taskId) ?? 0) + 1)
    return map
  }, []) ?? new Map<ID, number>()

  const todos = todosOf(tasks)
  const byId = new Map(todos.map((t) => [t.id, t]))
  return buildQueue(todos, counts)
    .map((e) => ({ ...e, task: byId.get(e.taskId)! }))
    .filter((e) => e.task !== undefined)
}
