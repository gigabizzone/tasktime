import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subHours,
  addHours,
} from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import * as ops from '../../db/taskOps'
import { syncIfLoaded } from '../../stores/useTaskStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useCategories } from '../../lib/useCategories'
import { toDayKey, todayKey } from '../../lib/dates'
import { formatMinutes } from '../../lib/format'
import { toast } from '../../stores/useToastStore'
import { DayPanel } from './DayPanel'

const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  return within.length > 0 ? within : closestCenter(args)
}

export function CalendarView() {
  const settings = useSettingsStore((s) => s.settings)
  const categories = useCategories()
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const today = todayKey(settings.dayStartHour)
  const [selectedDay, setSelectedDay] = useState<string | null>(today)

  const weekStartsOn = settings.weekStartsOn
  const gridStart =
    mode === 'month'
      ? startOfWeek(startOfMonth(anchor), { weekStartsOn })
      : startOfWeek(anchor, { weekStartsOn })
  const gridEnd =
    mode === 'month' ? endOfWeek(endOfMonth(anchor), { weekStartsOn }) : endOfWeek(anchor, { weekStartsOn })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const startKey = format(gridStart, 'yyyy-MM-dd')
  const endKey = format(gridEnd, 'yyyy-MM-dd')

  const rangeTasks =
    useLiveQuery(
      () => db.tasks.where('plannedDate').between(startKey, endKey, true, true).toArray(),
      [startKey, endKey],
    ) ?? []

  // Sessions bucketed by day-plan key; the ±1 day pad covers dayStartHour shifts.
  const activeByDay = useLiveQuery(
    async () => {
      const sessions = await db.sessions
        .where('startedAt')
        .between(
          subHours(gridStart, 24).toISOString(),
          addHours(gridEnd, 48).toISOString(),
        )
        .toArray()
      const map = new Map<string, number>()
      for (const s of sessions) {
        if (s.type !== 'focus' || !(s.completed || s.counted)) continue
        const key = toDayKey(new Date(s.startedAt), settings.dayStartHour)
        map.set(key, (map.get(key) ?? 0) + s.actualMinutes)
      }
      return map
    },
    [startKey, endKey, settings.dayStartHour],
  ) ?? new Map<string, number>()

  const dotsByDay = new Map<string, string[]>()
  for (const t of rangeTasks) {
    const color = categories.find((c) => c.id === t.categoryId)?.color ?? '#6B7280'
    const list = dotsByDay.get(t.plannedDate) ?? []
    if (!list.includes(color)) list.push(color)
    dotsByDay.set(t.plannedDate, list)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const dayTasks =
    useLiveQuery(() => (selectedDay ? ops.fetchDay(selectedDay) : Promise.resolve([])), [selectedDay]) ?? []

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || !selectedDay) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (overId.startsWith('cal-')) {
      const target = overId.slice(4)
      if (target === selectedDay) return
      await ops.updateTask(activeId, { plannedDate: target })
      syncIfLoaded(selectedDay)
      syncIfLoaded(target)
      toast(`Moved to ${format(parseISO(target), 'EEE, MMM d')}`)
      return
    }
    if (activeId === overId) return
    const todos = dayTasks.filter((t) => t.status !== 'done')
    const from = todos.findIndex((t) => t.id === activeId)
    const to = todos.findIndex((t) => t.id === overId)
    if (from === -1 || to === -1) return
    const next = [...todos]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    await ops.persistOrder([...next, ...dayTasks.filter((t) => t.status === 'done')])
    syncIfLoaded(selectedDay)
  }

  const step = (dir: 1 | -1) =>
    setAnchor((a) => (mode === 'month' ? addMonths(a, dir) : addWeeks(a, dir)))

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={(e) => void onDragEnd(e)}>
      <div className="flex min-h-0 w-full flex-col md:flex-row">
        <section className="flex min-h-0 flex-[2] flex-col gap-3 overflow-y-auto p-4">
          <div className="flex items-center gap-2">
            <button onClick={() => step(-1)} aria-label="Previous" className="rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800">‹</button>
            <h2 className="w-44 text-center text-sm font-semibold">
              {mode === 'month'
                ? format(anchor, 'MMMM yyyy')
                : `${format(gridStart, 'MMM d')} – ${format(gridEnd, 'MMM d, yyyy')}`}
            </h2>
            <button onClick={() => step(1)} aria-label="Next" className="rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800">›</button>
            <button
              onClick={() => { setAnchor(new Date()); setSelectedDay(today) }}
              className="rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              Today
            </button>
            <div className="ml-auto flex gap-1 rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-gray-800">
              {(['month', 'week'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`rounded-md px-2.5 py-1 capitalize ${
                    mode === m ? 'bg-white font-medium shadow dark:bg-gray-700' : 'text-gray-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px text-center text-xs text-gray-400">
            {days.slice(0, 7).map((d) => (
              <div key={d.toISOString()} className="py-1">{format(d, 'EEE')}</div>
            ))}
          </div>

          <div className={`grid flex-1 grid-cols-7 gap-1 ${mode === 'week' ? 'auto-rows-fr' : ''}`}>
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd')
              return (
                <CalendarCell
                  key={key}
                  dayKey={key}
                  label={format(d, 'd')}
                  inMonth={mode === 'week' || isSameMonth(d, anchor)}
                  isToday={key === today}
                  selected={key === selectedDay}
                  dots={dotsByDay.get(key) ?? []}
                  activeMinutes={activeByDay.get(key) ?? 0}
                  tall={mode === 'week'}
                  taskTitles={
                    mode === 'week'
                      ? rangeTasks.filter((t) => t.plannedDate === key).slice(0, 3).map((t) => t.title)
                      : []
                  }
                  onSelect={() => setSelectedDay(key)}
                />
              )
            })}
          </div>
        </section>

        {selectedDay && (
          <DayPanel
            dayKey={selectedDay}
            tasks={dayTasks}
            categories={categories}
            isPast={selectedDay < today}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </div>
    </DndContext>
  )
}

interface CellProps {
  dayKey: string
  label: string
  inMonth: boolean
  isToday: boolean
  selected: boolean
  dots: string[]
  activeMinutes: number
  tall: boolean
  taskTitles: string[]
  onSelect: () => void
}

function CalendarCell(props: CellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `cal-${props.dayKey}` })
  return (
    <button
      ref={setNodeRef}
      onClick={props.onSelect}
      className={`flex flex-col items-start gap-1 rounded-lg border p-1.5 text-left text-xs transition-colors ${
        props.tall ? 'min-h-32' : 'min-h-16'
      } ${props.inMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 opacity-50 dark:bg-gray-950'} ${
        props.selected
          ? 'border-blue-400 ring-1 ring-blue-400'
          : isOver
            ? 'border-blue-300 ring-2 ring-blue-300'
            : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          props.isToday ? 'bg-blue-500 font-semibold text-white' : ''
        }`}
      >
        {props.label}
      </span>
      {props.dots.length > 0 && (
        <span className="flex flex-wrap gap-0.5">
          {props.dots.slice(0, 5).map((color) => (
            <span key={color} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </span>
      )}
      {props.taskTitles.map((t, i) => (
        <span key={i} className="w-full truncate text-[11px] text-gray-500 dark:text-gray-400">{t}</span>
      ))}
      {props.activeMinutes > 0 && (
        <span className="mt-auto text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          {formatMinutes(props.activeMinutes)}
        </span>
      )}
    </button>
  )
}
