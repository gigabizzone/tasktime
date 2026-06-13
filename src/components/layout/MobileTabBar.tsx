import { useViewStore, type View } from '../../stores/useViewStore'
import { useTimerStore, remainingMsOf } from '../../stores/useTimerStore'
import { useNow } from '../../lib/useNow'
import { formatClock } from '../../lib/format'
import { IconCalendar, IconChart, IconTasks, IconTimer, type IconClose } from '../ui/Icons'

const TABS: Array<{ key: View; label: string; Icon: typeof IconClose }> = [
  { key: 'tasks', label: 'Tasks', Icon: IconTasks },
  { key: 'timer', label: 'Timer', Icon: IconTimer },
  { key: 'calendar', label: 'Calendar', Icon: IconCalendar },
  { key: 'reports', label: 'Reports', Icon: IconChart },
]

/** Mobile bottom navigation (PRD §7): Tasks / Timer / Calendar / Reports. */
export function MobileTabBar() {
  const { view, setView } = useViewStore()
  const status = useTimerStore((s) => s.status)
  const now = useNow(status === 'running')
  const remaining = status === 'idle' ? 0 : Math.max(0, remainingMsOf(useTimerStore.getState(), now))

  return (
    <nav className="flex shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-gray-800 dark:bg-gray-900">
      {TABS.map(({ key, label, Icon }) => {
        const active = view === key || (key === 'tasks' && view === 'settings')
        return (
          <button
            key={key}
            onClick={() => setView(key)}
            aria-current={view === key ? 'page' : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold ${
              active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Icon width={20} height={20} />
            {label}
            {key === 'timer' && status !== 'idle' && (
              <span className="absolute right-3 top-1 rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white tabular-nums">
                {formatClock(remaining)}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
