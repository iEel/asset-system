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
  assert.match(source, /navRef\.current\?\.querySelector\('\[aria-current="page"\]'\)\?\.scrollIntoView/)
  assert.match(source, /hasRemainingHorizontalContent/)
  assert.match(source, /ChevronRight/)
})

// Plan 2B-4 Task 2 (spec 2B I9, §8.8 row 2, B3(5)): the detail tabs are the shared TabNav (underline at every width,
// 44px on phones, aria-current set by the primitive). This client wrapper keeps the scrolling: the nav ref, onScroll,
// the snap style, snap-start on every link and the phone overflow cue. The count has no translucent chip any more.
// This file reads the source raw (CRLF): no line breaks in these regexes.
test("asset detail tabs wrap the shared TabNav and keep their own scrolling (spec 2B I9)", () => {
  const source = readFileSync("src/components/assets/asset-detail-tabs.tsx", "utf8")

  assert.match(source, /import \{ TabNav \} from "@\/components\/ui\/tab-nav"/)
  assert.match(source, /<TabNav\s+ref=\{navRef\}\s+aria-label=\{label\}\s+current=\{view\}\s+onScroll=\{handleScroll\}\s+style=\{\{ scrollSnapType: "x mandatory" \}\}\s+linkClassName="snap-start"/)
  assert.match(source, /count: indicator\?\.count \? formatCount\(indicator\.count\) : undefined/)
  assert.doesNotMatch(source, /aria-current=\{|<Link\b|bg-white\/|text-white|scrollSnapAlign/)
})
