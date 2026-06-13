import { describe, it, expect } from 'vitest'
import {
  getActiveTimeSeries,
  getCategoryTotals,
  getSummaryStats,
  getEstimateAccuracy,
  getBestStreak,
  activeDayKeysOf,
  getYearHeatmap,
  toCSV,
  bucketsFor,
  inRange,
} from './reports'
import type { Category, Session, Task } from '../types/models'

const opts = { weekStartsOn: 1 as const, dayStartHour: 0 }

let n = 0
function session(partial: Partial<Session>): Session {
  return {
    id: `s${n++}`,
    taskId: 't1',
    categoryId: 'biz',
    type: 'focus',
    plannedMinutes: 25,
    actualMinutes: 25,
    startedAt: '2026-06-12T09:00:00',
    endedAt: '2026-06-12T09:25:00',
    completed: true,
    counted: true,
    interruptions: [],
    ...partial,
  }
}

const ANCHOR = new Date(2026, 5, 12) // Fri Jun 12 2026

describe('bucketsFor', () => {
  it('day → 24 hourly buckets', () => {
    const b = bucketsFor('day', ANCHOR, 1)
    expect(b).toHaveLength(24)
    expect(b[0]).toEqual({ key: '0', label: '12a' })
    expect(b[13]).toEqual({ key: '13', label: '1p' })
  })

  it('week → 7 days starting Monday', () => {
    const b = bucketsFor('week', ANCHOR, 1)
    expect(b).toHaveLength(7)
    expect(b[0].key).toBe('2026-06-08') // Monday of that week
    expect(b[0].label).toBe('Mon')
    expect(b[6].key).toBe('2026-06-14')
  })

  it('month → one bucket per day of the month', () => {
    const b = bucketsFor('month', ANCHOR, 1)
    expect(b).toHaveLength(30) // June
    expect(b[0].key).toBe('2026-06-01')
  })

  it('year → 12 months', () => {
    const b = bucketsFor('year', ANCHOR, 1)
    expect(b).toHaveLength(12)
    expect(b[0]).toEqual({ key: '2026-01', label: 'Jan' })
  })
})

describe('inRange', () => {
  it('day matches the exact dayKey', () => {
    expect(inRange('2026-06-12', 'day', ANCHOR, 1)).toBe(true)
    expect(inRange('2026-06-11', 'day', ANCHOR, 1)).toBe(false)
  })
  it('week spans Mon–Sun', () => {
    expect(inRange('2026-06-08', 'week', ANCHOR, 1)).toBe(true)
    expect(inRange('2026-06-14', 'week', ANCHOR, 1)).toBe(true)
    expect(inRange('2026-06-15', 'week', ANCHOR, 1)).toBe(false)
  })
  it('month and year compare prefixes', () => {
    expect(inRange('2026-06-30', 'month', ANCHOR, 1)).toBe(true)
    expect(inRange('2026-07-01', 'month', ANCHOR, 1)).toBe(false)
    expect(inRange('2026-12-31', 'year', ANCHOR, 1)).toBe(true)
    expect(inRange('2027-01-01', 'year', ANCHOR, 1)).toBe(false)
  })
})

describe('getActiveTimeSeries', () => {
  it('buckets a day by clock hour and stacks by category', () => {
    const series = getActiveTimeSeries(
      [
        session({ startedAt: '2026-06-12T09:30:00', categoryId: 'biz', actualMinutes: 25 }),
        session({ startedAt: '2026-06-12T09:45:00', categoryId: 'learn', actualMinutes: 20 }),
        session({ startedAt: '2026-06-12T14:00:00', categoryId: 'biz', actualMinutes: 50 }),
      ],
      'day',
      ANCHOR,
      opts,
    )
    const nine = series.find((d) => d.key === '9')!
    expect(nine.total).toBe(45)
    expect(nine.byCategory).toEqual({ biz: 25, learn: 20 })
    expect(series.find((d) => d.key === '14')!.total).toBe(50)
  })

  it('excludes breaks and abandoned sessions', () => {
    const series = getActiveTimeSeries(
      [
        session({ type: 'break', actualMinutes: 5 }),
        session({ completed: false, counted: false, actualMinutes: 10 }),
        session({ actualMinutes: 25 }),
      ],
      'day',
      ANCHOR,
      opts,
    )
    expect(series.reduce((sum, d) => sum + d.total, 0)).toBe(25)
  })

  it('counts partial counted sessions as active', () => {
    const series = getActiveTimeSeries(
      [session({ completed: false, counted: true, actualMinutes: 12 })],
      'day',
      ANCHOR,
      opts,
    )
    expect(series.reduce((sum, d) => sum + d.total, 0)).toBe(12)
  })

  it('buckets a week by weekday and ignores out-of-range sessions', () => {
    const series = getActiveTimeSeries(
      [
        session({ startedAt: '2026-06-08T10:00:00', actualMinutes: 25 }), // Mon
        session({ startedAt: '2026-06-12T10:00:00', actualMinutes: 50 }), // Fri
        session({ startedAt: '2026-06-15T10:00:00', actualMinutes: 25 }), // next Mon, out
      ],
      'week',
      ANCHOR,
      opts,
    )
    expect(series.find((d) => d.key === '2026-06-08')!.total).toBe(25)
    expect(series.find((d) => d.key === '2026-06-12')!.total).toBe(50)
    expect(series.reduce((sum, d) => sum + d.total, 0)).toBe(75)
  })

  it('buckets a year by month', () => {
    const series = getActiveTimeSeries(
      [
        session({ startedAt: '2026-01-15T10:00:00', actualMinutes: 25 }),
        session({ startedAt: '2026-06-12T10:00:00', actualMinutes: 50 }),
        session({ startedAt: '2025-12-31T10:00:00', actualMinutes: 25 }), // prior year
      ],
      'year',
      ANCHOR,
      opts,
    )
    expect(series.find((d) => d.key === '2026-01')!.total).toBe(25)
    expect(series.find((d) => d.key === '2026-06')!.total).toBe(50)
    expect(series.reduce((sum, d) => sum + d.total, 0)).toBe(75)
  })

  it('respects dayStartHour when bucketing into a day', () => {
    // 2 AM with dayStartHour 4 belongs to the previous day-plan
    const series = getActiveTimeSeries(
      [session({ startedAt: '2026-06-13T02:00:00', actualMinutes: 25 })],
      'day',
      ANCHOR, // Jun 12
      { weekStartsOn: 1, dayStartHour: 4 },
    )
    expect(series.reduce((sum, d) => sum + d.total, 0)).toBe(25)
    expect(series.find((d) => d.key === '2')!.total).toBe(25) // shown at clock hour 2
  })
})

describe('getCategoryTotals', () => {
  it('sums active minutes per category sorted high to low', () => {
    const totals = getCategoryTotals(
      [
        session({ categoryId: 'biz', actualMinutes: 25 }),
        session({ categoryId: 'learn', actualMinutes: 60 }),
        session({ categoryId: 'biz', actualMinutes: 25 }),
        session({ type: 'break', categoryId: 'biz', actualMinutes: 5 }),
      ],
      'day',
      ANCHOR,
      opts,
    )
    expect(totals).toEqual([
      { categoryId: 'learn', minutes: 60 },
      { categoryId: 'biz', minutes: 50 },
    ])
  })
})

describe('getSummaryStats', () => {
  it('computes active minutes, completion rate, interruptions, best day', () => {
    const sessions = [
      session({ startedAt: '2026-06-08T10:00:00', actualMinutes: 25, completed: true, interruptions: [{ at: 'x' }] }),
      session({ startedAt: '2026-06-12T10:00:00', actualMinutes: 50, completed: true }),
      session({ startedAt: '2026-06-12T11:00:00', actualMinutes: 10, completed: false, counted: false }), // abandoned, started
    ]
    const stats = getSummaryStats(sessions, [], 'week', ANCHOR, opts)
    expect(stats.activeMinutes).toBe(75)
    expect(stats.sessionsStarted).toBe(3)
    expect(stats.sessionsCompleted).toBe(2)
    expect(stats.completionRate).toBeCloseTo(2 / 3)
    expect(stats.interruptions).toBe(1)
    expect(stats.bestFocusDayKey).toBe('2026-06-12')
    expect(stats.bestFocusDayMinutes).toBe(50)
  })

  it('counts tasks completed within the range', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'a', categoryId: 'biz', status: 'done', plannedDate: '2026-06-12', order: 0, createdAt: '', completedAt: '2026-06-12T12:00:00' },
      { id: 't2', title: 'b', categoryId: 'biz', status: 'done', plannedDate: '2026-06-12', order: 1, createdAt: '', completedAt: '2026-07-01T12:00:00' },
    ]
    expect(getSummaryStats([], tasks, 'month', ANCHOR, opts).tasksDone).toBe(1)
  })

  it('completion rate is 0 with no started sessions', () => {
    expect(getSummaryStats([], [], 'day', ANCHOR, opts).completionRate).toBe(0)
  })
})

describe('getEstimateAccuracy', () => {
  it('pairs estimate with actual active sessions, worst error first', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'spot on', categoryId: 'biz', status: 'todo', estimatePomos: 2, plannedDate: '2026-06-12', order: 0, createdAt: '' },
      { id: 't2', title: 'underestimated', categoryId: 'biz', status: 'todo', estimatePomos: 1, plannedDate: '2026-06-12', order: 1, createdAt: '' },
      { id: 't3', title: 'no estimate', categoryId: 'biz', status: 'todo', plannedDate: '2026-06-12', order: 2, createdAt: '' },
    ]
    const sessions = [
      session({ taskId: 't1' }),
      session({ taskId: 't1' }),
      session({ taskId: 't2' }),
      session({ taskId: 't2' }),
      session({ taskId: 't2' }),
    ]
    const rows = getEstimateAccuracy(sessions, tasks, 'day', ANCHOR, opts)
    expect(rows).toHaveLength(2) // task without estimate excluded
    expect(rows[0]).toMatchObject({ taskId: 't2', estimate: 1, actual: 3 }) // biggest error first
    expect(rows[1]).toMatchObject({ taskId: 't1', estimate: 2, actual: 2 })
  })
})

describe('streaks and heatmap', () => {
  it('getBestStreak finds the longest consecutive run', () => {
    const days = new Set(['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-10', '2026-06-11'])
    expect(getBestStreak(days)).toBe(3)
    expect(getBestStreak(new Set())).toBe(0)
    expect(getBestStreak(new Set(['2026-06-01']))).toBe(1)
  })

  it('activeDayKeysOf collects only active focus days', () => {
    const keys = activeDayKeysOf(
      [
        session({ startedAt: '2026-06-12T09:00:00' }),
        session({ startedAt: '2026-06-12T10:00:00' }),
        session({ startedAt: '2026-06-13T09:00:00', type: 'break' }),
      ],
      0,
    )
    expect([...keys]).toEqual(['2026-06-12'])
  })

  it('getYearHeatmap sums daily minutes within the year', () => {
    const map = getYearHeatmap(
      [
        session({ startedAt: '2026-06-12T09:00:00', actualMinutes: 25 }),
        session({ startedAt: '2026-06-12T10:00:00', actualMinutes: 50 }),
        session({ startedAt: '2025-06-12T10:00:00', actualMinutes: 50 }), // other year
      ],
      ANCHOR,
      0,
    )
    expect(map.get('2026-06-12')).toBe(75)
    expect(map.has('2025-06-12')).toBe(false)
  })
})

describe('toCSV', () => {
  const categories: Category[] = [
    { id: 'biz', name: 'Business', color: '#000', archived: false, isDefault: true },
  ]
  const tasks: Task[] = [
    { id: 't1', title: 'Write, report', categoryId: 'biz', status: 'todo', plannedDate: '2026-06-12', order: 0, createdAt: '' },
  ]

  it('emits a header and escapes commas in fields', () => {
    const csv = toCSV(
      [session({ taskId: 't1', actualMinutes: 25, completed: true })],
      tasks,
      categories,
      'day',
      ANCHOR,
      opts,
    )
    const lines = csv.split('\n')
    expect(lines[0]).toBe('date,task,category,minutes,completed')
    expect(lines[1]).toBe('2026-06-12,"Write, report",Business,25,yes')
  })

  it('marks partial and abandoned sessions', () => {
    const csv = toCSV(
      [
        session({ taskId: 't1', completed: false, counted: true }),
        session({ taskId: 't1', completed: false, counted: false }),
      ],
      tasks,
      categories,
      'day',
      ANCHOR,
      opts,
    )
    const lines = csv.split('\n')
    expect(lines[1]).toContain(',partial')
    expect(lines[2]).toContain(',no')
  })
})
