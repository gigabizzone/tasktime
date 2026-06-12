import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { db } from '../db/db'
import {
  BREAK_MINUTES,
  type ID,
  type Interruption,
  type Session,
  type SessionType,
} from '../types/models'
import { useSettingsStore } from './useSettingsStore'
import { buildQueue } from '../lib/queue'
import { todayKey } from '../lib/dates'
import { playChime } from '../lib/sound'
import { notify, requestNotificationPermission } from '../lib/notify'

export type TimerStatus = 'idle' | 'running' | 'paused'

export const LONG_BREAK_MINUTES = Math.max(...BREAK_MINUTES)

export interface PendingPartial {
  taskId: ID
  plannedMinutes: number
  actualMinutes: number
  startedAt: string
  endedAt: string
  interruptions: Interruption[]
}

interface TimerData {
  status: TimerStatus
  type: SessionType
  taskId: ID | null
  focusMinutes: number // last-used focus duration (F-2.1 default)
  breakMinutes: number // last-used break duration
  nextBreakIsLong: boolean
  startedAt: number | null // epoch ms of the latest start/resume
  sessionStartISO: string | null // wall-clock start of the whole session
  elapsedBeforePauseMs: number
  completedFocusCount: number // toward the long-break suggestion
  interruptions: Interruption[] // logged during the current session
  pendingPartial: PendingPartial | null // "Count this session?" prompt
  focusMode: boolean
}

interface TimerState extends TimerData {
  assignTask: (taskId: ID | null) => void
  setFocusMinutes: (minutes: number) => void
  setBreakMinutes: (minutes: number) => void
  start: () => void
  pause: () => void
  resume: () => void
  /** End early. Focus ≥1 min → count/discard prompt; break → straight back to focus. */
  skip: () => Promise<void>
  /** Discard the session entirely (or dismiss an offered break). */
  cancel: () => void
  resolvePartial: (countIt: boolean) => Promise<void>
  addInterruption: (note?: string) => void
  /** Called on every tick; finalizes the session once time is up. */
  checkCompletion: (now?: number) => Promise<void>
  /** Called once on boot: finalize a session that completed while the app was closed. */
  recover: () => Promise<void>
  advanceQueue: () => Promise<void>
  toggleFocusMode: (on?: boolean) => void
}

export function plannedMinutesOf(
  s: Pick<TimerData, 'type' | 'focusMinutes' | 'breakMinutes' | 'nextBreakIsLong'>,
): number {
  if (s.type === 'focus') return s.focusMinutes
  return s.nextBreakIsLong ? LONG_BREAK_MINUTES : s.breakMinutes
}

export function elapsedMsOf(
  s: Pick<TimerData, 'startedAt' | 'elapsedBeforePauseMs'>,
  now = Date.now(),
): number {
  return s.elapsedBeforePauseMs + (s.startedAt !== null ? Math.max(0, now - s.startedAt) : 0)
}

export function remainingMsOf(
  s: Pick<TimerData, 'type' | 'focusMinutes' | 'breakMinutes' | 'nextBreakIsLong' | 'startedAt' | 'elapsedBeforePauseMs'>,
  now = Date.now(),
): number {
  return plannedMinutesOf(s) * 60_000 - elapsedMsOf(s, now)
}

async function recordSession(input: Omit<Session, 'id' | 'categoryId'>): Promise<void> {
  const task = await db.tasks.get(input.taskId)
  await db.sessions.add({ id: nanoid(), categoryId: task?.categoryId ?? '', ...input })
}

const IDLE_RESET = {
  status: 'idle' as TimerStatus,
  startedAt: null,
  sessionStartISO: null,
  elapsedBeforePauseMs: 0,
  interruptions: [] as Interruption[],
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => {
      const settings = () => useSettingsStore.getState().settings

      const completeFocus = async (now: number, opts: { offerBreak: boolean }) => {
        const s = get()
        const planned = plannedMinutesOf(s)
        const count = s.completedFocusCount + 1
        const long = settings().longBreakEvery > 0 && count % settings().longBreakEvery === 0
        const autoBreak = opts.offerBreak && settings().autoStartBreak
        set({
          ...IDLE_RESET,
          type: 'break',
          nextBreakIsLong: long,
          completedFocusCount: count,
          ...(autoBreak
            ? { status: 'running' as TimerStatus, startedAt: now, sessionStartISO: new Date(now).toISOString() }
            : {}),
        })
        await recordSession({
          taskId: s.taskId!,
          type: 'focus',
          plannedMinutes: planned,
          actualMinutes: planned,
          startedAt: s.sessionStartISO!,
          endedAt: new Date(now).toISOString(),
          completed: true,
          counted: true,
          interruptions: s.interruptions,
        })
        if (settings().soundEnabled) playChime(settings().soundVolume)
        if (settings().notificationsEnabled)
          notify('Focus session complete', long ? 'Time for a long break!' : 'Time for a break.')
      }

      const completeBreak = async (now: number, opts: { advance: boolean }) => {
        const s = get()
        const planned = plannedMinutesOf(s)
        set({ ...IDLE_RESET, type: 'focus', nextBreakIsLong: false })
        if (s.taskId && s.sessionStartISO) {
          await recordSession({
            taskId: s.taskId,
            type: 'break',
            plannedMinutes: planned,
            actualMinutes: planned,
            startedAt: s.sessionStartISO,
            endedAt: new Date(now).toISOString(),
            completed: true,
            counted: true,
            interruptions: [],
          })
        }
        if (settings().soundEnabled) playChime(settings().soundVolume)
        if (settings().notificationsEnabled) notify('Break finished', 'Ready for the next session?')
        if (opts.advance && settings().autoAdvanceQueue) await get().advanceQueue()
      }

      return {
        status: 'idle',
        type: 'focus',
        taskId: null,
        focusMinutes: 25,
        breakMinutes: 5,
        nextBreakIsLong: false,
        startedAt: null,
        sessionStartISO: null,
        elapsedBeforePauseMs: 0,
        completedFocusCount: 0,
        interruptions: [],
        pendingPartial: null,
        focusMode: false,

        assignTask: (taskId) => {
          if (get().status === 'idle') set({ taskId })
          else set({ taskId: get().taskId ?? taskId }) // never swap mid-session
        },
        setFocusMinutes: (focusMinutes) => {
          if (get().status === 'idle') set({ focusMinutes })
        },
        setBreakMinutes: (breakMinutes) => {
          if (get().status === 'idle') set({ breakMinutes, nextBreakIsLong: false })
        },

        start: () => {
          const s = get()
          if (s.status !== 'idle') return
          if (s.type === 'focus' && !s.taskId) return // UI shows the "Pick a task" prompt
          if (settings().notificationsEnabled) void requestNotificationPermission()
          const now = Date.now()
          set({
            status: 'running',
            startedAt: now,
            sessionStartISO: new Date(now).toISOString(),
            elapsedBeforePauseMs: 0,
            interruptions: [],
          })
          if (s.type === 'focus' && s.taskId) {
            void db.tasks
              .where('id')
              .equals(s.taskId)
              .filter((t) => t.status === 'todo')
              .modify({ status: 'in_progress' })
          }
        },

        pause: () => {
          const s = get()
          if (s.status !== 'running' || s.startedAt === null) return
          set({
            status: 'paused',
            elapsedBeforePauseMs: elapsedMsOf(s),
            startedAt: null,
          })
        },

        resume: () => {
          if (get().status !== 'paused') return
          set({ status: 'running', startedAt: Date.now() })
        },

        skip: async () => {
          const s = get()
          if (s.status === 'idle') {
            if (s.type === 'break') set({ type: 'focus', nextBreakIsLong: false })
            return
          }
          const now = Date.now()
          const elapsed = elapsedMsOf(s, now)
          const planned = plannedMinutesOf(s)

          if (s.type === 'break') {
            set({ ...IDLE_RESET, type: 'focus', nextBreakIsLong: false })
            if (s.taskId && s.sessionStartISO && elapsed >= 60_000) {
              await recordSession({
                taskId: s.taskId,
                type: 'break',
                plannedMinutes: planned,
                actualMinutes: Math.round(elapsed / 60_000),
                startedAt: s.sessionStartISO,
                endedAt: new Date(now).toISOString(),
                completed: false,
                counted: false,
                interruptions: [],
              })
            }
            if (settings().autoAdvanceQueue) await get().advanceQueue()
            return
          }

          // Focus ended early: <1 min is just discarded, otherwise ask (F-2.4).
          const actualMinutes = Math.round(elapsed / 60_000)
          if (actualMinutes < 1) {
            set({ ...IDLE_RESET })
            return
          }
          set({
            ...IDLE_RESET,
            pendingPartial: {
              taskId: s.taskId!,
              plannedMinutes: planned,
              actualMinutes,
              startedAt: s.sessionStartISO!,
              endedAt: new Date(now).toISOString(),
              interruptions: s.interruptions,
            },
          })
        },

        cancel: () => {
          const s = get()
          set({ ...IDLE_RESET, ...(s.type === 'break' ? { type: 'focus' as SessionType, nextBreakIsLong: false } : {}) })
        },

        resolvePartial: async (countIt) => {
          const p = get().pendingPartial
          if (!p) return
          set({ pendingPartial: null })
          // Recorded either way: completion rate (F-4.4) needs started-but-
          // abandoned sessions too. `counted` carries the user's choice.
          await recordSession({
            ...p,
            type: 'focus',
            completed: false,
            counted: countIt,
          })
        },

        addInterruption: (note) => {
          const s = get()
          if (s.status !== 'running' || s.type !== 'focus') return
          set({
            interruptions: [...s.interruptions, { at: new Date().toISOString(), note: note?.trim() || undefined }],
          })
        },

        checkCompletion: async (now = Date.now()) => {
          const s = get()
          if (s.status !== 'running' || remainingMsOf(s, now) > 0) return
          if (s.type === 'focus') await completeFocus(now, { offerBreak: true })
          else await completeBreak(now, { advance: true })
        },

        recover: async () => {
          const s = get()
          if (s.status !== 'running' || s.startedAt === null) return
          const now = Date.now()
          if (remainingMsOf(s, now) > 0) return // still mid-session — ticker takes over
          const endMs = s.startedAt - s.elapsedBeforePauseMs + plannedMinutesOf(s) * 60_000
          // Don't retroactively auto-start a stale break/queue — finalize and offer.
          if (s.type === 'focus') await completeFocus(endMs, { offerBreak: false })
          else await completeBreak(endMs, { advance: false })
        },

        advanceQueue: async () => {
          const day = todayKey(settings().dayStartHour)
          const dayTasks = await db.tasks.where('plannedDate').equals(day).sortBy('order')
          const todos = dayTasks.filter((t) => t.status !== 'done')
          const focusSessions = await db.sessions
            .filter((x) => x.type === 'focus' && (x.completed || x.counted))
            .toArray()
          const counts = new Map<ID, number>()
          for (const x of focusSessions) counts.set(x.taskId, (counts.get(x.taskId) ?? 0) + 1)
          const queue = buildQueue(todos, counts)
          if (queue.length > 0) set({ taskId: queue[0].taskId })
        },

        toggleFocusMode: (on) => set({ focusMode: on ?? !get().focusMode }),
      }
    },
    {
      name: 'focusflow-timer',
      partialize: (s) => ({
        status: s.status,
        type: s.type,
        taskId: s.taskId,
        focusMinutes: s.focusMinutes,
        breakMinutes: s.breakMinutes,
        nextBreakIsLong: s.nextBreakIsLong,
        startedAt: s.startedAt,
        sessionStartISO: s.sessionStartISO,
        elapsedBeforePauseMs: s.elapsedBeforePauseMs,
        completedFocusCount: s.completedFocusCount,
        interruptions: s.interruptions,
        pendingPartial: s.pendingPartial,
      }),
    },
  ),
)
