import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D7, D9, D18, M20, M21, M22, M25, M29, M32 b, M33): the shared bits and the asset
// transactions on the shared parts. The phone ActionBar is one row on a short screen, the asset page's in-page links
// open the view that shows their section, the operation forms are ContentPanels, messages Notice by meaning, empty
// states EmptyNote or ActionEmptyState, label and value pairs KeyValueList, empty values Nil, codes tag. Each test pins
// one file (or one tight group) and fails before that commit. Sources are read with LF line endings, so the regexes may
// contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("ActionBar: a short screen keeps the 44px links, halves the padding and puts the next step beside the links (spec 2D D18)", () => {
  const source = read(`${C}ui/action-bar.tsx`)
  assert.match(source, /className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] pt-3 md:hidden \[@media\(max-height:32rem\)\]:pb-\[max\(0\.375rem,env\(safe-area-inset-bottom\)\)\] \[@media\(max-height:32rem\)\]:pt-1\.5"/)
  assert.match(source, /<div className=\{cn\("mx-auto grid min-w-0 max-w-lg gap-2", primaryAction && "\[@media\(max-height:32rem\)\]:max-w-3xl \[@media\(max-height:32rem\)\]:grid-cols-\[minmax\(0,1fr\)_minmax\(0,2fr\)\]"\)\}>/)
  assert.match(source, /buttonVariants\(\{ variant: action\.primary \? "default" : "outline", size: "sm" \}\)/, "size sm stays 44px tall below md")
  assert.doesNotMatch(source, /32rem\)\]:(?:min-)?h-|32rem\)\]:hidden/, "nothing shrinks a 44px target or hides an action on a short screen")
})
