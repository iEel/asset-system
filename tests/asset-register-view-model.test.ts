import assert from "node:assert/strict"
import test from "node:test"

import { parseAssetListParams } from "../src/lib/asset-list-query.ts"
import { buildStatusSumLine, buildStatusTabs } from "../src/lib/asset-register-status-tabs.ts"
import { buildAssetRegisterChips, buildAssetRegisterClearAllHref } from "../src/lib/asset-register-chips.ts"
import { assetRegisterSortOptions, getActiveSortKey } from "../src/lib/asset-register-sort.ts"
import {
  assetRegisterColumnPresets,
  assetRegisterColumnWidths,
  getAssetRegisterTableMinWidth,
} from "../src/lib/asset-register-columns.ts"

const filters = (query = "") => parseAssetListParams(new URLSearchParams(query))
const statuses = [
  { id: "s-ready", name: "Ready" },
  { id: "s-use", name: "In Use" },
  { id: "s-out", name: "Checked Out" },
  { id: "s-pending", name: "Pending Repair" },
  { id: "s-lost", name: "Lost/Missing" },
]
const counts = [
  { statusId: "s-ready", count: 127 },
  { statusId: "s-use", count: 1507 },
  { statusId: "s-lost", count: 3 },
]

test("status tabs follow the fixed order, count every status for all, and skip statuses missing from the database", () => {
  const result = buildStatusTabs({ statuses, counts, statusId: "" })

  assert.deepEqual(result.tabs.map((tab) => tab.key), ["all", "ready", "inUse", "checkedOut", "pendingRepair", "other"])
  assert.deepEqual(result.tabs.map((tab) => tab.count), [1637, 127, 1507, 0, 0, 3])
  assert.deepEqual(result.tabs.map((tab) => tab.active), [true, false, false, false, false, false])
  assert.deepEqual(result.tabStatusIds, ["s-ready", "s-use", "s-out", "s-pending"])
  assert.equal(result.otherStatusActive, false)
})

test("a status without a tab makes สถานะอื่น the current tab (group 4 plan 1)", () => {
  const result = buildStatusTabs({ statuses, counts, statusId: "s-lost" })

  assert.deepEqual(result.tabs.filter((tab) => tab.active).map((tab) => tab.key), ["other"])
  assert.equal(result.otherStatusActive, true)
  assert.equal(buildStatusTabs({ statuses, counts, statusId: "s-use" }).tabs.find((tab) => tab.active)?.key, "inUse")
})

const registerStatuses = [
  { id: "s-ready", name: "Ready", nameTh: "พร้อมใช้งาน" },
  { id: "s-use", name: "In Use", nameTh: "ใช้งานอยู่" },
  { id: "s-out", name: "Checked Out", nameTh: "ถูกยืม" },
  { id: "s-pending", name: "Pending Repair", nameTh: "รอซ่อม" },
  { id: "s-maint", name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม" },
  { id: "s-retired", name: "Retired", nameTh: "เลิกใช้งาน" },
  { id: "s-disposal", name: "Pending Disposal", nameTh: "รอจำหน่าย" },
  { id: "s-inspect", name: "Under Inspection", nameTh: "อยู่ระหว่างตรวจสอบ" },
  { id: "s-missing", name: "Missing", nameTh: "ไม่พบ" },
  { id: "s-lost", name: "Lost", nameTh: "สูญหาย" },
]
const registerCounts = [
  { statusId: "s-ready", count: 126 },
  { statusId: "s-use", count: 611 },
  { statusId: "s-out", count: 27 },
  { statusId: "s-pending", count: 6 },
  { statusId: "s-maint", count: 9 },
  { statusId: "s-retired", count: 7 },
  { statusId: "s-disposal", count: 21 },
  { statusId: "s-inspect", count: 18 },
  { statusId: "s-missing", count: 11 },
  { statusId: "s-lost", count: 6 },
]

test("the สถานะอื่น tab counts every status outside the five and breaks it down, largest first (group 4 plan 1)", () => {
  const result = buildStatusTabs({ statuses: registerStatuses, counts: registerCounts, statusId: "" })
  const other = result.tabs.find((tab) => tab.key === "other")

  assert.deepEqual(other, { key: "other", statusId: "", count: 63, active: false })
  assert.deepEqual(result.otherBreakdown[0], { statusId: "s-disposal", name: "Pending Disposal", nameTh: "รอจำหน่าย", count: 21 })
  assert.deepEqual(result.otherBreakdown.map((item) => item.count), [21, 18, 11, 7, 6])
  assert.equal(result.tabs.find((tab) => tab.key === "all")?.count, 842)

  const grouped = buildStatusTabs({ statuses: registerStatuses, counts: registerCounts, statusId: "", statusGroup: "other" })
  assert.deepEqual(grouped.tabs.filter((tab) => tab.active).map((tab) => tab.key), ["other"])
  assert.equal(grouped.otherStatusActive, false)
})

test("a dashboard link to one other status makes สถานะอื่น current (Review Focus 5)", () => {
  const result = buildStatusTabs({ statuses: registerStatuses, counts: registerCounts, statusId: "s-disposal" })

  assert.deepEqual(result.tabs.filter((tab) => tab.active).map((tab) => tab.key), ["other"])
  assert.equal(result.otherStatusActive, true)
  assert.equal(filters("statusId=s-disposal&statusGroup=other&exact=1").statusGroup, "", "statusId wins")
})

test("an other status with no active row is counted in สถานะอื่น but gets no name", () => {
  const result = buildStatusTabs({
    statuses: registerStatuses,
    counts: [...registerCounts, { statusId: "s-inactive", count: 4 }],
    statusId: "",
  })

  assert.equal(result.tabs.find((tab) => tab.key === "other")?.count, 67)
  assert.equal(result.otherBreakdown.some((item) => item.statusId === "s-inactive"), false)
  const line = buildStatusSumLine(result.tabs, result.otherBreakdown)
  assert.deepEqual(line.other, {
    count: 67,
    top: [{ label: "รอจำหน่าย", count: 21 }, { label: "อยู่ระหว่างตรวจสอบ", count: 18 }, { label: "ไม่พบ", count: 11 }],
    rest: 17,
  })
})

test("the sum line adds the five tabs and สถานะอื่น to the total, naming the three largest other statuses (spec §6.2)", () => {
  const result = buildStatusTabs({ statuses: registerStatuses, counts: registerCounts, statusId: "" })
  const line = buildStatusSumLine(result.tabs, result.otherBreakdown)

  assert.deepEqual(line.terms, [126, 611, 27, 6, 9, 63])
  assert.equal(line.total, 842)
  assert.deepEqual(line.other.top, [
    { label: "รอจำหน่าย", count: 21 },
    { label: "อยู่ระหว่างตรวจสอบ", count: 18 },
    { label: "ไม่พบ", count: 11 },
  ])
  assert.equal(line.other.count, 63)
  assert.equal(line.other.rest, 13)
  assert.deepEqual(
    buildStatusSumLine(result.tabs, result.otherBreakdown.slice(0, 2)).other,
    { count: 63, top: [{ label: "รอจำหน่าย", count: 21 }, { label: "อยู่ระหว่างตรวจสอบ", count: 18 }], rest: 24 },
  )
})

test("the sum line names the other statuses in the page's language: English name on /en, Thai nameTh on /th (final review C3)", () => {
  const result = buildStatusTabs({ statuses: registerStatuses, counts: registerCounts, statusId: "" })
  assert.deepEqual(buildStatusSumLine(result.tabs, result.otherBreakdown, "en").other.top, [
    { label: "Pending Disposal", count: 21 },
    { label: "Under Inspection", count: 18 },
    { label: "Missing", count: 11 },
  ])
  assert.deepEqual(buildStatusSumLine(result.tabs, result.otherBreakdown, "th").other.top.map((item) => item.label), ["รอจำหน่าย", "อยู่ระหว่างตรวจสอบ", "ไม่พบ"])
})

const chipLabels = {
  company: "บริษัท",
  branch: "สาขา",
  category: "หมวดหมู่",
  status: "สถานะ",
  condition: "สภาพ",
  ownershipType: "ประเภทการถือครอง",
  brand: "ยี่ห้อ",
  model: "รุ่น",
  custodian: "ผู้ถือครอง",
  location: "ที่ตั้ง",
  supplier: "ผู้ขาย",
  department: "แผนก",
  rowsPerPage: "จำนวนต่อหน้า",
  ownershipTypes: { shared: "ใช้ร่วมกัน" },
  dataQuality: { serial: "ไม่มี Serial", department: "แผนกไม่ครบ", licenseExpiry: "License ใกล้หมดอายุ", returnDue: "ใกล้/เกินกำหนดคืน" },
  crossScope: { all: "ต่างบริษัท/ต่างสาขา" },
  activity: { idle_180d: "ไม่มีความเคลื่อนไหวใน 180 วันล่าสุด" },
  custodianState: { assigned: "มีผู้ถือครอง" },
}

function chipsFor(query: string) {
  return buildAssetRegisterChips({
    basePath: "/th/assets",
    filters: filters(query),
    tabStatusIds: ["s-ready"],
    names: { company: "SNI - สยาม", status: "สูญหาย", brand: "Dell", custodian: "E001 - สมชาย", location: "L-01 - ห้อง IT ชั้น 3", supplier: "SUP1 - ร้านเอ", department: "IT - ฝ่ายไอที" },
    labels: chipLabels,
  })
}

function paramsOf(href: string) {
  return new URLSearchParams(href.slice(href.indexOf("?") + 1))
}

test("chips show hidden filters and hide tab statuses and search; the company chip shows at every width (group 1 spec §6.5)", () => {
  const chips = chipsFor("search=dell&companyId=c-1&statusId=s-ready&dataQuality=department&pageSize=50&brandId=br-1&custodianId=e-1&supplierId=sp-1&activity=idle_180d")

  assert.deepEqual(chips.map((chip) => chip.key), ["company", "dataQuality", "pageSize", "brand", "custodian", "supplier", "activity"])
  assert.deepEqual(chips.map((chip) => chip.label), [
    "บริษัท: SNI - สยาม",
    "แผนกไม่ครบ",
    "จำนวนต่อหน้า: 50",
    "ยี่ห้อ: Dell",
    "ผู้ถือครอง: E001 - สมชาย",
    "ผู้ขาย: SUP1 - ร้านเอ",
    "ไม่มีความเคลื่อนไหวใน 180 วันล่าสุด",
  ])
  assert.deepEqual(chips.filter((chip) => chip.mobileOnly).map((chip) => chip.key), [])
})

test("the waiting-work values and the custodian state get chips; branch and category stay phone-only (group 1 spec §6.5)", () => {
  const chips = chipsFor("companyId=c-1&branchId=b-1&categoryId=cat-1&dataQuality=returnDue&custodianState=assigned")
  assert.deepEqual(chips.map((chip) => [chip.key, chip.label, chip.mobileOnly]), [
    ["company", "บริษัท: SNI - สยาม", false],
    ["branch", "สาขา: b-1", true],
    ["category", "หมวดหมู่: cat-1", true],
    ["dataQuality", "ใกล้/เกินกำหนดคืน", false],
    ["custodianState", "มีผู้ถือครอง", false],
  ])
  const withoutCustodianState = paramsOf(chips.find((chip) => chip.key === "custodianState")!.href)
  assert.equal(withoutCustodianState.get("custodianState"), null)
  assert.equal(withoutCustodianState.get("dataQuality"), "returnDue")
  assert.equal(chipsFor("dataQuality=licenseExpiry")[0].label, "License ใกล้หมดอายุ")
  assert.equal(paramsOf(buildAssetRegisterClearAllHref("/th/assets", filters("custodianState=assigned&dataQuality=returnDue"))).get("custodianState"), null)
})

test("a status without a tab becomes a removable chip", () => {
  const [chip] = chipsFor("statusId=s-lost")

  assert.equal(chip.key, "status")
  assert.equal(chip.label, "สถานะ: สูญหาย")
  assert.equal(paramsOf(chip.href).get("statusId"), null)
})

test("removing a chip drops only its own parameter and returns to page 1", () => {
  const chips = chipsFor("page=3&search=dell&conditionId=cond-2&companyId=c-1&branchId=b-1&sort=name&direction=asc")
  const condition = paramsOf(chips.find((chip) => chip.key === "condition")!.href)
  const company = paramsOf(chips.find((chip) => chip.key === "company")!.href)

  assert.equal(condition.get("conditionId"), null)
  assert.equal(condition.get("page"), "1")
  assert.equal(condition.get("search"), "dell")
  assert.equal(condition.get("companyId"), "c-1")
  assert.equal(condition.get("sort"), "name")
  assert.equal(company.get("companyId"), null)
  assert.equal(company.get("branchId"), null, "a branch never outlives its company")
  assert.equal(company.get("conditionId"), "cond-2")
})

test("raw values are shown when a lookup name is missing", () => {
  const [model] = chipsFor("modelId=m-404")
  assert.equal(model.label, "รุ่น: m-404")
})

test("locationId gets the chip ที่ตั้ง: <name> at every width, and removing it or clearing all drops it (group 1 spec §7.4)", () => {
  const chips = chipsFor("locationId=loc-1&custodianState=assigned")
  assert.deepEqual(chips.map((chip) => [chip.key, chip.label, chip.mobileOnly]), [
    ["custodianState", "มีผู้ถือครอง", false],
    ["location", "ที่ตั้ง: L-01 - ห้อง IT ชั้น 3", false],
  ])
  const withoutLocation = paramsOf(chips[1].href)
  assert.equal(withoutLocation.get("locationId"), null)
  assert.equal(withoutLocation.get("custodianState"), "assigned")
  const [raw] = buildAssetRegisterChips({ basePath: "/th/assets", filters: filters("locationId=loc-404"), tabStatusIds: [], names: {}, labels: chipLabels })
  assert.equal(raw.label, "ที่ตั้ง: loc-404")
  assert.equal(paramsOf(buildAssetRegisterClearAllHref("/th/assets", filters("locationId=loc-1"))).get("locationId"), null)
})

test("departmentId gets the chip แผนก: <name> at every width, apart from dataQuality=department; removing it or clearing all drops it (group 8 plan 1 Task 4)", () => {
  const chips = chipsFor("departmentId=d-1&dataQuality=department")
  assert.deepEqual(chips.map((chip) => [chip.key, chip.label, chip.mobileOnly]), [
    ["dataQuality", "แผนกไม่ครบ", false],
    ["department", "แผนก: IT - ฝ่ายไอที", false],
  ])
  const withoutDepartment = paramsOf(chips[1].href)
  assert.equal(withoutDepartment.get("departmentId"), null)
  assert.equal(withoutDepartment.get("dataQuality"), "department")
  const [raw] = buildAssetRegisterChips({ basePath: "/th/assets", filters: filters("departmentId=d-404"), tabStatusIds: [], names: {}, labels: chipLabels })
  assert.equal(raw.label, "แผนก: d-404")
  assert.equal(paramsOf(buildAssetRegisterClearAllHref("/th/assets", filters("departmentId=d-1"))).get("departmentId"), null)
})

test("clear all keeps only the sort order", () => {
  const params = paramsOf(buildAssetRegisterClearAllHref("/th/assets", filters("search=dell&statusId=s-ready&dataQuality=serial&pageSize=50&sort=name&direction=asc&page=3")))

  assert.deepEqual(Object.fromEntries(params), { sort: "name", direction: "asc", page: "1", pageSize: "25" })
})

test("sort options map to the existing sort parameters", () => {
  assert.deepEqual(assetRegisterSortOptions.map((option) => option.key), [
    "newest",
    "oldest",
    "tagAsc",
    "tagDesc",
    "nameAsc",
    "purchaseDateDesc",
    "priceDesc",
  ])
  assert.equal(getActiveSortKey("createdAt", "desc"), "newest")
  assert.equal(getActiveSortKey("purchasePrice", "desc"), "priceDesc")
  assert.equal(getActiveSortKey("name", "desc"), null)
})

test("default columns fit a 1440px screen without horizontal scroll", () => {
  // Group 4 plan 1 Task 2 (P1-R3): the merged asset column is 280, the room 180, the holder 200.
  assert.equal(assetRegisterColumnWidths.asset, 280)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.operations), 1104)
  assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.operations) <= 1117)
  assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.all) > 1117, "the all preset scrolls")
})

// Plan 2B-3 Task 1 (spec 2B I26, §7.8.4, N8): the actions column holds the ช1 pair of RowActions (next step 120 + gap 4 +
// ⋯ 32 = 156) between pl-1.5 pr-2 and its left line: 172 − 6 − 8 − 0.5 = 157.5. companyBranch gives back 4px, so the
// accounting preset still fits the 1,117px a 1440px screen leaves (DESIGN.md, asset register: no horizontal scroll).
test("the actions column fits the next-step button and ⋯, and the accounting preset still fits 1440px (spec 2B I26)", () => {
  assert.equal(assetRegisterColumnWidths.actions, 172)
  assert.equal(assetRegisterColumnWidths.companyBranch, 116)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.accounting), 1024)
  assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.accounting) <= 1117)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.audit), 1264, "audit scrolls (group 4 plan 1 Task 2: 1,264)")
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.all), 1620, "all scrolls (group 4 plan 1 Task 2: 1,620)")
})
