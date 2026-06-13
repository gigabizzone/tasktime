import type { ReactNode } from 'react'
import { useTodayStats } from '../../lib/useTodayStats'
import { useViewStore, type View } from '../../stores/useViewStore'
import { useShortcutsOverlay } from '../shortcuts/ShortcutsOverlay'
import { MobileTabBar } from './MobileTabBar'
import { ThemeToggle } from '../ui/ThemeToggle'
import {
  IconCalendar,
  IconChart,
  IconFlame,
  IconKeyboard,
  IconSettings,
  IconTasks,
  type IconTimer,
} from '../ui/Icons'

type NavItem = { key: View; label: string; Icon: typeof IconTimer }

const NAV: NavItem[] = [
  { key: 'tasks', label: 'Tasks', Icon: IconTasks },
  { key: 'calendar', label: 'Calendar', Icon: IconCalendar },
  { key: 'reports', label: 'Reports', Icon: IconChart },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { streak } = useTodayStats()
  const { view, setView } = useViewStore()
  const openShortcuts = useShortcutsOverlay((s) => s.open)

  return (
    <div className="flex h-full flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-2.5 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
        <button
          onClick={() => setView('tasks')}
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-500 text-white shadow-sm">⏱</span>
          <span className="hidden sm:inline">
            Focus<span className="text-blue-500">Flow</span>
          </span>
        </button>

        {/* Center nav — clear icon + label buttons (hidden on mobile; bottom bar takes over). */}
        <nav className="mx-auto hidden items-center gap-1 rounded-2xl bg-gray-100 p-1 md:flex dark:bg-gray-800">
          {NAV.map(({ key, label, Icon }) => {
            const active = view === key
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                <Icon width={17} height={17} />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-sm font-semibold text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
            title={`${streak}-day streak`}
          >
            <IconFlame width={16} height={16} />
            {streak}
          </span>
          <button
            onClick={openShortcuts}
            className="btn-ghost px-2.5"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <IconKeyboard />
          </button>
          <ThemeToggle />
          <button
            onClick={() => setView('settings')}
            aria-current={view === 'settings' ? 'page' : undefined}
            className={`btn-ghost px-2.5 ${view === 'settings' ? 'bg-gray-100 text-blue-600 dark:bg-gray-800 dark:text-blue-400' : ''}`}
            title="Settings"
            aria-label="Settings"
          >
            <IconSettings />
          </button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1">{children}</main>
      <MobileTabBar />
    </div>
  )
}
