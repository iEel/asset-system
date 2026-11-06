import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { FIELD_FOCUS_MARGIN, fieldScrollLeft, fieldScrollTop } from "../src/lib/field-focus.ts"

const focus = readFileSync("src/lib/field-focus.ts", "utf8").replace(/\r\n/g, "\n")

test("a field in a table scrolled sideways comes into view across before the vertical scroll (group 8 plan 2 final review fix 6)", () => {
  // A phone's table scroll region from 16 to 359 in the viewport, scrolled 380px right.
  const view = { scrollLeft: 380, viewLeft: 16, viewRight: 359 }
  // Already in view: no scroll.
  assert.equal(fieldScrollLeft({ ...view, fieldLeft: 100, fieldRight: 250 }), null)
  // Off to the left (column 1 while the user is at จำเป็น): its start lands 24px inside the left edge.
  assert.equal(fieldScrollLeft({ ...view, fieldLeft: -200, fieldRight: -50 }), 380 - 200 - (16 + FIELD_FOCUS_MARGIN))
  // Off to the right: the least scroll that puts its end 24px inside the right edge.
  assert.equal(fieldScrollLeft({ ...view, fieldLeft: 400, fieldRight: 520 }), 380 + 520 - (359 - FIELD_FOCUS_MARGIN))
  // Wider than the room: its start wins.
  assert.equal(fieldScrollLeft({ ...view, fieldLeft: 300, fieldRight: 800 }), 380 + 300 - (16 + FIELD_FOCUS_MARGIN))
  // Never before the start of the table.
  assert.equal(fieldScrollLeft({ ...view, scrollLeft: 5, fieldLeft: 10, fieldRight: 100 }), 0)
})

test("focusField scrolls the nearest horizontal scroller, then main as before", () => {
  assert.match(focus, /control\.focus\(\{ preventScroll: true \}\)\n\s+\/\/ A field in a table[^\n]*\n\s+const scroller = horizontalScroller\(control, main\)/)
  assert.match(focus, /if \(left !== null\) scroller\.scrollTo\(\{ left, behavior: "auto" \}\)\n\s+\}\n\s+const view = main\.getBoundingClientRect\(\)/)
  assert.match(focus, /const overflowX = getComputedStyle\(node\)\.overflowX\n\s+if \(overflowX === "auto" \|\| overflowX === "scroll"\) return node/)
  // The vertical part is unchanged.
  assert.equal(fieldScrollTop({ scrollTop: 500, viewTop: 64, viewBottom: 864, coverBottom: 72, fieldTop: 300, fieldBottom: 380 }), null)
  assert.match(focus, /if \(next !== null\) main\.scrollTo\(\{ top: next, behavior: "auto" \}\)/)
})
