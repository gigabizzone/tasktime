import { create } from 'zustand'

export type View = 'tasks' | 'calendar' | 'reports'

interface ViewState {
  view: View
  setView: (view: View) => void
}

export const useViewStore = create<ViewState>((set) => ({
  view: 'tasks',
  setView: (view) => set({ view }),
}))
