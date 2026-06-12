import { create } from 'zustand'
import type { ID, SessionType } from '../types/models'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'break'

/**
 * Shape persisted so a running session survives refresh/crash (M3 will
 * write this to storage and reconstruct remaining time from timestamps —
 * never from tick counting).
 */
export interface PersistedTimer {
  status: TimerStatus
  type: SessionType
  taskId: ID | null
  plannedMinutes: number
  startedAt: string | null // ISO; null when idle
  /** Accumulated elapsed ms before the latest resume (for pause support). */
  elapsedBeforePauseMs: number
  completedFocusCount: number // toward long-break suggestion
}

interface TimerState extends PersistedTimer {
  assignTask: (taskId: ID | null) => void
  setPlannedMinutes: (minutes: number) => void
}

// M1 skeleton: state shape + assignment only. The full state machine
// (start/pause/resume/skip/cancel, countdown worker, persistence) is M3.
export const useTimerStore = create<TimerState>((set) => ({
  status: 'idle',
  type: 'focus',
  taskId: null,
  plannedMinutes: 25,
  startedAt: null,
  elapsedBeforePauseMs: 0,
  completedFocusCount: 0,

  assignTask: (taskId) => set({ taskId }),
  setPlannedMinutes: (plannedMinutes) => set({ plannedMinutes }),
}))
