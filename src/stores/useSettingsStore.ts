import { create } from 'zustand'
import { db, SETTINGS_KEY } from '../db/db'
import { DEFAULT_SETTINGS, type Settings } from '../types/models'

interface SettingsState {
  settings: Settings
  hydrated: boolean
  hydrate: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const row = await db.settings.get(SETTINGS_KEY)
    set({ settings: row?.value ?? DEFAULT_SETTINGS, hydrated: true })
  },

  update: async (patch) => {
    const next = { ...get().settings, ...patch }
    set({ settings: next })
    await db.settings.put({ key: SETTINGS_KEY, value: next })
  },
}))
