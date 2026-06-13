import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useSettingsStore } from '../stores/useSettingsStore'
import { calcStreakWithFreezes, freezesAvailableThisWeek } from './stats'
import { toDayKey, todayKey } from './dates'

export interface TodayStats {
  activeMinutes: number
  sessionsCompleted: number
  streak: number
  freezesAvailable: number
}

/** F-2.8 daily progress: today's active minutes, completed sessions, streak. */
export function useTodayStats(): TodayStats {
  const dayStartHour = useSettingsStore((s) => s.settings.dayStartHour)
  const focus =
    useLiveQuery(
      () => db.sessions.filter((x) => x.type === 'focus' && (x.completed || x.counted)).toArray(),
      [],
    ) ?? []

  const today = todayKey(dayStartHour)
  const dayOf = (iso: string) => toDayKey(new Date(iso), dayStartHour)
  const todays = focus.filter((x) => dayOf(x.startedAt) === today)
  const { streak, frozenDays } = calcStreakWithFreezes(new Set(focus.map((x) => dayOf(x.startedAt))), today)

  return {
    activeMinutes: todays.reduce((sum, x) => sum + x.actualMinutes, 0),
    sessionsCompleted: todays.filter((x) => x.completed).length,
    streak,
    freezesAvailable: freezesAvailableThisWeek(frozenDays, today),
  }
}
