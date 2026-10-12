import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const listPath = "src/components/master-data/supplier-list-view.tsx"
const list = existsSync(listPath) ? readFileSync(listPath, "utf8") : ""
const page = readFileSync("src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx", "utf8")
const dataTable = readFileSync("src/components/ui/data-table.tsx", "utf8")

test("supplier list has mutually exclusive desktop and mobile presentations", () => {
  assert.notEqual(list, "", "supplier-list-view.tsx must exist")
  assert.match(list, /data-supplier-desktop-table/)
  assert.match(list, /hidden[^"\n]*md:block/)
  assert.match(list, /data-supplier-mobile-list/)
  assert.match(list, /md:hidden/)
  assert.match(list, /<DataTable\b/)
  assert.match(list, /<article/)
})

test("mobile supplier cards expose operational fields and touch-safe actions", () => {
  for (const token of ["supplier.code", "supplier.name", "supplier.contactPerson", "supplier.phone", "supplier._count.assets", "supplier._count.maintenanceTickets", "supplier._count.purchaseDocuments"]) {
    assert.ok(list.includes(token), `missing ${token}`)
  }
  assert.match(list, /min-h-11 (?:min-)?w-11|<RowActions\b/)
  assert.match(list, /aria-label=/)
})

test("supplier desktop sorting exposes aria-sort and omits constant active status", () => {
  // The sort links and aria-sort come from DataTableHead (spec 2B §3.4).
  assert.match(list, /<DataTableHead sort=\{sortBy\("code"\)\}>/)
  assert.match(dataTable, /aria-sort=/)
  assert.doesNotMatch(list, /ActiveBadge/)
  assert.doesNotMatch(list, /tCommon\("status"\)/)
})

test("supplier list uses actionable empty states and disabled pagination controls", () => {
  assert.match(list, /ActionEmptyState/)
  assert.match(list, /hasActiveFilters/)
  // The page builds the shared Pagination (its disabled buttons are spans, pinned in asset-register-building-blocks-ui);
  // the list shows it once under the table and the phone cards.
  assert.match(page, /<Pagination\b/)
  assert.match(list, /<DataTableFoot>\{pagination\}<\/DataTableFoot>/)
})

test("supplier summaries use bounded count queries instead of loading every supplier", () => {
  assert.doesNotMatch(page, /summarySuppliers/)
  assert.doesNotMatch(page, /buildSupplierSummary/)
  assert.match(page, /prisma\.supplier\.count\(\{ where: \{ isActive: true, assets:/)
  assert.match(page, /prisma\.supplier\.count\(\{ where: \{ isActive: true, purchaseDocuments:/)
  assert.match(page, /<StatStrip\b/)
})

test("mobile filters use a disclosure while desktop filters remain visible", () => {
  assert.match(page, /<details/)
  assert.match(page, /md:hidden/)
  assert.match(page, /hidden[^"\n]*md:block/)
  assert.match(page, /min-h-11/)
})

test("the supplier create action meets the mobile touch target", () => {
  // buttonVariants size "md" is 44px tall below md and 36px from md (spec 2B I2).
  assert.match(page, /href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}/)
})
