// axe on the page as the person reads it. A toast still sliding in (sonner's 400 ms opacity transition) reads as low
// contrast: the offline toast measured 4.04:1 at 0 ms and passed at 1.5 s in the rehearsal (note N-AU2). So before axe
// runs, wait until the toast region has no running transition.
import type { Page } from "@playwright/test"
import type { Measure } from "../support/measure.ts"

export async function settleToasts(page: Page) {
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("[data-sonner-toaster]")).every((region) => region.getAnimations({ subtree: true }).length === 0),
  )
}

// measure.recordPage once the toasts have settled.
export async function recordSettled(page: Page, measure: Measure, label: string) {
  await settleToasts(page)
  return measure.recordPage(label)
}
