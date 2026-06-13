import { create } from 'zustand'

// 'timer' is a mobile-only view (desktop shows Tasks + Timer side by side).
export type View = 'tasks' | 'timer' | 'calendar' | 'reports' | 'settings'

interface ViewState {
  view: View
  setView: (view: View) => void
}

export const useViewStore = create<ViewState>((set) => ({
  view: 'tasks',
  setView: (view) => set({ view }),
}))
