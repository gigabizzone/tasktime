import type { ReactNode } from 'react'
import { useTodayStats } from '../../lib/useTodayStats'

const VIEWS = ['Tasks', 'Calendar', 'Reports'] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { streak } = useTodayStats()
  return (
    <div className="flex h-full flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <span className="text-lg font-bold tracking-tight">
          Focus<span className="text-blue-500">Flow</span>
        </span>
        <nav className="flex gap-1">
          {VIEWS.map((view) => (
            <button
              key={view}
              disabled={view !== 'Tasks'}
              title={view !== 'Tasks' ? 'Coming in a later milestone' : undefined}
              className={
                view === 'Tasks'
                  ? 'rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                  : 'rounded-md px-3 py-1 text-sm text-gray-400 dark:text-gray-600'
              }
            >
              {view}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span title="Current streak">🔥 {streak}</span>
          <button title="Settings (M6)" className="opacity-50">⚙</button>
          <button title="Theme (M6)" className="opacity-50">🌙</button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1">{children}</main>
    </div>
  )
}
