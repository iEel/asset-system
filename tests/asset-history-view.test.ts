import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import type { AssetHistoryEvent } from "../src/lib/asset-history-rules.ts"
import {
  ASSET_HISTORY_PAGE_SIZE,
  assetDocumentAccess,
  assetHistoryChipCounts,
  assetHistoryPeriodStart,
  buildAssetHistoryExportHref,
  buildAssetHistoryRows,
  filterAssetHistoryRows,
  formatHistoryMonth,
  formatHistoryTime,
  groupAssetHistoryByMonth,
  pageAssetHistoryRows,
  parseAssetHistoryType,
  visibleAssetHistoryChips,
} from "../src/lib/asset-history-view.ts"

const at = (iso: string) => new Date(iso)
const now = at("2026-10-26T05:00:00Z") // noon on 26 Oct in Bangkok
const access = { checkout: true, checkin: true, transfer: true, repair: false, disposal: false, auditRound: true }
const events: AssetHistoryEvent[] = [
  { id: "e3", at: at("2026-10-12T10:05:00Z"), category: "audit", labelKey: "asset.movementTypes.audit_correction", detail: "ตรงตามทะเบียน", actor: "IT01 - ผู้ตรวจ", document: { code: "AUD-2026-0003", href: "/th/audit/rounds/r1", kind: "auditRound" } },
  { id: "e2", at: at("2025-10-25T17:00:00Z"), category: "checkout", labelKey: "asset.movementTypes.checkout", detail: null, actor: null, document: { code: "HO-2025-0001", href: "/th/asset-management/checkouts/c1", kind: "checkout" } },
  { id: "e1", at: at("2025-10-25T16:59:00Z"), category: "repair", labelKey: "asset.movementTypes.maintenance_close", detail: "เปลี่ยนจอ", actor: "IT02 - ช่าง", document: { code: "MT-20251025-0001", href: "/th/maintenance/t1", kind: "repair" } },
]
const rows = buildAssetHistoryRows(events, { locale: "th", now, access, label: (key) => `<${key}>` })
const zero = { checkout: 0, checkin: 0, transfer: 0, audit: 0, repair: 0, disposal: 0, component: 0, edit: 0 }
const server = { total: 3, counts: { ...zero, checkout: 1, audit: 1, repair: 1 } }

test("the page size, and ?type= read only as a known category (spec §7.6; the chips' order is Task 3's ASSET_HISTORY_CATEGORIES)", () => {
  assert.equal(ASSET_HISTORY_PAGE_SIZE, 50)
  assert.equal(parseAssetHistoryType("audit"), "audit")
  assert.equal(parseAssetHistoryType(["repair", "audit"]), "repair")
  for (const raw of [undefined, "", "all", "bogus", "toString", ["x"]]) assert.equal(parseAssetHistoryType(raw), null, String(raw))
})

test("a document links only for those who may open its page (spec §7.6; the dashboard's rule)", () => {
  const asked: string[] = []
  const result = assetDocumentAccess((module, action) => {
    asked.push(`${module}:${action}`)
    return module === "asset" || module === "audit"
  })
  assert.deepEqual(result, { checkout: true, checkin: true, transfer: true, repair: false, disposal: false, auditRound: true })
  assert.ok(asked.every((entry) => entry.endsWith(":view")))
})

test("times and months in Bangkok with the Buddhist year in Thai; 12 เดือนล่าสุด starts on the same Bangkok date a year back", () => {
  assert.equal(formatHistoryTime(at("2026-10-12T10:05:00Z")), "17:05")
  assert.equal(formatHistoryTime(at("2025-10-25T17:00:00Z")), "00:00", "midnight in Bangkok, 24-hour")
  assert.equal(formatHistoryMonth(at("2026-10-12T10:05:00Z"), "th"), "ตุลาคม 2569")
  assert.equal(formatHistoryMonth(at("2026-10-12T10:05:00Z"), "en"), "October 2026")
  assert.equal(formatHistoryMonth(at("2026-09-30T17:30:00Z"), "th"), "ตุลาคม 2569", "00:30 on 1 Oct in Bangkok")
  assert.equal(assetHistoryPeriodStart(now).toISOString(), "2025-10-25T17:00:00.000Z")
  assert.equal(assetHistoryPeriodStart(at("2026-10-25T17:30:00Z")).toISOString(), "2025-10-25T17:00:00.000Z", "00:30 on 26 Oct")
  assert.equal(assetHistoryPeriodStart(at("2026-10-25T16:30:00Z")).toISOString(), "2025-10-24T17:00:00.000Z", "23:30 on 25 Oct")
  assert.equal(assetHistoryPeriodStart(at("2028-02-29T03:00:00Z")).toISOString(), "2027-02-27T17:00:00.000Z", "29 Feb counts from 28 Feb")
})

test("each event becomes a row with its own label, the detail page's date and the Bangkok time, its month, and a document only where the person may open it (spec §7.6; R12, R37)", () => {
  assert.deepEqual(rows, [
    { id: "e3", category: "audit", label: "<asset.movementTypes.audit_correction>", atIso: "2026-10-12T10:05:00.000Z", when: "12 ต.ค. 2569 · 17:05", monthKey: "2026-10", monthLabel: "ตุลาคม 2569", recent: true, detail: "ตรงตามทะเบียน", actor: "IT01 - ผู้ตรวจ", document: { code: "AUD-2026-0003", href: "/th/audit/rounds/r1" } },
    { id: "e2", category: "checkout", label: "<asset.movementTypes.checkout>", atIso: "2025-10-25T17:00:00.000Z", when: "26 ต.ค. 2568 · 00:00", monthKey: "2025-10", monthLabel: "ตุลาคม 2568", recent: true, detail: null, actor: null, document: { code: "HO-2025-0001", href: "/th/asset-management/checkouts/c1" } },
    { id: "e1", category: "repair", label: "<asset.movementTypes.maintenance_close>", atIso: "2025-10-25T16:59:00.000Z", when: "25 ต.ค. 2568 · 23:59", monthKey: "2025-10", monthLabel: "ตุลาคม 2568", recent: false, detail: "เปลี่ยนจอ", actor: "IT02 - ช่าง", document: null },
  ])
  const [en] = buildAssetHistoryRows([events[0]], { locale: "en", now, access, label: (key) => key })
  assert.deepEqual([en.when, en.monthLabel], ["12 Oct 2026 · 17:05", "October 2026"])
  const [edge] = buildAssetHistoryRows([{ ...events[1], id: "edge", at: at("2026-09-30T17:30:00Z") }], { locale: "th", now, access, label: (key) => key })
  assert.deepEqual([edge.monthKey, edge.when], ["2026-10", "1 ต.ค. 2569 · 00:30"], "the Bangkok month and date, not the UTC ones")
  const [denied] = buildAssetHistoryRows([events[1]], { locale: "th", now, access: { ...access, checkout: false }, label: (key) => key })
  assert.equal(denied.document, null, "no permission: neither the link nor the code (R12, the dashboard's rule)")
})

test("a chip and the period filter in place; counts follow the period; months group in order; 50 at a time (spec §7.6)", () => {
  assert.deepEqual(filterAssetHistoryRows(rows, "all", "all").map((row) => row.id), ["e3", "e2", "e1"])
  assert.deepEqual(filterAssetHistoryRows(rows, "checkout", "all").map((row) => row.id), ["e2"])
  assert.deepEqual(filterAssetHistoryRows(rows, "all", "year").map((row) => row.id), ["e3", "e2"])
  assert.deepEqual(filterAssetHistoryRows(rows, "repair", "year"), [])
  assert.equal(rows.length, 3, "the input is not changed")
  assert.deepEqual(assetHistoryChipCounts(rows, "all", server), server, "ทั้งหมด uses the server's counts over every event")
  assert.deepEqual(assetHistoryChipCounts(rows, "year", server), { total: 2, counts: { ...zero, checkout: 1, audit: 1 } })
  assert.deepEqual(visibleAssetHistoryChips(server.counts, null), ["checkout", "audit", "repair"])
  assert.deepEqual(visibleAssetHistoryChips(server.counts, "disposal"), ["checkout", "audit", "repair", "disposal"], "the ?type= chip shows even at zero")
  assert.deepEqual(groupAssetHistoryByMonth(rows), [
    { monthKey: "2026-10", monthLabel: "ตุลาคม 2569", rows: [rows[0]] },
    { monthKey: "2025-10", monthLabel: "ตุลาคม 2568", rows: [rows[1], rows[2]] },
  ])
  assert.deepEqual(groupAssetHistoryByMonth([]), [])
  const many = Array.from({ length: 120 }, (_, index) => index)
  assert.deepEqual([pageAssetHistoryRows(many, 50).shown.length, pageAssetHistoryRows(many, 50).remaining], [50, 70])
  assert.deepEqual([pageAssetHistoryRows(many, 150).shown.length, pageAssetHistoryRows(many, 150).remaining], [120, 0])
  assert.equal(buildAssetHistoryExportHref("th", "asset id/1"), "/api/assets/asset%20id%2F1/history/export?locale=th")
  assert.equal(buildAssetHistoryExportHref("en", "a1"), "/api/assets/a1/history/export?locale=en", "the Excel speaks the page's language (R15)")
})

test("the history view rules are client-safe: relative imports, no database", () => {
  const source = readFileSync("src/lib/asset-history-view.ts", "utf8")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type\b)[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /\bprisma\./)
})
