import { format, parseISO, subDays } from 'date-fns'

const key = (d: Date) => format(d, 'yyyy-MM-dd')

/**
 * Current streak of consecutive active days. Today not yet active doesn't
 * break the streak — it counts back from yesterday instead.
 */
export function calcStreak(activeDays: Set<string>, today: string): number {
  let cursor = parseISO(today)
  if (!activeDays.has(today)) cursor = subDays(cursor, 1)
  let streak = 0
  while (activeDays.has(key(cursor))) {
    streak++
    cursor = subDays(cursor, 1)
  }
  return streak
}

export interface FreezeStreak {
  streak: number // active days in the (freeze-bridged) run
  frozenDays: string[] // missed days bridged by a freeze token
}

/**
 * Streak that survives single missed days using freeze tokens — value-add #4.
 * One token per ISO week; a token bridges exactly one missed day when the day
 * before it was active. Frozen days don't add to the count but keep the run alive.
 */
export function calcStreakWithFreezes(
  activeDays: Set<string>,
  today: string,
  perWeek = 1,
): FreezeStreak {
  let cursor = parseISO(today)
  if (!activeDays.has(today)) cursor = subDays(cursor, 1)
  let streak = 0
  const frozenDays: string[] = []
  const usedByWeek = new Map<string, number>()

  for (;;) {
    if (activeDays.has(key(cursor))) {
      streak++
      cursor = subDays(cursor, 1)
      continue
    }
    // cursor is a missed day — try to freeze it.
    const prevActive = activeDays.has(key(subDays(cursor, 1)))
    const week = format(cursor, 'RRRR-II') // ISO week-numbering year + week
    const used = usedByWeek.get(week) ?? 0
    if (prevActive && used < perWeek) {
      usedByWeek.set(week, used + 1)
      frozenDays.push(key(cursor))
      cursor = subDays(cursor, 1)
      continue
    }
    break
  }
  return { streak, frozenDays }
}

/** Freeze tokens still available in the ISO week containing `today`. */
export function freezesAvailableThisWeek(frozenDays: string[], today: string, perWeek = 1): number {
  const thisWeek = format(parseISO(today), 'RRRR-II')
  const usedThisWeek = frozenDays.filter((d) => format(parseISO(d), 'RRRR-II') === thisWeek).length
  return Math.max(0, perWeek - usedThisWeek)
}
