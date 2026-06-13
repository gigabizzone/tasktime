import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useCategories } from './useCategories'
import { calcStreak } from './stats'
import { todayKey } from './dates'
import {
  activeDayKeysOf,
  getActiveTimeSeries,
  getBestStreak,
  getCategoryTotals,
  getEstimateAccuracy,
  getSummaryStats,
  getYearHeatmap,
  type RangeType,
  type SeriesDatum,
  type CategoryTotal,
  type SummaryStats,
  type EstimateRow,
} from './reports'
import type { Category, Session, Task } from '../types/models'

export interface ReportData {
  series: SeriesDatum[]
  categoryTotals: CategoryTotal[]
  summary: SummaryStats
  estimates: EstimateRow[]
  heatmap: Map<string, number>
  streaks: { current: number; best: number }
  categories: Category[]
  sessions: Session[] // all focus sessions (for CSV export, filtered there)
  tasks: Task[]
  loading: boolean
}

/**
 * Loads all sessions + tasks once and feeds the pure aggregation module.
 * Streaks span all history; everything else is range-scoped inside the
 * pure functions. Aggregation is memoized on the inputs.
 */
export function useReportData(type: RangeType, anchor: Date): ReportData {
  const settings = useSettingsStore((s) => s.settings)
  const categories = useCategories()
  const opts = useMemo(
    () => ({ weekStartsOn: settings.weekStartsOn, dayStartHour: settings.dayStartHour }),
    [settings.weekStartsOn, settings.dayStartHour],
  )

  const sessions = useLiveQuery(() => db.sessions.toArray(), [])
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const anchorKey = anchor.getTime()

  return useMemo(() => {
    const s = sessions ?? []
    const t = tasks ?? []
    const activeDays = activeDayKeysOf(s, opts.dayStartHour)
    return {
      series: getActiveTimeSeries(s, type, anchor, opts),
      categoryTotals: getCategoryTotals(s, type, anchor, opts),
      summary: getSummaryStats(s, t, type, anchor, opts),
      estimates: getEstimateAccuracy(s, t, type, anchor, opts),
      heatmap: getYearHeatmap(s, anchor, opts.dayStartHour),
      streaks: {
        current: calcStreak(activeDays, todayKey(opts.dayStartHour)),
        best: getBestStreak(activeDays),
      },
      categories,
      sessions: s,
      tasks: t,
      loading: sessions === undefined || tasks === undefined,
    }
    // anchorKey stands in for the anchor Date identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, tasks, type, anchorKey, opts, categories])
}
