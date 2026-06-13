import { eachDayOfInterval, endOfYear, format, getDay, startOfYear } from 'date-fns'
import { formatMinutes } from '../../lib/format'
import type { WeekStart } from '../../types/models'

interface Props {
  anchor: Date
  data: Map<string, number> // dayKey → active minutes
  weekStartsOn: WeekStart
}

const LEVELS = ['bg-gray-100 dark:bg-gray-800', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-500', 'bg-emerald-700']

function level(minutes: number): number {
  if (minutes <= 0) return 0
  if (minutes < 30) return 1
  if (minutes < 60) return 2
  if (minutes < 120) return 3
  return 4
}

/** F-4.6: GitHub-style calendar heatmap of daily active minutes. */
export function YearHeatmap({ anchor, data, weekStartsOn }: Props) {
  const days = eachDayOfInterval({ start: startOfYear(anchor), end: endOfYear(anchor) })
  const offset = (getDay(days[0]) - weekStartsOn + 7) % 7

  // Pad the first column so the grid aligns to the chosen week start.
  const cells: Array<{ key: string; minutes: number } | null> = [
    ...Array.from({ length: offset }, () => null),
    ...days.map((d) => {
      const key = format(d, 'yyyy-MM-dd')
      return { key, minutes: data.get(key) ?? 0 }
    }),
  ]

  const weeks: Array<typeof cells> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, di) =>
              cell ? (
                <span
                  key={cell.key}
                  title={`${cell.key}: ${formatMinutes(cell.minutes)}`}
                  className={`h-3 w-3 rounded-sm ${LEVELS[level(cell.minutes)]}`}
                />
              ) : (
                <span key={`pad-${wi}-${di}`} className="h-3 w-3" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <span>Less</span>
        {LEVELS.map((l, i) => (
          <span key={i} className={`h-3 w-3 rounded-sm ${l}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
