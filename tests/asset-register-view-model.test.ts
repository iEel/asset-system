import assert from "node:assert/strict"
import test from "node:test"

import { parseAssetListParams } from "../src/lib/asset-list-query.ts"
import { buildStatusTabs } from "../src/lib/asset-register-status-tabs.ts"
import { buildAssetRegisterChips, buildAssetRegisterClearAllHref } from "../src/lib/asset-register-chips.ts"
import { assetRegisterSortOptions, getActiveSortKey } from "../src/lib/asset-register-sort.ts"
import { getRowNextAction } from "../src/lib/asset-operation-policy.ts"
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

  assert.deepEqual(result.tabs.map((tab) => tab.key), ["all", "ready", "inUse", "checkedOut", "pendingRepair"])
  assert.deepEqual(result.tabs.map((tab) => tab.count), [1637, 127, 1507, 0, 0])
  assert.deepEqual(result.tabs.map((tab) => tab.active), [true, false, false, false, false])
  assert.deepEqual(result.tabStatusIds, ["s-ready", "s-use", "s-out", "s-pending"])
  assert.equal(result.otherStatusActive, false)
})

test("a status without a tab leaves every tab inactive", () => {
  const result = buildStatusTabs({ statuses, counts, statusId: "s-lost" })

  assert.equal(result.tabs.some((tab) => tab.active), false)
  assert.equal(result.otherStatusActive, true)
  assert.equal(buildStatusTabs({ statuses, counts, statusId: "s-use" }).tabs.find((tab) => tab.active)?.key, "inUse")
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
  supplier: "ผู้ขาย",
  rowsPerPage: "จำนวนต่อหน้า",
  ownershipTypes: { shared: "ใช้ร่วมกัน" },
  dataQuality: { serial: "ไม่มี Serial", department: "แผนกไม่ครบ", licenseExpiry: "License ใกล้หมดอายุ", returnDue: "ใกล้/เลยกำหนดคืน" },
  crossScope: { all: "ต่างบริษัท/ต่างสาขา" },
  activity: { idle_180d: "ไม่มีความเคลื่อนไหวใน 180 วันล่าสุด" },
  custodianState: { assigned: "มีผู้ถือครอง" },
}

function chipsFor(query: string) {
  return buildAssetRegisterChips({
    basePath: "/th/assets",
    filters: filters(query),
    tabStatusIds: ["s-ready"],
    names: { company: "SNI - สยาม", status: "สูญหาย", brand: "Dell", custodian: "E001 - สมชาย", supplier: "SUP1 - ร้านเอ" },
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
    ["dataQuality", "ใกล้/เลยกำหนดคืน", false],
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

test("the next-step button prefers handover, then return, else nothing", () => {
  assert.equal(getRowNextAction([
    { action: "checkout", enabled: true },
    { action: "checkin", enabled: true },
  ]), "checkout")
  assert.equal(getRowNextAction([
    { action: "checkout", enabled: false },
    { action: "checkin", enabled: true },
    { action: "transfer", enabled: true },
  ]), "checkin")
  assert.equal(getRowNextAction([
    { action: "checkout", enabled: false },
    { action: "checkin", enabled: false },
    { action: "transfer", enabled: true },
  ]), null)
  assert.equal(getRowNextAction([]), null)
})

test("default columns fit a 1440px screen without horizontal scroll", () => {
  assert.equal(assetRegisterColumnWidths.name, 200)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.operations), 1116)
  assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.operations) <= 1117)
  assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.all) > 1117, "the all preset scrolls")
})

// Plan 2B-3 Task 1 (spec 2B I26, §7.8.4, N8): the actions column holds the ช1 pair of RowActions (next step 120 + gap 4 +
// ⋯ 32 = 156) between pl-1.5 pr-2 and its left line: 172 − 6 − 8 − 0.5 = 157.5. companyBranch gives back 4px, so the
// accounting preset still fits the 1,117px a 1440px screen leaves (DESIGN.md, asset register: no horizontal scroll).
test("the actions column fits the next-step button and ⋯, and the accounting preset still fits 1440px (spec 2B I26)", () => {
  assert.equal(assetRegisterColumnWidths.actions, 172)
  assert.equal(assetRegisterColumnWidths.companyBranch, 116)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.accounting), 1116)
  assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.accounting) <= 1117)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.audit), 1276, "audit scrolls, as before")
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.all), 1632, "all scrolls, as before")
})
