import { addDays, addYears, format, isBefore, isValid, parse, startOfDay } from 'date-fns'

export interface ParsedNaturalDate {
  date: string // 'yyyy-MM-dd'
  time?: string // 'HH:mm'
}

const DAY_WORDS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
}

const pad = (n: number) => String(n).padStart(2, '0')

/** '2pm', '2:30pm', '14:30' → 'HH:mm'. Bare numbers are rejected as ambiguous. */
export function parseTimeToken(token: string): string | null {
  const m = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!m) return null
  const ap = m[3]?.toLowerCase()
  if (!ap && m[2] === undefined) return null
  let h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return `${pad(h)}:${pad(min)}`
}

function nextWeekday(now: Date, target: number): Date {
  const diff = (target - now.getDay() + 7) % 7 || 7 // always upcoming, never today
  return addDays(now, diff)
}

/**
 * Interpret tokens like 'tomorrow 2pm', 'fri', 'next mon 9am', 'jun 15',
 * '2026-07-01 14:30', or a bare time ('2pm' → today). Returns null when
 * nothing is recognized.
 */
export function parseNaturalDate(input: string, now: Date): ParsedNaturalDate | null {
  const words = input.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return null
  if (words[0] === 'next') words.shift() // 'next mon' reads the same as 'mon'

  let date: Date | null = null
  let consumed = 0
  const today = startOfDay(now)

  const w0 = words[0]
  if (w0 === 'today' || w0 === 'tod') {
    date = today
    consumed = 1
  } else if (w0 === 'tomorrow' || w0 === 'tmrw' || w0 === 'tmr') {
    date = addDays(today, 1)
    consumed = 1
  } else if (w0 in DAY_WORDS) {
    date = nextWeekday(today, DAY_WORDS[w0])
    consumed = 1
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(w0)) {
    const d = parse(w0, 'yyyy-MM-dd', today)
    if (isValid(d)) {
      date = d
      consumed = 1
    }
  } else if (words.length >= 2) {
    // 'jun 15' or '15 jun' — roll to next year if already past
    for (const pattern of ['MMM d', 'd MMM']) {
      const d = parse(`${words[0]} ${words[1]}`, pattern, today)
      if (isValid(d)) {
        date = isBefore(d, today) ? addYears(d, 1) : d
        consumed = 2
        break
      }
    }
  }

  const timeToken = words.slice(consumed).join(' ')
  const time = timeToken ? parseTimeToken(timeToken) : null

  if (date === null && time === null) return null
  if (date === null && timeToken && words.length > (time ? consumed : 0) && !time) return null
  if (date !== null && timeToken && time === null) return null // trailing junk → not a date

  return {
    date: format(date ?? today, 'yyyy-MM-dd'),
    ...(time ? { time } : {}),
  }
}

/** 'Fri, Jun 19' + optional '2:00 PM' — for confirmation toasts. */
export function formatScheduleLabel(parsed: ParsedNaturalDate): string {
  const d = parse(parsed.date, 'yyyy-MM-dd', new Date())
  const day = format(d, 'EEE, MMM d')
  if (!parsed.time) return day
  const [h, m] = parsed.time.split(':').map(Number)
  const t = format(new Date(2000, 0, 1, h, m), 'h:mm a')
  return `${day} ${t}`
}
