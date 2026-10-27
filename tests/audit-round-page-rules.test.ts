import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildAuditFindingWhere } from "../src/lib/audit-finding-filters.ts"
import {
  AUDIT_STALE_FINDING_REVIEW_REMARK,
  auditPersonDecidedFindingWhere,
  auditRoundAnyFieldFindingWhere,
  auditRoundPersonDecidedFindingWhere,
  auditRoundTopCategoryIds,
  auditSystemFindingDecisionActions,
  buildAuditRoundCategoryChips,
  buildAuditRoundPageMainAction,
  buildAuditRoundPageSteps,
  foldAuditRoundEvidence,
  formatAuditUserLabel,
  hasMultipleAuditFieldFindings,
  listAuditRoundMissingComponents,
  resolveAuditRoundRowChecker,
} from "../src/lib/audit-round-page-rules.ts"
import { auditRoundHrefQuery, buildAuditRoundExportHref, buildAuditRoundPageHref, parseAuditRoundListFilters } from "../src/lib/audit-round-result-filters.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("step 2 counts findings: รอ n is the findings page's pending rows, พิจารณาแล้ว m the findings a person decided; the scan's own closings are no decision (P2-R26)", () => {
  const scan = read("src/app/api/audit-rounds/[id]/scan/route.ts")
  assert.equal(AUDIT_STALE_FINDING_REVIEW_REMARK, "ยกเลิกเพราะแก้ผลตรวจ")
  assert.match(scan, /const staleFindingReviewRemark = "ยกเลิกเพราะแก้ผลตรวจ"/, "the scan route writes the same words")
  assert.deepEqual([...auditSystemFindingDecisionActions], ["component_confirmed_with_parent_mismatch_resolved", "found_later_by_component_confirmation", "found_later_by_audit_scan"])
  for (const action of auditSystemFindingDecisionActions) assert.match(scan, new RegExp(`actionTaken: "${action}"`), action)
  // reviewRemark and actionTaken are nullable: Prisma's `not` / `notIn` drop NULL rows, so the null branch is spelled out.
  assert.deepEqual(auditPersonDecidedFindingWhere, {
    reviewStatus: { in: ["approved", "rejected", "exception"] },
    AND: [
      { OR: [{ reviewRemark: null }, { reviewRemark: { not: "ยกเลิกเพราะแก้ผลตรวจ" } }] },
      { OR: [{ actionTaken: null }, { actionTaken: { notIn: ["component_confirmed_with_parent_mismatch_resolved", "found_later_by_component_confirmation", "found_later_by_audit_scan"] } }] },
    ],
  })
  assert.deepEqual(auditRoundPersonDecidedFindingWhere("round-1"), { AND: [{ auditRoundId: "round-1" }, auditPersonDecidedFindingWhere] })
  // รอ n is the close checklist's count (getAuditRoundCloseChecklist), the same where the findings page reads for
  // "พิจารณา n รายการ" (findings?status=pending&roundId=), so the step, its button and the page agree.
  assert.deepEqual(buildAuditFindingWhere({ status: "pending", roundId: "round-1" }), { reviewStatus: "pending", auditRoundId: "round-1" })
})

test("the field bars' distinct items and the several-fields line (P2-R16, P2-R18)", () => {
  assert.deepEqual(auditRoundAnyFieldFindingWhere, {
    findings: { some: { findingType: { in: ["wrong_location", "wrong_department", "wrong_custodian", "wrong_condition"] }, reviewStatus: { in: ["pending", "approved"] } } },
  })
  // The E2E walk's A2: แผนก and สภาพ on one item.
  assert.equal(hasMultipleAuditFieldFindings({ location: 0, department: 1, custodian: 0, condition: 1 }, 1), true)
  assert.equal(hasMultipleAuditFieldFindings({ location: 1, department: 1, custodian: 0, condition: 0 }, 2), false)
  assert.equal(hasMultipleAuditFieldFindings({ location: 0, department: 0, custodian: 0, condition: 0 }, 0), false)
})

test("a person reads as their display name and username, once when both are the same, and as the stored id when unknown", () => {
  assert.equal(formatAuditUserLabel({ username: "somchai", displayName: "สมชาย ใจดี" }, "user-a"), "สมชาย ใจดี (somchai)")
  assert.equal(formatAuditUserLabel({ username: "suda", displayName: "suda" }, "user-b"), "suda")
  assert.equal(formatAuditUserLabel(undefined, "user-gone"), "user-gone")
  assert.equal(formatAuditUserLabel(null, null), null)
})

test("the category chips: the six largest, ties by id, then อื่น ๆ; the chosen category outside the six stays; hidden at one category or none (§8, P2-R11, P2-R24)", () => {
  const rows = [
    { id: "c8", count: 1 }, { id: "c7", count: 3 }, { id: "c6", count: 5 }, { id: "c5", count: 5 },
    { id: "c4", count: 10 }, { id: "c3", count: 20 }, { id: "c2", count: 30 }, { id: "c1", count: 40 },
  ]
  const names = new Map(rows.map((row) => [row.id, { code: row.id.toUpperCase(), name: `หมวดหมู่ ${row.id}` }]))
  assert.deepEqual(auditRoundTopCategoryIds(rows), ["c1", "c2", "c3", "c4", "c5", "c6"])
  const chips = buildAuditRoundCategoryChips({ rows, names, selectedCategoryId: null })
  assert.equal(chips.visible, true)
  assert.equal(chips.all, 114, "ทุกหมวดหมู่: every row, the category not applied")
  assert.deepEqual(chips.top[0], { id: "c1", code: "C1", name: "หมวดหมู่ c1", count: 40 })
  assert.deepEqual(chips.top.map((chip) => chip.id), ["c1", "c2", "c3", "c4", "c5", "c6"])
  assert.deepEqual(chips.other, { categories: 2, count: 4 })
  assert.equal(chips.selected, null)
  assert.deepEqual(buildAuditRoundCategoryChips({ rows, names, selectedCategoryId: "c8" }).selected, { id: "c8", code: "C8", name: "หมวดหมู่ c8", count: 1 })
  assert.equal(buildAuditRoundCategoryChips({ rows, names, selectedCategoryId: "c2" }).selected, null, "a chosen chip inside the six is already shown")
  assert.equal(buildAuditRoundCategoryChips({ rows, names, selectedCategoryId: "gone" }).selected, null, "an unknown id is the page's redirect, never a chip")
  assert.equal(buildAuditRoundCategoryChips({ rows: [{ id: "c1", count: 3 }], names, selectedCategoryId: null }).visible, false)
  assert.equal(buildAuditRoundCategoryChips({ rows: [], names, selectedCategoryId: null }).visible, false)
  // The six ranked over every result (P2-R11): each is counted within the result in use, 0 allowed; อื่น ๆ is the rest.
  const inResult = buildAuditRoundCategoryChips({ rows: [{ id: "c7", count: 4 }, { id: "c2", count: 1 }], names, selectedCategoryId: null, topIds: ["c1", "c2", "c3", "c4", "c5", "c6"] })
  assert.deepEqual(inResult.top.map((chip) => [chip.id, chip.count]), [["c1", 0], ["c2", 1], ["c3", 0], ["c4", 0], ["c5", 0], ["c6", 0]])
  assert.deepEqual(inResult.other, { categories: 1, count: 4 })
})

test("รูปหลักฐาน counts the round's own checked items only: never a pending item, never an out-of-scope find (bug 10)", () => {
  const evidence = foldAuditRoundEvidence({
    items: [
      { assetId: "a1", categoryId: "desk", auditStatus: "scanned", auditResult: "found" },
      { assetId: "a2", categoryId: "desk", auditStatus: "reviewed", auditResult: "wrong_location" },
      { assetId: "a3", categoryId: "mon", auditStatus: "reviewed", auditResult: "not_found" },
      { assetId: "a4", categoryId: "desk", auditStatus: "pending", auditResult: null },
      { assetId: "a5", categoryId: "desk", auditStatus: "reviewed", auditResult: "out_of_scope" },
    ],
    attachmentNamesByAssetId: new Map([
      ["a1", ["ด้านหน้า - 1.jpg", "ป้าย - 2.jpg"]],
      ["a2", ["ด้านหน้า - 3.jpg"]],
      ["a4", ["ด้านหน้า - 9.jpg"]],
      ["a5", ["x.jpg"]],
    ]),
    checklistByCategoryId: new Map([["desk", ["ด้านหน้า", "ป้าย"]]]),
  })
  assert.deepEqual(evidence, { checked: 3, withPhoto: 2, withoutPhoto: 1, checklistComplete: 1, checklistIncomplete: 1 })
})

test("ตรวจโดย is the scanner and the first scan time, or for a not-found item the latest not-found finding's reporter (mark-not-found sets no scanner)", () => {
  const scannedAt = new Date("2026-10-07T02:00:00.000Z")
  assert.deepEqual(resolveAuditRoundRowChecker({ auditResult: "found", scannedBy: "user-a", scannedAt, findings: [] }), { userId: "user-a", at: scannedAt })
  const first = new Date("2026-10-08T01:00:00.000Z")
  const latest = new Date("2026-10-09T01:00:00.000Z")
  assert.deepEqual(
    resolveAuditRoundRowChecker({
      auditResult: "not_found",
      scannedBy: null,
      scannedAt: null,
      findings: [
        { findingType: "not_found", reportedBy: "user-b", reportedAt: first },
        { findingType: "wrong_location", reportedBy: "user-x", reportedAt: latest },
        { findingType: "not_found", reportedBy: "user-c", reportedAt: latest },
      ],
    }),
    { userId: "user-c", at: latest },
  )
  assert.equal(resolveAuditRoundRowChecker({ auditResult: null, scannedBy: null, scannedAt: null, findings: [] }), null)
})

test("a parent's missing components are its installed components with their own not-found item in this round (decision 6, P2-R19)", () => {
  assert.deepEqual(
    listAuditRoundMissingComponents([
      { componentAsset: { id: "asset-c1", assetTag: "GRL-COM-26-0017-01", name: "Adapter 65W", auditItems: [{ id: "item-c1" }] } },
      { componentAsset: { id: "asset-c2", assetTag: "GRL-COM-26-0017-02", name: "Monitor", auditItems: [] } },
    ]),
    [{ id: "asset-c1", assetTag: "GRL-COM-26-0017-01", name: "Adapter 65W" }],
  )
})

test("the round page's rules are pure and client-safe", () => {
  const source = read("src/lib/audit-round-page-rules.ts")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
})

// Group 2 plan 2 Task 4 (spec §8, P2-R8): the round page's three steps, the button that follows them, and the export
// links that carry the list's filters.
test("three steps: the walk until nothing is pending, then the decisions, then the close; all complete once closed; none for a cancelled round (spec §8, P2-R8)", () => {
  assert.equal(buildAuditRoundPageSteps({ status: "cancelled", pendingItems: 3, pendingFindings: 1 }), null)
  assert.deepEqual(buildAuditRoundPageSteps({ status: "closed", pendingItems: 0, pendingFindings: 0 }), { states: ["complete", "complete", "complete"], current: null })
  assert.deepEqual(buildAuditRoundPageSteps({ status: "open", pendingItems: 12, pendingFindings: 5 }), { states: ["current", "upcoming", "upcoming"], current: "walk" })
  assert.deepEqual(buildAuditRoundPageSteps({ status: "open", pendingItems: 0, pendingFindings: 5 }), { states: ["complete", "current", "upcoming"], current: "review" })
  // A leftover draft reads as open (spec §14).
  assert.deepEqual(buildAuditRoundPageSteps({ status: "draft", pendingItems: 0, pendingFindings: 0 }), { states: ["complete", "complete", "current"], current: "close" })
})

test("the main button follows the step: the scan for audit:edit or the pending list, then the decisions, then ปิดรอบตรวจ for audit:approve, disabled while a plan is open or for the opener (spec §8, §5, P2-R7)", () => {
  const base = { pendingItems: 12, pendingFindings: 5, canClose: false, openedByViewer: false, canScan: true, canApprove: true }
  const walk = buildAuditRoundPageSteps({ status: "open", pendingItems: 12, pendingFindings: 5 })
  assert.deepEqual(buildAuditRoundPageMainAction({ ...base, steps: walk }), { kind: "walk", count: 12, target: "scan" })
  assert.deepEqual(buildAuditRoundPageMainAction({ ...base, steps: walk, canScan: false }), { kind: "walk", count: 12, target: "pending" })
  const review = buildAuditRoundPageSteps({ status: "open", pendingItems: 0, pendingFindings: 5 })
  assert.deepEqual(buildAuditRoundPageMainAction({ ...base, pendingItems: 0, steps: review }), { kind: "review", count: 5 })
  const close = buildAuditRoundPageSteps({ status: "open", pendingItems: 0, pendingFindings: 0 })
  const atClose = { ...base, pendingItems: 0, pendingFindings: 0, steps: close }
  assert.deepEqual(buildAuditRoundPageMainAction({ ...atClose, canClose: true }), { kind: "close", disabled: false })
  assert.deepEqual(buildAuditRoundPageMainAction({ ...atClose, canClose: false }), { kind: "close", disabled: true }, "an open action plan")
  assert.deepEqual(buildAuditRoundPageMainAction({ ...atClose, canClose: true, openedByViewer: true }), { kind: "close", disabled: true }, "the opener")
  assert.equal(buildAuditRoundPageMainAction({ ...atClose, canClose: true, canApprove: false }), null)
  assert.equal(buildAuditRoundPageMainAction({ ...atClose, steps: buildAuditRoundPageSteps({ status: "closed", pendingItems: 0, pendingFindings: 0 }) }), null)
  assert.equal(buildAuditRoundPageMainAction({ ...atClose, steps: null }), null)
})

test("an export link carries the list's filters and nothing else: the page link's query without page, page size and returnTo (spec §8 ตามตัวกรองที่เลือก)", () => {
  const listHref = "/th/audit/rounds/round-1?result=found&categoryId=cat-1&search=PC&page=2&pageSize=50&returnTo=%2Fth%2Faudit%2Frounds#audit-result-list"
  assert.equal(auditRoundHrefQuery(listHref).get("categoryId"), "cat-1")
  assert.equal(auditRoundHrefQuery("/th/audit/rounds/round-1#audit-result-list").toString(), "")
  // Round trip through Task 1's builders and parser: the export (from the filters) is the list link's query less its
  // paging and way back, and the route reads back exactly the filters the list shows.
  const filters = { ...parseAuditRoundListFilters({}), result: "mismatch", categoryId: "other", field: "department", components: "missing", companyId: "company-1", branchId: "branch-1", search: "PC" } as const
  const href = buildAuditRoundPageHref("th", "round-1", filters, { page: 3, pageSize: 50, returnTo: "/th/audit/rounds" })
  const exported = new URL(buildAuditRoundExportHref("round-1", "export-pdf", filters), "http://local")
  assert.equal(exported.pathname, "/api/audit-rounds/round-1/export-pdf")
  for (const name of ["page", "pageSize", "returnTo"]) assert.equal(exported.searchParams.has(name), false, name)
  const listQuery = auditRoundHrefQuery(href)
  for (const name of ["page", "pageSize", "returnTo"]) listQuery.delete(name)
  assert.equal(exported.searchParams.toString(), listQuery.toString())
  const parsed = parseAuditRoundListFilters(Object.fromEntries(exported.searchParams))
  for (const key of ["result", "categoryId", "field", "components", "companyId", "branchId", "search"] as const) assert.equal(parsed[key], filters[key], key)
})
