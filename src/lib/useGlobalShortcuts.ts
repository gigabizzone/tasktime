import { useEffect } from 'react'
import { useTimerStore } from '../stores/useTimerStore'
import { useViewStore, type View } from '../stores/useViewStore'
import { useShortcutsOverlay } from '../components/shortcuts/ShortcutsOverlay'

const NUM_TO_VIEW: Record<string, View> = { '1': 'tasks', '2': 'calendar', '3': 'reports', '4': 'settings' }

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/** Value-add #1: global keyboard shortcuts. Ctrl+K and Esc-in-context live
 *  in their own components; this wires Space / N / 1–4 / F / ?. */
export function useGlobalShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isTyping(e.target)) return

      const timer = useTimerStore.getState()
      const setView = useViewStore.getState().setView

      switch (e.key) {
        case ' ': {
          e.preventDefault()
          if (timer.status === 'running') timer.pause()
          else if (timer.status === 'paused') timer.resume()
          else timer.start() // ignored if no task assigned (UI prompts)
          break
        }
        case 'n':
        case 'N': {
          e.preventDefault()
          setView('tasks')
          requestAnimationFrame(() => {
            document.getElementById('quick-add-input')?.focus()
          })
          break
        }
        case 'f':
        case 'F': {
          if (timer.status !== 'idle' || timer.taskId) {
            e.preventDefault()
            timer.toggleFocusMode()
          }
          break
        }
        case '?': {
          e.preventDefault()
          useShortcutsOverlay.getState().toggle()
          break
        }
        default: {
          if (e.key in NUM_TO_VIEW) {
            e.preventDefault()
            setView(NUM_TO_VIEW[e.key])
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
