/// <reference lib="webworker" />
// Ticks from a worker are not throttled when the tab is backgrounded, so the
// tab-title countdown stays live. Time itself is always computed from
// timestamps — a missed tick never loses time.

let interval: ReturnType<typeof setInterval> | undefined

self.onmessage = (e: MessageEvent<number>) => {
  clearInterval(interval)
  interval = setInterval(() => self.postMessage('tick'), e.data)
}

export {}
