import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { hasHiddenHorizontalContentBefore, hasRemainingHorizontalContent } from "../src/lib/horizontal-scroll.ts"

test("horizontal overflow cue remains visible until the user reaches the end", () => {
  assert.equal(hasRemainingHorizontalContent({ scrollLeft: 0, clientWidth: 390, scrollWidth: 500 }), true)
  assert.equal(hasRemainingHorizontalContent({ scrollLeft: 106, clientWidth: 390, scrollWidth: 500 }), false)
  assert.equal(hasRemainingHorizontalContent({ scrollLeft: 0, clientWidth: 500, scrollWidth: 500 }), false)
})

test("the leading overflow cue shows once the row is scrolled past the tolerance (phone polish 4)", () => {
  assert.equal(hasHiddenHorizontalContentBefore({ scrollLeft: 0 }), false)
  assert.equal(hasHiddenHorizontalContentBefore({ scrollLeft: 4 }), false)
  assert.equal(hasHiddenHorizontalContentBefore({ scrollLeft: 5 }), true)
  assert.equal(hasHiddenHorizontalContentBefore({ scrollLeft: 110 }), true)
  assert.equal(hasHiddenHorizontalContentBefore({ scrollLeft: 10 }, 12), false)
})

// Phone polish 4: the row centres the current tab, so on ไฟล์ / ประวัติ the left tabs are cut; a ChevronLeft cue mirrors
// the right one, and both cues are computed after the initial scrollIntoView too, so the first paint is right.
test("asset detail tabs show a leading cue while tabs are hidden on the left, computed after the first scroll too (phone polish 4)", () => {
  const source = readFileSync("src/components/assets/asset-detail-tabs.tsx", "utf8").replace(/\r\n/g, "\n")

  assert.match(source, /import \{ AlertTriangle, ChevronLeft, ChevronRight \} from "lucide-react"/)
  assert.match(source, /import \{ hasHiddenHorizontalContentBefore, hasRemainingHorizontalContent \} from "@\/lib\/horizontal-scroll"/)
  assert.match(source, /const \[showLeadingCue, setShowLeadingCue\] = useState\(false\)/)
  // After the initial scrollIntoView: a frame later both cues read the row, then on every scroll.
  assert.match(
    source,
    /\?\.scrollIntoView\(\{ block: "nearest", inline: "center" \}\)\n(?:\s+\/\/[^\n]*\n)?\s+const frame = requestAnimationFrame\(\(\) => \{\n\s+const nav = navRef\.current\n\s+if \(!nav\) return\n\s+setShowOverflowCue\(hasRemainingHorizontalContent\(nav\)\)\n\s+setShowLeadingCue\(hasHiddenHorizontalContentBefore\(nav\)\)\n\s+\}\)\n\s+return \(\) => cancelAnimationFrame\(frame\)/,
  )
  assert.match(source, /function handleScroll\(event: UIEvent<HTMLElement>\) \{\n\s+const container = event\.currentTarget\n\s+setShowOverflowCue\(hasRemainingHorizontalContent\(container\)\)\n\s+setShowLeadingCue\(hasHiddenHorizontalContentBefore\(container\)\)\n\s+\}/)
  assert.match(
    source,
    /\{showLeadingCue \? \(\n\s+<span\n\s+aria-hidden="true"\n\s+className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-start border-l border-border bg-canvas\/95 pl-1 text-muted-foreground sm:hidden"\n\s+>\n\s+<ChevronLeft className="h-5 w-5" \/>\n\s+<\/span>\n\s+\) : null\}/,
  )
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
  assert.match(source, /count: indicator\?\.count === undefined \? undefined : formatCount\(indicator\.count\)/)
  assert.doesNotMatch(source, /aria-current=\{|<Link\b|bg-white\/|text-white|scrollSnapAlign/)
})
