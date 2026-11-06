// Page group 8 plan 3 (spec docs/superpowers/specs/2026-11-07-page-group-8-remaining-master-data-design.md §3, §7, §8;
// plan docs/superpowers/plans/2026-11-07-group8-suppliers.md Task 4): the suppliers list (board MD-Suppliers) and the
// supplier page (board MD-Supplier), in all four projects, as the IT head. The run's role holds supplier:view since this
// task (e2e/support/run-plan.ts) and nothing else of the module: no supplier:create (no เพิ่มผู้ขาย), no supplier:edit
// (no แก้ไข, no "เพิ่มข้อมูลติดต่อ"), no supplier:delete (no ปิดใช้งาน), so ⋯ is absent on the list and on the page. The
// guard's reason (getSupplierDeactivateBlockReason) is read where the page shows it to everyone, under ข้อมูลผู้ขาย; the
// unavailable ⋯ item with it stays with the unit tests (tests/suppliers-list-board.test.ts,
// tests/supplier-detail-board.test.ts).
// - The run's own suppliers, created by the seed admin through the suppliers API: S with a contact, a phone and an email,
//   and N with no contact at all. Codes <run>-<project>-SUP / -SUN, names "<run> <project> …". The IT head adds three
//   run assets of S through the asset API (A, B, C), two purchase documents and a third without an amount through the
//   asset's document route (A: D1 ใบ PO 12,500.00 and D3 ใบกำกับ with no amount; B: D2 ใบกำกับ 7,250.50; C none), then
//   two repairs with S as the vendor through the repair form's route: B's done with a cost of 1,500 and A's not done (ค้าง).
//   No shared supplier, asset, document or repair is changed; nothing is deactivated; no DELETE.
// - The list: a search for S's code: ใช้งาน 1 (aria-current) / ไม่ใช้งาน 0 / ทั้งหมด 1, the summary line (1 ผู้ขาย ·
//   ทรัพย์สินรวม 3 · งานซ่อมค้าง 1 · เรียงตามชื่อผู้ขาย), the row's facts (name, code, address, the contact with
//   "phone · email", ทรัพย์สิน 3 linked to the register by supplierId, เอกสารจัดซื้อ 3, งานซ่อม 2 with ค้าง 1), no ⋯ and no
//   เพิ่มผู้ขาย. N: ยังไม่มีข้อมูลติดต่อ without "เพิ่มข้อมูลติดต่อ", ทรัพย์สิน 0 (no link), เอกสารจัดซื้อ ยังไม่มี.
// - The page (the row opens it): the contact line, no ⋯ and no แก้ไข, the four figures (ทรัพย์สิน 3 with 1 รายการยังไม่ผูก
//   เอกสาร, เอกสารจัดซื้อ 3 with มูลค่าจัดซื้อรวม 19,750.50 บาท, งานซ่อม 2 with ค้าง 1 · ซ่อมเสร็จแล้ว 1 · ยกเลิก 0, ค่าซ่อมสะสม
//   1,500.00 บาท from 1 ใบ), the assets table (C ยังไม่ผูก, A's first document +1), the documents table whose total row is
//   the sum of the rows (G8P3-R2, null as 0), สิ่งที่ควรติดตาม with the open repair's link, the repair history, the
//   guard's reason under ข้อมูลผู้ขาย; ดูทรัพย์สินทั้งหมด (3) opens the register by ?supplierId= with the supplier chip and
//   the three tags; กลับ goes back to the list with its search.
// - The phone: the list's cards and the documents' cards with the total line, the page never scrolls sideways. axe
//   through recordSettled on every step.
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { createPurchaseDocumentByApi } from "../assets/purchase-steps.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { seedAdminApi } from "../disposal/disposal-support.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { bangkokDate, projectCode, txAssetName, txAssetTag } from "../transactions/tx-plan.ts"
import { readAssetMasters, type AssetMasters } from "../transactions/tx-support.ts"
import { SUPPLIER_WORDS as W } from "./suppliers-words.ts"

// The seed admin's request context (seedAdminApi): the type comes from the helper, as specs import nothing from
// @playwright/test but the suite's fixtures.
type APIRequestContext = Awaited<ReturnType<typeof seedAdminApi>>

type RunSupplier = { id: string; code: string; name: string; contactPerson: string | null; phone: string | null; email: string | null; address: string | null }
type RunAsset = { id: string; assetTag: string; name: string }

// The reason the supplier guard gives for three assets, two repairs and three documents (getSupplierDeactivateBlockReason;
// a server string, not a message key, so it is here and tests/e2e-master-data.test.ts pins it to the function).
const SUPPLIER_BLOCKED = "ปิดใช้งานผู้ขายนี้ไม่ได้ เพราะยังมีทรัพย์สิน 3 รายการ, งานซ่อม 2 รายการ และเอกสารจัดซื้อ 3 รายการใช้งานอยู่"

// The run documents' amounts (null: not given) and the repair cost: the page's figures are their sums (G8P3-R1, R2).
const DOCUMENT_AMOUNTS = { D1: 12_500, D2: 7_250.5, D3: null } as const
const REPAIR_COST = 1_500
// The app's money format (src/lib/display-format.ts formatMoney): two decimals, Thai digits grouping.
const money = (value: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
const parseMoney = (text: string) => Number(text.replace(/[^\d.-]/g, ""))

async function created(response: Awaited<ReturnType<APIRequestContext["post"]>>, what: string): Promise<string> {
  expect(response.status(), `POST ${what}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return ((await response.json()) as { id: string }).id
}

// The run's two suppliers of this project (the seed admin, the suppliers API, every key of its schema): S with a
// contact, a phone, an email and an address; N with none of them.
async function createRunSuppliers(projectName: string): Promise<{ supplier: RunSupplier; bare: RunSupplier }> {
  const { runId } = readRunState()
  const prefix = `${runId}-${projectCode(projectName)}-SU`
  const name = (label: string) => txAssetName(runId, projectName, label)
  const admin = await seedAdminApi()
  try {
    const supplier: RunSupplier = {
      id: "", code: `${prefix}P`, name: name("ผู้ขายทดสอบรายการ"), contactPerson: name("ผู้ติดต่อผู้ขาย"),
      phone: "02-555-0101", email: "e2e.supplier@example.com", address: name("ที่อยู่ผู้ขายทดสอบ"),
    }
    const bare: RunSupplier = { id: "", code: `${prefix}N`, name: name("ผู้ขายทดสอบไม่มีผู้ติดต่อ"), contactPerson: null, phone: null, email: null, address: null }
    for (const record of [supplier, bare]) {
      const data = { code: record.code, name: record.name, contactPerson: record.contactPerson, phone: record.phone, email: record.email, address: record.address, isActive: true }
      record.id = await created(await admin.post("/api/suppliers", { data }), `/api/suppliers ${record.code}`)
    }
    return { supplier, bare }
  } finally {
    await admin.dispose()
  }
}

// One run asset of the supplier (the asset API as the IT head, every key of the form's body): Ready, Good, in the run's
// room and department, no holder.
async function createSupplierAsset(page: Page, masters: AssetMasters, projectName: string, key: string, label: string, supplierId: string): Promise<RunAsset> {
  const { runId } = readRunState()
  const run = readRunData()
  const assetTag = txAssetTag(runId, projectName, key)
  const name = txAssetName(runId, projectName, label)
  const response = await page.request.post("/api/assets", {
    data: {
      assetTag, name, categoryId: masters.categoryId, brandId: "", modelId: "", serialNumber: "",
      licenseTotalSeats: "", licenseUsedSeats: "", licenseAssignedAssetId: "", companyId: run.companyId, branchId: run.branchId,
      ownershipType: "personal", departmentId: run.departmentId, custodianId: "", homeLocationId: run.locationId, currentLocationId: run.locationId,
      statusId: masters.readyStatusId, conditionId: masters.goodConditionId, purchaseDate: "", purchasePrice: "", supplierId,
      warrantyStartDate: "", warrantyEndDate: "", fixedAssetCode: "", poNumber: "", invoiceNumber: "", remark: "", customFieldsJson: "",
      isActive: true,
    },
  })
  expect(response.status(), `POST /api/assets ${assetTag}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return { id: ((await response.json()) as { id: string }).id, assetTag, name }
}

// A repair with the supplier as the vendor through the repair form's route (every key of its body), as the IT head:
// done (closed, usable, Good, with a cost) or not done (in_progress: ค้าง).
async function repairWithSupplier(page: Page, asset: RunAsset, supplierId: string, masters: AssetMasters, done: boolean): Promise<{ id: string; repairNo: string; problem: string }> {
  const problem = `${asset.assetTag} ${done ? "ซ่อมกับผู้ขายเสร็จแล้ว" : "ส่งผู้ขายซ่อม ยังไม่ปิดงาน"}`
  const response = await page.request.post("/api/maintenance-tickets", {
    data: {
      assetId: asset.id,
      maintenancePlanId: null,
      problem,
      reportedDate: bangkokDate(),
      done,
      outcome: done ? "usable" : null,
      conditionId: done ? masters.goodConditionId : null,
      reportedById: readRunData().employees.itHead.id,
      vendorId: supplierId,
      repairCost: done ? REPAIR_COST : null,
      invoiceNo: null,
      remark: "E2E repair with the run supplier (the supplier page)",
    },
  })
  expect(response.status(), `POST /api/maintenance-tickets: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return { ...((await response.json()) as { id: string; repairNo: string }), problem }
}

// The list's entry of a supplier: the table row on the computer, the card on the phone (spec §8 keeps the cards).
const listEntry = (page: Page, code: string): Locator =>
  page.locator("[data-supplier-desktop-table] tbody tr, [data-supplier-mobile-list] article").filter({ visible: true, hasText: code })

// A count of the entry by its column: the table cell under the header on the computer, the card's count on the phone.
async function countCell(page: Page, entry: Locator, label: string, phone: boolean): Promise<Locator> {
  if (phone) return entry.locator("div.grid-cols-3 > *").filter({ hasText: label })
  const headers = await page.locator("[data-supplier-desktop-table] thead th").allTextContents()
  const index = headers.findIndex((text) => text.trim().startsWith(label))
  expect(index, `the column ${label}`).toBeGreaterThanOrEqual(0)
  return entry.locator("td").nth(index)
}

// The record-status segmented control: each option a link named by its word and its count.
function statusLink(page: Page, label: string, count: number): Locator {
  return page.getByRole("navigation", { name: W.recordStatusLabel, exact: true }).getByRole("link", { name: new RegExp(`^${label}\\s*${count}$`) })
}
async function expectStatusCounts(page: Page, counts: { active: number; inactive: number; all: number }) {
  await expect(statusLink(page, W.recordActive, counts.active)).toHaveAttribute("aria-current", "page")
  await expect(statusLink(page, W.recordInactive, counts.inactive)).not.toHaveAttribute("aria-current")
  await expect(statusLink(page, W.recordAll, counts.all)).not.toHaveAttribute("aria-current")
}

// One figure of a strip by its label: its value and its foot.
function stat(page: Page, label: string) {
  const cell = page.locator('[data-slot="stat"]').filter({ has: page.locator("dt", { hasText: new RegExp(`^\\s*${label}\\s*$`) }) })
  return { cell, value: cell.locator(".text-metric"), foot: cell.locator("dd").nth(1) }
}

// A side or main panel of the page by its heading.
const panel = (page: Page, title: string): Locator =>
  page.locator("section").filter({ has: page.getByRole("heading", { level: 2, name: title, exact: true }) })

const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)

test.describe("the IT head reads the suppliers list and a supplier's page", () => {
  asUser("itHead")

  test("the list shows the run supplier's board facts with ค้าง and no ⋯ without edit or delete; the page's four figures, the documents' total row as their sum, the guard's reason and ดูทรัพย์สินทั้งหมด to the register by the supplier (group 8 spec §3, §7; G8P3-R1, R2, R3)", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(300_000)
    const project = testInfo.project.name
    const phone = e2eDevice === "phone"
    const { runId } = readRunState()
    const { supplier, bare } = await createRunSuppliers(project)
    const masters = await readAssetMasters(page)
    const assetA = await createSupplierAsset(page, masters, project, "SPA", "เครื่องจากผู้ขาย ก", supplier.id)
    const assetB = await createSupplierAsset(page, masters, project, "SPB", "เครื่องจากผู้ขาย ข", supplier.id)
    const assetC = await createSupplierAsset(page, masters, project, "SPC", "เครื่องจากผู้ขาย ค", supplier.id)
    // The documents take the asset's supplier (no supplierId part: the route falls back to the asset's active supplier).
    const docNo = (key: string) => `${runId}-${projectCode(project)}-${key}`
    const d1 = await createPurchaseDocumentByApi(page, assetA.id, { documentType: "purchase_order", documentNo: docNo("SPD1"), documentDate: bangkokDate(-2), totalAmount: String(DOCUMENT_AMOUNTS.D1) })
    const d2 = await createPurchaseDocumentByApi(page, assetB.id, { documentType: "invoice", documentNo: docNo("SPD2"), documentDate: bangkokDate(-1), totalAmount: String(DOCUMENT_AMOUNTS.D2) })
    const d3 = await createPurchaseDocumentByApi(page, assetA.id, { documentType: "invoice", documentNo: docNo("SPD3") })
    const closedRepair = await repairWithSupplier(page, assetB, supplier.id, masters, true)
    const openRepair = await repairWithSupplier(page, assetA, supplier.id, masters, false)
    const documentsTotal = (DOCUMENT_AMOUNTS.D1 ?? 0) + (DOCUMENT_AMOUNTS.D2 ?? 0) + (DOCUMENT_AMOUNTS.D3 ?? 0)
    const registerBySupplier = `/th/assets?supplierId=${supplier.id}&page=1`
    const moreActions = (code: string) => page.getByRole("button", { name: fillTemplate(W.moreActionsFor, { code }), exact: true })

    // ── The list (board MD-Suppliers) ──
    const listPath = "/th/master-data/suppliers"
    await page.goto(`${listPath}?search=${encodeURIComponent(supplier.code)}`, { waitUntil: "load" })
    await expect(page.getByRole("heading", { level: 1, name: W.suppliersTitle, exact: true })).toBeVisible()
    await expectStatusCounts(page, { active: 1, inactive: 0, all: 1 })
    await expect(page.getByText(fillTemplate(W.summaryLine, { suppliers: 1, assets: 3, openRepairs: 1, sort: W.nameSort }), { exact: true })).toBeVisible()
    // No supplier:create: no เพิ่มผู้ขาย.
    await expect(page.getByRole("main").getByRole("link", { name: W.createTitle, exact: true })).toHaveCount(0)
    const entry = listEntry(page, supplier.code)
    await expect(entry).toHaveCount(1)
    // Name first, the code and the address under it; the contact in one column: the name, then "phone · email".
    await expect(entry).toContainText(supplier.name)
    await expect(entry).toContainText(supplier.address ?? "")
    await expect(entry).toContainText(supplier.contactPerson ?? "")
    await expect(entry).toContainText(`${supplier.phone} · ${supplier.email}`)
    // ทรัพย์สิน 3 links to the register by the supplier (asset:view); เอกสารจัดซื้อ 3; งานซ่อม 2 with ค้าง 1.
    const assetsLink = entry.locator(`a[href="${registerBySupplier}"]`)
    await expect(assetsLink).toHaveAccessibleName(`${W.assetsColumn}: 3`)
    await expect(await countCell(page, entry, W.purchaseDocumentsColumn, phone)).toContainText("3")
    const repairsCell = await countCell(page, entry, W.repairsColumn, phone)
    await expect(repairsCell).toContainText("2")
    await expect(repairsCell.getByText(fillTemplate(W.openRepairs, { count: 1 }), { exact: true })).toBeVisible()
    // No supplier:edit and no supplier:delete: no ⋯ at all (nothing to offer), no "เพิ่มข้อมูลติดต่อ".
    await expect(moreActions(supplier.code)).toHaveCount(0)
    if (phone) await expect(page.locator("[data-supplier-mobile-list] article").filter({ visible: true })).toHaveCount(1)
    expect(await noSidewaysScroll(page), "the list does not scroll sideways").toBe(true)
    await recordSettled(page, measure, "suppliers list, the run supplier")

    // N: no contact, no addContact link without supplier:edit, ทรัพย์สิน 0 (no link), เอกสารจัดซื้อ ยังไม่มี, no ค้าง.
    await page.goto(`${listPath}?search=${encodeURIComponent(bare.code)}`, { waitUntil: "load" })
    const bareEntry = listEntry(page, bare.code)
    await expect(bareEntry).toHaveCount(1)
    await expect(bareEntry.getByText(W.noContact, { exact: true })).toBeVisible()
    await expect(bareEntry.getByRole("link", { name: W.addContact, exact: true })).toHaveCount(0)
    await expect(bareEntry.locator('a[href*="/th/assets?"]')).toHaveCount(0)
    await expect(await countCell(page, bareEntry, W.purchaseDocumentsColumn, phone)).toContainText(W.none)
    await expect(bareEntry.getByText(/^ค้าง /)).toHaveCount(0)
    await expect(moreActions(bare.code)).toHaveCount(0)
    await recordSettled(page, measure, "suppliers list, a supplier with no contact")

    // ── The page (board MD-Supplier), opened from the row (the card's link on the phone) ──
    const listHref = `${listPath}?search=${encodeURIComponent(supplier.code)}`
    await page.goto(listHref, { waitUntil: "load" })
    const opener = phone ? listEntry(page, supplier.code).getByRole("link").first() : listEntry(page, supplier.code).getByText(supplier.name, { exact: true })
    await opener.click()
    const detailPath = `${listPath}/${supplier.id}`
    await page.waitForURL((url) => url.pathname === detailPath)
    expect(new URL(new URL(page.url()).searchParams.get("returnTo") ?? "", "http://e2e.invalid").pathname).toBe(listPath)
    await expect(page.getByRole("heading", { level: 1, name: supplier.name, exact: true })).toBeVisible()
    await expect(page.getByText(fillTemplate(W.contactLine, { name: supplier.contactPerson ?? "" }), { exact: true })).toBeVisible()
    // No supplier:edit: no แก้ไข; no supplier:delete: no ⋯.
    await expect(page.getByRole("main").getByRole("link", { name: W.edit, exact: true })).toHaveCount(0)
    await expect(moreActions(supplier.code)).toHaveCount(0)

    // The four figures (G8P3-R1–R3): C has no document; the documents' amounts with D3's as 0; one repair open, one
    // done with the cost.
    const assetsStat = stat(page, W.assetsColumn)
    await expect(assetsStat.value).toHaveText("3")
    await expect(assetsStat.foot).toContainText(fillTemplate(W.assetsWithoutDocument, { count: 1 }))
    const documentsStat = stat(page, W.purchaseDocumentsColumn)
    await expect(documentsStat.value).toHaveText("3")
    await expect(documentsStat.foot).toContainText(fillTemplate(W.purchaseAmountFoot, { amount: money(documentsTotal) }))
    const repairsStat = stat(page, W.repairsColumn)
    await expect(repairsStat.value).toHaveText("2")
    await expect(repairsStat.foot).toContainText(fillTemplate(W.repairsFoot, { open: 1, closed: 1, cancelled: 0 }))
    const costStat = stat(page, W.repairCostLabel)
    await expect(costStat.value).toHaveText(money(REPAIR_COST))
    await expect(costStat.cell).toContainText(W.baht)
    await expect(costStat.foot).toContainText(fillTemplate(W.repairCostFoot, { count: 1 }))

    // The assets panel: 3 of 3, C ยังไม่ผูก, A's first document with +1 (D1 and D3). Phone: a card per asset; from md
    // the table.
    const assetsPanel = panel(page, W.assetsPanelTitle)
    await expect(assetsPanel.getByText(fillTemplate(W.latestAssets, { shown: 3, total: 3 }), { exact: true })).toBeVisible()
    const assetEntries = phone
      ? page.locator("[data-supplier-assets-mobile] article")
      : page.getByRole("table", { name: W.assetsCaption, exact: true }).locator("tbody tr")
    await expect(assetEntries).toHaveCount(3)
    await expect(assetEntries.filter({ hasText: assetC.assetTag })).toContainText(W.noDocument)
    const entryA = assetEntries.filter({ hasText: assetA.assetTag })
    await expect(entryA.getByText(fillTemplate(W.moreDocuments, { count: 1 }), { exact: true })).toBeVisible()
    await expect(assetEntries.filter({ hasText: assetB.assetTag })).toContainText(d2.documentNo)

    // The documents: every run document with its type label; D3 has no amount; the total row is the rows' sum (R2).
    if (phone) {
      const cards = page.locator("[data-supplier-documents-mobile] article")
      await expect(cards).toHaveCount(3)
      await expect(cards.filter({ hasText: d3.documentNo })).toContainText(W.amountUnset)
      const totalLine = page.locator("p[data-supplier-documents-total]")
      await expect(totalLine).toContainText(fillTemplate(W.documentsTotal, { count: 3 }))
      await expect(totalLine).toContainText(money(documentsTotal))
    } else {
      const documentsTable = page.getByRole("table", { name: fillTemplate(W.documentsCaption, { count: 3 }), exact: true })
      const documentRows = documentsTable.locator("tbody tr:not([data-supplier-documents-total])")
      await expect(documentRows).toHaveCount(3)
      await expect(documentRows.filter({ hasText: d1.documentNo })).toContainText(W.typePurchaseOrder)
      await expect(documentRows.filter({ hasText: d2.documentNo })).toContainText(W.typeInvoice)
      await expect(documentRows.filter({ hasText: d3.documentNo })).toContainText(W.amountUnset)
      const amounts = (await documentRows.locator("td:last-child").allTextContents()).map((text) => (text.includes(W.amountUnset) ? 0 : parseMoney(text)))
      expect(amounts.reduce((sum, value) => sum + value, 0), "the rows' amounts add up to the run documents'").toBeCloseTo(documentsTotal, 2)
      const totalRow = documentsTable.locator("tr[data-supplier-documents-total]")
      await expect(totalRow.locator("th")).toHaveText(fillTemplate(W.documentsTotal, { count: 3 }))
      // Each document is linked to one active asset: 3; the amount is the rows' sum.
      await expect(totalRow.locator("td").first()).toHaveText("3")
      await expect(totalRow.locator("td").last()).toHaveText(money(documentsTotal))
    }

    // สิ่งที่ควรติดตาม: two items, C without a document (the strip's count, G8P3-R3) and the open repair with its link
    // (maintenance:view); the history lists both repairs.
    const followUp = panel(page, W.followUpTitle)
    await expect(followUp.getByText(fillTemplate(W.followUpCount, { count: 2 }), { exact: true })).toBeVisible()
    await expect(followUp).toContainText(fillTemplate(W.followUpAssetsWithoutDocument, { count: 1 }))
    await expect(followUp).toContainText(openRepair.problem)
    await expect(followUp.getByRole("link", { name: fillTemplate(W.openRepairLink, { repairNo: openRepair.repairNo }), exact: true })).toHaveAttribute("href", `/th/maintenance/${openRepair.id}`)
    const history = panel(page, W.repairHistoryTitle)
    for (const repair of [openRepair, closedRepair]) await expect(history.locator(`a[href="/th/maintenance/${repair.id}"]`)).toContainText(repair.repairNo)
    // ข้อมูลผู้ขาย says why it cannot be deactivated (the DELETE route's guard), to every reader of the page.
    await expect(panel(page, W.profileTitle).getByText(SUPPLIER_BLOCKED, { exact: true })).toBeVisible()
    expect(await noSidewaysScroll(page), "the supplier page does not scroll sideways").toBe(true)
    await recordSettled(page, measure, "supplier page, the run supplier")

    // ดูทรัพย์สินทั้งหมด (3) opens the register by the supplier, whose chip names it, with the three run assets.
    const viewAll = assetsPanel.getByRole("link", { name: fillTemplate(W.viewAllAssets, { count: 3 }), exact: true })
    await expect(viewAll).toHaveAttribute("href", registerBySupplier)
    await viewAll.click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("supplierId") === supplier.id)
    await expect(page.getByRole("group", { name: W.activeFilters }).filter({ visible: true })).toContainText(`${W.supplierChip}: ${supplier.code} - ${supplier.name}`)
    for (const asset of [assetA, assetB, assetC]) await expect(page.getByRole("main").getByText(asset.assetTag, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await recordSettled(page, measure, "register by the supplier, from the supplier page")

    // กลับ on the page goes back to the list with its search.
    await page.goBack({ waitUntil: "load" })
    await page.waitForURL((url) => url.pathname === detailPath)
    const back = page.locator('[data-slot="page-back-link"]').filter({ visible: true })
    await expect(back).toHaveAccessibleName(W.back)
    const backHref = new URL((await back.getAttribute("href")) ?? "", "http://e2e.invalid")
    expect(backHref.pathname).toBe(listPath)
    expect(backHref.searchParams.get("search")).toBe(supplier.code)
    await back.click()
    await page.waitForURL((url) => url.pathname === listPath && url.searchParams.get("search") === supplier.code)
    await expect(listEntry(page, supplier.code)).toHaveCount(1)
    await recordSettled(page, measure, "suppliers list, back from the supplier page")
  })
})
