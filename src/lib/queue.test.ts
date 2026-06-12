import { describe, it, expect } from 'vitest'
import { buildQueue } from './queue'
import type { Task } from '../types/models'

const task = (id: string, estimate?: number, status: Task['status'] = 'todo'): Task => ({
  id,
  title: id,
  categoryId: 'c',
  status,
  estimatePomos: estimate,
  plannedDate: '2026-06-12',
  order: 0,
  createdAt: '',
})

describe('buildQueue', () => {
  it('gives estimated tasks their remaining session count', () => {
    const queue = buildQueue([task('a', 3)], new Map([['a', 1]]))
    expect(queue).toEqual([{ taskId: 'a', remaining: 2 }])
  })

  it('drops tasks whose estimate is used up', () => {
    expect(buildQueue([task('a', 2)], new Map([['a', 2]]))).toEqual([])
  })

  it('keeps unestimated tasks queued regardless of session count', () => {
    expect(buildQueue([task('a')], new Map([['a', 5]]))).toEqual([{ taskId: 'a', remaining: 1 }])
  })

  it('excludes done tasks and preserves plan order', () => {
    const queue = buildQueue([task('a', 1, 'done'), task('b'), task('c', 2)], new Map())
    expect(queue.map((e) => e.taskId)).toEqual(['b', 'c'])
  })
})
