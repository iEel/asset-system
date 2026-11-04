import assert from "node:assert/strict"
import test from "node:test"
import { HASH_TARGET_WAIT_MS, landOnHashTarget, type HashLandResult } from "../src/lib/hash-target-landing.ts"

// A fake page: tryLand reports from a queue of results, watch and the timer hand their callbacks to the test.
function fakePage(results: HashLandResult[]) {
  const page = {
    tries: 0,
    watching: false,
    watchStarts: 0,
    timerMs: null as number | null,
    timerCleared: false,
    retry: null as (() => void) | null,
    interrupt: null as (() => void) | null,
    timeout: null as (() => void) | null,
  }
  const options = {
    tryLand: () => {
      page.tries += 1
      return results.shift() ?? "missing"
    },
    watch: (retry: () => void, interrupt: () => void) => {
      page.watching = true
      page.watchStarts += 1
      page.retry = retry
      page.interrupt = interrupt
      return () => {
        page.watching = false
      }
    },
    startTimer: (onTimeout: () => void, ms: number) => {
      page.timerMs = ms
      page.timeout = onTimeout
      return () => {
        page.timerCleared = true
      }
    },
  }
  return { page, options }
}

test("a hash whose target is already there lands at once and watches nothing", () => {
  const { page, options } = fakePage(["landed"])

  landOnHashTarget(options)

  assert.equal(page.tries, 1)
  assert.equal(page.watchStarts, 0)
  assert.equal(page.timerMs, null)
})

test("no hash, or a target outside main, never starts waiting", () => {
  const { page, options } = fakePage(["none"])

  landOnHashTarget(options)

  assert.equal(page.watchStarts, 0)
  assert.equal(page.timerMs, null)
})

test("a target that streams in after the loading skeleton lands once it arrives, then the wait stops", () => {
  const { page, options } = fakePage(["missing", "missing", "landed"])

  landOnHashTarget(options)
  assert.equal(page.watching, true)
  assert.equal(page.timerMs, HASH_TARGET_WAIT_MS)

  page.retry?.()
  assert.equal(page.watching, true, "still waiting while the skeleton is on screen")

  page.retry?.()
  assert.equal(page.tries, 3)
  assert.equal(page.watching, false)
  assert.equal(page.timerCleared, true)

  page.retry?.()
  assert.equal(page.tries, 3, "a later change in main does not scroll the page again")
})

test("the wait gives up after its window, so a hash with no target never moves the page later", () => {
  const { page, options } = fakePage(["missing"])

  landOnHashTarget(options)
  page.timeout?.()

  assert.equal(page.watching, false)
  page.retry?.()
  assert.equal(page.tries, 1)
})

test("the reader scrolling or typing while the page loads stops the wait", () => {
  const { page, options } = fakePage(["missing", "landed"])

  landOnHashTarget(options)
  page.interrupt?.()

  assert.equal(page.watching, false)
  assert.equal(page.timerCleared, true)
  page.retry?.()
  assert.equal(page.tries, 1)
})

test("the returned stop ends the wait (a new hash or leaving the shell)", () => {
  const { page, options } = fakePage(["missing"])

  const stop = landOnHashTarget(options)
  stop()
  stop()

  assert.equal(page.watching, false)
  assert.equal(page.timerCleared, true)
})
