import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-2 (spec 2D §3.2, D2, D18, M29): the topbar and sidebar buttons are the shared Button (ghost icon buttons,
// 36px from md and 44px below), and the topbar's right group keeps its width so the search narrows instead of running
// under the bell at 200% zoom. The search field itself is phase 3 (D2): only its width moved to its anchor.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("the topbar uses Button for its icon buttons and menu triggers, and its right group keeps its width (spec 2D D18, M29)", () => {
  const source = read(`${C}layout/topbar.tsx`)
  assert.doesNotMatch(source, /<button\b|border-dashed|rounded-full px-2 py-0\.5|sm:h-9|sm:min-h-0|size=\{\d+\}|bg-primary text-sm font-medium text-white/)
  assert.equal(source.match(/<Button\s+variant="ghost"\s+size="icon"/g)?.length, 2, "menu and sidebar toggle")
  assert.equal(source.match(/<Button variant="ghost" size="md"/g)?.length, 1, "the language menu trigger")
  assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline", size: "icon" \}\), "hidden lg:inline-flex"\)\}/)
  assert.match(source, /<div className="flex shrink-0 items-center gap-1 sm:gap-2">/)
  const search = read(`${C}layout/global-search.tsx`)
  assert.match(search, /<div ref=\{anchorRef\} className=\{cn\(variant === "bar" \? "relative hidden w-\[min\(28rem,36vw\)\] min-w-0 max-w-full lg:block" : "relative w-full"\)\}>/)
  assert.match(search, /className=\{cn\("h-9 w-full min-w-0 rounded-md [^"]*", variant === "sheet" && "h-11 text-base"\)\}/)
})

test("the sidebar has no drawer; its one raw button is the group row (spec 2D M29, menu B shell task 9)", () => {
  const source = read(`${C}layout/sidebar.tsx`)
  assert.doesNotMatch(source, /<Sheet\b|onMobileClose/)
  assert.equal(source.match(/<button\b/g)?.length, 1, "only the group disclosure row, a nav row of its own")
})
