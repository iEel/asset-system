// The signature pad's height (group 3 spec §7.4): 180px, except the phone's sign step below 1024px, where the pad
// takes half the viewport's height, from 180 to 280px. Pure, for tests.
export function signaturePadHeight(tall: boolean, viewportWidth: number, viewportHeight: number): number {
  return tall && viewportWidth < 1024 ? Math.max(180, Math.min(280, Math.round(viewportHeight / 2))) : 180
}

// A resize drops the drawing only when the pad becomes hidden (width 0, as on leaving the phone's step 3): a hidden
// pad's drawing is gone. Any other width change (a scrollbar, a window resize, zoom) keeps it, redrawn to the new size
// (final review M1).
export function shouldDropSignature(previousWidth: number, nextWidth: number): boolean {
  return nextWidth === 0 && previousWidth > 0
}
