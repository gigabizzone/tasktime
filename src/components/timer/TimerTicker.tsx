import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useTimerStore, remainingMsOf } from '../../stores/useTimerStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useViewStore } from '../../stores/useViewStore'
import { useNow } from '../../lib/useNow'
import { formatClock } from '../../lib/format'
import { todayKey } from '../../lib/dates'
import { notify } from '../../lib/notify'
import { toast } from '../../stores/useToastStore'

/**
 * Renders nothing. Mounted once in App so the session lifecycle keeps
 * working whatever view is open: completion check, live tab title, and
 * scheduled-time reminders (F-3.4).
 */
export function TimerTicker() {
  const status = useTimerStore((s) => s.status)
  const type = useTimerStore((s) => s.type)
  const taskId = useTimerStore((s) => s.taskId)
  const checkCompletion = useTimerStore((s) => s.checkCompletion)
  const running = status === 'running'
  const now = useNow(running)

  const task = useLiveQuery(() => (taskId ? db.tasks.get(taskId) : undefined), [taskId])

  useEffect(() => {
    if (running) void checkCompletion(now)
  }, [running, now, checkCompletion])

  // Live countdown in the tab title, e.g. "(17:42) Send proposal — FocusFlow".
  useEffect(() => {
    if (status === 'idle') {
      document.title = 'FocusFlow'
      return
    }
    const remaining = Math.max(0, remainingMsOf(useTimerStore.getState(), now))
    document.title = `(${formatClock(remaining)}) ${type === 'break' ? 'Break' : (task?.title ?? 'Focus')} — FocusFlow`
  }, [status, type, now, task?.title])

  useScheduledReminders(now)

  return null
}

/** F-3.4: when a task's scheduled time arrives, offer to start a session. */
function useScheduledReminders(now: number) {
  const dayStartHour = useSettingsStore((s) => s.settings.dayStartHour)
  const notificationsEnabled = useSettingsStore((s) => s.settings.notificationsEnabled)
  const notified = useRef(new Set<string>())
  const today = todayKey(dayStartHour)

  const scheduled = useLiveQuery(
    () =>
      db.tasks
        .where('plannedDate')
        .equals(today)
        .filter((t) => t.status !== 'done' && !!t.scheduledTime)
        .toArray(),
    [today],
  )

  useEffect(() => {
    if (!scheduled) return
    for (const t of scheduled) {
      const [h, m] = t.scheduledTime!.split(':').map(Number)
      const at = new Date(now)
      at.setHours(h, m, 0, 0)
      const key = `${t.id}@${today}`
      if (now >= at.getTime() && now - at.getTime() < 60_000 && !notified.current.has(key)) {
        notified.current.add(key)
        if (notificationsEnabled) notify(`Scheduled: ${t.title}`, 'Start a session?')
        toast(`Scheduled now: ${t.title}`, {
          label: 'Load timer',
          run: () => {
            useTimerStore.getState().assignTask(t.id)
            useViewStore.getState().setView('tasks')
          },
        })
      }
    }
  }, [scheduled, now, today, notificationsEnabled])
}
