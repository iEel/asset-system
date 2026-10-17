import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-5 (spec 2D §1, §3.5): the fixes handed to the last plan of 2D, one test per commit, each failing before its
// commit: the asset state help's phone target, two-line StatStrip feet, the dashboard skeleton, the settings labels no
// one read, words instead of English codes on the settings screens, Thai loading and result lines, export links that
// download and the message keys no code reads. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"
const D = "src/app/[locale]/(dashboard)/"

test("the asset state help trigger stays a 24px circle and gets a 44px hit area below md (the user, 2026-10-17)", () => {
  const source = read(`${C}assets/asset-state-help-popover.tsx`)
  const trigger = source.match(/<button\b[\s\S]*?className="([^"]+)"/)?.[1].split(/\s+/) ?? []
  // Below md: 10 + 24 + 10 = 44px wide and 16 + 24 + 4 = 44px tall. The box stops 4px under the circle, where the
  // field's own control starts (a 20px label row, the circle's -2px margins, the field's 6px gap). From md it is off.
  for (const token of ["inline-flex", "h-6", "w-6", "rounded-full", "relative", "after:absolute", "after:-inset-x-2.5", "after:-top-4", "after:-bottom-1", "md:after:hidden"]) {
    assert.ok(trigger.includes(token), `trigger class ${token}`)
  }
  assert.doesNotMatch(source, /\b(?:min-h-11|min-w-11|size-11|h-11|w-11)\b|-m-2\.5|-mx-2\.5|-my-2\.5/, "the circle itself does not grow or shift")
  assert.equal(source.match(/<button\b/g)?.length, 1, "still one raw button (plan 2D-3 R5)")
  // Every caller stays as it is: two field labels each in the asset form and the register filter sheet, the asset page
  // header and the register table head (shown from md only, where the hit area is off).
  const callers: Array<[string, number]> = [
    [`${C}assets/asset-form.tsx`, 2],
    [`${C}assets/asset-register-filter-sheet.tsx`, 2],
    [`${D}assets/[id]/page.tsx`, 2],
    [`${C}assets/asset-register-table.tsx`, 1],
  ]
  for (const [path, count] of callers) assert.equal(read(path).match(/<AssetStateHelpPopover \{\.\.\.\w+\} \/>/g)?.length, count, path)
})
