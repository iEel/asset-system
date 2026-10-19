import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track polish: the user's answers to the V track final plan's open issues 11, 7 and 6 (2026-10-19). One test per
// task, appended in order. The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("an aria-disabled button looks disabled in forced colors too: GrayText text and border (v-track polish 11)", () => {
  const css = read("src/app/globals.css")
  const blocks = [...css.matchAll(/@media \(forced-colors: active\) \{\n([\s\S]*?)\n\}/g)].map((match) => match[1])
  assert.ok(blocks.length > 0, "a forced-colors media block exists")
  const rule = blocks
    .map((block) => block.match(/\[data-slot="button"\]\[aria-disabled="true"\] \{([^}]*)\}/))
    .find(Boolean)
  assert.ok(rule, "the forced-colors block has a rule for an aria-disabled button")
  assert.match(rule[1], /(^|[\s;])color: GrayText;/)
  assert.match(rule[1], /border-color: GrayText;/)
  assert.match(read("src/components/ui/button.tsx"), /data-slot="button"/)
})

test("a review's refusal focuses its field as soon as the dialog has lost its layout box and handed focus back, not after ~1 s (v-track polish 7)", async () => {
  const globals = globalThis as unknown as Record<string, unknown>
  const had = { document: Object.hasOwn(globals, "document"), frame: Object.hasOwn(globals, "requestAnimationFrame") }
  const saved = { document: globals.document, frame: globals.requestAnimationFrame }
  // Frames run when the test says so.
  const frames: Array<() => void> = []
  const nextFrame = () => frames.shift()?.()
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5))
  globals.requestAnimationFrame = (callback: () => void) => frames.push(callback)
  // A fake document: focus is in the dialog, and focusin listeners are kept so the test can fire them.
  const inside = { name: "dialog's button" }
  const outside = { name: "the opener" }
  const listeners = new Set<(event: { target: unknown }) => void>()
  // The dialog stays connected after it closes (as in the running app); only its layout box goes.
  const makeDialog = () => ({
    isConnected: true,
    rects: [{}] as object[],
    getClientRects() {
      return this.rects
    },
    contains: (node: unknown) => node === inside,
  })
  const useDialog = (dialog: ReturnType<typeof makeDialog>) => {
    globals.document = {
      activeElement: { closest: (selector: string) => (selector === '[role="dialog"]' ? dialog : null) },
      addEventListener: (type: string, listener: (event: { target: unknown }) => void) => {
        if (type === "focusin") listeners.add(listener)
      },
      removeEventListener: (type: string, listener: (event: { target: unknown }) => void) => {
        if (type === "focusin") listeners.delete(listener)
      },
    }
  }
  const focusIn = (target: unknown) => [...listeners].forEach((listener) => listener({ target }))
  // A wait that never resolves fails here instead of hanging the run.
  const within = (promise: Promise<unknown>, what: string) =>
    Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} did not resolve`)), 200))])
  try {
    const { waitForDialogToClose } = await import("../src/lib/field-focus.ts")

    // (a) The layout box goes, then Radix hands focus back to the opener: the field takes focus right after that.
    const a = makeDialog()
    useDialog(a)
    let doneA = false
    const closingA = waitForDialogToClose().then(() => {
      doneA = true
    })
    nextFrame()
    nextFrame()
    focusIn(inside)
    await tick()
    assert.equal(doneA, false, "still open")
    a.rects = []
    nextFrame()
    await tick()
    assert.equal(doneA, false, "closed, but focus has not been handed back yet")
    focusIn(inside)
    await tick()
    assert.equal(doneA, false, "a focusin inside the dialog is not the hand-back")
    focusIn(outside)
    await within(closingA, "the wait after the hand-back")
    assert.equal(doneA, true)
    assert.ok(frames.length <= 1, "it did not run on towards its 60-frame limit")
    // (c) The focusin listener is gone once it resolves.
    assert.equal(listeners.size, 0, "the focusin listener is removed after the hand-back")
    frames.length = 0

    // (b) No focusin: it resolves 10 frames after the layout box is gone.
    const b = makeDialog()
    useDialog(b)
    let doneB = false
    const closingB = waitForDialogToClose().then(() => {
      doneB = true
    })
    nextFrame()
    b.rects = []
    for (let frame = 0; frame < 10; frame += 1) nextFrame()
    await tick()
    assert.equal(doneB, false, "not before the 10 frames have run")
    nextFrame()
    await within(closingB, "the wait after 10 frames")
    assert.equal(doneB, true)
    // (c) The focusin listener is gone after the frames ran out too.
    assert.equal(listeners.size, 0, "the focusin listener is removed after the 10 frames")
    frames.length = 0

    // The overall limit still applies to a dialog that never closes, and removes the listener too.
    useDialog(makeDialog())
    const stuck = waitForDialogToClose(2)
    nextFrame()
    nextFrame()
    nextFrame()
    await within(stuck, "the wait that gives up")
    assert.equal(listeners.size, 0, "the focusin listener is removed when it gives up")
  } finally {
    if (had.document) globals.document = saved.document
    else delete globals.document
    if (had.frame) globals.requestAnimationFrame = saved.frame
    else delete globals.requestAnimationFrame
  }
  const focus = read("src/lib/field-focus.ts")
  assert.match(focus, /export function waitForDialogToClose\(frames = 60\): Promise<void>/)
  assert.match(focus, /getClientRects\(\)\.length === 0/)
})
