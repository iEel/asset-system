import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  AUDIT_ID_CHUNK_SIZE,
  AUDIT_OUT_OF_SCOPE_RESULT,
  auditRoundOutOfScopeItemWhere,
  auditRoundOwnItemWhere,
  chunkAuditIds,
  emptyAuditRoundCounts,
  foldAuditRoundCounts,
  isAuditRoundOwnItem,
  withAuditRoundOwnItems,
} from "../src/lib/audit-round-counts-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("a round's own items are its items without the out-of-scope result; a pending item's null result is its own (group 2 spec §5)", () => {
  assert.equal(AUDIT_OUT_OF_SCOPE_RESULT, "out_of_scope")
  assert.equal(isAuditRoundOwnItem({ auditResult: null }), true, "a pending item")
  for (const result of ["found", "confirmed_with_parent", "not_found", "wrong_location", "need_review"]) {
    assert.equal(isAuditRoundOwnItem({ auditResult: result }), true, result)
  }
  assert.equal(isAuditRoundOwnItem({ auditResult: "out_of_scope" }), false)
  // Prisma's `not` compiles to [auditResult] <> @p, which drops NULL rows: every pending item would vanish.
  assert.deepEqual(auditRoundOwnItemWhere, { OR: [{ auditResult: null }, { auditResult: { not: "out_of_scope" } }] })
  assert.deepEqual(auditRoundOutOfScopeItemWhere, { auditResult: "out_of_scope" })
})

test("the own-items where is AND-combined, so a caller's own OR (a search) survives", () => {
  const searched = { auditRoundId: "r1", OR: [{ asset: { assetTag: { contains: "PC" } } }, { asset: { name: { contains: "PC" } } }] }
  assert.deepEqual(withAuditRoundOwnItems(searched), { AND: [searched, auditRoundOwnItemWhere] })
  assert.deepEqual(withAuditRoundOwnItems({}), { AND: [{}, auditRoundOwnItemWhere] })
})

test("one fold gives each round its own total, pending and checked, and its out-of-scope finds apart (group 2 spec §5)", () => {
  const counts = foldAuditRoundCounts([
    { auditRoundId: "r1", auditStatus: "pending", auditResult: null, count: 5 },
    { auditRoundId: "r1", auditStatus: "scanned", auditResult: "found", count: 7 },
    { auditRoundId: "r1", auditStatus: "reviewed", auditResult: "wrong_location", count: 2 },
    // The review route sets the status only, so a checked item can have no result.
    { auditRoundId: "r1", auditStatus: "reviewed", auditResult: null, count: 1 },
    { auditRoundId: "r1", auditStatus: "reviewed", auditResult: "out_of_scope", count: 3 },
    { auditRoundId: "r2", auditStatus: "reviewed", auditResult: "out_of_scope", count: 1 },
  ])
  assert.deepEqual(counts.get("r1"), { total: 15, pending: 5, checked: 10, outOfScope: 3 })
  assert.deepEqual(counts.get("r2"), { total: 0, pending: 0, checked: 0, outOfScope: 1 })
  assert.equal(counts.has("r3"), false)
  assert.equal(foldAuditRoundCounts([]).size, 0)
  assert.deepEqual(emptyAuditRoundCounts, { total: 0, pending: 0, checked: 0, outOfScope: 0 })
  assert.equal(Object.isFrozen(emptyAuditRoundCounts), true)
})

test("ids reach SQL Server in chunks of 2,000, under its 2,100-parameter limit", () => {
  assert.equal(AUDIT_ID_CHUNK_SIZE, 2000)
  const ids = Array.from({ length: 4001 }, (_, index) => `r${index}`)
  assert.deepEqual(chunkAuditIds(ids).map((chunk) => chunk.length), [2000, 2000, 1])
  assert.deepEqual(chunkAuditIds(ids).flat(), ids)
  assert.deepEqual(chunkAuditIds([]), [])
  assert.deepEqual(chunkAuditIds(["a", "b", "c"], 2), [["a", "b"], ["c"]])
})

test("the count rules are pure and client-safe, and say that a re-scan turns an out-of-scope find into an own item", () => {
  const source = read("src/lib/audit-round-counts-rules.ts")
  assert.doesNotMatch(source, /from "@\//, "node --test and the phone walk import this file")
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
  assert.match(source, /A re-scan of an out-of-scope find/)
})

test("one groupBy counts any set of rounds, in chunks of ids, folded by the rules; every requested round is in the map", () => {
  const source = read("src/lib/audit-round-counts.ts")
  assert.match(source, /export async function getAuditRoundCounts\(roundIds: readonly string\[\], where\?: Prisma\.AuditItemWhereInput\): Promise<Map<string, AuditRoundCounts>>/)
  assert.match(source, /const ids = \[\.\.\.new Set\(roundIds\)\]/)
  assert.match(source, /chunkAuditIds\(ids\)\.map\(\(chunk\) =>/)
  assert.match(source, /prisma\.auditItem\.groupBy\(\{\s*by: \["auditRoundId", "auditStatus", "auditResult"\],\s*where: where \? \{ AND: \[\{ auditRoundId: \{ in: chunk \} \}, where\] \} : \{ auditRoundId: \{ in: chunk \} \},\s*_count: \{ _all: true \},?\s*\}\)/)
  assert.match(source, /foldAuditRoundCounts\(/)
  assert.match(source, /for \(const id of ids\) if \(!counts\.has\(id\)\) counts\.set\(id, \{ \.\.\.emptyAuditRoundCounts \}\)/)
  assert.equal(source.match(/prisma\.\w+\.\w+\(/g)?.length, 1, "one query shape")
  assert.doesNotMatch(source, /\.(create|update|upsert|delete)(Many)?\(/)
})

test("the dashboard counts the round's own items, so its KPI equals the round page's list it opens (group 2 spec §5, R5)", () => {
  const source = read("src/lib/dashboard-overview.ts")
  assert.match(source, /import \{ withAuditRoundOwnItems \} from "@\/lib\/audit-round-counts-rules"/)
  assert.match(source, /where: withAuditRoundOwnItems\(\{ auditRound: \{ isActive: true, status: auditRoundOperationalWhere \}, \.\.\.\(companyId \? \{ expectedCompanyId: companyId \} : \{\}\) \}\),/)
  const filters = read("src/lib/audit-round-result-filters.ts")
  assert.match(filters, /import \{ withAuditRoundOwnItems \} from "\.\/audit-round-counts-rules\.ts"/)
  assert.match(filters, /return result === "out_of_scope" \|\| result === "pending_review" \? where : withAuditRoundOwnItems\(where\)/)
})

test("the round page's total, checked and progress count the round's own items (group 2 spec §5; plan 1's minimal edit)", () => {
  const page = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx")
  assert.match(page, /getAuditRoundCounts\(\[id\]\),/)
  assert.match(page, /const roundCounts = roundCountsById\.get\(round\.id\) \?\? emptyAuditRoundCounts/)
  assert.match(page, /const pendingCount = roundCounts\.pending\n\s+const processedCount = roundCounts\.checked/)
  assert.match(page, /const progress = roundCounts\.total > 0 \? Math\.round\(\(roundCounts\.checked \/ roundCounts\.total\) \* 100\) : 0/)
  assert.match(page, /\{ key: "totalExpected", label: t\("totalExpected"\), value: formatCount\(roundCounts\.total\) \}/)
  assert.match(page, /\{ key: "scanned", label: t\("scanned"\), value: formatCount\(processedCount\) \}/)
  assert.match(page, /<AuditProgressBar\s+total=\{roundCounts\.total\}\s+processed=\{processedCount\}\s+pending=\{pendingCount\}/)
  // The cancel dialog's "work done" stays the API's count (route.ts getCancellationImpact): every non-pending item.
  assert.match(page, /processedItems: roundCounts\.checked \+ roundCounts\.outOfScope,/)
  assert.doesNotMatch(page, /_count\.items|_count: \{ select: \{ items: true|by: \["auditStatus"\]|scannedCount/)
  assert.doesNotMatch(page, /statusCounts|round\._count/, "the old pendingCount / processedCount lines are gone")
})
