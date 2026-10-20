// axe on the page as the person reads it. A toast still sliding in (sonner's 400 ms opacity transition) reads as low
// contrast: the offline toast measured 4.04:1 at 0 ms and passed at 1.5 s in the rehearsal (note N-AU2). So before axe
// runs, wait until no finite animation or transition runs anywhere in the page (a spinner's endless one does not count):
// a button turning from waiting to ready fades its colours too (transition-colors), and axe read the check's save half
// way, a colour-contrast failure on .border-warning in the dry run (e2e fix loop 1).
import type { Page } from "@playwright/test"
import type { Measure } from "../support/measure.ts"

export async function settleToasts(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getComputedTiming().iterations === Infinity),
  )
}

// measure.recordPage once the page has settled.
export async function recordSettled(page: Page, measure: Measure, label: string) {
  await settleToasts(page)
  return measure.recordPage(label)
}
