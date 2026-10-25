"use client"

import { useSyncExternalStore } from "react"

/** The browser's own online flag; with no navigator (server, Node) the app counts as online. */
export function readOnlineStatus(nav: { onLine: boolean } | undefined): boolean {
  return nav ? nav.onLine : true
}

/** Calls onChange on every online and offline event of the target; returns the unsubscribe. */
export function subscribeOnlineStatus(
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  onChange: () => void,
): () => void {
  target.addEventListener("online", onChange)
  target.addEventListener("offline", onChange)
  return () => {
    target.removeEventListener("online", onChange)
    target.removeEventListener("offline", onChange)
  }
}

/** True during server render and hydration, then navigator.onLine, following the online and offline events. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeOnlineStatus(window, onChange),
    () => readOnlineStatus(navigator),
    () => true,
  )
}
