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

test("the user and role forms: PageHeader and PageBackLink, and the role create page names itself (2B-1 task 22, I32)", () => {
  const user = read(`${C}admin/admin-user-form.tsx`)
  assert.ok(user.includes(HEADER_IMPORT), "admin-user-form.tsx imports PageHeader and PageBackLink")
  assert.match(user, /<PageHeader\n\s+title=\{title\}\n\s+meta=\{t\("formSubtitle"\)\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{backHref\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/)
  const role = read(`${C}admin/role-permission-form.tsx`)
  assert.ok(role.includes(HEADER_IMPORT), "role-permission-form.tsx imports PageHeader and PageBackLink")
  assert.match(role, /<PageHeader\n\s+title=\{isCreate \? t\("createTitle"\) : t\("editTitle"\)\}\n/, "the create page reads เพิ่มบทบาท, not แก้ไขสิทธิ์บทบาท")
  assert.match(role, /\n\s+back=\{<PageBackLink href=\{backHref\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/)
  for (const source of [user, role]) assert.doesNotMatch(source, /<h1\b|\bArrowLeft\b/)
})

test("the asset form and the component manager: PageHeader, and the component header no longer sticks (2B-1 task 22, I32)", () => {
  const form = read(`${C}assets/asset-form.tsx`)
  assert.ok(form.includes(HEADER_IMPORT), "asset-form.tsx imports PageHeader and PageBackLink")
  assert.match(form, /<PageHeader\n\s+title=\{title\}\n\s+meta=\{t\("subtitle"\)\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{backHref\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/)
  const manager = read(`${C}assets/asset-component-manager.tsx`)
  assert.ok(manager.includes(HEADER_IMPORT), "asset-component-manager.tsx imports PageHeader and PageBackLink")
  // The page title is the page's name; the parent asset's code and name are its first facts (spec §4.3.3 rule 6).
  assert.match(manager, /<PageHeader\n\s+title=\{labels\.title\}\n\s+meta=\{\n\s+<>\n\s+<span className="tag">\{parentAsset\.assetTag\}<\/span>\n\s+<span className="min-w-0 break-words">\{parentAsset\.name\}<\/span>\n\s+<\/>\n\s+\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{returnToHref\} label=\{labels\.back\} \/>\}\n\s+\/>/)
  assert.doesNotMatch(manager, /sticky top-0/, "the header of the component page scrolls with the page, like every other header")
  for (const source of [form, manager]) assert.doesNotMatch(source, /<h1\b|\bArrowLeft\b/)
})
