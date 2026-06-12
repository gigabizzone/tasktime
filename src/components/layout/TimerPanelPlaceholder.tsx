import { useTimerStore } from '../../stores/useTimerStore'

export function TimerPanelPlaceholder() {
  const plannedMinutes = useTimerStore((s) => s.plannedMinutes)

  return (
    <section className="flex w-[45%] flex-col items-center justify-center gap-4 p-4">
      <div className="flex h-48 w-48 items-center justify-center rounded-full border-8 border-gray-200 dark:border-gray-800">
        <span className="text-3xl font-semibold tabular-nums">{plannedMinutes}:00</span>
      </div>
      <p className="text-sm text-gray-400">Pomodoro timer arrives in M3</p>
    </section>
  )
}
