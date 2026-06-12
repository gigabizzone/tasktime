import { BREAK_MINUTES, FOCUS_MINUTES } from '../../types/models'
import { useTimerStore } from '../../stores/useTimerStore'

function Chip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  )
}

/** F-2.1 / F-2.2 duration chips. Locked while a session is running or paused. */
export function DurationPickers() {
  const { status, focusMinutes, breakMinutes, setFocusMinutes, setBreakMinutes } = useTimerStore()
  const locked = status !== 'idle'

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="w-14 text-xs text-gray-400">Session</span>
        <div className="flex flex-wrap gap-1">
          {FOCUS_MINUTES.map((m) => (
            <Chip
              key={m}
              label={String(m)}
              active={focusMinutes === m}
              disabled={locked}
              onClick={() => setFocusMinutes(m)}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-14 text-xs text-gray-400">Break</span>
        <div className="flex flex-wrap gap-1">
          {BREAK_MINUTES.map((m) => (
            <Chip
              key={m}
              label={String(m)}
              active={breakMinutes === m}
              disabled={locked}
              onClick={() => setBreakMinutes(m)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
