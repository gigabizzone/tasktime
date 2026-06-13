import { useEffect } from 'react'
import { create } from 'zustand'
import { IconClose } from '../ui/Icons'

interface OverlayState {
  visible: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const useShortcutsOverlay = create<OverlayState>((set, get) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
  toggle: () => set({ visible: !get().visible }),
}))

const GROUPS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: 'Timer',
    items: [
      ['Space', 'Start / pause the timer'],
      ['F', 'Focus mode'],
      ['Esc', 'Exit focus mode / close dialogs'],
    ],
  },
  {
    title: 'Tasks',
    items: [
      ['N', 'New task'],
      ['Ctrl / ⌘ + K', 'Quick capture & schedule'],
      ['Alt + ↑ / ↓', 'Move selected task'],
    ],
  },
  {
    title: 'Navigation',
    items: [
      ['1', 'Tasks'],
      ['2', 'Calendar'],
      ['3', 'Reports'],
      ['4', 'Settings'],
      ['?', 'This help'],
    ],
  },
]

export function ShortcutsOverlay() {
  const { visible, close } = useShortcutsOverlay()

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, close])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="card flex w-full max-w-lg flex-col gap-4 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Keyboard shortcuts</h2>
          <button onClick={close} className="btn-ghost px-2" aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.title} className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">{g.title}</h3>
              {g.items.map(([key, desc]) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <kbd className="w-fit rounded-md border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-semibold dark:border-gray-600 dark:bg-gray-800">
                    {key}
                  </kbd>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
