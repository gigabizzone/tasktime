import { useEffect, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import {
  useTimerStore,
  plannedMinutesOf,
  remainingMsOf,
  LONG_BREAK_MINUTES,
} from '../../stores/useTimerStore'
import { useNow } from '../../lib/useNow'
import { useQueue } from '../../lib/useQueue'
import { formatClock } from '../../lib/format'
import { TimerRing } from './TimerRing'
import { ProgressStrip } from './ProgressStrip'
import { SessionQueue } from './SessionQueue'
import { DurationPickers } from './DurationPickers'

export const TIMER_DROP_ID = 'timer-dropzone'

const BTN = 'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors'
const BTN_PRIMARY = `${BTN} bg-blue-500 text-white hover:bg-blue-600`
const BTN_QUIET = `${BTN} bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`

export function TimerPanel() {
  const timer = useTimerStore()
  const running = timer.status === 'running'
  const now = useNow(running)

  const task = useLiveQuery(
    () => (timer.taskId ? db.tasks.get(timer.taskId) : undefined),
    [timer.taskId],
  )
  const category = useLiveQuery(
    () => (task ? db.categories.get(task.categoryId) : undefined),
    [task?.categoryId],
  )

  const queue = useQueue()
  const [showPickTask, setShowPickTask] = useState(false)
  const [interruptOpen, setInterruptOpen] = useState(false)
  const [interruptNote, setInterruptNote] = useState('')

  const isBreak = timer.type === 'break'
  const plannedMs = plannedMinutesOf(timer) * 60_000
  const remaining = timer.status === 'idle' ? plannedMs : Math.max(0, remainingMsOf(timer, now))
  const progress = 1 - remaining / plannedMs
  const color = isBreak ? '#22C55E' : (category?.color ?? '#9CA3AF')

  // Finalize the session the moment time runs out (F-2.4).
  useEffect(() => {
    if (running) void timer.checkCompletion(now)
  }, [running, now, timer])

  // Live countdown in the tab title, e.g. "(17:42) Send proposal — FocusFlow".
  useEffect(() => {
    document.title =
      timer.status === 'idle'
        ? 'FocusFlow'
        : `(${formatClock(remaining)}) ${isBreak ? 'Break' : (task?.title ?? 'Focus')} — FocusFlow`
    return () => {
      document.title = 'FocusFlow'
    }
  }, [timer.status, remaining, isBreak, task?.title])

  // Esc leaves focus mode (F-2.7).
  useEffect(() => {
    if (!timer.focusMode) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && timer.toggleFocusMode(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [timer.focusMode, timer])

  const { setNodeRef, isOver } = useDroppable({ id: TIMER_DROP_ID })

  const onStart = () => {
    if (timer.type === 'focus' && !timer.taskId) {
      setShowPickTask(true)
      return
    }
    setShowPickTask(false)
    timer.start()
  }

  const ring = (
    <TimerRing progress={progress} color={color}>
      <span className="text-5xl font-semibold tabular-nums">{formatClock(remaining)}</span>
      {isBreak ? (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {timer.nextBreakIsLong ? `Long break (${LONG_BREAK_MINUTES} min)` : 'Break'}
        </span>
      ) : task ? (
        <span className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{task.title}</span>
      ) : (
        <span className="text-sm text-gray-400">Drop a task here or press ▶ on a task</span>
      )}
      {timer.interruptions.length > 0 && (
        <span className="text-xs text-amber-500">⚡ {timer.interruptions.length} interruption{timer.interruptions.length === 1 ? '' : 's'}</span>
      )}
    </TimerRing>
  )

  const controls = timer.pendingPartial ? (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
      <span>
        Count this session? <strong>{timer.pendingPartial.actualMinutes} min</strong> elapsed of{' '}
        {timer.pendingPartial.plannedMinutes}.
      </span>
      <div className="flex gap-2">
        <button className={BTN_PRIMARY} onClick={() => void timer.resolvePartial(true)}>
          Count it
        </button>
        <button className={BTN_QUIET} onClick={() => void timer.resolvePartial(false)}>
          Discard
        </button>
      </div>
    </div>
  ) : timer.status === 'idle' ? (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        <button className={BTN_PRIMARY} onClick={onStart}>
          {isBreak ? `Start ${timer.nextBreakIsLong ? 'long ' : ''}break` : 'Start'}
        </button>
        {isBreak && (
          <button className={BTN_QUIET} onClick={() => void timer.skip()}>
            Skip break
          </button>
        )}
      </div>
      {showPickTask && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm dark:border-blue-700 dark:bg-blue-950">
          <span>Pick a task first.</span>
          {queue.length > 0 ? (
            <button
              className={BTN_PRIMARY}
              onClick={() => {
                timer.assignTask(queue[0].taskId)
                setShowPickTask(false)
                timer.start()
              }}
            >
              ▶ {queue[0].task.title}
            </button>
          ) : (
            <span className="text-gray-500">Add a task in the left panel.</span>
          )}
        </div>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        {timer.status === 'running' ? (
          <button className={BTN_PRIMARY} onClick={timer.pause}>
            Pause
          </button>
        ) : (
          <button className={BTN_PRIMARY} onClick={timer.resume}>
            Resume
          </button>
        )}
        <button className={BTN_QUIET} onClick={() => void timer.skip()} title="End early">
          Skip
        </button>
        <button className={BTN_QUIET} onClick={timer.cancel} title="Discard this session">
          Cancel
        </button>
      </div>
      {running && !isBreak && (
        <div className="flex items-center gap-2">
          <button
            className="text-xs text-amber-600 hover:underline dark:text-amber-400"
            onClick={() => setInterruptOpen((v) => !v)}
          >
            + Interruption
          </button>
          {interruptOpen && (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={interruptNote}
                onChange={(e) => setInterruptNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    timer.addInterruption(interruptNote)
                    setInterruptNote('')
                    setInterruptOpen(false)
                  }
                  if (e.key === 'Escape') setInterruptOpen(false)
                }}
                placeholder="What happened? (optional)"
                className="rounded-md border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800"
              />
              <button
                className="text-xs font-medium text-amber-600 dark:text-amber-400"
                onClick={() => {
                  timer.addInterruption(interruptNote)
                  setInterruptNote('')
                  setInterruptOpen(false)
                }}
              >
                Log
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )

  if (timer.focusMode) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-gray-950/95 text-gray-100">
        <div className="dark">
          {ring}
        </div>
        <div className="dark flex flex-col items-center gap-2">{controls}</div>
        <p className="text-xs text-gray-500">Esc to exit focus mode</p>
      </div>
    )
  }

  return (
    <section className="flex w-[45%] min-w-0 flex-col items-center gap-4 overflow-y-auto p-4">
      <ProgressStrip />
      <div
        ref={setNodeRef}
        className={`rounded-full transition-shadow ${isOver ? 'ring-4 ring-blue-400 ring-offset-2 dark:ring-offset-gray-950' : ''}`}
      >
        {ring}
      </div>
      {controls}
      <DurationPickers />
      <button
        onClick={() => timer.toggleFocusMode(true)}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="Hide everything except the timer (Esc exits)"
      >
        ⛶ Focus mode
      </button>
      <SessionQueue />
    </section>
  )
}
