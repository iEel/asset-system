// Landing on a URL's hash inside the dashboard's scrolling <main> (src/components/layout/dashboard-shell.tsx).
// A fresh load or reload mounts the shell while loading.tsx's skeleton is in main, so the hash's target (say
// section#stuck) is not there yet. The shell tries once; if the target is missing it watches main until the streamed
// page brings it, lands once, and stops. It also stops after a short window, or when the reader scrolls or types
// first, so a late target never pulls the page away from where they went.

export type HashLandResult = "landed" | "missing" | "none"

// Long enough for a slow page's server data to stream in; the reader is usually still looking at the skeleton.
export const HASH_TARGET_WAIT_MS = 10_000

export function landOnHashTarget({
  tryLand,
  watch,
  startTimer,
  timeoutMs = HASH_TARGET_WAIT_MS,
}: {
  // Scrolls to the target when it is there: "landed"; "missing" while it is not; "none" when there is nothing to wait for.
  tryLand: () => HashLandResult
  // Calls retry on each change in main and interrupt when the reader acts; returns its own cleanup.
  watch: (retry: () => void, interrupt: () => void) => () => void
  startTimer: (onTimeout: () => void, ms: number) => () => void
  timeoutMs?: number
}): () => void {
  if (tryLand() !== "missing") return () => {}

  let stopped = false
  let stopWatching = () => {}
  let stopTimer = () => {}

  const stop = () => {
    if (stopped) return
    stopped = true
    stopWatching()
    stopTimer()
  }

  const retry = () => {
    if (stopped) return
    if (tryLand() !== "missing") stop()
  }

  stopWatching = watch(retry, stop)
  stopTimer = startTimer(stop, timeoutMs)
  if (stopped) {
    stopWatching()
    stopTimer()
  }

  return stop
}
