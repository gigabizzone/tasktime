import { useState } from 'react'
import { IconClose } from './ui/Icons'

const KEY = 'focusflow-onboarded'

/** First-launch welcome with a skippable mini-tour (value-add #2). */
export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(KEY) === '1')
  if (dismissed) return null

  const close = () => {
    localStorage.setItem(KEY, '1')
    setDismissed(true)
  }

  const tips = [
    ['⌨', 'Press ? anytime', 'See every keyboard shortcut.'],
    ['＋', 'Capture fast', 'Hit N for a new task, or Ctrl/⌘+K from anywhere.'],
    ['▶', 'Start focusing', 'Drag a task onto the timer or press its play button, then Space to start.'],
  ]

  return (
    <div className="card relative flex flex-col gap-3 border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/40">
      <button onClick={close} className="btn-ghost absolute right-2 top-2 px-2 py-1" aria-label="Dismiss welcome">
        <IconClose width={16} height={16} />
      </button>
      <h2 className="text-base font-bold">Welcome to FocusFlow 👋</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        {tips.map(([icon, title, desc]) => (
          <div key={title} className="flex gap-2 rounded-xl bg-white/70 p-2.5 dark:bg-gray-900/60">
            <span className="text-lg">{icon}</span>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={close} className="btn-primary w-fit">Got it</button>
    </div>
  )
}
