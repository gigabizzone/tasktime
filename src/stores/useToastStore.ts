import { create } from 'zustand'

interface ToastAction {
  label: string
  run: () => void
}

interface ToastState {
  message: string | null
  action: ToastAction | null
  show: (message: string, action?: ToastAction) => void
  clear: () => void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  action: null,
  show: (message, action) => {
    clearTimeout(toastTimer)
    set({ message, action: action ?? null })
    toastTimer = setTimeout(() => set({ message: null, action: null }), 4000)
  },
  clear: () => {
    clearTimeout(toastTimer)
    set({ message: null, action: null })
  },
}))

export const toast = (message: string, action?: ToastAction) =>
  useToastStore.getState().show(message, action)
