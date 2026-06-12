import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { TaskPanelPlaceholder } from './components/layout/TaskPanelPlaceholder'
import { TimerPanelPlaceholder } from './components/layout/TimerPanelPlaceholder'
import { db } from './db/db'
import { seed } from './db/seed'
import { useSettingsStore } from './stores/useSettingsStore'

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

export default function App() {
  const [ready, setReady] = useState(false)
  const hydrate = useSettingsStore((s) => s.hydrate)
  useApplyTheme()

  useEffect(() => {
    void seed(db)
      .then(hydrate)
      .then(() => setReady(true))
  }, [hydrate])

  if (!ready) return null

  return (
    <AppShell>
      <TaskPanelPlaceholder />
      <TimerPanelPlaceholder />
    </AppShell>
  )
}
