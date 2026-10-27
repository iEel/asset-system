import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  buildAssetDetailMoreGroups,
  buildCustodianHref,
  buildLocationRegisterHref,
  describeAssetAudit,
  describeAssetHolder,
  describeAssetWarranty,
  formatAssetDetailDate,
  getDisposalRequestOffer,
  listAssetDataGaps,
  withoutPhoneOnly,
  type AssetDataGap,
  type AssetHolderCell,
} from "../src/lib/asset-detail-frame-rules.ts"
import type { AssetOwnershipKind } from "../src/lib/asset-actions.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const now = new Date("2026-10-26T03:00:00Z") // 10:00 in Bangkok
const heldDays = (cell: AssetHolderCell) => (cell.kind === "custodian" ? cell.heldDays : undefined)

test("the first fact follows the ownership type, and ถือมาแล้ว counts Bangkok days from the open handover (spec §7.4)", () => {
  const base = { custodian: null, department: null, parent: null, seats: { used: null, total: null }, openCheckoutDate: null, now }
  const custodian = { id: "e1", code: "E001", fullNameTh: "สมชาย ใจดี", department: "ACC - ฝ่ายบัญชี" }
  assert.deepEqual(
    describeAssetHolder({ ...base, ownership: "personal", custodian, openCheckoutDate: new Date("2026-09-09T18:00:00Z") }),
    { kind: "custodian", employeeId: "e1", name: "สมชาย ใจดี", department: "ACC - ฝ่ายบัญชี", heldDays: 46 },
  )
  assert.equal(heldDays(describeAssetHolder({ ...base, ownership: "personal", custodian, openCheckoutDate: new Date("2026-10-25T16:59:00Z") })), 1, "23:59 yesterday in Bangkok")
  assert.equal(heldDays(describeAssetHolder({ ...base, ownership: "personal", custodian, openCheckoutDate: new Date("2026-10-25T17:00:00Z") })), 0, "00:00 today in Bangkok")
  assert.equal(heldDays(describeAssetHolder({ ...base, ownership: "personal", custodian })), null, "an imported custodian with no open handover has no count")
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "personal" }), { kind: "noCustodian" })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "stock", department: "IT - ฝ่ายไอที" }), { kind: "department", label: "managing", department: "IT - ฝ่ายไอที" })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "shared", custodian }), { kind: "department", label: "using", department: null })
  const parent = { id: "p1", assetTag: "GRL-COM-26-0017", name: "Notebook Lenovo" }
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "component", parent }), { kind: "parent", parent })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "component" }), { kind: "parent", parent: null })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "software_license", seats: { used: 2, total: 5 } }), { kind: "seats", used: 2, total: 5 })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "software_license" }), { kind: "seats", used: 0, total: null })
})

test("ตรวจนับล่าสุด: waiting in an open round first, else the latest result with its badge tone, else never (spec §7.4)", () => {
  const r1 = { id: "r1", auditNo: "AUD-2026-0003" }
  const r2 = { id: "r2", auditNo: "AUD-2026-0007" }
  const at = new Date("2026-10-12T10:05:00Z")
  assert.deepEqual(describeAssetAudit({ auditResult: "found", at, round: r1 }, { round: r2 }), { kind: "pending", round: r2 })
  assert.deepEqual(describeAssetAudit({ auditResult: "found", at, round: r1 }, null), { kind: "result", result: "found", labelKey: "found", tone: "success", at, round: r1 })
  const tones = ["confirmed_with_parent", "mismatch", "out_of_scope", "not_found", "legacy_code"].map((auditResult) => {
    const cell = describeAssetAudit({ auditResult, at, round: r1 }, null)
    return cell.kind === "result" ? [cell.labelKey, cell.tone] : null
  })
  // The round page's item badge tones (audit/rounds/[id]/page.tsx:364, R54).
  assert.deepEqual(tones, [["confirmedWithParent", "success"], ["mismatch", "muted"], ["outOfScope", "muted"], ["notFound", "danger"], [null, "muted"]])
  assert.deepEqual(describeAssetAudit(null, null), { kind: "never" })
})

test("ประกัน: until the end day, ended after it, unknown without a date, in Bangkok days (spec §7.4)", () => {
  assert.deepEqual(describeAssetWarranty(null, now), { kind: "unknown" })
  const later = new Date("2027-01-12T00:00:00Z")
  assert.deepEqual(describeAssetWarranty(later, now), { kind: "until", date: later })
  const today = new Date("2026-10-25T17:00:00Z") // 00:00 on 26 Oct in Bangkok
  assert.deepEqual(describeAssetWarranty(today, now), { kind: "until", date: today }, "the end day is still covered")
  const yesterday = new Date("2026-10-25T16:59:00Z") // 23:59 on 25 Oct in Bangkok
  assert.deepEqual(describeAssetWarranty(yesterday, now), { kind: "expired", date: yesterday })
})

test("a detail date: day, short month and year in Bangkok, Buddhist in Thai", () => {
  assert.equal(formatAssetDetailDate(new Date("2027-01-12T00:00:00Z"), "th"), "12 ม.ค. 2570")
  assert.equal(formatAssetDetailDate(new Date("2026-10-12T10:00:00Z"), "th"), "12 ต.ค. 2569")
  assert.equal(formatAssetDetailDate(new Date("2026-12-31T17:30:00Z"), "th"), "1 ม.ค. 2570", "already the new year in Bangkok")
  assert.equal(formatAssetDetailDate(new Date("2027-01-12T00:00:00Z"), "en"), "12 Jan 2027")
})

test("the fact strip's links: the employee page with employee:view, else the register by custodian; the register by location (spec §7.4)", () => {
  assert.equal(buildCustodianHref("th", "e 1", true), "/th/master-data/employees/e%201")
  assert.equal(buildCustodianHref("th", "e1", false), "/th/assets?custodianId=e1&exact=1")
  assert.equal(buildLocationRegisterHref("en", "loc/1"), "/en/assets?locationId=loc%2F1&exact=1")
})

test("ขอตัดจำหน่าย: offered when the status allows and nothing is open, unavailable with the API's first blocker (spec §7.1)", () => {
  const base = { canCreate: true, status: { name: "Ready" }, openDisposalId: null, blockers: [] }
  assert.deepEqual(getDisposalRequestOffer(base), { blocker: null })
  assert.deepEqual(getDisposalRequestOffer({ ...base, status: { name: "In Use" }, blockers: ["open_checkout", "operational_audit"] }), { blocker: "open_checkout" })
  assert.deepEqual(getDisposalRequestOffer({ ...base, status: { name: "Pending Disposal" } }), { blocker: null }, "a repair closed to Pending Disposal before anyone asked")
  for (const name of ["Pending Repair", "Under Maintenance", "Lost", "Missing", "Disposed", "Retired"]) assert.equal(getDisposalRequestOffer({ ...base, status: { name } }), null, name)
  assert.equal(getDisposalRequestOffer({ ...base, openDisposalId: "d1" }), null)
  assert.equal(getDisposalRequestOffer({ ...base, canCreate: false }), null)
})

test("อื่น ๆ: the other transactions, then the page's own items in the spec's order; the phone adds แก้ไข and พิมพ์ป้าย last (spec §7.1, §7.8; R21)", () => {
  const groups = buildAssetDetailMoreGroups({
    primaryKey: "checkin",
    // Task 1's transactions never hold the primary (R3).
    transactions: [
      { key: "checkout", label: "ส่งมอบ", href: null, enabled: false, reason: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น" },
      { key: "transfer", label: "โอนย้าย", href: null, enabled: false, reason: "มีการส่งมอบค้างอยู่" },
    ],
    recordRepair: null,
    disposal: { label: "ขอตัดจำหน่าย", href: "/th/disposal/new?assetId=a1", reason: "ยังไม่ได้รับคืนจากผู้ถือครอง" },
    correctStatus: "แก้ไขสถานะ",
    cancelLatest: "ยกเลิกรายการล่าสุด",
    manageComponents: { label: "จัดการส่วนควบ", href: "/th/assets/a1/components" },
    clone: { label: "คัดลอกเป็นรายการใหม่", href: "/th/assets/new?cloneFrom=a1" },
    edit: { label: "แก้ไข", href: "/th/assets/a1/edit" },
    printLabel: { label: "พิมพ์ป้าย", href: "/th/assets/a1/label" },
  })
  assert.deepEqual(groups, [
    { key: "transactions", items: [
      { kind: "unavailable", key: "checkout", label: "ส่งมอบ", reason: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น" },
      { kind: "unavailable", key: "transfer", label: "โอนย้าย", reason: "มีการส่งมอบค้างอยู่" },
    ] },
    { key: "asset", items: [
      { kind: "unavailable", key: "requestDisposal", label: "ขอตัดจำหน่าย", reason: "ยังไม่ได้รับคืนจากผู้ถือครอง" },
      { kind: "dialog", key: "correctStatus", label: "แก้ไขสถานะ" },
      { kind: "dialog", key: "cancelLatest", label: "ยกเลิกรายการล่าสุด" },
      { kind: "link", key: "manageComponents", label: "จัดการส่วนควบ", href: "/th/assets/a1/components" },
      { kind: "link", key: "clone", label: "คัดลอกเป็นรายการใหม่", href: "/th/assets/new?cloneFrom=a1" },
      { kind: "link", key: "edit", label: "แก้ไข", href: "/th/assets/a1/edit", phoneOnly: true },
      { kind: "link", key: "printLabel", label: "พิมพ์ป้าย", href: "/th/assets/a1/label", phoneOnly: true },
    ] },
  ])
  const desktop = withoutPhoneOnly(groups)
  assert.deepEqual(desktop[1].items.map((item) => item.key), ["requestDisposal", "correctStatus", "cancelLatest", "manageComponents", "clone"])
})

test("อื่น ๆ: an available transaction is a link before the unavailable ones, a page item never repeats the primary, the scan return's บันทึกซ่อม is a phone item, and an empty group is left out", () => {
  const groups = buildAssetDetailMoreGroups({
    primaryKey: "manageComponents",
    transactions: [
      { key: "checkin", label: "รับคืน", href: null, enabled: false, reason: "ไม่มีรายการส่งมอบให้รับคืน" },
      { key: "transfer", label: "ย้ายชิ้นส่วน", href: "/th/asset-management/transfer?assetId=a1", enabled: true, reason: null },
    ],
    // From the scan page the phone bar holds สแกนรายการถัดไป and the primary, so บันทึกซ่อม moves into the sheet (R21).
    recordRepair: { label: "บันทึกซ่อม", href: "/th/maintenance/new?assetId=a1" },
    disposal: null, correctStatus: null, cancelLatest: null,
    manageComponents: { label: "จัดการส่วนควบ", href: "/th/assets/a1/components" },
    clone: null, edit: null,
    printLabel: { label: "พิมพ์ป้าย", href: "/th/assets/a1/label" },
  })
  assert.deepEqual(groups.map((group) => [group.key, group.items.map((item) => `${item.kind}:${item.key}`)]), [
    ["transactions", ["link:transfer", "unavailable:checkin"]],
    ["asset", ["link:recordRepair", "link:printLabel"]],
  ])
  assert.equal(groups[1].items[0].kind === "link" && groups[1].items[0].phoneOnly, true, "the desktop pins บันทึกซ่อม in the header")
  assert.deepEqual(withoutPhoneOnly(groups).map((group) => group.key), ["transactions"], "a group left with only phone items goes on the desktop")
  const viewer = buildAssetDetailMoreGroups({ primaryKey: null, transactions: [], recordRepair: null, disposal: null, correctStatus: null, cancelLatest: null, manageComponents: null, clone: null, edit: null, printLabel: { label: "พิมพ์ป้าย", href: "/th/assets/a1/label" } })
  assert.deepEqual(withoutPhoneOnly(viewer), [], "a viewer's desktop has no อื่น ๆ")
})

test("ข้อมูลยังไม่ครบ: today's data-health items by ownership type, in their order, each with the place it is fixed (R59)", () => {
  const complete = { hasSerial: true, hasResponsibility: true, hasPrimaryPhoto: true, missingChecklistCount: 0, hasPurchaseDocument: true, hasWarrantyEnd: true, hasLicenseSeats: true }
  for (const ownership of ["personal", "shared", "stock", "component", "software_license"] as const) assert.deepEqual(listAssetDataGaps({ ownership, ...complete }), [], ownership)

  const bare = { hasSerial: false, hasResponsibility: false, hasPrimaryPhoto: false, missingChecklistCount: 2, hasPurchaseDocument: false, hasWarrantyEnd: false, hasLicenseSeats: false }
  const brief = (gaps: AssetDataGap[]) => gaps.map((gap) => [gap.key, gap.labelKey, gap.target, gap.anchor, gap.count ?? null])
  // The order of today's panel (P:744-759); the labels are the app's own words for each field.
  assert.deepEqual(brief(listAssetDataGaps({ ownership: "shared", ...bare })), [
    ["serial", "asset.serialNumber", "edit", "asset-serial-number", null],
    ["photo", "asset.primaryAssetPhoto", "files", null, null],
    ["checklist", "asset.dataHealthChecklistMissing", "files", null, 2],
    ["purchaseDocument", "asset.purchaseDocuments", "purchaseDocuments", null, null],
    ["responsibility", "assetDetail.usingDepartment", "edit", "asset-department", null],
    ["warranty", "asset.dataGapWarranty", "edit", "asset-warranty-end", null],
  ])
  // A licence has no photo or checklist (P:736-743); its key is the serial field, its expiry the warranty field.
  assert.deepEqual(brief(listAssetDataGaps({ ownership: "software_license", ...bare })), [
    ["licenseKey", "asset.licenseKey", "edit", "asset-serial-number", null],
    ["responsibility", "asset.licenseAssignee", "edit", "asset-custodian", null],
    ["licenseSeats", "asset.licenseTotalSeats", "edit", "asset-license-total-seats", null],
    ["purchaseDocument", "asset.purchaseDocuments", "purchaseDocuments", null, null],
    ["licenseExpiry", "asset.dataGapLicenseExpiry", "edit", "asset-warranty-end", null],
  ])
  // Who is responsible follows the ownership type (hasAssetResponsibility, src/lib/asset-ownership.ts), in the fact strip's words (R30).
  const responsibility = (ownership: AssetOwnershipKind) => listAssetDataGaps({ ownership, ...complete, hasResponsibility: false }).map((gap) => [gap.labelKey, gap.anchor])
  assert.deepEqual(responsibility("personal"), [["asset.custodian", "asset-custodian"]])
  assert.deepEqual(responsibility("stock"), [["assetDetail.managingDepartment", "asset-department"]])
  assert.deepEqual(responsibility("shared"), [["assetDetail.usingDepartment", "asset-department"]])
  assert.deepEqual(responsibility("component"), [["asset.parentAsset", null]])
  // A checklist with nothing missing, or a category without one, is complete.
  assert.deepEqual(listAssetDataGaps({ ownership: "personal", ...complete, missingChecklistCount: 0 }), [])
})

test("the frame reads one row or one count per question, in one round, with the API's own definitions (spec §5 Performance, §7.1)", () => {
  const source = read("src/lib/asset-detail-frame.ts")
  assert.match(source, /export async function getAssetDetailFrame\(assetId: string\): Promise<AssetDetailFrame>/)
  assert.equal(source.match(/await Promise\.all\(\[/g)?.length, 1)
  assert.match(source, /prisma\.assetCheckout\.findFirst\(\{\s*where: \{ assetId, isReturned: false, transactionStatus: "active" \}/)
  assert.match(source, /prisma\.maintenanceTicket\.findFirst\(\{\s*where: \{ assetId, \.\.\.openRepairRecordWhere \}/)
  // The disposal API's own "open request" (src/app/api/disposal-requests/route.ts:68-73).
  assert.match(source, /where: \{ assetId, isActive: true, requestStatus: \{ in: \["pending", "approved"\] \} \}/)
  assert.match(source, /where: \{ assetId, auditStatus: "pending", auditRound: \{ isActive: true, status: auditRoundOperationalWhere \} \}/)
  assert.match(source, /where: \{ assetId, \.\.\.latestAuditResultWhere \},\s+orderBy: latestAuditResultOrderBy,/, "the asset's latest result: the rule in src/lib/latest-audit-result-rules.ts, shared with the pending list (group 2 plan 2 P2-R32)")
  assert.match(source, /at: latestAuditResultAt\(latestItem\)/)
  assert.match(source, /select: disposalReadinessAssetSelect/)
  assert.match(source, /disposalBlockers: readiness \? getDisposalReadinessBlockersForAsset\(readiness\) : \[\]/)
  assert.doesNotMatch(source, /findMany\(|"use client"/)
})
