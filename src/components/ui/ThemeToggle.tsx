import { useSettingsStore } from '../../stores/useSettingsStore'
import type { Theme } from '../../types/models'
import { IconMonitor, IconMoon, IconSun } from './Icons'

const ORDER: Theme[] = ['system', 'light', 'dark']
const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const ICON = { system: IconMonitor, light: IconSun, dark: IconMoon }

/** Cycles system → light → dark; the full radio also lives in Settings. */
export function ThemeToggle() {
  const theme = useSettingsStore((s) => s.settings.theme)
  const update = useSettingsStore((s) => s.update)
  const Icon = ICON[theme]
  return (
    <button
      onClick={() => void update({ theme: NEXT[theme] })}
      className="btn-ghost px-2.5"
      title={`Theme: ${theme} (click to change)`}
      aria-label={`Theme: ${theme}. Click to cycle through ${ORDER.join(', ')}.`}
    >
      <Icon />
    </button>
  )
}
