import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B plan 1, Tasks 22–24 (spec 2B §4.4.2, §4.5, §9.2.1, I1, I13, I32, R-e, R-f): the forms and new/edit pages
// that 2B-1 moves draw their title with the shared PageHeader, a back link in a header is PageBackLink with the href
// the page already computed, and the three 2C files of Task 24 take the white table header and the th-TH number
// helpers. Most of these files are CRLF in the working tree, so sources are read with \r stripped and the regexes
// below may hold \n. The "nothing left" side (no <h1>, no hand-placed ArrowLeft, no header fill) is LFG LH1, LB1
// and LT1 and VFG R7.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"
const HEADER_IMPORT = 'import { PageBackLink, PageHeader } from "@/components/ui/page-header"'

test("the 9 master-data forms: PageHeader with the subtitle as meta and the back link to backHref (2B-1 task 22)", () => {
  const forms = ["asset-model", "branch", "brand", "category", "company", "department", "employee", "location", "supplier"]
  for (const name of forms) {
    const path = `${C}master-data/${name}-form.tsx`
    const source = read(path)
    assert.ok(source.includes(HEADER_IMPORT), `${path}: imports PageHeader and PageBackLink`)
    assert.match(
      source,
      /<PageHeader\n\s+title=\{title\}\n\s+meta=\{t\("subtitle"\)\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{backHref\}(?: onClick=\{confirmNavigation\})? label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/,
      path,
    )
    assert.doesNotMatch(source, /<h1\b|\bArrowLeft\b/, path)
  }
  assert.match(
    read(`${C}master-data/supplier-form.tsx`),
    /<PageBackLink href=\{backHref\} onClick=\{confirmNavigation\} label=\{tCommon\("back"\)\} \/>/,
    "the supplier back link still asks before it drops unsaved changes",
  )
})
