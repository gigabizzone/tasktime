import { format, subHours } from 'date-fns'

/**
 * Bucket a timestamp into its day-plan key ('YYYY-MM-DD'), respecting the
 * user's day start hour: with dayStartHour = 4, work at 2 AM counts toward
 * the previous day.
 */
export function toDayKey(date: Date, dayStartHour = 0): string {
  return format(subHours(date, dayStartHour), 'yyyy-MM-dd')
}

export function todayKey(dayStartHour = 0): string {
  return toDayKey(new Date(), dayStartHour)
}
