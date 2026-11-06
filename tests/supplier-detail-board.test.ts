import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 8 plan 3 Task 3: the supplier page on board MD-Supplier (spec §7, §8, §9). Sources are read with \r stripped, so
// a regex here may hold \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx")
const documents = read("src/components/master-data/supplier-purchase-documents.tsx")
type Detail = Record<string, string> & { columns: Record<string, string> }
const th = JSON.parse(read("messages/th.json")) as { supplier: { detail: Detail } }
const en = JSON.parse(read("messages/en.json")) as { supplier: { detail: Detail } }

test("the page reads the one read model and nothing of its own", () => {
  assert.match(page, /readSupplierDetail\(prisma, id\)/)
  assert.doesNotMatch(page, /prisma\.(asset|purchaseDocument|maintenanceTicket|maintenancePlan)\./, "every count comes from readSupplierDetail")
})

test("header: name, code, contact line, แก้ไข with supplier:edit and ⋯ ปิดใช้งาน / เปิดใช้งาน", () => {
  assert.match(page, /hasPermission\(user, "supplier", "edit"\)/)
  assert.match(page, /hasPermission\(user, "supplier", "delete"\)/)
  assert.match(page, /canEdit \? \(\s*<Link href=\{editHref\}/)
  assert.match(page, /t\("detail\.contactLine", \{ name: supplier\.contactPerson \}\)/)
  assert.match(page, /<MasterDataRowActions\b/)
  assert.match(page, /getSupplierDeactivateBlockReason\(detail\.deactivateCounts\)/)
  assert.match(page, /canDeactivate && supplier\.isActive/)
  assert.match(page, /canEdit && !supplier\.isActive/)
  assert.match(page, /const endpoint = `\/api\/suppliers\/\$\{supplier\.id\}`/)
  assert.match(page, /<PageBackLink href=\{returnToHref\}/, "the back link is kept")
})

test("the strip of four: ทรัพย์สิน, เอกสารจัดซื้อ, งานซ่อม, ค่าซ่อมสะสม with the board's feet", () => {
  for (const key of ["assetsAllLinked", "assetsWithoutDocument", "purchaseAmountFoot", "repairsFoot", "repairCostFoot"]) {
    assert.match(page, new RegExp(`t\\("detail\\.${key}"`), key)
  }
  assert.match(page, /figures\.repairs\.open/)
  assert.match(page, /figures\.repairsWithCost/)
  assert.match(page, /href: canViewAssets \? hrefs\.assets : undefined/)
  assert.equal((page.match(/<StatStrip\b/g) ?? []).length, 1, "one strip")
})

test("assets: the latest 5 of n, ดูทรัพย์สินทั้งหมด (n) to the register only with asset:view, the board's columns", () => {
  assert.match(page, /hasPermission\(user, "asset", "view"\)/)
  assert.match(page, /t\("detail\.latestAssets", \{ shown: detail\.latestAssets\.length, total: figures\.assets \}\)/)
  assert.match(page, /canViewAssets && figures\.assets > 0 \? \(\s*<Link href=\{hrefs\.assets\}/)
  assert.match(page, /t\("detail\.viewAllAssets", \{ count: figures\.assets \}\)/)
  for (const key of ["asset", "categoryLocation", "status", "document", "purchasePrice"]) assert.match(page, new RegExp(`t\\("detail\\.columns\\.${key}"\\)`), key)
  assert.match(page, /ActionEmptyState title=\{t\("noAssets"\)\}/, "the empty state is kept")
})

test("documents: type label, invoice, linked count, amount or ยังไม่ระบุ, and the total row; phone cards kept", () => {
  assert.match(page, /documents=\{detail\.documents\}/)
  assert.match(page, /totals=\{detail\.documentTotals\}/)
  assert.match(documents, /labels\.typeLabels\[type\] \?\? type/)
  assert.equal((documents.match(/\{typeLabel\(document\.documentType\)\} <span className="tag">\{document\.documentNo\}<\/span>/g) ?? []).length, 2, "the table and the phone card")
  assert.match(documents, /labels\.amountUnset/)
  assert.match(documents, /<th scope="row" colSpan=\{2\}/)
  assert.match(documents, /labels\.totalRow/)
  assert.match(documents, /data-supplier-documents-mobile/)
  assert.match(documents, /data-supplier-documents-total/)
})

test("สิ่งที่ควรติดตาม: today's items, the open repairs with เปิดงานเมื่อ {date} ({n} วัน), MT- links only with maintenance:view", () => {
  assert.match(page, /buildSupplierFollowUpItems\(/)
  assert.match(page, /t\("detail\.openedOn", \{ date: formatDate\(repair\.reportedDate\), days: repair\.daysOpen \}\)/)
  assert.match(page, /hasPermission\(user, "maintenance", "view"\)/)
  assert.match(page, /canViewMaintenance \? \(\s*<Link href=\{`\/\$\{locale\}\/maintenance\/\$\{repair\.id\}`\}/)
  assert.match(page, /t\("detail\.openRepairLink", \{ repairNo: repair\.repairNo \}\)/)
})

test("ประวัติงานซ่อมกับผู้ขาย: asset name first, status, tag · MT-, problem, cost and the reported date kept", () => {
  assert.match(page, /detail\.repairHistory\.map/)
  assert.match(page, /\{ticket\.asset\.assetTag\} · \{ticket\.repairNo\}/)
  assert.match(page, /t\("reportedDate"\)/)
  assert.match(page, /canViewMaintenance \?/)
  assert.match(page, /ActionEmptyState title=\{t\("noMaintenance"\)\}/)
})

test("ข้อมูลผู้ขาย holds the code and contact facts, and says why it cannot be deactivated", () => {
  assert.match(page, /title=\{t\("profileTitle"\)\}/)
  assert.match(page, /key: "code", label: t\("code"\)/)
  assert.match(page, /deactivateBlocked \? <p/)
})

test("messages exist in th and en, English counts as ICU plurals", () => {
  for (const key of ["contactLine", "assetsAllLinked", "assetsWithoutDocument", "purchaseAmountFoot", "repairsFoot", "repairCostFoot", "latestAssets", "viewAllAssets", "documentsTotal", "amountUnset", "openedOn", "openRepairLink"]) {
    assert.ok(th.supplier.detail[key], `th ${key}`)
    assert.ok(en.supplier.detail[key], `en ${key}`)
  }
  assert.equal(th.supplier.detail.openedOn, "เปิดงานเมื่อ {date} ({days, number} วัน)")
  assert.equal(th.supplier.detail.repairCostFoot, "รวมจากใบซ่อม {count, number} ใบที่มีค่าใช้จ่าย")
  assert.match(en.supplier.detail.assetsWithoutDocument, /\{count, plural, one \{/)
})
