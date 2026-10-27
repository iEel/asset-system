import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  latestAuditResultAt,
  latestAuditResultOrderBy,
  latestAuditResultSelect,
  latestAuditResultWhere,
  pickLatestAuditResultAt,
} from "../src/lib/latest-audit-result-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const at = (iso: string) => new Date(iso)
const open = { isActive: true, status: "open" }
const row = (assetId: string, auditResult: string | null, lastScanAt: string | null, updatedAt: string, auditRound = open) => ({
  assetId,
  auditResult,
  lastScanAt: lastScanAt ? at(lastScanAt) : null,
  updatedAt: at(updatedAt),
  auditRound,
})

test("the asset's latest audit result: the asset page's where, order and date, in one copy (group 1 R54; group 2 plan 2 P2-R32)", () => {
  assert.deepEqual(latestAuditResultWhere, { auditResult: { not: null }, auditRound: { isActive: true, status: { not: "cancelled" } } })
  assert.deepEqual(latestAuditResultOrderBy, [{ lastScanAt: "desc" }, { updatedAt: "desc" }])
  assert.deepEqual(latestAuditResultSelect, { assetId: true, auditResult: true, lastScanAt: true, updatedAt: true, auditRound: { select: { isActive: true, status: true } } })
  assert.deepEqual(latestAuditResultAt({ lastScanAt: at("2026-09-01T03:00:00Z"), updatedAt: at("2026-09-02T03:00:00Z") }), at("2026-09-01T03:00:00Z"))
  assert.deepEqual(latestAuditResultAt({ lastScanAt: null, updatedAt: at("2026-09-02T03:00:00Z") }), at("2026-09-02T03:00:00Z"), "a not-found record with no scan dates from its change")
})

test("ตรวจล่าสุด on the pending list: an earlier round's found item gives its date; a cancelled or inactive round and a null result are skipped; none gives no entry (P2-R32)", () => {
  const rows = [
    // a1 was found in place in an earlier round, which writes no movement: its scan is the date.
    row("a1", "found", "2026-05-10T02:30:00Z", "2026-05-10T02:30:00Z"),
    // Later items of a1 in a cancelled round, in an inactive round, and with no result never win.
    row("a1", "found", "2026-09-01T02:00:00Z", "2026-09-01T02:00:00Z", { isActive: true, status: "cancelled" }),
    row("a1", "wrong_location", "2026-09-02T02:00:00Z", "2026-09-02T02:00:00Z", { isActive: false, status: "closed" }),
    row("a1", null, "2026-09-03T02:00:00Z", "2026-09-03T02:00:00Z"),
    // a2: a scanned item comes before a later not-found record with no scan (a null lastScanAt sorts last, as SQL
    // Server's desc does), as on the asset page.
    row("a2", "found", "2026-06-01T03:00:00Z", "2026-06-01T03:00:00Z", { isActive: true, status: "closed" }),
    row("a2", "not_found", null, "2026-09-05T03:00:00Z"),
    // a3: only a not-found record: its change is the date.
    row("a3", "not_found", null, "2026-08-20T04:00:00Z"),
    // a4: nothing that counts, so the page reads "ยังไม่เคยตรวจ".
    row("a4", "found", "2026-09-01T02:00:00Z", "2026-09-01T02:00:00Z", { isActive: true, status: "cancelled" }),
    row("a4", null, null, "2026-09-01T02:00:00Z"),
  ]
  const latest = pickLatestAuditResultAt(rows)
  assert.deepEqual(latest, new Map([["a1", at("2026-05-10T02:30:00Z")], ["a2", at("2026-06-01T03:00:00Z")], ["a3", at("2026-08-20T04:00:00Z")]]))
  assert.equal(latest.has("a4"), false)
  assert.deepEqual(pickLatestAuditResultAt([...rows].reverse()), latest, "the pick does not rest on the rows' order")
  assert.equal(pickLatestAuditResultAt([]).size, 0)
})

test("the latest-result rules are pure, and the asset page's frame reads them (one copy)", () => {
  const source = read("src/lib/latest-audit-result-rules.ts")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
  assert.match(source, /^import \{ auditRoundCoverageWhere \} from "\.\/audit-round-status\.ts"$/m)
  const frame = read("src/lib/asset-detail-frame.ts")
  assert.match(frame, /^import \{ latestAuditResultAt, latestAuditResultOrderBy, latestAuditResultWhere \} from "@\/lib\/latest-audit-result-rules"$/m)
  assert.doesNotMatch(frame, /lastScanAt: "desc"|lastScanAt \?\? /, "no second copy of the order or the date")
})
