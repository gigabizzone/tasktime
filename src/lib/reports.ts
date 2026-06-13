import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { toDayKey } from './dates'
import type { Category, Session, Task, WeekStart } from '../types/models'

export type RangeType = 'day' | 'week' | 'month' | 'year'

export interface RangeOpts {
  weekStartsOn: WeekStart
  dayStartHour: number
}

/** Active time is completed-or-counted focus minutes; breaks are excluded. */
export function isActiveFocus(s: Session): boolean {
  return s.type === 'focus' && (s.completed || s.counted)
}

/** A recorded focus session represents a *started* session (for completion rate). */
export function isStartedFocus(s: Session): boolean {
  return s.type === 'focus'
}

const dayKeyOf = (iso: string, dayStartHour: number) => toDayKey(parseISO(iso), dayStartHour)

function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

export interface Bucket {
  key: string
  label: string
}

/** Every bucket on the x-axis for the range, including empty ones. */
export function bucketsFor(type: RangeType, anchor: Date, weekStartsOn: WeekStart): Bucket[] {
  switch (type) {
    case 'day':
      return Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: hourLabel(h) }))
    case 'week': {
      const start = startOfWeek(anchor, { weekStartsOn })
      return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(start, i)
        return { key: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE') }
      })
    }
    case 'month': {
      const days = eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) })
      return days.map((d) => ({ key: format(d, 'yyyy-MM-dd'), label: format(d, 'd') }))
    }
    case 'year': {
      const start = startOfYear(anchor)
      return Array.from({ length: 12 }, (_, i) => {
        const m = addMonths(start, i)
        return { key: format(m, 'yyyy-MM'), label: format(m, 'MMM') }
      })
    }
  }
}

/** Is a day-plan key inside the selected range? */
export function inRange(dayKey: string, type: RangeType, anchor: Date, weekStartsOn: WeekStart): boolean {
  switch (type) {
    case 'day':
      return dayKey === format(anchor, 'yyyy-MM-dd')
    case 'week': {
      const start = format(startOfWeek(anchor, { weekStartsOn }), 'yyyy-MM-dd')
      const end = format(addDays(startOfWeek(anchor, { weekStartsOn }), 6), 'yyyy-MM-dd')
      return dayKey >= start && dayKey <= end
    }
    case 'month':
      return dayKey.slice(0, 7) === format(anchor, 'yyyy-MM')
    case 'year':
      return dayKey.slice(0, 4) === format(anchor, 'yyyy')
  }
}

function bucketKeyOf(s: Session, type: RangeType, dayKey: string): string {
  if (type === 'day') return String(parseISO(s.startedAt).getHours())
  if (type === 'year') return dayKey.slice(0, 7)
  return dayKey
}

export interface SeriesDatum {
  key: string
  label: string
  total: number
  byCategory: Record<string, number> // categoryId → minutes
}

/**
 * Active minutes per bucket, split by category — the stacked-bar source.
 * Day → per hour, Week → per weekday, Month → per day, Year → per month.
 */
export function getActiveTimeSeries(
  sessions: Session[],
  type: RangeType,
  anchor: Date,
  opts: RangeOpts,
): SeriesDatum[] {
  const buckets = bucketsFor(type, anchor, opts.weekStartsOn)
  const index = new Map(buckets.map((b, i) => [b.key, i]))
  const data: SeriesDatum[] = buckets.map((b) => ({ key: b.key, label: b.label, total: 0, byCategory: {} }))

  for (const s of sessions) {
    if (!isActiveFocus(s)) continue
    const dayKey = dayKeyOf(s.startedAt, opts.dayStartHour)
    if (!inRange(dayKey, type, anchor, opts.weekStartsOn)) continue
    const i = index.get(bucketKeyOf(s, type, dayKey))
    if (i === undefined) continue
    data[i].byCategory[s.categoryId] = (data[i].byCategory[s.categoryId] ?? 0) + s.actualMinutes
    data[i].total += s.actualMinutes
  }
  return data
}

export interface CategoryTotal {
  categoryId: string
  minutes: number
}

/** Active minutes per category for the range, sorted high → low. */
export function getCategoryTotals(
  sessions: Session[],
  type: RangeType,
  anchor: Date,
  opts: RangeOpts,
): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const s of sessions) {
    if (!isActiveFocus(s)) continue
    const dayKey = dayKeyOf(s.startedAt, opts.dayStartHour)
    if (!inRange(dayKey, type, anchor, opts.weekStartsOn)) continue
    totals.set(s.categoryId, (totals.get(s.categoryId) ?? 0) + s.actualMinutes)
  }
  return [...totals.entries()]
    .map(([categoryId, minutes]) => ({ categoryId, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

export interface SummaryStats {
  activeMinutes: number
  sessionsCompleted: number
  sessionsStarted: number
  completionRate: number // 0..1
  tasksDone: number
  interruptions: number
  bestFocusDayKey: string | null
  bestFocusDayMinutes: number
}

export function getSummaryStats(
  sessions: Session[],
  tasks: Task[],
  type: RangeType,
  anchor: Date,
  opts: RangeOpts,
): SummaryStats {
  let activeMinutes = 0
  let sessionsCompleted = 0
  let sessionsStarted = 0
  let interruptions = 0
  const perDay = new Map<string, number>()

  for (const s of sessions) {
    if (s.type !== 'focus') continue
    const dayKey = dayKeyOf(s.startedAt, opts.dayStartHour)
    if (!inRange(dayKey, type, anchor, opts.weekStartsOn)) continue
    sessionsStarted++
    if (s.completed) sessionsCompleted++
    if (isActiveFocus(s)) {
      activeMinutes += s.actualMinutes
      interruptions += s.interruptions.length
      perDay.set(dayKey, (perDay.get(dayKey) ?? 0) + s.actualMinutes)
    }
  }

  const tasksDone = tasks.filter(
    (t) =>
      t.completedAt && inRange(dayKeyOf(t.completedAt, opts.dayStartHour), type, anchor, opts.weekStartsOn),
  ).length

  let bestFocusDayKey: string | null = null
  let bestFocusDayMinutes = 0
  for (const [dayKey, minutes] of perDay) {
    if (minutes > bestFocusDayMinutes) {
      bestFocusDayMinutes = minutes
      bestFocusDayKey = dayKey
    }
  }

  return {
    activeMinutes,
    sessionsCompleted,
    sessionsStarted,
    completionRate: sessionsStarted > 0 ? sessionsCompleted / sessionsStarted : 0,
    tasksDone,
    interruptions,
    bestFocusDayKey,
    bestFocusDayMinutes,
  }
}

export interface EstimateRow {
  taskId: string
  title: string
  categoryId: string
  estimate: number
  actual: number
}

/** F-4.5: planned vs. actual Pomodoros for estimated tasks planned in the range. */
export function getEstimateAccuracy(
  sessions: Session[],
  tasks: Task[],
  type: RangeType,
  anchor: Date,
  opts: RangeOpts,
): EstimateRow[] {
  const actualByTask = new Map<string, number>()
  for (const s of sessions) {
    if (!isActiveFocus(s)) continue
    actualByTask.set(s.taskId, (actualByTask.get(s.taskId) ?? 0) + 1)
  }
  return tasks
    .filter((t) => t.estimatePomos && inRange(t.plannedDate, type, anchor, opts.weekStartsOn))
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      categoryId: t.categoryId,
      estimate: t.estimatePomos!,
      actual: actualByTask.get(t.id) ?? 0,
    }))
    .sort((a, b) => Math.abs(b.actual - b.estimate) - Math.abs(a.actual - a.estimate))
}

export interface Streaks {
  current: number
  best: number
}

/** Longest run of consecutive active days, anywhere in history. */
export function getBestStreak(activeDayKeys: Set<string>): number {
  if (activeDayKeys.size === 0) return 0
  const sorted = [...activeDayKeys].sort()
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1])
    const cur = parseISO(sorted[i])
    const gapDays = Math.round((cur.getTime() - prev.getTime()) / 86_400_000)
    run = gapDays === 1 ? run + 1 : 1
    if (run > best) best = run
  }
  return best
}

/** Day-plan keys that have any active focus time — for streak calculations. */
export function activeDayKeysOf(sessions: Session[], dayStartHour: number): Set<string> {
  const keys = new Set<string>()
  for (const s of sessions) {
    if (isActiveFocus(s)) keys.add(dayKeyOf(s.startedAt, dayStartHour))
  }
  return keys
}

/** F-4.6 heatmap source: active minutes per day for the whole year. */
export function getYearHeatmap(
  sessions: Session[],
  anchor: Date,
  dayStartHour: number,
): Map<string, number> {
  const year = format(anchor, 'yyyy')
  const map = new Map<string, number>()
  for (const s of sessions) {
    if (!isActiveFocus(s)) continue
    const dayKey = dayKeyOf(s.startedAt, dayStartHour)
    if (dayKey.slice(0, 4) !== year) continue
    map.set(dayKey, (map.get(dayKey) ?? 0) + s.actualMinutes)
  }
  return map
}

/** F-4.7: sessions in range as CSV rows (date, task, category, minutes, completed). */
export function toCSV(
  sessions: Session[],
  tasks: Task[],
  categories: Category[],
  type: RangeType,
  anchor: Date,
  opts: RangeOpts,
): string {
  const taskTitle = new Map(tasks.map((t) => [t.id, t.title]))
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

  const rows = sessions
    .filter((s) => s.type === 'focus')
    .filter((s) => inRange(dayKeyOf(s.startedAt, opts.dayStartHour), type, anchor, opts.weekStartsOn))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((s) =>
      [
        dayKeyOf(s.startedAt, opts.dayStartHour),
        esc(taskTitle.get(s.taskId) ?? '(deleted task)'),
        esc(catName.get(s.categoryId) ?? ''),
        String(s.actualMinutes),
        s.completed ? 'yes' : s.counted ? 'partial' : 'no',
      ].join(','),
    )

  return ['date,task,category,minutes,completed', ...rows].join('\n')
}
