import { format, parseISO, subDays } from 'date-fns'

/**
 * Current streak of consecutive active days. Today not yet active doesn't
 * break the streak — it counts back from yesterday instead.
 */
export function calcStreak(activeDays: Set<string>, today: string): number {
  let cursor = parseISO(today)
  if (!activeDays.has(today)) cursor = subDays(cursor, 1)
  let streak = 0
  while (activeDays.has(format(cursor, 'yyyy-MM-dd'))) {
    streak++
    cursor = subDays(cursor, 1)
  }
  return streak
}
