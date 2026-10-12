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

test("the two disposal create pages: PageHeader with the back link they had, on a space-y-6 root (2B-1 task 22, I19)", () => {
  const D = "src/app/[locale]/(dashboard)/"
  const request = read(`${D}disposal/new/page.tsx`)
  assert.ok(request.includes(HEADER_IMPORT), "disposal/new imports PageHeader and PageBackLink")
  assert.match(request, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("createTitle"\)\}\n\s+meta=\{t\("createSubtitle"\)\}\n\s+back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/)
  const batch = read(`${D}disposal/batch/new/page.tsx`)
  assert.ok(batch.includes(HEADER_IMPORT), "disposal/batch/new imports PageHeader and PageBackLink")
  // The icon-only link with an aria-label becomes the words "กลับคิวตัดจำหน่าย" from md and a 44px icon below md.
  assert.match(batch, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("batchCreateTitle"\)\}\n\s+meta=\{t\("batchCreateHelp"\)\}\n\s+back=\{<PageBackLink href=\{`\/\$\{locale\}\/disposal`\} label=\{t\("backToQueue"\)\} \/>\}\n\s+\/>/)
  for (const source of [request, batch]) assert.doesNotMatch(source, /<h1\b|\bArrowLeft\b|from "next\/link"|aria-label=/)
})

test("the three maintenance create and edit pages: crumbs in PageHeader and กลับ instead of ยกเลิก (2B-1 task 22, B2)", () => {
  const D = "src/app/[locale]/(dashboard)/"
  const pages = {
    "maintenance/new/page.tsx": /<div className="space-y-6">\n\s+<PageHeader\n\s+breadcrumbs=\{\[\{ label: t\("title"\), href: returnTo \}, \{ label: t\("createTitle"\) \}\]\}\n\s+title=\{t\("createTitle"\)\}\n\s+meta=\{plan \? t\("pmCreateSubtitle"\) : t\("createSubtitle"\)\}\n/,
    "maintenance/pm/new/page.tsx": /<div className="space-y-6">\n\s+<PageHeader\n\s+breadcrumbs=\{\[\{ label: t\("pmTitle"\), href: returnTo \}, \{ label: t\("pmCreateTitle"\) \}\]\}\n\s+title=\{t\("pmCreateTitle"\)\}\n\s+meta=\{t\("pmSubtitle"\)\}\n/,
    // The trail ends on the plan code, so the title is the plan's own name and the code is the first fact (spec §4.3.3 rule 6).
    "maintenance/pm/[id]/edit/page.tsx": /<div className="space-y-6">\n\s+<PageHeader\n\s+breadcrumbs=\{\[\{ label: t\("pmTitle"\), href: returnTo \}, \{ label: plan\.planNo, code: true \}\]\}\n\s+title=\{plan\.title\}\n\s+meta=\{<span className="tag">\{plan\.planNo\}<\/span>\}\n/,
  }
  for (const [file, header] of Object.entries(pages)) {
    const source = read(D + file)
    assert.ok(source.includes(HEADER_IMPORT), `${file} imports PageHeader and PageBackLink`)
    assert.match(source, header, file)
    assert.match(source, /\n\s+back=\{<PageBackLink href=\{returnTo\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/, file)
    assert.doesNotMatch(source, /<h1\b|<Breadcrumbs\b|from "next\/link"|tCommon\("cancel"\)/, file)
  }
})

test("the check-in form draws its title with PageHeader (2B-1 task 23, I13)", () => {
  const source = read(`${C}asset-operations/checkin-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "checkin-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-5xl">\n\s+<PageHeader title=\{t\("title"\)\} className="mb-6" \/>\n/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/, "the operation forms keep having no back button (B2)")
})

test("the check-out form's OperationShell draws its title with PageHeader and stays a card (2B-1 task 23, I13)", () => {
  const source = read(`${C}asset-operations/checkout-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "checkout-form.tsx imports PageHeader")
  assert.match(
    source,
    /function OperationShell\(\{ title, children \}: \{ title: string; children: React\.ReactNode \}\) \{\n\s+return \(\n\s+<div className="mx-auto max-w-5xl">\n\s+<PageHeader title=\{title\} className="mb-6" \/>\n\s+<section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-6">\{children\}<\/section>/,
  )
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})

test("the transfer form draws its title with PageHeader (2B-1 task 23, I13)", () => {
  const source = read(`${C}asset-operations/transfer-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "transfer-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-5xl">\n\s+<PageHeader title=\{t\("title"\)\} className="mb-6" \/>\n/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})

test("the bulk move form shows the selected count as the header's meta (2B-1 task 23, I13)", () => {
  const source = read(`${C}asset-operations/bulk-move-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "bulk-move-form.tsx imports PageHeader")
  assert.match(source, /<PageHeader title=\{t\("title"\)\} meta=\{t\("selectedCount", \{ count: assetIds\.length \}\)\} className="mb-6" \/>/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})

test("the new audit round form draws its title with PageHeader (2B-1 task 23, I13)", () => {
  const source = read(`${C}audit/audit-round-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "audit-round-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-5xl">\n\s+<PageHeader title=\{t\("createTitle"\)\} className="mb-6" \/>\n/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})

test("the three settings tables have the white 13/500 header in sentence case (2B-1 task 24, R-e)", () => {
  const source = read(`${C}admin/system-settings-form.tsx`)
  assert.equal(source.match(/<thead>/g)?.length, 3, "the prefix, advanced and change-review tables")
  assert.match(
    source,
    /function Head\(\{ children \}: \{ children: React\.ReactNode \}\) \{\n  return <th className="bg-surface px-4 py-2\.5 text-left align-bottom text-meta font-medium text-faint-foreground">\{children\}<\/th>\n\}/,
  )
  assert.doesNotMatch(source, /<thead className=|\bbg-muted\//)
})

test("the asset batch form: PageHeader and the white table header on its three tables (2B-1 task 24, I13, R-e)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "asset-batch-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-6xl">\n\s+<PageHeader title=\{t\("batchCreateTitle"\)\} meta=\{t\("batchCreateSubtitle"\)\} className="mb-6" \/>\n/)
  assert.equal(source.match(/<thead className="bg-surface text-left text-meta font-medium text-faint-foreground">/g)?.length, 3)
  assert.doesNotMatch(source, /<h1\b|\bbg-muted\/|text-xs font-semibold text-muted-foreground/)
})
