import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { hasRemainingHorizontalContent } from "../src/lib/horizontal-scroll.ts"

test("horizontal overflow cue remains visible until the user reaches the end", () => {
  assert.equal(hasRemainingHorizontalContent({ scrollLeft: 0, clientWidth: 390, scrollWidth: 500 }), true)
  assert.equal(hasRemainingHorizontalContent({ scrollLeft: 106, clientWidth: 390, scrollWidth: 500 }), false)
  assert.equal(hasRemainingHorizontalContent({ scrollLeft: 0, clientWidth: 500, scrollWidth: 500 }), false)
})

test("asset detail tabs snap, center the active tab, and expose a mobile overflow cue", () => {
  const source = readFileSync("src/components/assets/asset-detail-tabs.tsx", "utf8")

  assert.match(source, /^"use client"/)
  assert.match(source, /scrollSnapType: "x mandatory"/)
  assert.match(source, /activeTabRef\.current\?\.scrollIntoView/)
  assert.match(source, /hasRemainingHorizontalContent/)
  assert.match(source, /ChevronRight/)
})
