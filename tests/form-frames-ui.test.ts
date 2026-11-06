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
      // Group 7 plan 3 Task 2: the location form's meta is its board's lead line, one for create and one for edit.
      // Group 8 plan 2 Task 2: the category form's meta is the usage line on edit and the subtitle on create.
      /<PageHeader\n\s+title=\{title\}\n\s+meta=\{(?:t\("subtitle"\)|meta|isEdit \? t\("form\.introEdit"\) : t\("form\.introCreate"\))\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{backHref\}(?: onClick=\{confirmNavigation\})? label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/,
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
  // Group 4 plan 2 Task 6a: the asset form's header is AssetFormHeader (asset-form-header.tsx); on create its meta is the
  // line that says only the first card is needed, and its actions hold the workspace's single/batch switch.
  const form = read(`${C}assets/asset-form-header.tsx`)
  assert.ok(form.includes(HEADER_IMPORT), "asset-form-header.tsx imports PageHeader and PageBackLink")
  // Task 7: on edit the meta names the asset's code, status, holder and room, with a link to the asset page.
  assert.match(form, /<PageHeader\n\s+title=\{title\}\n\s+meta=\{mode === "create" \? t\("createRequiredHint"\) : edit \? <AssetFormEditMeta assetTag=\{edit\.assetTag\} context=\{edit\.context\} \/> : t\("subtitle"\)\}\n\s+actions=\{actions\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{backHref\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/)
  assert.match(read(`${C}assets/asset-form.tsx`), /<AssetFormHeader mode=\{isEdit \? "edit" : "create"\} title=\{title\} backHref=\{backHref\} actions=\{headerActions\} edit=\{headerEdit\} \/>/)
  assert.doesNotMatch(read(`${C}assets/asset-form.tsx`), /<h1\b|\bArrowLeft\b/)
  const manager = read(`${C}assets/asset-component-manager.tsx`)
  assert.ok(manager.includes(HEADER_IMPORT), "asset-component-manager.tsx imports PageHeader and PageBackLink")
  // The page title is the page's name; the parent asset's name, code, holder and room are its facts (spec §4.3.3 rule 6;
  // group 4 plan 4 Task 3: name first, and the editor's primary ติดตั้งส่วนควบ in the actions).
  assert.match(manager, /<PageHeader\n\s+title=\{labels\.title\}\n\s+meta=\{\n\s+<>\n\s+<span className="min-w-0 break-words">\{header\.name\}<\/span>\n\s+<span className="tag">\{header\.assetTag\}<\/span>\n\s+<span>\{holderText\}<\/span>\n\s+\{header\.room \? <span>\{header\.room\}<\/span> : null\}\n\s+<\/>\n\s+\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{returnToHref\} label=\{labels\.back\} \/>\}\n\s+actions=\{/)
  assert.doesNotMatch(manager, /sticky top-0/, "the header of the component page scrolls with the page, like every other header")
  for (const source of [form, manager]) assert.doesNotMatch(source, /<h1\b|\bArrowLeft\b/)
})

// Group 6 plan 3 Task 2: ยื่นคำขอตัดจำหน่าย moved onto the operation frame (spec §8.1): crumbs and the back link it had.
// Request batches Task 2: สร้างชุดคำขอ moved onto the operation frame too; its page keeps PageHeader for the phone notice
// and the missing-schema state, and the phone notice links to the single form.
test("the two disposal create pages are the operation frame with crumbs and the back link; the batch page keeps PageHeader for the phone and the missing schema (2B-1 task 22, I19)", () => {
  const D = "src/app/[locale]/(dashboard)/"
  const request = read(`${D}disposal/new/page.tsx`)
  assert.ok(request.includes('import { PageBackLink } from "@/components/ui/page-header"'), "disposal/new imports only the back link")
  assert.match(request, /<DisposalRequestForm\n\s+breadcrumbs=\{\[\{ label: t\("title"\), href: `\/\$\{locale\}\/disposal` \}, \{ label: t\("createTitle"\) \}\]\}\n\s+back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  const batch = read(`${D}disposal/batch/new/page.tsx`)
  assert.ok(batch.includes(HEADER_IMPORT), "disposal/batch/new imports PageHeader and PageBackLink")
  // The icon-only link with an aria-label becomes the words "กลับคิวตัดจำหน่าย" from md and a 44px icon below md.
  assert.match(batch, /const back = <PageBackLink href=\{`\/\$\{locale\}\/disposal`\} label=\{t\("backToQueue"\)\} \/>\n/)
  assert.equal(batch.match(/<PageHeader title=\{t\("batchCreateTitle"\)\} meta=\{t\("batchCreateHelp"\)\} back=\{back\} \/>/g)?.length, 2, "the missing schema and the phone")
  assert.match(batch, /<div data-disposal-batch-phone className="space-y-6 md:hidden">/)
  assert.match(batch, /<DisposalBatchForm\n\s+breadcrumbs=\{\[\{ label: t\("title"\), href: `\/\$\{locale\}\/disposal` \}, \{ label: t\("batchCreateTitle"\) \}\]\}\n\s+back=\{back\}/)
  assert.doesNotMatch(request, /from "next\/link"/)
  for (const source of [request, batch]) assert.doesNotMatch(source, /<h1\b|\bArrowLeft\b|aria-label=/)
})

// บันทึกซ่อม moved onto the operation frame (group 5 plan 2 Task 3): its own test below.
// Group 5 plan 4 Task 4 (spec §10): the PM form moved onto the operation frame as บันทึกซ่อม did.
test("the two PM create and edit pages are the operation frame with the crumbs and กลับ, not ยกเลิก (2B-1 task 22, B2; group 5 spec §10)", () => {
  const D = "src/app/[locale]/(dashboard)/"
  const crumbs = String.raw`breadcrumbs=\{\[\n\s+\{ label: tRecord\("title"\), href: ` + "`" + String.raw`\/\$\{locale\}\/maintenance` + "`" + String.raw` \},\n\s+\{ label: t\("pmTitle"\), href: maintenanceListCrumbHref\(returnTo, ` + "`" + String.raw`\/\$\{locale\}\/maintenance\/pm` + "`" + String.raw`\) \},\n\s+\{ label: t\("(?:pmCreateTitle|pmFormEditCrumb)"\) \},\n\s+\]\}`
  for (const file of ["maintenance/pm/new/page.tsx", "maintenance/pm/[id]/edit/page.tsx"]) {
    const source = read(D + file)
    assert.ok(source.includes('import { PageBackLink } from "@/components/ui/page-header"'), `${file} imports only the back link`)
    assert.match(source, new RegExp(String.raw`<MaintenancePlanForm\n\s+` + crumbs + String.raw`\n\s+back=\{<PageBackLink href=\{returnTo\} label=\{tCommon\("back"\)\} \/>\}\n`), file)
    assert.doesNotMatch(source, /<h1\b|<Breadcrumbs\b|<PageHeader\b|from "next\/link"|tCommon\("cancel"\)/, file)
  }
  const form = read(`${C}maintenance/maintenance-plan-form.tsx`)
  assert.ok(form.includes('import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"'), "maintenance-plan-form.tsx imports OperationFormFrame")
  assert.match(form, /<OperationFormFrame\n\s+title=\{title\}\n\s+description=\{description\}\n\s+breadcrumbs=\{breadcrumbs\}\n\s+back=\{back\}\n/)
  assert.doesNotMatch(form, /<h1\b|PageHeader|ContentPanel/)
})

test("the check-in form is the operation frame, with T7's legacy link in its header (group 3 plan 2 Task 8)", () => {
  const source = read(`${C}asset-operations/checkin-form.tsx`)
  assert.ok(source.includes('import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"'), "checkin-form.tsx imports OperationFormFrame")
  assert.match(source, /<OperationFormFrame\n\s+title=\{t\("title"\)\}\n\s+description=\{t\("description"\)\}\n\s+actions=\{legacyLink\}\n/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/, "the operation forms keep having no back button (B2)")
})

test("the check-out form is the operation frame (group 3 plan 1 Task 6)", () => {
  const source = read(`${C}asset-operations/checkout-form.tsx`)
  assert.ok(source.includes('import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"'), "checkout-form.tsx imports OperationFormFrame")
  assert.match(source, /<OperationFormFrame\n\s+title=\{t\("title"\)\}\n\s+description=\{t\("description"\)\}/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})

test("the transfer form is the operation frame (group 3 plan 3 Task 6)", () => {
  const source = read(`${C}asset-operations/transfer-form.tsx`)
  assert.ok(source.includes('import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"'), "transfer-form.tsx imports OperationFormFrame")
  assert.match(source, /<OperationFormFrame\n\s+title=\{t\("title"\)\}\n\s+description=\{t\("description"\)\}\n\s+summaryOnPhone=\{false\}\n/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink|PageHeader|ContentPanel/, "the operation forms keep having no back button (B2)")
})

test("บันทึกซ่อม is the operation frame with the crumbs and the back link it had (group 5 spec §7.1, plan 2 Task 3)", () => {
  const page = read("src/app/[locale]/(dashboard)/maintenance/new/page.tsx")
  assert.ok(page.includes('import { PageBackLink } from "@/components/ui/page-header"'), "the page imports only the back link")
  assert.match(page, /<RepairRecordForm\n\s+breadcrumbs=\{\[\{ label: t\("title"\), href: maintenanceListCrumbHref\(returnTo, `\/\$\{locale\}\/maintenance`\) \}, \{ label: t\("createTitle"\) \}\]\}\n\s+back=\{<PageBackLink href=\{returnTo\} label=\{tCommon\("back"\)\} \/>\}\n/)
  assert.doesNotMatch(page, /<h1\b|<Breadcrumbs\b|<PageHeader\b|tCommon\("cancel"\)/)
  const form = read(`${C}maintenance/repair-record-form.tsx`)
  assert.ok(form.includes('import { OperationFormFrame } from "@/components/asset-operations/operation-form-frame"'), "repair-record-form.tsx imports OperationFormFrame")
  assert.match(form, /<OperationFormFrame\n\s+title=\{t\("createTitle"\)\}\n\s+description=\{plan \? t\("pmCreateSubtitle"\) : t\("createSubtitle"\)\}\n\s+breadcrumbs=\{breadcrumbs\}\n\s+back=\{back\}\n/)
  assert.doesNotMatch(form, /<h1\b|PageHeader|ContentPanel/)
})

test("ย้ายที่ตั้งหลายรายการ: one PageHeader with the subtitle at every width, and the count in the bar (2B-1 task 23, I13; group 3 spec §10.1, §10.2; plan 4 P4-R19)", () => {
  const source = read(`${C}asset-operations/bulk-move-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "bulk-move-form.tsx imports PageHeader")
  assert.equal(source.match(/<PageHeader\b/g)?.length, 1)
  assert.match(source, /<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>/)
  assert.match(source, /countLabel=\{t\("selectedCount", \{ count: formatCount\(selection\.size\) \}\)\}/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink|meta=\{t\("selectedCount"/)
})

test("the new audit round form draws its title and trail with PageHeader (2B-1 task 23, I13; group 2 spec §7)", () => {
  const source = read(`${C}audit/audit-round-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "audit-round-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-6xl">\n\s+<PageHeader\n\s+title=\{t\("createTitle"\)\}\n\s+breadcrumbs=\{\[\{ label: t\("title"\), href: `\/\$\{locale\}\/audit\/rounds` \}, \{ label: t\("createRound"\) \}\]\}\n\s+className="mb-6"\n\s+\/>\n/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})

// Plan 2D-2 moved the three settings tables from the local Head onto the shared DataTable, inside their panels.
test("the three settings tables are the shared DataTable with its white 13/500 header (2B-1 task 24, R-e; plan 2D-2)", () => {
  const source = read(`${C}admin/system-settings-form.tsx`)
  assert.equal(source.match(/<DataTableHeader>/g)?.length, 3, "the prefix, advanced and change-review tables")
  assert.equal(source.match(/<DataTable framed=\{false\}/g)?.length, 3, "each sits in its panel, so it has no frame of its own")
  assert.doesNotMatch(source, /<thead\b|<th\b|function Head\b|\bbg-muted\//)
})

// Plan 2D-3 moved the three hand tables onto the shared DataTable, without a frame of their own inside their panels.
test("the asset batch form: PageHeader and the shared DataTable for its three tables (2B-1 task 24, I13, R-e; plan 2D-3)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "asset-batch-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-6xl">\n\s+<PageHeader title=\{t\("batchCreateTitle"\)\} meta=\{t\("batchCreateSubtitle"\)\} className="mb-6" \/>\n/)
  assert.equal(source.match(/<DataTableHeader>/g)?.length, 3)
  assert.equal(source.match(/<DataTable framed=\{false\}/g)?.length, 3)
  assert.doesNotMatch(source, /<h1\b|<thead\b|<th\b|\bbg-muted\/|text-xs font-semibold text-muted-foreground/)
})

test("the depreciation builder formats its preview with the shared th-TH helpers (2B-1 task 24, R-f)", () => {
  const source = read(`${C}admin/depreciation-policy-builder.tsx`)
  assert.ok(source.includes('import { formatCount, formatMoney } from "@/lib/display-format"'), "depreciation-policy-builder.tsx imports the shared helpers")
  // The preview is a KeyValueList since plan 2D-2, so the values are item fields.
  assert.match(source, /value: formatCount\(preview\.ageMonths\) \}/)
  assert.equal(source.match(/value: formatMoney\(preview\.\w+\) \}/g)?.length, 3)
  assert.doesNotMatch(source, /function formatMoney\b|toLocaleString/, "no local formatter is left")
})
