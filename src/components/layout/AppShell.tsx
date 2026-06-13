import type { ReactNode } from 'react'
import { useTodayStats } from '../../lib/useTodayStats'
import { useViewStore, type View } from '../../stores/useViewStore'

const VIEWS: Array<{ key: View; label: string; enabled: boolean }> = [
  { key: 'tasks', label: 'Tasks', enabled: true },
  { key: 'calendar', label: 'Calendar', enabled: true },
  { key: 'reports', label: 'Reports', enabled: true },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { streak } = useTodayStats()
  const { view, setView } = useViewStore()
  return (
    <div className="flex h-full flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <span className="text-lg font-bold tracking-tight">
          Focus<span className="text-blue-500">Flow</span>
        </span>
        <nav className="flex gap-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              disabled={!v.enabled}
              onClick={() => setView(v.key)}
              title={!v.enabled ? 'Coming in a later milestone' : undefined}
              aria-current={view === v.key ? 'page' : undefined}
              className={
                view === v.key
                  ? 'rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                  : v.enabled
                    ? 'rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    : 'rounded-md px-3 py-1 text-sm text-gray-400 dark:text-gray-600'
              }
            >
              {v.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="hidden text-xs text-gray-400 sm:inline">Ctrl+K to capture</span>
          <span title="Current streak">🔥 {streak}</span>
          <button title="Settings (M6)" className="opacity-50">⚙</button>
          <button title="Theme (M6)" className="opacity-50">🌙</button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1">{children}</main>
    </div>
  )
}
