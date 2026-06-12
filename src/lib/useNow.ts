import { useEffect, useState } from 'react'

/**
 * Re-render with the current time every `intervalMs` while `active`.
 * Driven by a Web Worker so ticks survive background-tab throttling;
 * falls back to setInterval where workers are unavailable.
 */
export function useNow(active: boolean, intervalMs = 500): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    try {
      const worker = new Worker(new URL('../workers/tick.worker.ts', import.meta.url), {
        type: 'module',
      })
      worker.onmessage = () => setNow(Date.now())
      worker.postMessage(intervalMs)
      return () => worker.terminate()
    } catch {
      const id = setInterval(() => setNow(Date.now()), intervalMs)
      return () => clearInterval(id)
    }
  }, [active, intervalMs])

  return now
}
