import { lazy, Suspense, useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { WorkspaceView } from './components/WorkspaceView'
import { MobileTaskBoard } from './components/MobileTaskBoard'
import { TimerPanel } from './components/timer/TimerPanel'
import { CommandBar } from './components/commandbar/CommandBar'
import { CarryOverPrompt } from './components/CarryOverPrompt'
import { EndOfDaySummary } from './components/EndOfDaySummary'
import { Toast } from './components/layout/Toast'
import { TimerTicker } from './components/timer/TimerTicker'
import { TimerPill } from './components/timer/TimerPill'
import { IdlePrompt } from './components/timer/IdlePrompt'
import { ShortcutsOverlay } from './components/shortcuts/ShortcutsOverlay'
import { db } from './db/db'
import { seed } from './db/seed'
import { useSettingsStore } from './stores/useSettingsStore'
import { useTimerStore } from './stores/useTimerStore'
import { useViewStore } from './stores/useViewStore'
import { useGlobalShortcuts } from './lib/useGlobalShortcuts'
import { useIsMobile } from './lib/useMediaQuery'

// Heavy, route-level views (Recharts, calendar grid) are split out of the
// initial bundle so the first paint of the task workspace stays lean.
const CalendarView = lazy(() => import('./components/calendar/CalendarView').then((m) => ({ default: m.CalendarView })))
const ReportsView = lazy(() => import('./components/reports/ReportsView').then((m) => ({ default: m.ReportsView })))
const SettingsView = lazy(() => import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView })))

const TIMER_PERSIST_KEY = 'focusflow-timer'

function useApplyTheme() {
  const theme = useSettingsStore((s) => s.settings.theme)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}

const loadingFallback = (
  <div className="flex w-full items-center justify-center p-10 text-sm text-gray-400">Loading…</div>
)

function MainView() {
  const view = useViewStore((s) => s.view)
  const isMobile = useIsMobile()

  if (view === 'calendar' || view === 'reports' || view === 'settings') {
    return (
      <Suspense fallback={loadingFallback}>
        {view === 'calendar' ? <CalendarView /> : view === 'reports' ? <ReportsView /> : <SettingsView />}
      </Suspense>
    )
  }
  // 'tasks' / 'timer': two panels on desktop, one tab at a time on mobile.
  if (isMobile) return view === 'timer' ? <TimerPanel /> : <MobileTaskBoard />
  return <WorkspaceView />
}

export default function App() {
  const [ready, setReady] = useState(false)
  const hydrate = useSettingsStore((s) => s.hydrate)
  useApplyTheme()
  useGlobalShortcuts()

  useEffect(() => {
    const firstTimerRun = localStorage.getItem(TIMER_PERSIST_KEY) === null
    void seed(db)
      .then(hydrate)
      .then(() => {
        // First ever load: seed the timer's durations from the user's defaults
        // (afterwards the picker remembers the last-used value).
        if (firstTimerRun) {
          const { defaultFocusMinutes, defaultBreakMinutes } = useSettingsStore.getState().settings
          useTimerStore.getState().setFocusMinutes(defaultFocusMinutes)
          useTimerStore.getState().setBreakMinutes(defaultBreakMinutes)
        }
      })
      // A session that finished while the app was closed gets finalized here.
      .then(() => useTimerStore.getState().recover())
      .then(() => setReady(true))
  }, [hydrate])

  if (!ready) return null

  return (
    <AppShell>
      <MainView />
      <TimerTicker />
      <TimerPill />
      <CommandBar />
      <CarryOverPrompt />
      <EndOfDaySummary />
      <IdlePrompt />
      <ShortcutsOverlay />
      <Toast />
    </AppShell>
  )
}
