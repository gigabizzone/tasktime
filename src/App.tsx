import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { WorkspaceView } from './components/WorkspaceView'
import { db } from './db/db'
import { seed } from './db/seed'
import { useSettingsStore } from './stores/useSettingsStore'
import { useTimerStore } from './stores/useTimerStore'

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
      // A session that finished while the app was closed gets finalized here.
      .then(() => useTimerStore.getState().recover())
      .then(() => setReady(true))
  }, [hydrate])

  if (!ready) return null

  return (
    <AppShell>
      <WorkspaceView />
    </AppShell>
  )
}
