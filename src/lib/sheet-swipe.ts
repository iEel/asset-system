// A bottom sheet closes on a drag down of 80px, or on a short quick flick down (menu B shell, spec §6.6).
export const SHEET_SWIPE_CLOSE_PX = 80

export function isSheetSwipeClose(deltaY: number, elapsedMs: number): boolean {
  return deltaY >= SHEET_SWIPE_CLOSE_PX || (deltaY >= 32 && elapsedMs > 0 && deltaY / elapsedMs >= 0.5)
}
