import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { waitForDialogToClose } from "../src/lib/field-focus.ts"

// V track plan 2, area O: the asset operation forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5 #9–#13, §7). One test per task, appended in
// order. The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("a review dialog closes before the form's field takes focus: waitForDialogToClose waits for the dialog that holds focus to leave and hand focus back (v-track O1)", async () => {
  const globals = globalThis as unknown as Record<string, unknown>
  const had = { document: Object.hasOwn(globals, "document"), frame: Object.hasOwn(globals, "requestAnimationFrame") }
  const saved = { document: globals.document, frame: globals.requestAnimationFrame }
  // Frames run when the test says so.
  const frames: Array<() => void> = []
  const nextFrame = () => frames.shift()?.()
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5))
  globals.requestAnimationFrame = (callback: () => void) => frames.push(callback)
  try {
    // Focus in no dialog (a client-side error: the review never opened): resolves at once.
    globals.document = { activeElement: { closest: () => null } }
    await waitForDialogToClose()
    assert.equal(frames.length, 0, "no frame was asked for")

    // Focus in the review dialog: it resolves only after the dialog has left the page, and after the task in which the
    // dialog hands focus back to its opener (Radix runs it after the unmount), so the field takes focus last.
    const dialog = { isConnected: true }
    globals.document = { activeElement: { closest: (selector: string) => (selector === '[role="dialog"]' ? dialog : null) } }
    const order: string[] = []
    const closing = waitForDialogToClose().then(() => order.push("field"))
    nextFrame()
    nextFrame()
    await tick()
    assert.equal(order.length, 0, "still open")
    dialog.isConnected = false
    setTimeout(() => order.push("dialog hands focus back"), 0)
    nextFrame()
    await closing
    assert.deepEqual(order, ["dialog hands focus back", "field"])

    // A dialog that never leaves: it gives up after the frames it was given, like waitForElement.
    const stuck = { isConnected: true }
    globals.document = { activeElement: { closest: () => stuck } }
    let gaveUp = false
    const waiting = waitForDialogToClose(2).then(() => {
      gaveUp = true
    })
    nextFrame()
    nextFrame()
    nextFrame()
    await waiting
    assert.equal(gaveUp, true)
  } finally {
    if (had.document) globals.document = saved.document
    else delete globals.document
    if (had.frame) globals.requestAnimationFrame = saved.frame
    else delete globals.requestAnimationFrame
  }
  const focus = read("src/lib/field-focus.ts")
  assert.match(focus, /export function waitForDialogToClose\(frames = 60\): Promise<void>/)
  assert.match(focus, /const dialog = document\.activeElement\?\.closest\('\[role="dialog"\]'\)/)
  assert.doesNotMatch(focus, /from "@\/|"use client"|from "react"/)
})
