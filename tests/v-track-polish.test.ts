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

test("the prefix editor's transfer arrows wait with their reason beside them: aria-disabled, described by one visible line (v-track polish 6)", () => {
  const form = read("src/components/admin/system-settings-form.tsx")
  assert.doesNotMatch(form, /disabled=\{checkedAvailableCategoryIds\.length === 0\}/)
  assert.doesNotMatch(form, /disabled=\{checkedSelectedCategoryIds\.length === 0\}/)
  // Both buttons stay focusable, say they wait, and point at the reason while they wait.
  assert.match(
    form,
    /onClick=\{addCheckedCategoriesToPrefix\}\s+aria-disabled=\{checkedAvailableCategoryIds\.length === 0 \|\| undefined\}\s+aria-describedby=\{checkedAvailableCategoryIds\.length === 0 \? "category-prefix-transfer-reason" : undefined\}/
  )
  assert.match(
    form,
    /onClick=\{removeCheckedCategoriesFromPrefix\}\s+aria-disabled=\{checkedSelectedCategoryIds\.length === 0 \|\| undefined\}\s+aria-describedby=\{checkedSelectedCategoryIds\.length === 0 \? "category-prefix-transfer-reason" : undefined\}/
  )
  // One visible line under the two buttons, shown only while either waits.
  assert.match(
    form,
    /\{\(checkedAvailableCategoryIds\.length === 0 \|\| checkedSelectedCategoryIds\.length === 0\) && \(\s*<p id="category-prefix-transfer-reason" className="text-meta text-muted-foreground[^"]*">\s*\{labels\.prefixTransferNeedsSelection\}\s*<\/p>\s*\)\}/
  )
  assert.match(form, /prefixTransferNeedsSelection: string/)
  assert.match(read("src/app/[locale]/(dashboard)/admin/settings/page.tsx"), /prefixTransferNeedsSelection: t\("prefixTransferNeedsSelection"\)/)
  // Both handlers return first when nothing is checked.
  assert.match(form, /const addCheckedCategoriesToPrefix = \(\) => \{\n\s+if \(checkedAvailableCategoryIds\.length === 0\) return\n/)
  assert.match(form, /const removeCheckedCategoriesFromPrefix = \(\) => \{\n\s+if \(checkedSelectedCategoryIds\.length === 0\) return\n/)
  // The reason's text in both languages.
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.systemSettingsPage.prefixTransferNeedsSelection, "ติ๊กเลือกหมวดหมู่ในรายการก่อน แล้วจึงกดย้าย")
  assert.equal(en.systemSettingsPage.prefixTransferNeedsSelection, "Tick categories in a list first, then move them.")
})
