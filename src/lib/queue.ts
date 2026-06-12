import type { ID, Task } from '../types/models'

export interface QueueEntry {
  taskId: ID
  /** Focus sessions still to do. Tasks without an estimate always queue with 1. */
  remaining: number
}

/**
 * F-2.5: the session queue is built from today's unfinished tasks in day-plan
 * order. A task with an estimate occupies the queue until `estimate` focus
 * sessions are done; a task without an estimate stays queued until checked off.
 */
export function buildQueue(todos: Task[], focusCounts: Map<ID, number>): QueueEntry[] {
  return todos
    .filter((t) => t.status !== 'done')
    .map((t) => {
      const count = focusCounts.get(t.id) ?? 0
      const remaining = t.estimatePomos ? Math.max(t.estimatePomos - count, 0) : 1
      return { taskId: t.id, remaining }
    })
    .filter((e) => e.remaining > 0)
}
