import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { orderIdsByCount, readPageIdsByCount } from "../src/lib/master-data-list-ui.ts"
import {
  buildSupplierFilterChips,
  buildSupplierOrderBy,
  getSupplierDeactivateBlockReason,
  isSupplierCountSort,
  parseSupplierListParams,
  supplierListHasFieldFilters,
  supplierSorts,
  supplierSummaryLineWheres,
} from "../src/lib/organization-master-query.ts"
import { readSupplierOpenRepairCounts, supplierOpenRepairWhere } from "../src/lib/supplier-detail.ts"

// Group 8 plan 3 Task 1: the suppliers list on board MD-Suppliers (spec §3, §7) with plan 1's shared list pattern, and
// what spec §8 keeps. Sources are read with \r stripped, so a regex here may hold \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx")
const list = read("src/components/master-data/supplier-list-view.tsx")
const detail = read("src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx")
const detailModel = read("src/lib/supplier-detail.ts")
type Messages = { supplier: Record<string, unknown> & { list: Record<string, string>; deactivate: Record<string, unknown>; reactivate: Record<string, string> } }
const th = JSON.parse(read("messages/th.json")) as Messages
const en = JSON.parse(read("messages/en.json")) as Messages

test("an open repair is an active one not closed or cancelled: one where for the list and the supplier page", () => {
  assert.deepEqual(supplierOpenRepairWhere, { isActive: true, repairStatus: { notIn: ["closed", "cancelled"] } })
  // Task 2: the page reads it through readSupplierDetail.
  assert.match(detailModel, /db\.maintenanceTicket\.count\(\{ where: \{ vendorId: supplierId, \.\.\.supplierOpenRepairWhere \} \}\)/)
  assert.match(detail, /readSupplierDetail\(prisma, id\)/)
  assert.doesNotMatch(detail, /notIn: \["closed", "cancelled"\]/, "the page reads the shared where")
})

test("readSupplierOpenRepairCounts groups the open repairs by vendor, 2,000 ids a query", async () => {
  const calls: Array<{ by: string[]; where: Record<string, unknown> }> = []
  const db = {
    maintenanceTicket: {
      groupBy: async (args: object) => {
        const typed = args as { by: string[]; where: { vendorId: { in: string[] } } }
        calls.push(typed)
        return typed.where.vendorId.in.slice(0, 2).map((id, index) => ({ vendorId: id, _count: { _all: index + 1 } }))
      },
    },
  }
  const ids = Array.from({ length: 2001 }, (_, index) => `s${index}`)
  const counts = await readSupplierOpenRepairCounts(db, ids)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0].by, ["vendorId"])
  assert.deepEqual({ ...calls[0].where, vendorId: undefined }, { ...supplierOpenRepairWhere, vendorId: undefined })
  assert.equal((calls[0].where.vendorId as { in: string[] }).in.length, 2000)
  assert.equal(counts.get("s0"), 1)
  assert.equal(counts.get("s1"), 2)
  assert.equal(counts.get("s2000"), 1)
  assert.equal(counts.get("s5"), undefined)
  assert.equal((await readSupplierOpenRepairCounts(db, [])).size, 0)
  assert.equal(calls.length, 2, "no query for no ids")
})

test("the suppliers list sorts by name A→Z by default; every supplierSorts value stays; the id breaks ties", () => {
  assert.deepEqual(parseSupplierListParams({}).sort, "name")
  assert.deepEqual(parseSupplierListParams({}).direction, "asc")
  for (const sort of supplierSorts) assert.equal(parseSupplierListParams({ sort }).sort, sort)
  assert.equal(parseSupplierListParams({ sort: "createdAt" }).direction, "desc")
  assert.deepEqual(buildSupplierOrderBy({ sort: "code", direction: "desc" }), [{ code: "desc" }, { id: "asc" }])
  assert.equal(isSupplierCountSort("assets"), true)
  assert.equal(isSupplierCountSort("purchaseDocuments"), true)
  assert.equal(isSupplierCountSort("name"), false)
})

test("count sorts order the filtered ids by active count in memory, the id as tie-breaker, then page (plan 2 fix 1)", async () => {
  const counts = new Map([["a", 2], ["b", 5], ["d", 2]])
  assert.deepEqual(orderIdsByCount(["d", "c", "b", "a"], counts, "desc"), ["b", "a", "d", "c"])
  assert.deepEqual(orderIdsByCount(["d", "c", "b", "a"], counts, "asc"), ["c", "a", "d", "b"])
  const chunks: number[] = []
  const ids = Array.from({ length: 2001 }, (_, index) => `id${String(index).padStart(4, "0")}`)
  const readCounts = async (chunk: string[]) => {
    chunks.push(chunk.length)
    return chunk.filter((id) => id === "id2000" || id === "id0003").map((id) => ({ id, count: id === "id2000" ? 9 : 4 }))
  }
  assert.deepEqual(await readPageIdsByCount({ ids, direction: "desc", page: 1, pageSize: 3, readCounts }), ["id2000", "id0003", "id0000"])
  assert.deepEqual(chunks, [2000, 1])
})

test("the phone filters open on a filter field; the status is the segmented control", () => {
  assert.equal(supplierListHasFieldFilters(parseSupplierListParams({})), false)
  assert.equal(supplierListHasFieldFilters(parseSupplierListParams({ status: "inactive" })), false)
  assert.equal(supplierListHasFieldFilters(parseSupplierListParams({ search: "x" })), true)
  assert.equal(supplierListHasFieldFilters(parseSupplierListParams({ assetUsage: "withAssets" })), true)
  assert.equal(supplierListHasFieldFilters(parseSupplierListParams({ purchaseDocumentUsage: "withoutPurchaseDocuments" })), true)
})

test("the filter chips: one per usage filter in use, each a link without it", () => {
  const state = parseSupplierListParams({ assetUsage: "withAssets", purchaseDocumentUsage: "withoutPurchaseDocuments", page: "3" })
  const chips = buildSupplierFilterChips({
    basePath: "/th/master-data/suppliers",
    state,
    labels: {
      assets: "การผูกทรัพย์สิน",
      purchaseDocuments: "เอกสารจัดซื้อ",
      assetUsage: { withAssets: "มีทรัพย์สิน", withoutAssets: "ยังไม่มีทรัพย์สิน" },
      purchaseDocumentUsage: { withPurchaseDocuments: "มีเอกสารจัดซื้อ", withoutPurchaseDocuments: "ยังไม่มีเอกสารจัดซื้อ" },
    },
  })
  assert.deepEqual(chips.map((chip) => chip.label), ["การผูกทรัพย์สิน: มีทรัพย์สิน", "เอกสารจัดซื้อ: ยังไม่มีเอกสารจัดซื้อ"])
  assert.match(chips[0].href, /assetUsage=all/)
  assert.match(chips[0].href, /purchaseDocumentUsage=withoutPurchaseDocuments/)
  assert.match(chips[0].href, /page=1/)
  assert.match(chips[1].href, /purchaseDocumentUsage=all/)
  assert.equal(buildSupplierFilterChips({ basePath: "/th/master-data/suppliers", state: parseSupplierListParams({}), labels: { assets: "", purchaseDocuments: "", assetUsage: { withAssets: "", withoutAssets: "" }, purchaseDocumentUsage: { withPurchaseDocuments: "", withoutPurchaseDocuments: "" } } }).length, 0)
})

test("the summary line counts the filtered suppliers' active assets and open repairs", () => {
  const where = { isActive: true }
  assert.deepEqual(supplierSummaryLineWheres(where), {
    assets: { isActive: true, supplier: { is: where } },
    openRepairs: { ...supplierOpenRepairWhere, vendor: { is: where } },
  })
})

test("ปิดใช้งาน is unavailable with the route's reason: assets, repairs, PM plans and purchase documents (shouldBlockSupplierLifecycleChange)", () => {
  assert.equal(getSupplierDeactivateBlockReason({ assets: 0, maintenanceTickets: 0, maintenancePlans: 0, purchaseDocuments: 0 }), null)
  assert.equal(
    getSupplierDeactivateBlockReason({ assets: 0, maintenanceTickets: 0, maintenancePlans: 2, purchaseDocuments: 0 }),
    "ปิดใช้งานผู้ขายนี้ไม่ได้ เพราะยังมีแผน PM 2 รายการใช้งานอยู่"
  )
  assert.match(page, /blocked: getSupplierDeactivateBlockReason\(\{\n\s+assets: supplier\._count\.assets,\n\s+maintenanceTickets: supplier\._count\.maintenanceTickets,\n\s+maintenancePlans: supplier\._count\.maintenancePlans,\n\s+purchaseDocuments: supplier\._count\.purchaseDocuments,\n\s+\}\)/)
  assert.match(page, /maintenancePlans: \{ where: \{ isActive: true \} \}/)
})

test("suppliers: the record-status segmented control with counts; the status column only under ทั้งหมด (spec §3)", () => {
  assert.match(page, /readRecordStatusCounts\(prisma\.supplier, recordStatusCountWheres\(listState, buildSupplierWhere\)\)/)
  assert.match(page, /<RecordStatusSegmented value=\{listState\.status\} counts=\{recordStatusCounts\} hrefFor=\{\(status\) => listHref\(\{ status, page: 1 \}\)\} \/>/)
  assert.match(page, /\{current\.status !== "active" \? <input type="hidden" name="status" value=\{current\.status\} \/> : null\}/, "a search keeps the status")
  assert.doesNotMatch(page, /label=\{labels\.status\}/, "the status select is gone")
  assert.match(page, /showRecordStatus=\{listState\.status === "all"\}/)
  assert.match(list, /\{showRecordStatus \? <DataTableHead>\{labels\.status\}<\/DataTableHead> : null\}/)
  assert.match(page, /readDeactivatedAt\(\n\s+prisma,\n\s+"supplier",\n\s+suppliers\.filter\(\(supplier\) => !supplier\.isActive\)\.map\(\(supplier\) => supplier\.id\)\n\s+\)/)
  assert.match(page, /tCommon\("recordStatus\.deactivatedAt", \{ date: at \? formatDeactivatedAt\(at, locale\) : "–" \}\)/)
})

test("suppliers: the board's cards, chips and summary line (spec §7)", () => {
  assert.equal(th.supplier.summaryTotal, "ผู้ขายทั้งหมด (ใช้งาน)")
  assert.equal(th.supplier.list.withAssetsFoot, "ผูกทรัพย์สินรวม {assets, number} รายการ")
  assert.equal(th.supplier.list.withoutDocumentsFoot, "ในจำนวนนี้มีทรัพย์สินผูกอยู่ {count, number} ราย ›")
  assert.equal(th.supplier.list.summaryLine, "{suppliers, number} ผู้ขาย · ทรัพย์สินรวม {assets, number} รายการ · งานซ่อมค้าง {openRepairs, number} งาน · เรียงตาม{sort}")
  assert.match(en.supplier.list.summaryLine, /^\{suppliers, plural, one \{# supplier\} other \{# suppliers\}\}/)
  assert.match(page, /prisma\.supplier\.count\(\{ where: \{ isActive: true, purchaseDocuments: \{ none: \{ isActive: true \} \}, assets: \{ some: \{ isActive: true \} \} \} \}\)/)
  assert.match(page, /href: listHref\(\{ purchaseDocumentUsage: "withoutPurchaseDocuments", page: 1 \}\)/, "the card still filters")
  assert.match(page, /<Link href=\{listHref\(\{ purchaseDocumentUsage: "withoutPurchaseDocuments", assetUsage: "withAssets", page: 1 \}\)\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "relative z-10"\)\}>/)
  assert.match(page, /<FilterChipList\n\s+chips=\{filterChips\}/)
  assert.match(page, /t\("list\.summaryLine", \{ suppliers: total, assets: summaryLineAssets, openRepairs: summaryLineOpenRepairs, sort: sortLabel\(listState\.sort\) \}\)/)
  assert.match(page, /supplierSummaryLineWheres\(where\)/)
})

test("suppliers: filters, every sort in เรียงตาม / ลำดับ, the phone disclosure and both forms keyed on the list's query (spec §8)", () => {
  for (const name of ["search", "assetUsage", "purchaseDocumentUsage", "sort", "direction"]) {
    assert.match(page, new RegExp(`name="${name}"`), name)
  }
  assert.match(page, /sortOptions: supplierSorts\.map\(\(sort\) => \(\{ value: sort, label: sortLabel\(sort\) \}\)\)/)
  assert.equal(page.match(/<SupplierFilterForm key=\{supplierReturnHref\} /g)?.length, 2)
  assert.match(page, /<details className=\{cn\(getPanelClasses\(\), "md:hidden"\)\} open=\{hasFieldFilters\}>/)
  for (const sort of ["name", "contactPerson", "assets", "purchaseDocuments"]) {
    assert.match(list, new RegExp(`sort=\\{sortBy\\("${sort}"\\)\\}`), sort)
  }
  assert.match(page, /isSupplierCountSort\(sort\)/)
  assert.match(page, /readPageIdsByCount\(\{/)
})

test("suppliers: columns — name with code and address, contact or ยังไม่มีข้อมูลติดต่อ + เพิ่มข้อมูลติดต่อ, ยังไม่มี documents, ค้าง {n} (spec §7)", () => {
  assert.match(list, /<span className="tag">\{supplier\.code\}<\/span>/)
  assert.match(list, /\{row\.deactivatedLine \? <> · \{row\.deactivatedLine\}<\/> : null\}/)
  assert.match(list, /supplier\.address \?/)
  assert.match(list, /<StatusBadge label=\{labels\.noContact\} tone="warning" \/>/)
  assert.match(list, /\{canEdit \? \(\n\s+<Link href=\{row\.hrefs\.edit\}/)
  assert.match(list, /labels\.openRepairs\(row\.counts\.openRepairs\)/)
  assert.match(list, /row\.counts\.purchaseDocuments > 0 \? formatCount\(row\.counts\.purchaseDocuments\) : labels\.none/)
  assert.equal(th.supplier.list.addContact, "เพิ่มข้อมูลติดต่อ")
  assert.equal(th.supplier.list.openRepairs, "ค้าง {count, number}")
  assert.equal(th.supplier.list.none, "ยังไม่มี")
  assert.match(page, /readSupplierOpenRepairCounts\(prisma, suppliers\.map\(\(supplier\) => supplier\.id\)\)/)
})

test("suppliers ⋯: แก้ไข (supplier:edit), ปิดใช้งาน (supplier:delete) / เปิดใช้งาน (supplier:edit, PATCH); the row opens the detail page", () => {
  assert.match(page, /const canDeactivate = hasPermission\(user, "supplier", "delete"\)/)
  assert.match(page, /const canEdit = hasPermission\(user, "supplier", "edit"\)/)
  assert.match(page, /const canCreate = hasPermission\(user, "supplier", "create"\)/)
  assert.match(page, /const canViewAssets = hasPermission\(user, "asset", "view"\)/)
  assert.match(page, /links: canEdit \? \[\{ key: "edit", label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\] : \[\]/)
  assert.match(page, /deactivate:\n\s+canDeactivate && supplier\.isActive\n\s+\? \{/)
  assert.match(page, /canEdit && !supplier\.isActive\n\s+\? \{\n\s+endpoint,/)
  assert.equal(list.match(/<MasterDataRowActions\n/g)?.length, 2, "the desktop row and the phone card")
  assert.doesNotMatch(list, /deleteAction=|next=/)
  assert.match(list, /<ClickableTableRow key=\{supplier\.id\} href=\{row\.hrefs\.detail\}/)
  assert.match(list, /\{canViewAssets && row\.counts\.assets > 0 \? \(/)
  assert.equal(th.supplier.deactivate.action, "ปิดใช้งาน")
  assert.equal(th.supplier.reactivate.action, "เปิดใช้งาน")
  assert.match(page, /actions=\{\n\s+canCreate \? \(\n\s+<Link href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
})
