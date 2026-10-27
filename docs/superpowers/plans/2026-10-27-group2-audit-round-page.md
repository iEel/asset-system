# Page Group 2 (Audit) Plan 2: The Round Page and the Pending List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the round page (AU-Round) and the pending list (AU-Pending) to the approved group 2 design: a next-step card, a round-wide result card, "ไม่ตรงเรื่องอะไร" per field, result and category chips that count within the other filters, the "ส่วนควบไม่ครบ" filter, out-of-scope finds counted from items everywhere, exports that follow the filters, and a pending list that reads each item's expected room and custodian.

**Architecture:** A pure filter-rules file (`audit-round-result-filters.ts`) owns the filter state, the parser, the one where builder (every filter in one `AND` list), the result fold and the one href builder, so a count, its list, its links and its exports always share one where. A server module (`audit-round-page-data.ts`) loads everything the round page shows in one timed load; the page and the pending page only render. Out-of-scope finds move from scan history onto items in one task across the round page, the rounds list and the three exports. No schema change and no migration.

**Tech Stack:** Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before Next code), React 19, next-intl (Thai first), Prisma 7 on SQL Server, Tailwind 4 tokens, shadcn/Radix parts, `node --test` source and rule tests, Playwright E2E (4 projects: desktop/phone × light/dark).

**Spec:** `docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md` (§5, §8, §9, §13 bugs 2 and 9-16, §15, §16 round page and pending list, Appendix A §8/§9). Plan 1 (merged `f8269894`): `docs/superpowers/plans/2026-10-26-group2-audit-rounds.md`; its rulings R1-R35 stand unless a ruling here replaces one.

**Base:** master `f8269894`. **Branch:** `feat/group2-audit-round-page`. **Dry run:** none (no migration; the targeted E2E covers the pages).

**Execution:** subagent-driven. Implementers are the `opus-medium-implementer` agent type; the main session reviews each task itself. Tasks run in order 1 → 7; each later task assumes the earlier ones are committed, and line numbers are master's (a task names each block by its content where earlier tasks move it).

**E2E (the user's cadence):** after Task 7, one targeted run of `e2e/audit e2e/smoke e2e/dashboard e2e/asset-detail e2e/cross-cutting/reports.spec.ts e2e/cross-cutting/field-errors.spec.ts e2e/cross-cutting/roles.spec.ts e2e/disposal/open-audit-block.spec.ts` on the dev DB from a clean build (`rm -rf .next && npm run build`). The whole suite runs once after plan 4.

## Global Constraints

- Words follow `docs/19_THAI_GLOSSARY.md` ("ไม่ตรง", "รายการไม่ตรง", "พบตรง", "หมวดหมู่", "ผู้พิจารณา"). Messages change only through `node scripts/messages-edit.mjs <change file>`, th and en together; change files live in the session scratchpad, never in the repo. No raw code reaches the screen.
- Shared parts and tokens only (DESIGN.md): no hex or rgba in tsx, no `dark:`, no `/NN` tints. Both themes must read. A removed shared part takes its DESIGN.md line with it.
- Permissions: `audit:view` reads; `audit:edit` scans, records not-found and edits a result (nobody else sees a scan, record or "แก้ไขผลตรวจ" control, nor "เดินตรวจต่อ" on the pending list; on the round page the next step's "เดินตรวจต่อ (N)" opens the pending list for them, spec §8, P2-R7); `audit:approve` reviews, cancels and closes (the close API's own rules); `audit:export` exports.
- **Counts equal lists.** A number that links somewhere is counted with the where of the rows it opens. The result card, the next-step card and the "ไม่ตรงเรื่องอะไร" card are round-wide, and their links clear the other filters; every chip counts within the other active filters (§5).
- **One where, one href.** Every filter goes into the where's `AND` list (several filters write `asset` and `findings`). Every chip, bar, paging, search and export link comes from `buildAuditRoundPageHref` / `buildAuditRoundExportHref` over the parsed filters, so no link drops a filter.
- **Own items:** a round's items without the result `out_of_scope`, null-safe (`withAuditRoundOwnItems`). Out-of-scope finds are counted apart, from items.
- SQL Server takes about 2,100 parameters: any id list that grows with the round or the register is chunked (`chunkAuditIds`) or bounded to the round's own rooms.
- Lists and exports order with an `id` tiebreak.
- No schema change and no migration. Pure rules files use relative `.ts` imports and `import type` only.
- Every task runs `npm test`, `npx tsc --noEmit` and `npm run lint` before its commit. A pin that fails outside the task's list is rewritten in the same commit and named in the report.
- Secrets: never read or print `.env`, `.env.prod-admin` or `.env.e2e`. Nothing writes to Production; E2E runs on the dev DB only and never runs LDAP sync, the settings save, Excel import, a failed login or a delete.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A large round** (the Production test round has 1,509 items; real rounds pass 2,000): the photo count, the reference labels, the room search and every chip must not fail on SQL Server's parameter limit. Task 2 chunks the label lookups and bounds the room search to the round's rooms; Task 3 chunks the photo load; their tests pin chunk sizes.
2. **Filters that write the same key** (category and "ส่วนควบไม่ครบ" both write `asset`; a field filter and รอพิจารณา both write `findings`): combined, neither may drop the other. Task 1's tests combine every pair and check the `AND` list.
3. **A link that drops a filter:** paging, a chip, a bar, the search box's hidden inputs or an export must keep every other active filter. Task 1's href tests and Task 5's source pins cover each link family.
4. **A viewer** (`audit:view` only) never sees a scan, record or "แก้ไขผลตรวจ" control on the round page or the pending list, nor "เดินตรวจต่อ" on the pending list; the round page's "เดินตรวจต่อ (N)" opens /pending for them (spec §8) and no visible `main a[href*="/scan"]` exists. Task 4, Task 5 and Task 6 pin the gates; Task 7's viewer step checks both pages.
5. **The equation:** พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด for any round, including a checked item with a null result and out-of-scope finds kept apart. Task 1's fold test pins it by value.

---

### Task 1: The round page's filter rules (pure)

The round page's list, its chips, its exports and every link read one filter state (spec §5, §8). This task writes that state and its rules in `src/lib/audit-round-result-filters.ts`, which stays pure (`import type` from `@prisma/client`, relative `.ts` imports only, recon RF gotcha 3):

- the parsed filter state with the new result values `pending` (รอตรวจ) and `mismatch` (ไม่ตรง), and the new `categoryId`, `field` and `components` values;
- one where per filter, all of them in one `AND` list (recon RF gotcha 2: `pending_review` and the field filter both write `findings`; the category and the components filter both write `asset`);
- the out-of-scope where restricted to out-of-scope items (recon RF gotcha 1: today `result=out_of_scope` returns the whole round);
- one fold of the result counts, where พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด always (P2-R2);
- one link writer for the page, its exports and the dashboard.

`result=wrong_*` leaves the result values (P2-R22: old links parse into `field=`). The round page reads those values today, so this task also makes the page's smallest type edits. The page still draws its old boxes. The three `wrong_*` boxes now open `field=` lists, and every link keeps the new filters. Task 2 moves out-of-scope onto items, and Tasks 3-5 rebuild the page.

**Files:**
- Modify: `src/lib/audit-round-result-filters.ts`:
  - `:1-3` (imports);
  - `:5-16` (result values and type);
  - `:18-34` (state and params);
  - `:38-55` (summary key type);
  - `:106-122` (resolve and parse);
  - `:124-161` (`buildAuditRoundItemWhere`);
  - `:249-284` (hrefs);
  - `:291-293` (old private helper removed; `buildAssetSearchWhere` `:295-300` stays private);
  - new exports after `:161` and after `:284`.
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`:
  - `:41-54` (imports);
  - `:59` (searchParams type);
  - `:74` (`itemFilters`);
  - `:299` (stale-id redirect);
  - `:314-323` (`resultFilterLabels`);
  - `:367-369` (three box hrefs);
  - `:423-434` (findings link);
  - `:628` (the "ทั้งหมด" reset);
  - `:642-649` (search hidden inputs).
- Test:
  - `tests/audit-round-list-filters.test.ts` (new, by value);
  - `tests/audit-round-result-drilldown.test.ts:24-49`, `:51-59`, `:327-334`, `:336-343`, `:369-373` (rewritten);
  - `tests/audit-round-counts.test.ts:89` (rewritten: the import now names three helpers; `:86-88` and `:90` are kept).

**Interfaces:**
- Consumes:
  - `successfulAuditResults`, `isSuccessfulAuditResult` (`src/lib/audit-result-summary.ts:1-5`, pure);
  - `withAuditRoundOwnItems`, `auditRoundOutOfScopeItemWhere`, `isAuditRoundOwnItem` (`src/lib/audit-round-counts-rules.ts:11-26`, pure, plan 1).
- Produces, all in `src/lib/audit-round-result-filters.ts`:
  - `auditRoundResultFilterValues = ["all", "pending", "found", "mismatch", "not_found", "out_of_scope", "pending_review"] as const`; `type AuditRoundResultFilter`.
  - `auditFindingFields = ["location", "department", "custodian", "condition"] as const`; `type AuditFindingField`.
  - `auditFindingTypeByField: Readonly<Record<AuditFindingField, string>>` = `{ location: "wrong_location", department: "wrong_department", custodian: "wrong_custodian", condition: "wrong_condition" }`.
  - `auditCountedFindingReviewStatuses = ["pending", "approved"] as const` (P2-R1: `exception` and every `rejected` left out).
  - `AUDIT_ROUND_OTHER_CATEGORY = "other"`.
  - The filter state:

    ```ts
    type AuditRoundListFilters = {
      result: AuditRoundResultFilter
      categoryId: string | null
      field: AuditFindingField | null
      components: "missing" | null
      companyId: string | null
      branchId: string | null
      search: string
      expectedLocationIds?: readonly string[]
    }
    ```
  - `emptyAuditRoundListFilters: Readonly<AuditRoundListFilters>` (frozen; result `all`, every other filter null or `""`).
  - `type AuditRoundListParams = Readonly<Record<string, string | string[] | undefined>>`.
  - `resolveAuditRoundResultFilter(value?: string | string[] | null): AuditRoundResultFilter` (kept; unknown and `wrong_*` → `"all"`).
  - `resolveAuditFindingField(value?: string | string[] | null): AuditFindingField | null`.
  - `parseAuditRoundListFilters(params: AuditRoundListParams): AuditRoundListFilters`. It never sets `expectedLocationIds`: that is a lookup, not a URL value.
  - `type AuditRoundResultListState = AuditRoundListFilters & { page: number; pageSize: number }` and `parseAuditRoundResultListParams(params: AuditRoundListParams): AuditRoundResultListState` (kept: the filters plus paging).
  - The where input:

    ```ts
    type AuditRoundItemWhereInput = {
      roundId: string
      result: AuditRoundResultFilter
      search?: string | null
      companyId?: string | null
      branchId?: string | null
      categoryId?: string | null
      field?: AuditFindingField | null
      components?: "missing" | null
      expectedLocationIds?: readonly string[]
      shownCategoryIds?: readonly string[] // the six categories the chip row shows; categoryId "other" = none of them
    }
    ```
    `AuditRoundListFilters & { roundId }` is assignable to it, and so are today's calls `{ roundId, result, search, ...{ companyId, branchId } }` (the exports, the page).
  - `auditRoundResultWhere(result: AuditRoundResultFilter): Prisma.AuditItemWhereInput | null`.
  - `auditRoundCategoryWhere(categoryId: string, shownCategoryIds?: readonly string[]): Prisma.AuditItemWhereInput`.
  - `auditRoundFieldFindingWhere(field: AuditFindingField): Prisma.AuditItemWhereInput`.
  - `auditRoundComponentsMissingWhere(roundId: string): Prisma.AuditItemWhereInput`.
  - `auditRoundSearchWhere(search: string, expectedLocationIds?: readonly string[]): Prisma.AuditItemWhereInput`.
  - `buildAuditRoundFilterWhere(input: Omit<AuditRoundItemWhereInput, "result">): Prisma.AuditItemWhereInput`: every filter but the result, not own-wrapped. Task 2's variance export uses it (the out-of-scope finds stay beside the own items and are folded apart).
  - `buildAuditRoundItemWhere(input: AuditRoundItemWhereInput): Prisma.AuditItemWhereInput`.
  - Result counts:
    - `type AuditRoundResultCountRow = { auditStatus: string; auditResult: string | null; count: number }`;
    - `type AuditRoundResultCounts = { all: number; pending: number; found: number; mismatch: number; notFound: number; outOfScope: number }`;
    - `emptyAuditRoundResultCounts` (frozen zeros);
    - `foldAuditRoundResultCounts(rows: readonly AuditRoundResultCountRow[]): AuditRoundResultCounts`.
  - `type AuditRoundListHrefFilters = Omit<AuditRoundListFilters, "expectedLocationIds">`.
  - `type AuditRoundPageHrefOverrides = Partial<AuditRoundListHrefFilters> & { page?: number; pageSize?: number; returnTo?: string | null }`.
  - `buildAuditRoundPageHref(locale: string, roundId: string, filters: AuditRoundListHrefFilters, overrides?: AuditRoundPageHrefOverrides): string`: the one link to the round page's list. It drops defaults; an override of `undefined` keeps the filter, and `null` clears it.
  - `type AuditRoundExportEndpoint = "export" | "export-pdf" | "variance-export"` and `buildAuditRoundExportHref(roundId: string, endpoint: AuditRoundExportEndpoint, filters: AuditRoundListHrefFilters): string`. These are the same params, with no page, returnTo or hash.
  - `buildAuditRoundItemsHref(locale, roundId, filters: { branchId?: string; companyId?: string })` (signature kept, `tests/dashboard-page.test.ts:122,197`). It now goes through `buildAuditRoundPageHref`.
  - `buildAuditRoundResultListHref({ …, categoryId?, field?, components? })`: used by the page until Task 5; stays exported after it. It writes the three new params after `branchId` and before `page`, so every pinned string stays.
  - `type AuditRoundResultSummaryKey = "found" | "wrong_location" | "wrong_custodian" | "wrong_condition" | "not_found" | "out_of_scope" | "pending_review"`. `buildAuditRoundResultSummaryGroups` is retyped on it, and its behaviour is unchanged until Task 4 retires it.
- For later tasks:
  - Task 2 removes `buildAuditRoundScanHistoryWhere` / `isAuditRoundScanHistoryResultFilter`, and gives the export label the new filters.
  - Task 3 counts its cards and chips with `buildAuditRoundItemWhere` (overriding `result`, `field` or `components`, so `auditRoundFieldFindingWhere` and `auditRoundComponentsMissingWhere` come in through it) and `foldAuditRoundResultCounts`, and moves the stale-filter redirect onto `buildAuditRoundPageHref` (P2-R31).
  - Task 4 builds the three export links with `buildAuditRoundExportHref(round.id, endpoint, filters)`.
  - Task 5 moves every other page link onto `buildAuditRoundPageHref` and drops the page's import of `buildAuditRoundResultListHref`. The function stays exported from `src/lib/audit-round-result-filters.ts`, because `tests/audit-round-result-drilldown.test.ts:12,73,345` and this task's builder test (the `buildAuditRoundResultListHref` call in "one link writer") still pin it.

- [ ] **Step 1: Write the failing tests**

`tests/audit-round-list-filters.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  AUDIT_ROUND_OTHER_CATEGORY,
  auditCountedFindingReviewStatuses,
  auditFindingFields,
  auditFindingTypeByField,
  auditRoundResultFilterValues,
  buildAuditRoundExportHref,
  buildAuditRoundFilterWhere,
  buildAuditRoundItemWhere,
  buildAuditRoundItemsHref,
  buildAuditRoundPageHref,
  buildAuditRoundResultListHref,
  emptyAuditRoundListFilters,
  emptyAuditRoundResultCounts,
  foldAuditRoundResultCounts,
  parseAuditRoundListFilters,
  parseAuditRoundResultListParams,
  resolveAuditRoundResultFilter,
} from "../src/lib/audit-round-result-filters.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
// The round's own items (spec §5), null-safe: a pending item has no result.
const own = (where: object) => ({ AND: [where, { OR: [{ auditResult: null }, { auditResult: { not: "out_of_scope" } }] }] })
const round = { auditRoundId: "round-1" }

test("the round page's filters: seven results, a category (other allowed), a field, missing components, company, branch and search (spec §8, P2-R22, P2-R23)", () => {
  assert.deepEqual([...auditRoundResultFilterValues], ["all", "pending", "found", "mismatch", "not_found", "out_of_scope", "pending_review"])
  assert.deepEqual([...auditFindingFields], ["location", "department", "custodian", "condition"])
  assert.deepEqual(auditFindingTypeByField, { location: "wrong_location", department: "wrong_department", custodian: "wrong_custodian", condition: "wrong_condition" })
  assert.deepEqual([...auditCountedFindingReviewStatuses], ["pending", "approved"], "P2-R1: exception and rejected never count")
  assert.equal(AUDIT_ROUND_OTHER_CATEGORY, "other")

  const none = { result: "all", categoryId: null, field: null, components: null, companyId: null, branchId: null, search: "" }
  assert.deepEqual(parseAuditRoundListFilters({}), none)
  assert.deepEqual(emptyAuditRoundListFilters, none)
  assert.equal(Object.isFrozen(emptyAuditRoundListFilters), true)
  assert.deepEqual(
    parseAuditRoundListFilters({ result: "mismatch", categoryId: " cat-1 ", field: "department", components: "missing", companyId: ["c-1", "c-2"], branchId: "  ", search: "  PC  " }),
    { result: "mismatch", categoryId: "cat-1", field: "department", components: "missing", companyId: "c-1", branchId: null, search: "PC" },
  )
  assert.equal(parseAuditRoundListFilters({ result: "pending" }).result, "pending")
  assert.equal(parseAuditRoundListFilters({ categoryId: "other" }).categoryId, "other")
  for (const bogus of [{ result: "bogus" }, { field: "status" }, { components: "all" }]) {
    assert.deepEqual(parseAuditRoundListFilters(bogus), none, JSON.stringify(bogus))
  }
  // Old links keep working (P2-R22): a wrong_* result is the whole list narrowed to that field.
  for (const [result, field] of [["wrong_location", "location"], ["wrong_department", "department"], ["wrong_custodian", "custodian"], ["wrong_condition", "condition"]] as const) {
    assert.deepEqual(parseAuditRoundListFilters({ result }), { ...none, field }, result)
    assert.equal(resolveAuditRoundResultFilter(result), "all", result)
  }
  assert.equal(parseAuditRoundListFilters({ result: "wrong_location", field: "condition" }).field, "condition", "an explicit field wins")
  assert.equal("expectedLocationIds" in parseAuditRoundListFilters({ search: "R101" }), false, "a room lookup, never a URL value")

  assert.deepEqual(parseAuditRoundResultListParams({}), { ...none, page: 1, pageSize: 25 })
  assert.deepEqual(parseAuditRoundResultListParams({ page: "3", pageSize: "500", field: "location" }), { ...none, field: "location", page: 3, pageSize: 100 })
  assert.equal(parseAuditRoundResultListParams({ pageSize: "1" }).pageSize, 10)
})

test("each result is one where; every result but out-of-scope and pending review keeps to the round's own items (spec §5, §8, P2-R2, recon gotcha 1)", () => {
  const where = (result: (typeof auditRoundResultFilterValues)[number]) => buildAuditRoundItemWhere({ roundId: "round-1", result })
  assert.deepEqual(where("all"), own({ AND: [round] }))
  assert.deepEqual(where("pending"), own({ AND: [round, { auditStatus: "pending" }] }))
  assert.deepEqual(where("found"), own({ AND: [round, { auditResult: { in: ["found", "confirmed_with_parent"] } }] }))
  // ไม่ตรง: every variance result (isVarianceAuditResult), plus a checked item with no result (P2-R2).
  assert.deepEqual(where("mismatch"), own({ AND: [round, { OR: [
    { auditResult: { not: null, notIn: ["found", "confirmed_with_parent", "not_found", "out_of_scope"] } },
    { auditResult: null, auditStatus: { not: "pending" } },
  ] }] }))
  assert.deepEqual(where("not_found"), own({ AND: [round, { auditResult: "not_found" }] }))
  // The out-of-scope list is the out-of-scope items, never the whole round (gotcha 1).
  assert.deepEqual(where("out_of_scope"), { AND: [round, { auditResult: "out_of_scope" }] })
  // รอพิจารณา follows the pending findings, out-of-scope finds included (plan 1 R5 kept).
  assert.deepEqual(where("pending_review"), { AND: [round, { findings: { some: { reviewStatus: "pending" } } }] })
})

test("every filter goes into one AND list, so two findings filters and two asset filters never overwrite each other (spec §8, recon gotcha 2)", () => {
  assert.deepEqual(
    buildAuditRoundItemWhere({ roundId: "round-1", result: "not_found", companyId: "c-1", branchId: "b-1", categoryId: "cat-1", field: "location", components: "missing", search: "PC", expectedLocationIds: ["loc-1", "loc-2"] }),
    own({ AND: [
      round,
      { expectedCompanyId: "c-1" },
      { expectedBranchId: "b-1" },
      { asset: { categoryId: "cat-1" } },
      { findings: { some: { findingType: "wrong_location", reviewStatus: { in: ["pending", "approved"] } } } },
      { asset: { parentComponents: { some: { status: "installed", removedAt: null, componentAsset: { auditItems: { some: { auditRoundId: "round-1", auditResult: "not_found" } } } } } } },
      { OR: [{ asset: { assetTag: { contains: "PC" } } }, { asset: { name: { contains: "PC" } } }, { expectedLocationId: { in: ["loc-1", "loc-2"] } }] },
      { auditResult: "not_found" },
    ] }),
  )
  // A field bar under รอพิจารณา: both findings conditions stay.
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "pending_review", field: "department" }), { AND: [
    round,
    { findings: { some: { findingType: "wrong_department", reviewStatus: { in: ["pending", "approved"] } } } },
    { findings: { some: { reviewStatus: "pending" } } },
  ] })
  // "อื่น ๆ": none of the six categories the chip row shows (P2-R11); with none shown, every category.
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", categoryId: "other", shownCategoryIds: ["cat-1", "cat-2"] }), own({ AND: [round, { asset: { categoryId: { notIn: ["cat-1", "cat-2"] } } }] }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", categoryId: "other" }), own({ AND: [round, { asset: { categoryId: { notIn: [] } } }] }))
  // The search is code and name, plus the item's expected room when the lookup found one (P2-R5); no search, no room.
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: " SNI ", expectedLocationIds: [] }), own({ AND: [round, { OR: [{ asset: { assetTag: { contains: "SNI" } } }, { asset: { name: { contains: "SNI" } } }] }] }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "  ", expectedLocationIds: ["loc-1"] }), own({ AND: [round] }))
  // The chips' base: every filter but the result, not own-wrapped, so one fold counts the out-of-scope finds apart.
  assert.deepEqual(buildAuditRoundFilterWhere({ roundId: "round-1", companyId: "c-1", field: "condition" }), { AND: [
    round,
    { expectedCompanyId: "c-1" },
    { findings: { some: { findingType: "wrong_condition", reviewStatus: { in: ["pending", "approved"] } } } },
  ] })
})

test("one fold of the result counts: own items only, and พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด (spec §5, §8, P2-R2)", () => {
  const counts = foldAuditRoundResultCounts([
    { auditStatus: "pending", auditResult: null, count: 5 },
    { auditStatus: "scanned", auditResult: "found", count: 7 },
    { auditStatus: "scanned", auditResult: "confirmed_with_parent", count: 2 },
    { auditStatus: "scanned", auditResult: "wrong_location", count: 3 },
    { auditStatus: "reviewed", auditResult: "need_review", count: 1 },
    // The review route sets the status only, so a checked item can have no result: it reads ไม่ตรง (P2-R2).
    { auditStatus: "reviewed", auditResult: null, count: 1 },
    { auditStatus: "reviewed", auditResult: "not_found", count: 4 },
    { auditStatus: "reviewed", auditResult: "out_of_scope", count: 3 },
  ])
  assert.deepEqual(counts, { all: 23, pending: 5, found: 9, mismatch: 5, notFound: 4, outOfScope: 3 })
  assert.equal(counts.found + counts.mismatch + counts.notFound + counts.pending, counts.all)
  assert.deepEqual(foldAuditRoundResultCounts([]), { all: 0, pending: 0, found: 0, mismatch: 0, notFound: 0, outOfScope: 0 })
  assert.deepEqual(emptyAuditRoundResultCounts, { all: 0, pending: 0, found: 0, mismatch: 0, notFound: 0, outOfScope: 0 })
  assert.equal(Object.isFrozen(emptyAuditRoundResultCounts), true)
})

test("one link writer: the page's list, its exports and the dashboard carry every filter and drop the defaults (spec §8, global constraint)", () => {
  const none = parseAuditRoundListFilters({})
  const full = { result: "mismatch", search: "PC 1", companyId: "c-1", branchId: "b-1", categoryId: "other", field: "location", components: "missing" } as const
  assert.equal(buildAuditRoundPageHref("th", "round-1", none), "/th/audit/rounds/round-1#audit-result-list")
  assert.equal(
    buildAuditRoundPageHref("th", "round-1", full, { page: 2, pageSize: 50, returnTo: "/th/audit/rounds?view=open" }),
    "/th/audit/rounds/round-1?result=mismatch&search=PC+1&companyId=c-1&branchId=b-1&categoryId=other&field=location&components=missing&page=2&pageSize=50&returnTo=%2Fth%2Faudit%2Frounds%3Fview%3Dopen#audit-result-list",
  )
  // null clears a filter (a chip's ✕), undefined keeps it; page 1 and 25 rows are the defaults.
  assert.equal(
    buildAuditRoundPageHref("th", "round-1", full, { companyId: null, components: null, branchId: undefined, page: 1, pageSize: 25 }),
    "/th/audit/rounds/round-1?result=mismatch&search=PC+1&branchId=b-1&categoryId=other&field=location#audit-result-list",
  )
  // A variable, not a fresh literal: tsc runs no excess-property check against the Omit type (TS2353 otherwise).
  const withRooms = { ...none, expectedLocationIds: ["loc-1"] }
  assert.equal(buildAuditRoundPageHref("th", "round-1", withRooms), "/th/audit/rounds/round-1#audit-result-list", "a lookup never reaches the URL")
  assert.equal(
    buildAuditRoundExportHref("round-1", "export", full),
    "/api/audit-rounds/round-1/export?result=mismatch&search=PC+1&companyId=c-1&branchId=b-1&categoryId=other&field=location&components=missing",
  )
  assert.equal(buildAuditRoundExportHref("round-1", "variance-export", none), "/api/audit-rounds/round-1/variance-export")
  assert.equal(buildAuditRoundExportHref("round-1", "export-pdf", { ...none, field: "department" }), "/api/audit-rounds/round-1/export-pdf?field=department")
  // The dashboard's links (R13) go through the same writer.
  assert.equal(buildAuditRoundItemsHref("th", "round-1", { companyId: "company-1", branchId: "branch-1" }), "/th/audit/rounds/round-1?companyId=company-1&branchId=branch-1#audit-result-list")
  // The page's old builder (until Task 5) writes the new filters after the branch and before the page, so its pinned strings hold.
  assert.equal(
    buildAuditRoundResultListHref({ locale: "th", roundId: "round-1", result: "all", field: "department", categoryId: "cat-1", components: "missing", pageSize: 50 }),
    "/th/audit/rounds/round-1?categoryId=cat-1&field=department&components=missing&page=1&pageSize=50#audit-result-list",
  )
})

test("the filter rules stay pure and client-safe (recon gotcha 3)", () => {
  const source = read("src/lib/audit-round-result-filters.ts")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
  assert.doesNotMatch(source, /isAuditFindingResultFilter|wrong_location: t\(|result === "wrong_/, "wrong_* is a field now")
})

test("the round page keeps every parsed filter in its where and its links until Task 5 rebuilds them (P2-R22)", () => {
  const page = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx")
  assert.match(page, /branchId\?: string \| string\[\]; categoryId\?: string \| string\[\]; field\?: string \| string\[\]; components\?: string \| string\[\] \}>/)
  assert.match(page, /const itemFilters = \{ companyId: resultListState\.companyId, branchId: resultListState\.branchId, categoryId: resultListState\.categoryId, field: resultListState\.field, components: resultListState\.components \}/)
  for (const [name, field] of [["wrongLocation", "location"], ["wrongCustodian", "custodian"], ["wrongCondition", "condition"]]) {
    assert.match(page, new RegExp(`const ${name}ResultHref = buildAuditRoundResultListHref\\(\\{ locale, roundId: round\\.id, result: "all", field: "${field}", returnTo: returnToHref, pageSize: resultListState\\.pageSize \\}\\)`), name)
  }
  assert.match(page, /&findingType=\$\{auditFindingTypeByField\[resultListState\.field\]\}/)
  assert.match(page, /pending: t\("pending"\),/)
  assert.match(page, /mismatch: t\("mismatch"\),/)
  for (const key of ["categoryId", "field", "components"]) {
    assert.match(page, new RegExp(`\\.\\.\\.\\(resultListState\\.${key} \\? \\{ ${key}: resultListState\\.${key} \\} : \\{\\}\\)`), `the search keeps ${key}`)
  }
  // The summary boxes keep their wrong_* keys (AuditRoundResultSummaryKey) until Task 4; no link writes result=wrong_*.
  assert.doesNotMatch(page, /findingReviewTypeByResult|buildAuditRoundResultListHref\(\{[^}]*result: "wrong_/)
})
```

- [ ] **Step 2: Rewrite these pins** (`tests/audit-round-result-drilldown.test.ts`)

`own` (`:22`) stays. Every expected where becomes the `AND` list. `round1` means `{ auditRoundId: "round-1" }`, spelled out in the file.

| Line | Call | Old expected | New expected |
|---|---|---|---|
| `:26` | `resolveAuditRoundResultFilter("wrong_location")` | `"wrong_location"` | `"all"` (P2-R22) |
| `:28-31` | `found` | `own({ auditRoundId, auditResult: { in: […] } })` | `own({ AND: [{ auditRoundId: "round-1" }, { auditResult: { in: ["found", "confirmed_with_parent"] } }] })` |
| `:32-35` | `not_found` | `own({ auditRoundId, auditResult: "not_found" })` | `own({ AND: [{ auditRoundId: "round-1" }, { auditResult: "not_found" }] })` |
| `:36-39` | `result: "wrong_location"` | `own({ …, findings: { some: { findingType: "wrong_location" } } })` | call becomes `{ roundId: "round-1", result: "all", field: "location", search: "" }`; expected `own({ AND: [{ auditRoundId: "round-1" }, { findings: { some: { findingType: "wrong_location", reviewStatus: { in: ["pending", "approved"] } } } }] })` |
| `:40-43`, `:48` | `pending_review` | `{ auditRoundId, findings: … }` | `{ AND: [{ auditRoundId: "round-1" }, { findings: { some: { reviewStatus: "pending" } } }] }` |
| `:44` | `all` | `own({ auditRoundId: "round-1" })` | `own({ AND: [{ auditRoundId: "round-1" }] })` |
| `:45-46` | `out_of_scope` | `{ auditRoundId: "round-1" }`, comment "still reads the scan history" | `{ AND: [{ auditRoundId: "round-1" }, { auditResult: "out_of_scope" }] }`, comment "The out-of-scope list is the out-of-scope items (plan 2, gotcha 1); Task 2 moves the page and the exports onto it." |
| `:52-59` | `wrong_custodian` + search `SNI-EQU` | `own({ …findings…, OR: […] })` | call `{ roundId: "round-1", result: "all", field: "custodian", search: "SNI-EQU" }`; expected `own({ AND: [{ auditRoundId: "round-1" }, { findings: { some: { findingType: "wrong_custodian", reviewStatus: { in: ["pending", "approved"] } } } }, { OR: [{ asset: { assetTag: { contains: "SNI-EQU" } } }, { asset: { name: { contains: "SNI-EQU" } } }] }] })` |
| `:306-309` | `all` + branch | `own({ auditRoundId, expectedBranchId })` | `own({ AND: [{ auditRoundId: "round-1" }, { expectedBranchId: "branch-1" }] })` |
| `:310-313` | `all` + company | `own({ auditRoundId, expectedCompanyId })` | `own({ AND: [{ auditRoundId: "round-1" }, { expectedCompanyId: "company-1" }] })` |
| `:314-323` | `not_found` + search + both | `own({ auditRoundId, expectedCompanyId, expectedBranchId, auditResult, OR })` | `own({ AND: [{ auditRoundId: "round-1" }, { expectedCompanyId: "company-1" }, { expectedBranchId: "branch-1" }, { OR: [{ asset: { assetTag: { contains: "SNI" } } }, { asset: { name: { contains: "SNI" } } }] }, { auditResult: "not_found" }] })` |
| `:324` | `all`, both null | `own({ auditRoundId: "round-1" })` | `own({ AND: [{ auditRoundId: "round-1" }] })` |
| `:333` | `parseAuditRoundResultListParams({})` | `{ result: "all", search: "", companyId: null, branchId: null, page: 1, pageSize: 25 }` | `{ result: "all", categoryId: null, field: null, components: null, companyId: null, branchId: null, search: "", page: 1, pageSize: 25 }` |
| `:337` | items href, branch | `…?branchId=branch-1&page=1&pageSize=25#audit-result-list` | `/th/audit/rounds/round-1?branchId=branch-1#audit-result-list` |
| `:338` | company | `…?companyId=company-1&page=1&pageSize=25#…` | `/th/audit/rounds/round-1?companyId=company-1#audit-result-list` |
| `:339-342` | both | `…&page=1&pageSize=25#…` | `/th/audit/rounds/round-1?companyId=company-1&branchId=branch-1#audit-result-list` |
| `:343` | none | `…?page=1&pageSize=25#…` | `/th/audit/rounds/round-1#audit-result-list` |
| `:371` | searchParams type ends `branchId?: string \| string\[\] \}>` | — | `/searchParams: Promise<\{[^}]*pageSize\?: string \| string\[\]; companyId\?: string \| string\[\]; branchId\?: string \| string\[\]; categoryId\?: string \| string\[\]; field\?: string \| string\[\]; components\?: string \| string\[\] \}>/` |
| `:372` | `const itemFilters = { companyId, branchId }` | — | `/const itemFilters = \{ companyId: resultListState\.companyId, branchId: resultListState\.branchId, categoryId: resultListState\.categoryId, field: resultListState\.field, components: resultListState\.components \}/` |

Also in `tests/audit-round-counts.test.ts`: `:89` becomes `assert.match(filters, /import \{ [^}]*\bwithAuditRoundOwnItems\b[^}]* \} from "\.\/audit-round-counts-rules\.ts"/)` (Step 4 widens the import to three names). `:90` (the return line) stays.

These stay as they are:
- `:71-84` and `:344-347`: the old builder's exact strings. The new params come after `branchId` and are absent there.
- `:86-108`: the summary groups, on their own key type.
- `:61-68`: the scan-history where; Task 2 deletes it.
- `:157-187` and `:207-226`: the exports; Task 2 rewrites them.
- `:373`: the page's where call; its text is unchanged in this task.
- `:377`, `:383`, `:385`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/audit-round-list-filters.test.ts tests/audit-round-result-drilldown.test.ts`
Expected: FAIL.
- `audit-round-list-filters.test.ts`: `auditFindingFields`, `parseAuditRoundListFilters`, `foldAuditRoundResultCounts`, `buildAuditRoundPageHref` and the others are not exported (import error).
- `audit-round-result-drilldown.test.ts`: the old where shapes, `wrong_location` still a result, and the old `parse` and items-href strings.

- [ ] **Step 4: Implement `src/lib/audit-round-result-filters.ts`**

- **Imports (`:1-3`):**

  ```ts
  import type { Prisma } from "@prisma/client"
  import { isSuccessfulAuditResult, successfulAuditResults } from "./audit-result-summary.ts"
  import { auditRoundOutOfScopeItemWhere, isAuditRoundOwnItem, withAuditRoundOwnItems } from "./audit-round-counts-rules.ts"
  ```
  The header comment (new, above the imports): "The round page's list filters (group 2 spec §5, §8): the parsed state, one where per filter in one AND list, the result fold, and the one link writer for the page, its exports and the dashboard. Pure and client-safe: `import type` and relative `.ts` imports only (asset-detail-frame-rules, asset-history-rules and dashboard-overview-rules import it)."
- **Values (`:5-16`):** the seven values in the Interfaces order. Then the field constants, `AUDIT_ROUND_OTHER_CATEGORY`, and a private map for P2-R22:

  ```ts
  const legacyFieldByResult: Readonly<Record<string, AuditFindingField>> = Object.freeze({ wrong_location: "location", wrong_department: "department", wrong_custodian: "custodian", wrong_condition: "condition" })
  ```
- **State (`:18-34`):** the types from the Interfaces block, `AuditRoundListParams` included.
  - `AuditRoundResultListParams` goes; `parseAuditRoundResultListParams` takes `AuditRoundListParams`.
  - `AuditRoundResultListState` becomes the intersection.
- **Summary key (`:38-55`):** `export type AuditRoundResultSummaryKey = …` (the seven keys). `AuditRoundResultSummaryInput.result` becomes `AuditRoundResultSummaryKey`, and both order arrays become `AuditRoundResultSummaryKey[]`. No other change.
- **Parse (`:106-122`):**
  - `resolveAuditRoundResultFilter` keeps its body.
  - `resolveAuditFindingField(value)` returns `firstValue(value)` when it is one of `auditFindingFields`, else `null`.
  - The new parse:

    ```ts
    export function parseAuditRoundListFilters(params: AuditRoundListParams): AuditRoundListFilters {
      const rawResult = firstValue(params.result)
      const legacyField = typeof rawResult === "string" && Object.hasOwn(legacyFieldByResult, rawResult) ? legacyFieldByResult[rawResult] : null
      return {
        result: resolveAuditRoundResultFilter(params.result),
        categoryId: trimmedOrNull(params.categoryId),
        field: resolveAuditFindingField(params.field) ?? legacyField,
        components: firstValue(params.components) === "missing" ? "missing" : null,
        companyId: trimmedOrNull(params.companyId),
        branchId: trimmedOrNull(params.branchId),
        search: String(firstValue(params.search) ?? "").trim(),
      }
    }
    ```
  - `parseAuditRoundResultListParams(params)` returns `{ ...parseAuditRoundListFilters(params), page, pageSize }`, with today's page and pageSize lines (`:112-113`, `:119-120`).
  - `firstValue` (`:302-304`) narrows to `string | string[] | undefined`. `trimmedOrNull(value)` is `String(firstValue(value) ?? "").trim() || null`.
  - `emptyAuditRoundListFilters = Object.freeze(parseAuditRoundListFilters({}))`.
- **The wheres (replace `:124-161`, `:291-300`):**
  - `auditRoundResultWhere(result)`:
    - `all` → `null`;
    - `pending` → `{ auditStatus: "pending" }`;
    - `found` → `{ auditResult: { in: Array.from(successfulAuditResults) } }`;
    - `mismatch` → `{ OR: [{ auditResult: { not: null, notIn: [...successfulAuditResults, "not_found", "out_of_scope"] } }, { auditResult: null, auditStatus: { not: "pending" } }] }`;
    - `not_found` → `{ auditResult: "not_found" }`;
    - `out_of_scope` → `auditRoundOutOfScopeItemWhere`;
    - `pending_review` → `{ findings: { some: { reviewStatus: "pending" } } }`.

    Comment on `mismatch`: "`isVarianceAuditResult` (audit-result-summary.ts) as a where. `not: null` is spelled out so a pending item, whose result is null, is never a variance. The null branch is P2-R2: a checked item with no result (the review route sets the status only) reads ไม่ตรง, so พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด. The `found` and `not_found` wheres need no status, because only a pending item has a null result and no write path leaves a pending item with a result (mark-not-found takes pending items only; the scan always sets scanned or reconciled)."
  - `auditRoundCategoryWhere(categoryId, shownCategoryIds = [])`: `categoryId === AUDIT_ROUND_OTHER_CATEGORY ? { asset: { categoryId: { notIn: [...shownCategoryIds] } } } : { asset: { categoryId } }`. An item has no category of its own: an asset's category rarely changes, and spec §4 allows no new column.
  - `auditRoundFieldFindingWhere(field)`: `{ findings: { some: { findingType: auditFindingTypeByField[field], reviewStatus: { in: [...auditCountedFindingReviewStatuses] } } } }`.
  - `auditRoundComponentsMissingWhere(roundId)`: the relation-only where of recon RF §4, as in the test. Comment: "A parent with an installed component whose own item in this round is ไม่พบ (spec §8, decision 6). Both not-found paths set the result (the pending list and the component-missing dialog post mark-not-found), and a rejected not-found finding keeps it (P2-R19). Relations only, so no id list."
  - `auditRoundSearchWhere(search, expectedLocationIds = [])`: the `OR` of tag, name and, when the list is not empty, `{ expectedLocationId: { in: [...expectedLocationIds] } }`. The caller passes the trimmed text.
  - A private `auditRoundFilterClauses(input)` returns the clause array in this order:
    1. `{ auditRoundId }`;
    2. company (`{ expectedCompanyId }`);
    3. branch (`{ expectedBranchId }`);
    4. category;
    5. field;
    6. `components === "missing"`;
    7. search (only when `input.search?.trim()` is not empty).
  - `buildAuditRoundFilterWhere(input)` returns `{ AND: auditRoundFilterClauses(input) }`.
  - `buildAuditRoundItemWhere(input)`:

    ```ts
    export function buildAuditRoundItemWhere(input: AuditRoundItemWhereInput): Prisma.AuditItemWhereInput {
      const { result } = input
      const resultWhere = auditRoundResultWhere(result)
      // Every filter in one AND list (a spread would overwrite: pending review and a field both write findings; a
      // category and missing components both write asset).
      const where: Prisma.AuditItemWhereInput = { AND: [...auditRoundFilterClauses(input), ...(resultWhere ? [resultWhere] : [])] }
      // The round's own items (group 2 spec §5): every result list leaves the out-of-scope finds out, so each count
      // equals the list it opens. Two lists keep them: the out-of-scope list (the out-of-scope items) and the
      // pending-review list, which follows the pending findings; an out-of-scope find waits for review too (R5).
      return result === "out_of_scope" || result === "pending_review" ? where : withAuditRoundOwnItems(where)
    }
    ```
    The last line is the text that `tests/audit-round-counts.test.ts:90` pins, kept as it is.
- **The fold (after the wheres):**
  - `foldAuditRoundResultCounts` handles each row in turn:
    1. If `!isAuditRoundOwnItem(row)`, the count goes to `outOfScope` only.
    2. Else `all` takes the count, and then exactly one of:
       - `auditStatus === "pending"` → `pending`;
       - `isSuccessfulAuditResult(row.auditResult)` → `found`;
       - `row.auditResult === "not_found"` → `notFound`;
       - anything else → `mismatch`.
  - `emptyAuditRoundResultCounts = Object.freeze({ all: 0, pending: 0, found: 0, mismatch: 0, notFound: 0, outOfScope: 0 })`.
- **Links (replace `:249-284`):**
  - The private writer, used by all four builders:

    ```ts
    function writeAuditRoundListParams(filters: AuditRoundListHrefFilters): URLSearchParams {
      const params = new URLSearchParams()
      if (filters.result !== "all") params.set("result", filters.result)
      if (filters.search.trim()) params.set("search", filters.search.trim())
      if (filters.companyId) params.set("companyId", filters.companyId)
      if (filters.branchId) params.set("branchId", filters.branchId)
      if (filters.categoryId) params.set("categoryId", filters.categoryId)
      if (filters.field) params.set("field", filters.field)
      if (filters.components) params.set("components", filters.components)
      return params
    }
    ```
  - `buildAuditRoundPageHref`:
    - It merges the overrides key by key, skipping `undefined`.
    - It writes the filters, then `page` when it is above 1, `pageSize` when it is not 25 (`AUDIT_ROUND_DEFAULT_PAGE_SIZE = 25`, unexported), and `returnTo` when given.
    - It returns `/${locale}/audit/rounds/${roundId}${query ? `?${query}` : ""}#audit-result-list`.
    - It never reads `expectedLocationIds` or `shownCategoryIds`.
  - `buildAuditRoundExportHref`: `/api/audit-rounds/${roundId}/${endpoint}` plus the writer's query.
  - `buildAuditRoundResultListHref` keeps its signature plus `categoryId?: string | null`, `field?: AuditFindingField | null` and `components?: "missing" | null`.
    - Its body: the writer, then `page` and `pageSize` always, then `returnTo`, then the hash.
    - Its doc comment: "The round page's old list links, page and page size always written (until plan 2 Task 5 moves the page onto buildAuditRoundPageHref)."
  - `buildAuditRoundItemsHref` returns `buildAuditRoundPageHref(locale, roundId, emptyAuditRoundListFilters, { companyId: filters.companyId ?? null, branchId: filters.branchId ?? null })`.
- `isAuditFindingResultFilter` (`:291-293`) goes. `buildAssetSearchWhere` (`:295-300`) stays, private and with no return type annotation. `auditRoundSearchWhere` builds its `OR` as `[...buildAssetSearchWhere(search), ...(expectedLocationIds.length > 0 ? [{ expectedLocationId: { in: [...expectedLocationIds] } }] : [])]`. `buildAuditRoundScanHistoryWhere` (`:163-181`) keeps `where.OR = buildAssetSearchWhere(searchText)` unchanged until Task 2 deletes it. (`AuditItemWhereInput[]` cannot be assigned to `AuditScanHistoryWhereInput.OR`: TS2322, so it never reuses `auditRoundSearchWhere(...).OR`.)

- [ ] **Step 5: The round page's type edits (`audit/rounds/[id]/page.tsx`)**

The page keeps its look; only the filter state reaches it.
- **Import (`:41-54`):** add `auditFindingTypeByField`.
- **`:59`:** the searchParams type ends `…; branchId?: string | string[]; categoryId?: string | string[]; field?: string | string[]; components?: string | string[] }>`.
- **`:74`:**

  ```ts
  const itemFilters = { companyId: resultListState.companyId, branchId: resultListState.branchId, categoryId: resultListState.categoryId, field: resultListState.field, components: resultListState.components }
  ```
  Every list href that spreads `itemFilters` now keeps the new filters (the stale-id and past-the-last-page redirects, the chips, the paging, the return href). The where call (`:75`) is unchanged.
- **`:299`:** the stale company/branch redirect keeps the rest:

  ```ts
  redirect(buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, ...itemFilters, companyId: filterCompany ? resultListState.companyId : null, branchId: filterBranch ? resultListState.branchId : null, pageSize: resultListState.pageSize }))
  ```
- **`:314-323`:** `resultFilterLabels` holds `all: t("viewAll")`, `pending: t("pending")`, `found: t("found")`, `mismatch: t("mismatch")`, `not_found: t("notFound")`, `out_of_scope: t("outOfScope")` and `pending_review: t("pendingReview")`. All are existing keys: รอตรวจ and รายการไม่ตรง.
- **`:367-369`:** each box opens its field (P2-R22):

  ```ts
  const wrongLocationResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "all", field: "location", returnTo: returnToHref, pageSize: resultListState.pageSize })
  ```
  `wrongCustodianResultHref` (`field: "custodian"`) and `wrongConditionResultHref` (`field: "condition"`) follow the same form.
- **`:423-434`:** `findingReviewTypeByResult` goes:

  ```ts
  const resultFindingReviewHref =
    resultListState.result === "pending_review"
      ? pendingReviewFindingsHref
      : resultListState.field
        ? `/${locale}/audit/findings?status=pending&roundId=${round.id}&findingType=${auditFindingTypeByField[resultListState.field]}`
        : null
  ```
  "ไปพิจารณารายการไม่ตรง" now follows `field=department` too (spec §8).
- **`:628`:** the "ทั้งหมด" reset shows for any narrowing: `{resultListState.result !== "all" || resultListState.search || resultListState.categoryId || resultListState.field || resultListState.components ? (`.
- **`:642-649` (hiddenInputs):** after the branch line, add:

  ```ts
  ...(resultListState.categoryId ? { categoryId: resultListState.categoryId } : {}),
  ...(resultListState.field ? { field: resultListState.field } : {}),
  ...(resultListState.components ? { components: resultListState.components } : {}),
  ```
- **No other page change.** These keep today's behaviour until Tasks 3-5 rebuild the page:
  - `buildAuditRoundExportHref` (local, `:882-898`);
  - `resultSummaryItemConfig` (its keys are `AuditRoundResultSummaryKey`);
  - `current: resultListState.result === item.result` (the types overlap, so tsc accepts it; a field box never reads as current until Task 4);
  - the list title.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/audit-round-list-filters.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-round-counts.test.ts tests/dashboard-page.test.ts tests/dashboard-overview-rules.test.ts tests/asset-detail-frame.test.ts tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-item-status-labels.test.ts && npx tsc --noEmit`
Expected: PASS.
- `audit-round-counts.test.ts:89` (rewritten in this task) finds the widened import, and `:90` still finds the return line.
- `list-pages-ui.test.ts:364-369` and `operational-return-navigation.test.ts:61-66` still find the page's text.
- tsc: the dashboard and the exports still call `buildAuditRoundItemsHref` / `buildAuditRoundItemWhere({ roundId, result, search, ...filters })` with the old shapes.

Then run: `npm test && npm run lint`
Expected: PASS. A pin that fails outside this list is rewritten in this commit and named in the report.

- [ ] **Step 7: Commit**

```bash
git add src/lib/audit-round-result-filters.ts "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" tests/audit-round-list-filters.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-round-counts.test.ts
git commit -m "feat(audit-round): the round page's filter rules: รอตรวจ and ไม่ตรง results, category (with อื่น ๆ), field, missing components and room search in one AND list, the out-of-scope list on its own items, one result fold where the four results add up to the total, and one link writer; old result=wrong_* links open the field (group 2 plan 2 task 1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Out-of-scope onto items, everywhere at once (R4 closes); exports follow the filters; M8

Plan 1 kept the out-of-scope list and count on scan history (R4, R18). They now move onto the out-of-scope items in one commit (P2-R4). Those readers are:
- the round page's list and its box;
- the rounds list's count;
- the Excel, PDF and variance exports.

From then on:
- each count equals its list;
- company, branch, category and search narrow the out-of-scope list as they narrow every other list.

The three exports read the page's whole filter state through `buildAuditRoundItemWhere`, including:
- the room search (P2-R5);
- "อื่น ๆ" (P2-R11);
- the field;
- missing components.

The variance export counts own items and counts `done` plans as open (P2-R6). The reference-label lookups are chunked, and the lists order with an `id` tiebreak (P2-R20). On an out-of-scope row the page offers no "แก้ไขผลตรวจ": its re-scan would turn the find into an own item, and plan 3 fixes that path (P2-R4). The rounds list's `review` work view reads "มีรายการรอพิจารณา" (M8, P2-R21), and "รายงาน Variance" becomes "รายงานผลต่าง" (spec §5, bug 12).

**Files:**
- Create: `src/lib/audit-round-list-lookups.ts` (server: the room-search lookup, the category counts, the resolved where input, the export filters)
- Modify: `src/lib/audit-round-result-filters.ts`:
  - delete `buildAuditRoundScanHistoryWhere`, `isAuditRoundScanHistoryResultFilter` (`:163-185` on master) and `buildAssetSearchWhere` if `auditRoundSearchWhere` no longer uses it (otherwise keep it as the private tag/name helper);
  - the export label and filename helpers (`:187-242`) take the new filters;
  - new `buildAuditRoundExportSummary` and `buildAuditRoundVarianceWhere`.
- Modify: `src/lib/audit-finding-labels.ts:9-43` (one chunked `buildAuditReferenceLabels`; `buildFindingValueLabels` uses it)
- Modify: `src/app/api/audit-rounds/[id]/export/route.ts` (whole file: no history branch, the resolved filters, the shared labels, the `id` tiebreak)
- Modify: `src/app/api/audit-rounds/[id]/export-pdf/route.ts` (the same, plus the summary)
- Modify: `src/app/api/audit-rounds/[id]/variance-export/route.ts` (filters, own items, items not history, `done` open)
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`:
  - `:47`, `:50`, `:53` (imports);
  - `:73-76` (where);
  - `:78-95` and `:150` (destructure; the history count goes);
  - `:165-237` (one item list);
  - `:324-364` (rows);
  - `:373-388` (chips);
  - `:406-407` and `:499` (export hrefs);
  - `:441` (box count);
  - `:711`, `:794` (edit gate);
  - `:882-898` (local export href deleted).
- Modify: `src/lib/audit-rounds-list-rules.ts:146-171` (`buildAuditRoundInsights` drops its 4th parameter)
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/page.tsx:173-202` (the history groupBy goes)
- Modify: `messages/th.json`, `messages/en.json` (only through `node scripts/messages-edit.mjs`)
- Test:
  - `tests/audit-round-exports.test.ts` (new);
  - `tests/audit-round-list-lookups.test.ts` (new, runtime with a Prisma stand-in: the room search and the category counts, P2-R25);
  - `tests/audit-round-result-drilldown.test.ts:5-18`, `:61-68`, `:169-187`, `:373`, `:384` (rewritten);
  - `tests/audit-rounds-list-rules.test.ts:139-142`;
  - `tests/audit-rounds-ux.test.ts:57`, `:63`, `:67`;
  - `tests/phase2d-final-ui.test.ts:138`.

**Interfaces:**
- Consumes (Task 1):
  - `parseAuditRoundListFilters`, `buildAuditRoundItemWhere`, `buildAuditRoundFilterWhere`, `buildAuditRoundExportHref`, `foldAuditRoundResultCounts`, `AUDIT_ROUND_OTHER_CATEGORY`;
  - `type AuditRoundListFilters`, `type AuditRoundItemWhereInput`, `type AuditFindingField`.
- Consumes (plan 1):
  - `chunkAuditIds`, `foldTopCategories` (`src/lib/audit-round-counts-rules.ts:58-73`);
  - `isOpenAuditFindingActionStatus` (`src/lib/audit-finding-filters.ts:45-47`; `planned`, `in_progress`, `done`).
- Produces, in `src/lib/audit-round-list-lookups.ts` (server, `import { prisma } from "@/lib/db"`, never writes):
  - `findAuditRoundSearchLocationIds(roundId: string, search: string): Promise<string[]>`: the round's expected rooms whose code or name contains the text. One `auditItem.groupBy` gives the round's rooms, then `location.findMany` runs per 2,000 ids. An empty search gives `[]` with no query.
  - `countAuditRoundItemCategories(itemWhere: Prisma.AuditItemWhereInput): Promise<Array<{ categoryId: string; count: number }>>`: `asset.groupBy({ by: ["categoryId"], where: { auditItems: { some: itemWhere } }, _count: { _all: true } })`, the rows sorted by `categoryId`. It is exact, because `@@unique([auditRoundId, assetId])` and every item where pins the round. The id order makes every fold of it (`foldTopCategories` keeps equal counts in input order) pick the same six: the exports' "อื่น ๆ" here and the round page's chips (Task 3's `auditRoundTopCategoryIds`, which sorts by id the same way).
  - `resolveAuditRoundListWhereInput(roundId: string, filters: AuditRoundListFilters): Promise<AuditRoundItemWhereInput>`: the filters plus `roundId`, `expectedLocationIds` (search lookup) and, for `categoryId: "other"`, `shownCategoryIds`. Those are the six largest categories (`foldTopCategories`) counted with the same where without the category and with `result: "all"`, so the six do not change when the result tab changes and every result chip counts against the six its link opens, and so "อื่น ๆ" is exactly the chip row's "อื่น ๆ" (P2-R11).
  - `resolveAuditRoundExportFilters(roundId: string, searchParams: URLSearchParams): Promise<{ filters: AuditRoundListFilters; whereInput: AuditRoundItemWhereInput; company: { code: string } | null; branch: { code: string; company: { code: string } } | null; category: { code: string } | null }>`. It parses, then looks up company, branch and category. An unknown id exports as if absent, as the page's redirect shows (R13). For "อื่น ๆ", `category` is `{ code: "other" }`.
- Produces, in `src/lib/audit-finding-labels.ts`: `buildAuditReferenceLabels(ids: ReadonlyArray<string | null | undefined>): Promise<Map<string, string>>`. It reads location, employee, department and condition labels, each `IN` chunked at 2,000. `buildFindingValueLabels` calls it.
- Produces, in `src/lib/audit-round-result-filters.ts` (pure):
  - `buildAuditExportFilterLabel` and `buildAuditExportFilename` each gain `category?: { code: string } | null`, `field?: AuditFindingField | null` and `components?: "missing" | null`. Label order: result, company, branch, `category-<code>`, `field-<field>`, `components-missing`, search.
  - `buildAuditRoundExportSummary(rows: ReadonlyArray<{ auditStatus: string; auditResult: string | null }>): { exported: number; pending: number; checked: number; mismatchOrNotFound: number; outOfScope: number }`. Here `checked` = own non-pending.
  - `buildAuditRoundVarianceWhere(input: AuditRoundItemWhereInput): Prisma.AuditItemWhereInput`:
    - with result `all`: `buildAuditRoundFilterWhere(input)`, so the out-of-scope finds stay beside the own items and are counted apart;
    - else `buildAuditRoundItemWhere(input)`.
- Produces, in `src/lib/audit-rounds-list-rules.ts`: `buildAuditRoundInsights(rounds, countsByRoundId, findingWork)` (3 parameters); `outOfScope` = `counts.outOfScope`.
- For later tasks:
  - Task 3 calls `findAuditRoundSearchLocationIds(roundId, filters.search)` for the list's room ids and `countAuditRoundItemCategories` for the category chips (names read beside it), and derives "อื่น ๆ"'s six from the rows ranked over every result (`result: "all"`, P2-R11), as the exports do; it writes no room lookup of its own (P2-R25). Its row values go through `buildFindingValueLabels`, which now uses the chunked `buildAuditReferenceLabels`. The page then stops calling `resolveAuditRoundListWhereInput`; the three exports keep it.
  - Task 4's "ส่งออก ▾" menu uses `auditRoundExportHref` / `auditRoundExportPdfHref` / `auditRoundVarianceHref` (all three from `buildAuditRoundExportHref`, over the page's `filters` from Task 3 on) and keeps each an `<a … download>`.
  - Task 6 calls `findAuditRoundSearchLocationIds(roundId, searchText)` for the room half of the pending search (P2-R25).
  - Task 7 writes the deploy note (the Production SELECT of recon RF §5).

- [ ] **Step 1: Change the words**

Write this change file in the session scratchpad (e.g. `<scratchpad>/group2-plan2/task2-messages.json`), never in the repo, then run `node scripts/messages-edit.mjs <file>`. The run sets 2 keys in th and 1 in en.

```json
{
  "set": {
    "th": { "auditRound.viewReview": "มีรายการรอพิจารณา", "auditRound.exportVariance": "รายงานผลต่าง" },
    "en": { "auditRound.viewReview": "Has Pending Decisions" }
  }
}
```

| Key | th | en |
|---|---|---|
| `auditRound.viewReview` (changed, M8, P2-R21) | มีรายการรอพิจารณา | Has Pending Decisions |
| `auditRound.exportVariance` (changed, spec §5, bug 12) | รายงานผลต่าง | Variance Report (unchanged) |

Kept:
- `auditRound.pendingReview` stays "รอพิจารณา". It is the computed badge (`isAuditRoundAwaitingDecision`), so the chip no longer reads like the badge.
- Both values pass `tests/thai-glossary.test.ts`. "พิจารณา" is glossary row 11.

- [ ] **Step 2: Write the failing tests**

`tests/audit-round-exports.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildAuditExportFilename,
  buildAuditExportFilterLabel,
  buildAuditRoundExportSummary,
  buildAuditRoundVarianceWhere,
} from "../src/lib/audit-round-result-filters.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
const API = "src/app/api/audit-rounds/[id]/"
const own = (where: object) => ({ AND: [where, { OR: [{ auditResult: null }, { auditResult: { not: "out_of_scope" } }] }] })

test("an export's label and file name name every filter: category (or อื่น ๆ), field and missing components slot in after the branch (spec §8)", () => {
  const sni = { code: "SNI" }
  const hq = { code: "HQ", company: sni }
  assert.equal(
    buildAuditExportFilterLabel({ result: "mismatch", search: "PC", company: sni, branch: hq, category: { code: "NB" }, field: "location", components: "missing" }),
    "mismatch-company-SNI-branch-HQ-category-NB-field-location-components-missing-search-PC",
  )
  assert.equal(buildAuditExportFilterLabel({ result: "all", search: "", category: { code: "other" } }), "category-other")
  assert.equal(buildAuditExportFilterLabel({ result: "all", search: "", field: null, components: null, category: null }), "all")
  assert.equal(
    buildAuditExportFilename({ prefix: "audit-variance", auditNo: "AUD-2026-0003", result: "all", search: "", field: "department", components: "missing", extension: "xlsx", date: new Date("2026-10-27T03:00:00Z") }),
    "audit-variance-AUD-2026-0003-field-department-components-missing-2026-10-27.xlsx",
  )
  assert.equal(
    buildAuditExportFilename({ prefix: "audit-variance", auditNo: "AUD-2026-0003", result: "all", search: "", extension: "xlsx", date: new Date("2026-10-27T03:00:00Z") }),
    "audit-variance-AUD-2026-0003-2026-10-27.xlsx",
    "no filter: today's variance file name",
  )
})

test("the PDF summary: pending, checked (own, not pending), mismatch or not found, and the out-of-scope finds apart; the three add up to the rows (spec §5, P2-R4)", () => {
  const summary = buildAuditRoundExportSummary([
    { auditStatus: "pending", auditResult: null },
    { auditStatus: "scanned", auditResult: "found" },
    { auditStatus: "reviewed", auditResult: "wrong_location" },
    { auditStatus: "reviewed", auditResult: null },
    { auditStatus: "reviewed", auditResult: "not_found" },
    { auditStatus: "reviewed", auditResult: "out_of_scope" },
  ])
  assert.deepEqual(summary, { exported: 6, pending: 1, checked: 4, mismatchOrNotFound: 3, outOfScope: 1 })
  assert.equal(summary.pending + summary.checked + summary.outOfScope, summary.exported)
})

test("the variance report follows the filters; with no result chosen it keeps the out-of-scope finds beside the own items, counted apart (P2-R6)", () => {
  assert.deepEqual(buildAuditRoundVarianceWhere({ roundId: "round-1", result: "all", companyId: "c-1" }), { AND: [{ auditRoundId: "round-1" }, { expectedCompanyId: "c-1" }] })
  assert.deepEqual(buildAuditRoundVarianceWhere({ roundId: "round-1", result: "not_found", companyId: "c-1" }), own({ AND: [{ auditRoundId: "round-1" }, { expectedCompanyId: "c-1" }, { auditResult: "not_found" }] }))
})

test("the room search, the category counts and the export filters are server lookups: chunked, by relation, never writing (P2-R5, P2-R11)", () => {
  const source = read("src/lib/audit-round-list-lookups.ts")
  assert.match(source, /export async function findAuditRoundSearchLocationIds\(roundId: string, search: string\): Promise<string\[\]>/)
  assert.match(source, /by: \["expectedLocationId"\],\s*where: \{ auditRoundId: roundId \}/)
  assert.match(source, /chunkAuditIds\(roomIds\)\.map\(\(chunk\) =>/)
  assert.match(source, /where: \{ id: \{ in: chunk \}, OR: \[\{ code: \{ contains: text \} \}, \{ name: \{ contains: text \} \}\] \}/)
  assert.match(source, /export async function countAuditRoundItemCategories\(itemWhere: Prisma\.AuditItemWhereInput\): Promise<Array<\{ categoryId: string; count: number \}>>/)
  assert.match(source, /prisma\.asset\.groupBy\(\{\s*by: \["categoryId"\],\s*where: \{ auditItems: \{ some: itemWhere \} \},\s*_count: \{ _all: true \},?\s*\}\)/)
  assert.match(source, /export async function resolveAuditRoundListWhereInput\(roundId: string, filters: AuditRoundListFilters\): Promise<AuditRoundItemWhereInput>/)
  assert.match(source, /foldTopCategories\(rows\)\.top\.map\(\(row\) => row\.categoryId\)/)
  assert.match(source, /buildAuditRoundItemWhere\(\{ \.\.\.base, categoryId: null \}\)/, "อื่น ๆ is counted with every other filter, as the chip row counts it")
  assert.match(source, /export async function resolveAuditRoundExportFilters\(roundId: string, searchParams: URLSearchParams\)/)
  assert.match(source, /parseAuditRoundListFilters\(Object\.fromEntries\(searchParams\)\)/)
  assert.match(source, /prisma\.assetCategory\.findUnique\(\{ where: \{ id: parsed\.categoryId \}, select: \{ code: true \} \}\)/)
  assert.doesNotMatch(source, /\.(create|update|upsert|delete)(Many)?\(|\$queryRaw/)

  const labels = read("src/lib/audit-finding-labels.ts")
  assert.match(labels, /export async function buildAuditReferenceLabels\(ids: ReadonlyArray<string \| null \| undefined>\): Promise<Map<string, string>>/)
  assert.match(labels, /chunkAuditIds\(/)
  assert.match(labels, /return buildAuditReferenceLabels\(/, "buildFindingValueLabels shares the chunked lookup")
  assert.equal(labels.match(/prisma\.location\.findMany\(/g)?.length, 1)
})

test("the Excel and PDF exports read the page's whole filter state, the out-of-scope finds as items, with chunked labels and a stable order (P2-R4, P2-R5, P2-R20)", () => {
  for (const file of ["export/route.ts", "export-pdf/route.ts"]) {
    const route = read(`${API}${file}`)
    assert.match(route, /resolveAuditRoundExportFilters\(id, request\.nextUrl\.searchParams\)/, file)
    assert.match(route, /prisma\.auditItem\.findMany\(\{\s*where: buildAuditRoundItemWhere\(whereInput\),\s*orderBy: \[\{ auditStatus: "asc" \}, \{ createdAt: "asc" \}, \{ id: "asc" \}\],/, file)
    assert.match(route, /import \{ buildAuditReferenceLabels \} from "@\/lib\/audit-finding-labels"/, file)
    assert.match(route, /category, field: filters\.field, components: filters\.components/, file)
    assert.doesNotMatch(route, /auditScanHistory|buildOutOfScopeExportRows|isOutOfScopeExport|ScanHistory|async function buildAuditReferenceLabels|prisma\.location\.findMany/, file)
  }
  const pdf = read(`${API}export-pdf/route.ts`)
  assert.match(pdf, /const summary = buildAuditRoundExportSummary\(rows\)/)
  assert.match(pdf, /\{ label: "Checked", value: summary\.checked \}/)
  assert.match(pdf, /\{ label: "Out of Scope", value: summary\.outOfScope \}/)
  assert.doesNotMatch(pdf, /row\.auditStatus === "out_of_scope"|scannedCount/)
})

test("the variance report: the filters, the round's own items, the out-of-scope finds from items, and done plans still open (spec §8, P2-R6)", () => {
  const route = read(`${API}variance-export/route.ts`)
  assert.match(route, /export async function GET\(request: NextRequest, context: AuditVarianceExportContext\)/)
  assert.match(route, /resolveAuditRoundExportFilters\(id, request\.nextUrl\.searchParams\)/)
  assert.match(route, /const scopeWhere = buildAuditRoundVarianceWhere\(whereInput\)/)
  assert.match(route, /prisma\.auditItem\.groupBy\(\{\s*by: \["auditStatus", "auditResult"\],\s*where: scopeWhere,/)
  assert.match(route, /where: \{ auditRoundId: id, auditItem: scopeWhere \}/)
  assert.match(route, /orderBy: \[\{ reviewStatus: "asc" \}, \{ findingType: "asc" \}, \{ reportedAt: "asc" \}, \{ id: "asc" \}\]/)
  assert.match(route, /const counts = foldAuditRoundResultCounts\(/)
  for (const row of [
    /\{ metric: "Total Expected Assets", count: counts\.all \}/,
    /\{ metric: "Matched Assets", count: counts\.found \}/,
    /\{ metric: "Mismatched Assets", count: counts\.mismatch \}/,
    /\{ metric: "Pending Assets", count: counts\.pending \}/,
    /\{ metric: "Not Found Assets", count: counts\.notFound \}/,
    /\{ metric: "Out-of-scope Assets", count: counts\.outOfScope \}/,
  ]) assert.match(route, row)
  assert.match(route, /findings\.filter\(\(finding\) => isOpenAuditFindingActionStatus\(finding\.actionStatus\)\)\.length/)
  assert.match(route, /buildAuditExportFilename\(\{ prefix: "audit-variance"/)
  assert.match(route, /round\.status === "cancelled"/, "the read-only guard (audit-round-cancellation.test.ts:65-85)")
  assert.doesNotMatch(route, /auditScanHistory|_request|\["planned", "in_progress"\]|items\.length|Out-of-scope Scan Events/)
})

test("the round page lists the out-of-scope finds as items under every filter, counts them from the items, and offers no แก้ไขผลตรวจ on them (P2-R4, P2-R5)", () => {
  const page = read(`${D}audit/rounds/[id]/page.tsx`)
  assert.doesNotMatch(page, /auditScanHistory\.findMany|auditItemId: null|isOutOfScopeResultList|ScanHistoryWhere|ScanHistoryResultFilter|outOfScopeScan/)
  assert.match(page, /const resultWhereInput = await resolveAuditRoundListWhereInput\(id, resultListState\)\n\s+const resultItemWhere = buildAuditRoundItemWhere\(resultWhereInput\)/)
  assert.match(page, /orderBy: \[\{ auditStatus: "asc" \}, \{ createdAt: "desc" \}, \{ id: "asc" \}\]/)
  assert.match(page, /\{ result: "out_of_scope", count: roundCounts\.outOfScope \}/)
  assert.match(page, /editHref: item\.auditResult === "out_of_scope" \? null : buildAuditRoundScanEditHref\(/)
  assert.equal(page.match(/\{!isRoundReadOnly && item\.editHref \? \(/g)?.length, 2, "the phone card and the table row")
  assert.match(page, /if \(filterCompany\) \{\n\s+resultFilterChips\.push/, "the company chip shows on the out-of-scope list too")
  assert.match(page, /const auditRoundExportHref = buildAuditRoundExportHref\(round\.id, "export", resultListState\)/)
  assert.match(page, /const auditRoundExportPdfHref = buildAuditRoundExportHref\(round\.id, "export-pdf", resultListState\)/)
  assert.match(page, /const auditRoundVarianceHref = buildAuditRoundExportHref\(round\.id, "variance-export", resultListState\)/)
  assert.doesNotMatch(page, /function buildAuditRoundExportHref/)
  // The cancel dialog still counts every scan event (route.ts getCancellationImpact).
  assert.match(page, /prisma\.auditScanHistory\.count\(\{ where: \{ auditRoundId: id \} \}\)/)
})

test("the rounds list counts the out-of-scope finds from the items, as the round page's list it opens (P2-R4, R4 closed)", () => {
  const page = read(`${D}audit/rounds/page.tsx`)
  assert.doesNotMatch(page, /auditScanHistory|outOfScopeByRoundId|outOfScopeWorkCounts/)
  assert.match(page, /const \[countsByRoundId, findingWorkRows\] = roundIds\.length/)
  assert.match(page, /buildAuditRoundInsights\(allRounds, countsByRoundId, findingWorkByRoundId\)/)
  assert.match(read("src/lib/audit-rounds-list-rules.ts"), /outOfScope: counts\.outOfScope,/)
})

test("the work view no longer reads like the badge, and the variance report is in Thai (M8, P2-R21, spec §5)", () => {
  const th = JSON.parse(read("messages/th.json"))
  const en = JSON.parse(read("messages/en.json"))
  assert.equal(th.auditRound.viewReview, "มีรายการรอพิจารณา")
  assert.equal(en.auditRound.viewReview, "Has Pending Decisions")
  assert.equal(th.auditRound.pendingReview, "รอพิจารณา", "the badge keeps its word")
  assert.notEqual(th.auditRound.viewReview, th.auditRound.pendingReview)
  assert.equal(th.auditRound.exportVariance, "รายงานผลต่าง")
})
```

`tests/audit-round-list-lookups.test.ts` (new). It loads the lookups with a Prisma stand-in, the pattern of `tests/master-data-record-status.test.ts:113-139` (Task 3's page-data test uses the same harness). The room search's runtime cases live here, in the task that owns the lookup (P2-R25); Task 3's test only checks that the list's where carries the ids.

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import { buildAuditRoundItemWhere, parseAuditRoundListFilters } from "../src/lib/audit-round-result-filters.ts"

type Args = { where?: unknown; by?: readonly string[]; select?: unknown }
const state: { calls: Array<{ call: string; args: Args }>; respond: (call: string, args: Args) => unknown } = { calls: [], respond: () => undefined }
Object.assign(globalThis, { __roundListLookups: state })

const stubs = new Map<string, string>([
  ["@/lib/db", `
    const state = () => globalThis.__roundListLookups
    const model = (name) => new Proxy({}, {
      get: (_, method) => async (args) => {
        const call = name + "." + String(method)
        state().calls.push({ call, args: args ?? {} })
        const value = state().respond(call, args ?? {})
        if (value !== undefined) return value
        if (method === "count") return 0
        if (method === "findMany" || method === "groupBy") return []
        return null
      },
    })
    export const prisma = new Proxy({}, { get: (_, key) => model(String(key)) })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const { countAuditRoundItemCategories, findAuditRoundSearchLocationIds, resolveAuditRoundListWhereInput } = (await import(
  pathToFileURL("src/lib/audit-round-list-lookups.ts").href
)) as typeof import("../src/lib/audit-round-list-lookups.ts")

const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const ids = (args: Args | undefined) => (args?.where as { id: { in: string[] } }).id.in

beforeEach(() => {
  state.calls = []
  state.respond = () => undefined
})

test("the room search reads the round's own rooms, then matches them by code or name in chunks of 2,000 (bug 11, P2-R5, P2-R25)", async () => {
  const rooms = Array.from({ length: 2001 }, (_, index) => ({ expectedLocationId: `loc-${index}` }))
  state.respond = (call, args) => {
    if (call === "auditItem.groupBy") return rooms
    if (call === "location.findMany") return ids(args).includes("loc-7") ? [{ id: "loc-7" }] : []
    return undefined
  }
  assert.deepEqual(await findAuditRoundSearchLocationIds("round-1", " B-1 "), ["loc-7"])
  const groupBy = callsTo("auditItem.groupBy")
  assert.equal(groupBy.length, 1)
  assert.deepEqual(groupBy[0].by, ["expectedLocationId"])
  assert.deepEqual(groupBy[0].where, { auditRoundId: "round-1" }, "the round's own rooms, never the register's")
  const lookups = callsTo("location.findMany")
  assert.deepEqual(lookups.map((args) => ids(args).length), [2000, 1])
  assert.deepEqual(lookups[1], { where: { id: { in: ["loc-2000"] }, OR: [{ code: { contains: "B-1" } }, { name: { contains: "B-1" } }] }, select: { id: true } })
})

test("an empty search reads nothing; a search that names no room gives no ids", async () => {
  assert.deepEqual(await findAuditRoundSearchLocationIds("round-1", "   "), [])
  assert.equal(state.calls.length, 0)
  state.respond = (call) => (call === "auditItem.groupBy" ? [{ expectedLocationId: "loc-1" }] : undefined)
  assert.deepEqual(await findAuditRoundSearchLocationIds("round-1", "ZZZ"), [])
})

test("the category counts come back in id order, so อื่น ๆ leaves out the same six on the page and in the exports (P2-R11)", async () => {
  const sizes: Record<string, number> = { c1: 40, c2: 30, c3: 20, c4: 10, c5: 5, c6: 5, c7: 5, c8: 1 }
  state.respond = (call) => (call === "asset.groupBy" ? Object.entries(sizes).reverse().map(([categoryId, count]) => ({ categoryId, _count: { _all: count } })) : undefined)
  const where = buildAuditRoundItemWhere({ ...parseAuditRoundListFilters({}), roundId: "round-1" })
  assert.deepEqual((await countAuditRoundItemCategories(where)).map((row) => row.categoryId), ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"])
  assert.deepEqual(callsTo("asset.groupBy")[0].where, { auditItems: { some: where } })
  // Three categories tie at 5: the six shown take c5 and c6 by id, so c7 and c8 are "อื่น ๆ" (Task 3's chips fold the same way).
  const other = await resolveAuditRoundListWhereInput("round-1", parseAuditRoundListFilters({ categoryId: "other" }))
  assert.deepEqual(other.shownCategoryIds, ["c1", "c2", "c3", "c4", "c5", "c6"])
  // The six are ranked over every result, so a result tab under อื่น ๆ counts against the six its link opens (P2-R11).
  state.calls = []
  await resolveAuditRoundListWhereInput("round-1", parseAuditRoundListFilters({ categoryId: "other", result: "not_found" }))
  assert.deepEqual(callsTo("asset.groupBy")[0].where, { auditItems: { some: buildAuditRoundItemWhere({ ...parseAuditRoundListFilters({ result: "not_found" }), roundId: "round-1", expectedLocationIds: [], categoryId: null, result: "all" }) } }, "the six are ranked over every result")
  state.calls = []
  assert.equal((await resolveAuditRoundListWhereInput("round-1", parseAuditRoundListFilters({ categoryId: "cat-1" }))).shownCategoryIds, undefined)
  assert.equal(callsTo("asset.groupBy").length, 0, "only อื่น ๆ needs the six")
})
```

- [ ] **Step 3: Rewrite these pins**

- **`tests/audit-round-result-drilldown.test.ts`:**
  - `:13`: the import of `buildAuditRoundScanHistoryWhere` goes.
  - `:61-68`: the `buildAuditRoundScanHistoryWhere` deepEqual goes. The test keeps its name and its first assertion (Task 1's field + search).
  - `:169-187` becomes:

    ```ts
    test("audit round result exports use the same filters as the on-screen result list", () => {
      const excelRoute = readFileSync("src/app/api/audit-rounds/[id]/export/route.ts", "utf8")
      const pdfRoute = readFileSync("src/app/api/audit-rounds/[id]/export-pdf/route.ts", "utf8")

      for (const route of [excelRoute, pdfRoute]) {
        assert.match(route, /request: NextRequest/)
        assert.match(route, /resolveAuditRoundExportFilters\(id, request\.nextUrl\.searchParams\)/)
        assert.match(route, /buildAuditRoundItemWhere\(whereInput\)/)
        assert.match(route, /auditItem\.findMany/)
        assert.doesNotMatch(route, /auditScanHistory|ScanHistoryWhere|ScanHistoryResultFilter/, "the out-of-scope export is the out-of-scope items (P2-R4)")
      }
    })
    ```
  - `:207-226` stay: the helpers keep their names, `result !== "all"`, `search.trim()`, the worksheet line and the PDF subtitle.
  - `:373` becomes `assert.match(page, /const resultWhereInput = await resolveAuditRoundListWhereInput\(id, resultListState\)\n\s+const resultItemWhere = buildAuditRoundItemWhere\(resultWhereInput\)/)`. The page now resolves the room search and อื่น ๆ (P2-R5, P2-R11). That test's `roundPage()` read (`:303`) already has `.replace(/\r\n/g, "\n")`.
  - `:384` becomes `assert.match(page, /const auditRoundExportHref = buildAuditRoundExportHref\(round\.id, "export", resultListState\)/)`. The local builder is gone (Step 5 deletes `:882-898`, the only text the old `state: Pick<AuditRoundResultListState, …>` pin matched), and the shared one in audit-round-result-filters keeps the company and branch.
- **`tests/audit-rounds-list-rules.test.ts`:**
  - `:139` becomes `const insights = buildAuditRoundInsights(rounds, counts, work)`.
  - `:141` becomes `// The out-of-scope count is the items' (P2-R4), as the round page's list it opens.`
  - `:142` expects `outOfScope: 9` (the fixture's `counts`, `:132`).
- **`tests/audit-rounds-ux.test.ts`:**
  - `:57`, the test name: `R4` becomes `P2-R4`.
  - `:63` comment: `// One round count for own items, out-of-scope finds apart; decisions and action plans apart.`
  - `:67` becomes `assert.doesNotMatch(page, /auditScanHistory/)`.
- **`tests/phase2d-final-ui.test.ts:138`** becomes `assert.match(round, /<a href=\{auditRoundVarianceHref\} download className=/)`.

- [ ] **Step 4: Run the tests to verify they fail**

Run: `node --test tests/audit-round-exports.test.ts tests/audit-round-list-lookups.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-rounds-list-rules.test.ts tests/audit-rounds-ux.test.ts tests/phase2d-final-ui.test.ts`
Expected: FAIL.
- `audit-round-exports.test.ts`: `buildAuditRoundExportSummary` and `buildAuditRoundVarianceWhere` are not exported (import error).
- `audit-round-list-lookups.test.ts`: `src/lib/audit-round-list-lookups.ts` does not exist (import error).
- The others: the routes still read scan history, `buildAuditRoundInsights` still takes the history map, and the variance link has no filters.

The message assertions already pass after Step 1.

- [ ] **Step 5: Implement**

- **`src/lib/audit-round-result-filters.ts`:**
  - Delete `buildAuditRoundScanHistoryWhere` and `isAuditRoundScanHistoryResultFilter`. `buildAssetSearchWhere` stays only as `auditRoundSearchWhere`'s private helper.
  - `buildAuditExportFilterLabel` takes `{ result, search, company, branch, category, field, components }`. After the branch part it pushes `category-${category.code}`, then `field-${field}`, then `components-${components}`, each when set; the search stays last.
  - `buildAuditExportFilename` takes the same three optional params and passes them through.
  - `buildAuditRoundExportSummary(rows)`:

    ```ts
    // The PDF's summary cells (P2-R4): the out-of-scope finds apart from the round's own items, so pending + checked +
    // out of scope = the exported rows. Checked is every own item not pending, whatever its result.
    export function buildAuditRoundExportSummary(rows: ReadonlyArray<{ auditStatus: string; auditResult: string | null }>) {
      const counts = foldAuditRoundResultCounts(rows.map((row) => ({ auditStatus: row.auditStatus, auditResult: row.auditResult, count: 1 })))
      return { exported: rows.length, pending: counts.pending, checked: counts.found + counts.mismatch + counts.notFound, mismatchOrNotFound: counts.mismatch + counts.notFound, outOfScope: counts.outOfScope }
    }
    ```
  - `buildAuditRoundVarianceWhere(input)`: `input.result === "all" ? buildAuditRoundFilterWhere(input) : buildAuditRoundItemWhere(input)`. Comment: "Every result but `all` already leaves the out-of-scope finds out or keeps only them (Task 1), so only `all` differs: the variance report keeps the finds, because they are variances too, and its summary counts them apart."
- **`src/lib/audit-round-list-lookups.ts`** (new):

  ```ts
  import type { Prisma } from "@prisma/client"
  import { prisma } from "@/lib/db"
  import { chunkAuditIds, foldTopCategories } from "@/lib/audit-round-counts-rules"
  import {
    AUDIT_ROUND_OTHER_CATEGORY,
    buildAuditRoundItemWhere,
    parseAuditRoundListFilters,
    type AuditRoundItemWhereInput,
    type AuditRoundListFilters,
  } from "@/lib/audit-round-result-filters"

  // The round page's filter lookups (group 2 spec §8): what a pure where cannot know. AuditItem.expectedLocationId has
  // no relation, so a room search first finds the round's rooms by code or name (P2-R5); "อื่น ๆ" needs the six
  // categories the chip row shows (P2-R11). The page and the three exports call the same functions, so a list and its
  // export hold the same rows. It never writes.
  export async function findAuditRoundSearchLocationIds(roundId: string, search: string): Promise<string[]> {
    const text = search.trim()
    if (!text) return []
    // Only the round's own rooms, so the id list stays the size of the round's rooms, not the register's.
    const rooms = await prisma.auditItem.groupBy({
      by: ["expectedLocationId"],
      where: { auditRoundId: roundId },
    })
    const roomIds = rooms.map((room) => room.expectedLocationId)
    const matches = await Promise.all(
      chunkAuditIds(roomIds).map((chunk) =>
        prisma.location.findMany({ where: { id: { in: chunk }, OR: [{ code: { contains: text } }, { name: { contains: text } }] }, select: { id: true } }),
      ),
    )
    return matches.flat().map((location) => location.id)
  }
  ```
  - `countAuditRoundItemCategories(itemWhere)`: the groupBy in the Interfaces block, mapped to `{ categoryId: row.categoryId, count: row._count._all }`, then sorted by `categoryId` (`<`/`>`, not `localeCompare`; in JS after the query, so the pinned groupBy text keeps no `orderBy`). It has no `isActive` filter: a deactivated asset's item still counts. Comment: "In id order, so a fold of equal counts picks the same six on every request, here and on the round page (Task 3's auditRoundTopCategoryIds sorts the same way)."
  - `resolveAuditRoundListWhereInput(roundId, filters)`:

    ```ts
    const expectedLocationIds = await findAuditRoundSearchLocationIds(roundId, filters.search)
    const base: AuditRoundItemWhereInput = { ...filters, roundId, expectedLocationIds }
    if (filters.categoryId !== AUDIT_ROUND_OTHER_CATEGORY) return base
    // Ranked over every result (P2-R11): the six stay put when the result tab changes.
    const rows = await countAuditRoundItemCategories(buildAuditRoundItemWhere({ ...base, categoryId: null, result: "all" }))
    return { ...base, shownCategoryIds: foldTopCategories(rows).top.map((row) => row.categoryId) }
    ```
  - `resolveAuditRoundExportFilters(roundId, searchParams)`:
    1. `const parsed = parseAuditRoundListFilters(Object.fromEntries(searchParams))`.
    2. One `Promise.all` runs the company read (`select: { code: true }`), the branch read (`select: { code: true, company: { select: { code: true } } }`) and, unless the category is "other" or null, `prisma.assetCategory.findUnique({ where: { id: parsed.categoryId }, select: { code: true } })`.
    3. `filters` = `parsed` with each unknown id set to `null` ("other" is kept).
    4. `whereInput = await resolveAuditRoundListWhereInput(roundId, filters)`.
    5. `category` = `{ code: AUDIT_ROUND_OTHER_CATEGORY }` for "other", else the read.
  - If tsc's `groupBy` generics ask for an aggregate on the rooms query, add `_count: { _all: true }`. The pinned text allows it only after `where`, so keep `by` and `where` first.
- **`src/lib/audit-finding-labels.ts`:**
  - Add the import `import { chunkAuditIds } from "@/lib/audit-round-counts-rules"`.
  - `buildAuditReferenceLabels(ids)`:
    - The unique non-empty ids go through `chunkAuditIds`.
    - Each of the four reads runs `Promise.all(chunks.map((chunk) => prisma.X.findMany({ where: { id: { in: chunk } }, select: … })))` and flattens. One `prisma.location.findMany(` text in the file: put the four reads in a small `readChunked` helper, or write each once inside its `.map`.
    - The map is filled the same way as today's (`:37-42`).
  - `buildFindingValueLabels` keeps its id collection (`:10-15`) and ends `return buildAuditReferenceLabels(idList)`.
  - SQL Server takes at most 2,100 parameters. A round's export can name every room and custodian of 1,509 items (AUD-2026-0002), so the four lists can pass that limit unchunked (recon RF gotcha 4).
- **`export/route.ts`** (Excel):
  - Imports:

    ```ts
    import { buildAuditReferenceLabels } from "@/lib/audit-finding-labels"
    import { resolveAuditRoundExportFilters } from "@/lib/audit-round-list-lookups"
    import {
      buildAuditExportFilterLabel,
      buildAuditExportFilename,
      buildAuditExportWorksheetName,
      buildAuditRoundItemWhere,
      type AuditRoundItemWhereInput,
    } from "@/lib/audit-round-result-filters"
    ```
  - The top of `GET`:

    ```ts
    const { id } = await context.params
    const [round, exportFilters] = await Promise.all([
      prisma.auditRound.findFirst({ where: { id, isActive: true }, select: { id: true, auditNo: true, name: true, status: true } }),
      resolveAuditRoundExportFilters(id, request.nextUrl.searchParams),
    ])
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })
    if (round.status === "cancelled") {
      return NextResponse.json({ error: "Audit round is cancelled" }, { status: 400 })
    }
    // The export is the page's list (spec §8 "ตามตัวกรองที่เลือก"): every filter, the room search and อื่น ๆ included,
    // the out-of-scope finds as items (P2-R4). An unknown id exports as if absent, as the page's redirect shows (R13).
    const { filters, whereInput, company, branch, category } = exportFilters
    const labelInput = { result: filters.result, search: filters.search, company, branch, category, field: filters.field, components: filters.components }
    const filterLabel = buildAuditExportFilterLabel(labelInput)
    const rows = await buildAuditItemExportRows(whereInput)
    const labels = await buildAuditReferenceLabels(rows.flatMap((row) => [ /* the same eight ids as :75-82 */ ]))
    ```
  - The workbook block (`:86-112`) stays.
  - The response: `buildAuditExportFilename({ prefix: "audit-result", auditNo: round.auditNo, ...labelInput, extension: "xlsx" })`.
  - `buildAuditItemExportRows(whereInput: AuditRoundItemWhereInput)`:
    - its `findMany` is `where: buildAuditRoundItemWhere(whereInput), orderBy: [{ auditStatus: "asc" }, { createdAt: "asc" }, { id: "asc" }],`;
    - the mapping (`:140-158`) stays.
  - `buildOutOfScopeExportRows` and the local `buildAuditReferenceLabels` go. `labelOrBlank` stays.
  - The exported row now carries the out-of-scope find's real expected and actual values, scan count and reconcile status, instead of the history's blanks.
- **`export-pdf/route.ts`:**
  - The same imports, `Promise.all`, `labelInput`, `filterLabel` and `buildAuditItemExportRows(whereInput)` as the Excel route.
  - `isSuccessfulAuditResult` is dropped, and the result filter types go.
  - `AuditPdfExportRow.auditResult` becomes `string | null`, with `auditResult: item.auditResult` in the mapping and `auditResult: row.auditResult ?? ""` in the PDF rows.
  - `const labels = await buildAuditReferenceLabels(rows.flatMap((row) => [row.expectedLocationId, row.actualLocationId]))`.
  - `const summary = buildAuditRoundExportSummary(rows)`; the summary becomes:

    ```ts
    summary: [
      { label: "Exported Rows", value: summary.exported },
      { label: "Pending", value: summary.pending },
      { label: "Checked", value: summary.checked },
      { label: "Mismatch/Not Found", value: summary.mismatchOrNotFound },
      { label: "Out of Scope", value: summary.outOfScope },
    ],
    ```
  - The subtitle line (`:76`) stays exactly as it is (pin `drilldown:226`).
- **`variance-export/route.ts`:**
  - `GET(request: NextRequest, context: AuditVarianceExportContext)`.
  - Imports:
    - `isOpenAuditFindingActionStatus` from `@/lib/audit-finding-filters`;
    - `resolveAuditRoundExportFilters` from `@/lib/audit-round-list-lookups`;
    - `buildAuditExportFilename`, `buildAuditRoundVarianceWhere` and `foldAuditRoundResultCounts` from `@/lib/audit-round-result-filters`.
  - `isSuccessfulAuditResult` is dropped.
  - The round and `resolveAuditRoundExportFilters(id, request.nextUrl.searchParams)` are read in one `Promise.all`. The 404 and cancelled guards stay.
  - Then:

    ```ts
    // The variance report follows the page's filters (spec §8, P2-R6): its totals are the round's own items, the
    // out-of-scope finds are counted apart from the items (not the scan history), and an action plan is open until it is
    // verified, as the close checklist counts it (planned, in_progress, done).
    const { filters, whereInput, company, branch, category } = exportFilters
    const scopeWhere = buildAuditRoundVarianceWhere(whereInput)
    const [itemGroups, findings] = await Promise.all([
      prisma.auditItem.groupBy({
        by: ["auditStatus", "auditResult"],
        where: scopeWhere,
        _count: { _all: true },
      }),
      prisma.auditFinding.findMany({
        where: { auditRoundId: id, auditItem: scopeWhere },
        include: { /* as :53-57 */ },
        orderBy: [{ reviewStatus: "asc" }, { findingType: "asc" }, { reportedAt: "asc" }, { id: "asc" }],
      }),
    ])
    const counts = foldAuditRoundResultCounts(itemGroups.map((group) => ({ auditStatus: group.auditStatus, auditResult: group.auditResult, count: group._count._all })))
    ```
  - The summary rows, in this order:
    1. `{ metric: "Total Expected Assets", count: counts.all }`;
    2. `Matched Assets` (`counts.found`);
    3. `Mismatched Assets` (`counts.mismatch`, new);
    4. `Pending Assets` (`counts.pending`);
    5. `Not Found Assets` (`counts.notFound`);
    6. the four `Wrong … Findings` (unchanged, now over the filtered findings);
    7. `Out-of-scope Findings` (unchanged);
    8. `{ metric: "Out-of-scope Assets", count: counts.outOfScope }` (replaces "Out-of-scope Scan Events");
    9. `Pending Review Findings` (unchanged);
    10. `{ metric: "Open Action Plans", count: findings.filter((finding) => isOpenAuditFindingActionStatus(finding.actionStatus)).length }`.
  - The response: `workbookResponse(buffer, buildAuditExportFilename({ prefix: "audit-variance", auditNo: round.auditNo, result: filters.result, search: filters.search, company, branch, category, field: filters.field, components: filters.components, extension: "xlsx" }))`. With no filter the name equals today's.
  - The `items` findMany and the history count go.
- **Round page `audit/rounds/[id]/page.tsx`:**
  - **Imports:**
    - drop `buildAuditRoundScanHistoryWhere`, `isAuditRoundScanHistoryResultFilter` and `type AuditRoundResultListState`;
    - add `buildAuditRoundExportHref`;
    - add `import { resolveAuditRoundListWhereInput } from "@/lib/audit-round-list-lookups"`.
  - **`:73-76`** become:

    ```ts
    const itemFilters = { /* Task 1's line, unchanged */ }
    // The search matches the item's expected room too, and "อื่น ๆ" leaves out the six categories the chip row shows
    // (P2-R5, P2-R11); the exports resolve the same input (audit-round-list-lookups.ts).
    const resultWhereInput = await resolveAuditRoundListWhereInput(id, resultListState)
    const resultItemWhere = buildAuditRoundItemWhere(resultWhereInput)
    ```
  - **Destructure and `Promise.all`:**
    - Out: `outOfScopeCount` (`:84`, query `:150`), `outOfScopeScanRows`, `outOfScopeScanTotal` (`:91-92`, queries `:202-237`).
    - `resultItems` is always `prisma.auditItem.findMany({ where: resultItemWhere, skip, take, orderBy: [{ auditStatus: "asc" }, { createdAt: "desc" }, { id: "asc" }], include: { /* :172-199 */ } })` (P2-R20).
    - `resultItemTotal` is always `prisma.auditItem.count({ where: resultItemWhere })` (pin `drilldown:374`).
  - **`:324-364`:**
    - `resultListTotal = resultItemTotal` and `resultPageRowCount = resultItems.length`.
    - The `isOutOfScopeResultList ? … :` branch goes, so `resultRows = resultItems.map(…)`.
    - In that map: `auditResultTone` gains `item.auditResult === "out_of_scope" ? ("info" as const)` before the muted fallback (today's tone for those rows).
    - `editHref: item.auditResult === "out_of_scope" ? null : buildAuditRoundScanEditHref({ … })`. A re-scan from the round page would turn the find into an own item through the in-round path (scan route `:423-642`). Plan 3 fixes the walk's lookup (P2-R4).
    - An out-of-scope row reads status "ตรวจแล้ว" (`auditFinding.itemStatus_reviewed`) and result "นอกขอบเขต" (`auditRound.outOfScope`).
  - **`:373-388`:** the comment becomes "The company and branch narrow every list, the out-of-scope one included (P2-R4)". Both conditions lose `!isOutOfScopeResultList &&` (`if (filterCompany) {`, `if (filterBranch) {`).
  - **`:406-407`:**

    ```ts
    const auditRoundExportHref = buildAuditRoundExportHref(round.id, "export", resultListState)
    const auditRoundExportPdfHref = buildAuditRoundExportHref(round.id, "export-pdf", resultListState)
    const auditRoundVarianceHref = buildAuditRoundExportHref(round.id, "variance-export", resultListState)
    ```
    `:499` becomes `<a href={auditRoundVarianceHref} download className={buttonVariants({ variant: "outline", size: "md" })}>`. Its label reads "รายงานผลต่าง" after Step 1.
  - **`:441`:** `{ result: "out_of_scope", count: roundCounts.outOfScope },` (it was the history count; it now equals the list it opens).
  - **`:711`, `:794`:** `{!isRoundReadOnly && item.editHref ? (`. The RowActions block keeps its exact text (`list-pages-ui.test.ts:365`). Inside the branch `item.editHref` narrows to `string`. The `audit:edit` gate (P2-R7) is Task 4/5's.
  - **`:882-898`:** the local `buildAuditRoundExportHref` goes.
- **`src/lib/audit-rounds-list-rules.ts:146-171`:** the 4th parameter `outOfScopeByRoundId` goes. `outOfScope: counts.outOfScope,` gets the comment "From the out-of-scope items, as the round page's list it opens (P2-R4)."
- **Rounds list `audit/rounds/page.tsx`:**
  - `:173` becomes `const [countsByRoundId, findingWorkRows] = roundIds.length`.
  - The history groupBy and its comment (`:188-193`) go.
  - The fallback becomes `: ([new Map<string, AuditRoundCounts>(), []] as const)`.
  - `:201` goes.
  - `:202` becomes `const insightsByRoundId = buildAuditRoundInsights(allRounds, countsByRoundId, findingWorkByRoundId)`.
  - `withPerformanceTiming("audit-rounds.progress-data", …)` keeps its label.
- **No change:**
  - the API's cancel impact (`api/audit-rounds/[id]/route.ts:185-196`, `scanHistoryRows` every scan event);
  - the page's `scanHistoryCount` (`:153`);
  - the scan route;
  - `buildAuditRoundNextStep`'s out-of-scope href (`audit-rounds-list-rules.ts:258-260`): it opens `?result=out_of_scope`, which now lists the items it counts.
- **E2E:** no step changes. No step opens `?result=out_of_scope`, downloads a round export or reads "รายงาน Variance" (recon tests-e2e B1, B4). Task 7 adds the Excel step.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/audit-round-exports.test.ts tests/audit-round-list-lookups.test.ts tests/audit-round-list-filters.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-rounds-list-rules.test.ts tests/audit-rounds-ux.test.ts tests/phase2d-final-ui.test.ts tests/audit-round-cancellation.test.ts tests/audit-round-counts.test.ts tests/list-pages-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/e2e-fixes.test.ts tests/e2e-cross-cutting.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts && npx tsc --noEmit`
Expected: PASS.
- `audit-round-cancellation.test.ts:65-85` still finds `round.status === "cancelled"` in all three routes.
- `drilldown:207-226` still finds the label helpers, the worksheet line and the PDF subtitle.
- `list-pages-ui.test.ts:365` still finds the RowActions text.
- `e2e-fixes.test.ts:71` still finds `canExportRound`.

Then run: `npm test && npm run lint`
Expected: PASS. A pin that fails outside this list is rewritten in this commit and named in the report.

- [ ] **Step 7: Commit**

```bash
git add src/lib/audit-round-list-lookups.ts src/lib/audit-round-result-filters.ts src/lib/audit-finding-labels.ts src/lib/audit-rounds-list-rules.ts "src/app/api/audit-rounds/[id]/export/route.ts" "src/app/api/audit-rounds/[id]/export-pdf/route.ts" "src/app/api/audit-rounds/[id]/variance-export/route.ts" "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" "src/app/[locale]/(dashboard)/audit/rounds/page.tsx" messages/th.json messages/en.json tests/audit-round-exports.test.ts tests/audit-round-list-lookups.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-rounds-list-rules.test.ts tests/audit-rounds-ux.test.ts tests/phase2d-final-ui.test.ts
git commit -m "feat(audit-round): out-of-scope finds come from their items on the round page, the rounds list and the three exports; the exports follow every filter of the list (room search, category with อื่น ๆ, field, missing components); the variance report counts own items and done plans as open; chunked reference labels and stable order; no แก้ไขผลตรวจ on an out-of-scope row; the review work view reads มีรายการรอพิจารณา and รายงานผลต่าง is in Thai (group 2 plan 2 task 2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Round page data: one server load, round-wide cards, chips within the filters, the close API's own checklist

The round page loads everything in one server module (spec §5, §8). Tasks 4-5 rebuild the page on this data. This task:
- moves the close API's checklist out of the route into a lib function, so the route and the page read one checklist (spec §8 step 3, R2);
- reads the search's room ids through Task 2's lookup, `findAuditRoundSearchLocationIds`, and the category chips' counts through Task 2's `countAuditRoundItemCategories` (bug 11, P2-R5, P2-R25); it writes no lookup of its own;
- loads the round page's data in one module: the cards (round-wide), the chips (within the other filters), the list and its extras, and the photo count (bug 10, chunked);
- counts step 2 in findings, the rows of the findings page its links open (P2-R26);
- owns the stale `categoryId` redirect, through the shared href builder (P2-R31);
- wires the page to it with its UI kept: the old boxes, the progress bar, the result card and the photo box read the new numbers.

What stays for later tasks:
- Task 4 draws the header, the next-step card, the result card and "ไม่ตรงเรื่องอะไร" from `round`, `resultCard`, `fieldBars`, `componentsMissing`, `evidence` and `steps`.
- Task 5 draws the chips, the filter row and the table from `resultChips`, `categoryChips`, `componentsMissingInFilters`, `rows`, `findingValueLabels` and `filterNames`.

Line numbers below are master `f8269894`. Tasks 1 and 2 edit the page first, so the page edits name the code by content as well as by master line.

**Files:**
- Create: `src/lib/audit-round-close.ts` (server: the close checklist)
- Create: `src/lib/audit-round-page-rules.ts` (pure, client-safe: `import type` and relative `.ts` only)
- Create: `src/lib/audit-round-page-data.ts` (server)
- Modify: `src/app/api/audit-rounds/[id]/route.ts`:
  - `:1-8` (imports);
  - `:109` (the call);
  - `:165-183` (the local `getCloseChecklist` goes).
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`:
  - imports `:5`, `:14`, `:30`, `:35`, `:37-39`;
  - the data block: master `:71-76` (as Tasks 1-2 left it), `:78-268`, `:270-295`;
  - the stale-filter redirect `:297-300`;
  - the close checklist and the cancel impact `:391-405`;
  - the result card counts `:435-443`;
  - the StatStrip, the progress bar and the photo box `:547-596`;
  - the row mapping `:351`;
  - `getEvidenceSummary` `:900-965` goes.
- Modify: `src/lib/audit-rounds-list-rules.ts:166-167` (a comment naming the checklist's new home).
- Test:
  - `tests/audit-round-page-rules.test.ts` (new)
  - `tests/audit-round-page-data.test.ts` (new, runtime with a Prisma stand-in)
  - `tests/performance-route-instrumentation.test.ts:35-38` (a new entry after it)
  - `tests/audit-round-counts.test.ts:93-106` (rewritten)
  - `tests/audit-round-result-drilldown.test.ts:275-276`, `:373-377` (rewritten)
  - `tests/audit-round-cancellation.test.ts:99` (rewritten)
  - `tests/audit-round-exports.test.ts` (Task 2's round-page test: the four pins this task moves into the data module, rewritten)

**Interfaces:**
- Consumes (Task 1, `src/lib/audit-round-result-filters.ts`):
  - `type AuditRoundListFilters`
  - `parseAuditRoundListFilters(params)`; `parseAuditRoundListFilters({})` is the round-wide default (result `all`, every filter null, search `""`)
  - `buildAuditRoundItemWhere(filters & { roundId; shownCategoryIds? })`
  - `foldAuditRoundResultCounts(rows: { auditStatus; auditResult; count }[]): { all; pending; found; mismatch; notFound; outOfScope }`
  - `auditFindingFields`, `type AuditFindingField`, `auditFindingTypeByField`, `auditCountedFindingReviewStatuses`
  - `buildAuditRoundPageHref(locale, roundId, filters, overrides?)` (the stale-filter redirect, P2-R31)
- Consumes (Task 2):
  - `findAuditRoundSearchLocationIds(roundId: string, search: string): Promise<string[]>` and `countAuditRoundItemCategories(itemWhere: Prisma.AuditItemWhereInput): Promise<Array<{ categoryId: string; count: number }>>` (rows in `categoryId` order), both in `src/lib/audit-round-list-lookups.ts` (P2-R25);
  - in the page: `resultListState` and `itemFilters` (Task 1's names, kept by Task 2), and the single item list (out-of-scope on items). This task replaces Task 2's `resultWhereInput` / `resultItemWhere` lines and leaves `resolveAuditRoundListWhereInput` to the exports.
- Consumes (plan 1 and before):
  - `chunkAuditIds`, `withAuditRoundOwnItems`, `isAuditRoundOwnItem`, `foldTopCategories` (`src/lib/audit-round-counts-rules.ts`)
  - `openAuditFindingActionStatuses` (`src/lib/audit-finding-filters.ts:29`)
  - `buildAuditCorrectionHistoryByItemId`, `type AuditCorrectionHistoryItem` (`src/lib/audit-correction-history.ts:54`)
  - `buildFindingValueLabels` (`src/lib/audit-finding-labels.ts:9`)
  - `categoryPhotoChecklistKey`, `parsePhotoChecklist` (`src/lib/category-photo-checklist.ts:3,7`)
  - `isSameAuditActor` (`src/lib/audit-segregation.ts:6`), `isAuditRoundReadOnlyStatus` (`src/lib/audit-round-status.ts:7`)
  - `withPerformanceTiming(label, operation, meta)` (`src/lib/performance-timing.ts:25`)
- Produces, in `src/lib/audit-round-close.ts`:
  - `type AuditRoundCloseChecklist = { pendingItems: number; pendingFindings: number; openActions: number; canClose: boolean }`
  - `getAuditRoundCloseChecklist(auditRoundId: string): Promise<AuditRoundCloseChecklist>`: the route's `getCloseChecklist` body, moved, with `openAuditFindingActionStatuses` in place of the same three literals.
- Produces, in `src/lib/audit-round-page-rules.ts`:
  - `AUDIT_STALE_FINDING_REVIEW_REMARK = "ยกเลิกเพราะแก้ผลตรวจ"` (the scan route's `staleFindingReviewRemark`, `scan/route.ts:44`)
  - `auditSystemFindingDecisionActions = ["component_confirmed_with_parent_mismatch_resolved", "found_later_by_component_confirmation", "found_later_by_audit_scan"] as const`
  - `auditPersonDecidedFindingWhere: Prisma.AuditFindingWhereInput`
  - `auditRoundPersonDecidedFindingWhere(roundId: string): Prisma.AuditFindingWhereInput`: the round's findings a person decided, step 2's "พิจารณาแล้ว m" (P2-R26)
  - `auditRoundAnyFieldFindingWhere: Prisma.AuditItemWhereInput`
  - `hasMultipleAuditFieldFindings(counts: Readonly<Record<AuditFindingField, number>>, distinctItems: number): boolean`
  - `formatAuditUserLabel(user: { username: string; displayName: string } | null | undefined, fallbackId: string | null): string | null`
  - `type AuditRoundCategoryCount = { id: string; count: number }`
  - `type AuditRoundCategoryChip = { id: string; code: string; name: string; count: number }`
  - `type AuditRoundCategoryChips = { visible: boolean; all: number; top: AuditRoundCategoryChip[]; other: { categories: number; count: number }; selected: AuditRoundCategoryChip | null }` (`all` is every row's count, "ทุกหมวดหมู่ N")
  - `auditRoundTopCategoryIds(rows: readonly AuditRoundCategoryCount[]): string[]`
  - `buildAuditRoundCategoryChips({ rows, names, selectedCategoryId, topIds }: { rows: readonly AuditRoundCategoryCount[]; names: ReadonlyMap<string, { code: string; name: string }>; selectedCategoryId: string | null; topIds?: readonly string[] }): AuditRoundCategoryChips` (`topIds`: the six ranked over every result, P2-R11; without it the six are folded from `rows`)
  - `type AuditRoundEvidenceItem = { assetId: string; categoryId: string; auditStatus: string; auditResult: string | null }`
  - `type AuditRoundEvidence = { checked: number; withPhoto: number; withoutPhoto: number; checklistComplete: number; checklistIncomplete: number }`
  - `foldAuditRoundEvidence({ items, attachmentNamesByAssetId, checklistByCategoryId }: { items: readonly AuditRoundEvidenceItem[]; attachmentNamesByAssetId: ReadonlyMap<string, readonly string[]>; checklistByCategoryId: ReadonlyMap<string, readonly string[]> }): AuditRoundEvidence`
  - `resolveAuditRoundRowChecker(item: { auditResult: string | null; scannedBy: string | null; scannedAt: Date | null; findings: readonly { findingType: string; reportedBy: string; reportedAt: Date }[] }): { userId: string; at: Date } | null`
  - `listAuditRoundMissingComponents(links: readonly { componentAsset: { id: string; assetTag: string; name: string; auditItems: readonly { id: string }[] } }[]): { id: string; assetTag: string; name: string }[]`
- Produces, in `src/lib/audit-round-page-data.ts`:
  - `type AuditRoundPageDataInput = { roundId: string; filters: AuditRoundListFilters; page: number; pageSize: number; user: { id: string } }`
  - `getAuditRoundPageData(input: AuditRoundPageDataInput)`. It returns `null` for a missing or inactive round, else:
    - `round`: `{ id, auditNo, name, status, startDate, endDate, createdBy, cancelledAt, cancelledBy, cancelReason, createdByLabel: string | null, cancelledByLabel: string | null }`
    - `resultCard`: the round-wide fold, `{ all, pending, found, mismatch, notFound, outOfScope }`
    - `resultChips`: the fold within the filters, result not applied, `{ all, pending, found, mismatch, notFound, outOfScope, pendingReview }`
    - `categoryChips: AuditRoundCategoryChips`
    - `fieldBars: { counts: Record<AuditFindingField, number>; distinctItems: number; multipleFields: boolean }`
    - `componentsMissing: number` (round-wide) and `componentsMissingInFilters: number`
    - `steps`:
      - `walk: { checked, total, left }`
      - `review: { pendingFindings, decidedFindings }`: findings, so they equal the findings page the step's links open (P2-R26). `pendingFindings` is the close checklist's own count (`{ auditRoundId, reviewStatus: "pending" }`, the where `buildAuditFindingWhere` gives `status=pending&roundId=`); `decidedFindings` counts `auditRoundPersonDecidedFindingWhere(roundId)`.
      - `close: { checklist: AuditRoundCloseChecklist; openedByViewer: boolean; canClose: boolean }`
    - `evidence: AuditRoundEvidence`
    - `cancelImpact: { pendingItems, processedItems, pendingFindings, approvedFindings, openActions, scanHistoryRows }`
    - `rows`: each item with its asset, its `findings`, `correctionHistory: AuditCorrectionHistoryItem[]`, `missingComponents`, `hasPhoto: boolean | null` and `checkedBy: { label: string; at: Date } | null`
    - `total: number`
    - `findingValueLabels: Map<string, string>`
    - `filterNames: { company: { code; nameTh } | null; branch: { name; company: { code } } | null; category: { code; name } | null }`
  - `type AuditRoundPageData = NonNullable<Awaited<ReturnType<typeof getAuditRoundPageData>>>`, `type AuditRoundPageRow = AuditRoundPageData["rows"][number]`
- Produces, in the page (Tasks 4-5 read these names):
  - `const { page, pageSize, ...filters } = resultListState` (`filters: AuditRoundListFilters`; Task 5 folds the destructure into the parse and retires `resultListState`);
  - `data`, `round`, `resultItems`, `filterCompany`, `filterBranch`, `filterCategory`, `isRoundCreator`, `isRoundReadOnly`, `canExportRound`, `cancelImpact`;
  - the stale-filter redirect through `buildAuditRoundPageHref` (P2-R31; Task 5 adds no other).
- For later tasks:
  - Task 4 derives the three step states from `steps` (`getLinearStepStates`, `src/lib/step-states.ts:9`); this task computes no state.
  - Task 5 picks the field findings it shows from `row.findings` (pending and approved, P2-R1) and formats them with `formatFindingValue(type, value, data.findingValueLabels)`.
  - The room lookup is Task 2's; Task 6 reuses it for the pending search (P2-R25).

- [ ] **Step 1: Write the failing tests**

`tests/audit-round-page-rules.test.ts` (new):

```ts
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
  foldAuditRoundEvidence,
  formatAuditUserLabel,
  hasMultipleAuditFieldFindings,
  listAuditRoundMissingComponents,
  resolveAuditRoundRowChecker,
} from "../src/lib/audit-round-page-rules.ts"

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
```

`tests/audit-round-page-data.test.ts` (new). It loads the server modules with a Prisma stand-in, the pattern of `tests/master-data-record-status.test.ts:113-139`. Every expected where comes from Task 1's builder, so a count that equals its list is checked by value:

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"

import { withAuditRoundOwnItems } from "../src/lib/audit-round-counts-rules.ts"
import { auditRoundAnyFieldFindingWhere, auditRoundPersonDecidedFindingWhere } from "../src/lib/audit-round-page-rules.ts"
import { buildAuditRoundItemWhere, parseAuditRoundListFilters } from "../src/lib/audit-round-result-filters.ts"

type Args = { where?: unknown; by?: readonly string[]; skip?: number; take?: number; orderBy?: unknown; select?: unknown; include?: unknown }
type Call = { call: string; args: Args }
const state: { calls: Call[]; respond: (call: string, args: Args) => unknown } = { calls: [], respond: () => undefined }
Object.assign(globalThis, { __roundPageData: state })

const stubs = new Map<string, string>([
  ["@/lib/db", `
    const state = () => globalThis.__roundPageData
    const model = (name) => new Proxy({}, {
      get: (_, method) => async (args) => {
        const call = name + "." + String(method)
        state().calls.push({ call, args: args ?? {} })
        const value = state().respond(call, args ?? {})
        if (value !== undefined) return value
        if (method === "count") return 0
        if (method === "findMany" || method === "groupBy") return []
        return null
      },
    })
    export const prisma = new Proxy({}, { get: (_, key) => model(String(key)) })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>
const { getAuditRoundPageData } = await load<typeof import("../src/lib/audit-round-page-data.ts")>("src/lib/audit-round-page-data.ts")
const { getAuditRoundCloseChecklist } = await load<typeof import("../src/lib/audit-round-close.ts")>("src/lib/audit-round-close.ts")

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const round = {
  id: "round-1", auditNo: "AUD-2026-0007", name: "ตรวจนับห้อง IT", status: "open",
  startDate: new Date("2026-10-01T00:00:00.000Z"), endDate: new Date("2026-10-31T00:00:00.000Z"),
  createdBy: "user-opener", cancelledAt: null, cancelledBy: null, cancelReason: null,
}
type ItemWhereInput = Parameters<typeof buildAuditRoundItemWhere>[0]
const itemWhere = (params: Record<string, string>, overrides: Partial<ItemWhereInput> = {}) =>
  buildAuditRoundItemWhere({ ...parseAuditRoundListFilters(params), ...overrides, roundId: "round-1" })
const roundWide = (overrides: Partial<ItemWhereInput>) => itemWhere({}, overrides)
const counted = (rows: Array<[string, string | null, number]>) => rows.map(([auditStatus, auditResult, count]) => ({ auditStatus, auditResult, _count: { _all: count } }))
const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const hasWhere = (call: string, where: unknown) => callsTo(call).some((args) => isDeepStrictEqual(args.where, where))
const listCall = () => callsTo("auditItem.findMany").find((args) => args.skip !== undefined)
const ids = (args: Args | undefined, key: "id" | "assetId") => (args?.where as Record<string, { in: string[] }>)[key].in
const loadPage = (params: Record<string, string> = {}, options: { page?: number; userId?: string } = {}) =>
  getAuditRoundPageData({ roundId: "round-1", filters: parseAuditRoundListFilters(params), page: options.page ?? 1, pageSize: 25, user: { id: options.userId ?? "user-head" } })

beforeEach(() => {
  state.calls = []
  state.respond = (call) => (call === "auditRound.findFirst" ? round : undefined)
})

test("a missing round reads as no data and loads nothing else; the round is read without its items (spec §8, recon RP §1)", async () => {
  state.respond = () => undefined
  assert.equal(await loadPage(), null)
  assert.deepEqual(state.calls.map((entry) => entry.call), ["auditRound.findFirst"])
  assert.deepEqual(callsTo("auditRound.findFirst")[0], {
    where: { id: "round-1", isActive: true },
    select: { id: true, auditNo: true, name: true, status: true, startDate: true, endDate: true, createdBy: true, cancelledAt: true, cancelledBy: true, cancelReason: true },
  })
})

test("the result card and the walk are round-wide over the own items, out-of-scope finds apart: พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด (spec §5, §8, P2-R2)", async () => {
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditItem.groupBy" && isDeepStrictEqual(args.where, { auditRoundId: "round-1" })) {
      return counted([["pending", null, 5], ["scanned", "found", 6], ["scanned", "confirmed_with_parent", 1], ["reviewed", "wrong_location", 1], ["reviewed", null, 1], ["reviewed", "not_found", 1], ["reviewed", "out_of_scope", 3]])
    }
    if (call === "auditFinding.count" && isDeepStrictEqual(args.where, { auditRoundId: "round-1", reviewStatus: "approved" })) return 4
    if (call === "auditScanHistory.count") return 12
    return undefined
  }
  const data = await loadPage({ categoryId: "cat-desk" })
  assert.ok(data)
  assert.deepEqual(callsTo("auditItem.groupBy").find((args) => isDeepStrictEqual(args.where, { auditRoundId: "round-1" }))?.by, ["auditStatus", "auditResult"])
  assert.deepEqual(data.resultCard, { all: 15, pending: 5, found: 7, mismatch: 2, notFound: 1, outOfScope: 3 })
  assert.equal(data.resultCard.found + data.resultCard.mismatch + data.resultCard.notFound + data.resultCard.pending, data.resultCard.all)
  assert.deepEqual(data.steps.walk, { checked: 10, total: 15, left: 5 })
  // The cancel dialog's work done stays the API's count (route.ts getCancellationImpact): every non-pending item.
  assert.deepEqual(data.cancelImpact, { pendingItems: 5, processedItems: 13, pendingFindings: 0, approvedFindings: 4, openActions: 0, scanHistoryRows: 12 })
  assert.ok(hasWhere("auditScanHistory.count", { auditRoundId: "round-1" }))
})

test("the list, its total, the result chips, the category chips and the ส่วนควบไม่ครบ chip each count with the list's own where (counts equal lists, spec §5)", async () => {
  const params = { result: "found", categoryId: "cat-desk", companyId: "co-1" }
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "company.findUnique") return { code: "GLT", nameTh: "จีลิงค์" }
    if (call === "auditItem.groupBy" && isDeepStrictEqual(args.where, itemWhere(params, { result: "all" }))) return counted([["pending", null, 2], ["scanned", "found", 3]])
    if (call !== "auditItem.count") return undefined
    if (isDeepStrictEqual(args.where, itemWhere(params, { result: "out_of_scope" }))) return 1
    if (isDeepStrictEqual(args.where, itemWhere(params, { result: "pending_review" }))) return 4
    if (isDeepStrictEqual(args.where, itemWhere(params, { components: "missing" }))) return 1
    if (isDeepStrictEqual(args.where, itemWhere(params))) return 30
    return undefined
  }
  const data = await loadPage(params, { page: 2 })
  assert.ok(data)
  const list = listCall()
  assert.deepEqual(list?.where, itemWhere(params))
  assert.deepEqual(list?.orderBy, [{ auditStatus: "asc" }, { createdAt: "desc" }, { id: "asc" }])
  assert.equal(list?.skip, 25)
  assert.equal(list?.take, 25)
  assert.equal(data.total, 30)
  assert.deepEqual(data.resultChips, { all: 5, pending: 2, found: 3, mismatch: 0, notFound: 0, outOfScope: 1, pendingReview: 4 })
  assert.equal(data.componentsMissingInFilters, 1)
  const categories = callsTo("asset.groupBy")
  assert.equal(categories.length, 2, "result found: one ranking over every result, one count within it (a single call only when result is all)")
  assert.deepEqual(categories[0].by, ["categoryId"])
  assert.deepEqual(categories[0].where, { auditItems: { some: itemWhere(params, { categoryId: null, result: "all" }) } }, "the six are ranked over every result (P2-R11)")
  assert.deepEqual(categories[1].where, { auditItems: { some: itemWhere(params, { categoryId: null }) } }, "the category chips count within every other filter")
  assert.deepEqual(callsTo("company.findUnique")[0], { where: { id: "co-1" }, select: { code: true, nameTh: true } })
  assert.deepEqual(data.filterNames.company, { code: "GLT", nameTh: "จีลิงค์" })
  assert.equal(callsTo("branch.findUnique").length, 0)
  assert.deepEqual(callsTo("assetCategory.findMany")[0], { where: { id: { in: ["cat-desk"] } }, select: { id: true, code: true, name: true } })
  assert.equal(data.filterNames.category, null, "an unknown category: the page redirects without it")
})

test("อื่น ๆ is every category but the six shown: the list, its total and the result chips read the same six (P2-R11)", async () => {
  const sizes: Record<string, number> = { c1: 40, c2: 30, c3: 20, c4: 10, c5: 5, c6: 5, c7: 3, c8: 1 }
  state.respond = (call) => {
    if (call === "auditRound.findFirst") return round
    if (call === "asset.groupBy") return Object.entries(sizes).reverse().map(([categoryId, count]) => ({ categoryId, _count: { _all: count } }))
    if (call === "assetCategory.findMany") return Object.keys(sizes).map((id) => ({ id, code: id.toUpperCase(), name: `หมวดหมู่ ${id}` }))
    return undefined
  }
  const data = await loadPage({ categoryId: "other" })
  assert.ok(data)
  const top = ["c1", "c2", "c3", "c4", "c5", "c6"]
  assert.deepEqual(listCall()?.where, itemWhere({ categoryId: "other" }, { shownCategoryIds: top }))
  assert.ok(hasWhere("auditItem.count", itemWhere({ categoryId: "other" }, { shownCategoryIds: top })), "the total")
  assert.ok(hasWhere("auditItem.groupBy", itemWhere({ categoryId: "other" }, { result: "all", shownCategoryIds: top })), "the result chips")
  assert.deepEqual(callsTo("assetCategory.findMany")[0], { where: { id: { in: top } }, select: { id: true, code: true, name: true } })
  assert.deepEqual(data.categoryChips.top.map((chip) => [chip.id, chip.count]), [["c1", 40], ["c2", 30], ["c3", 20], ["c4", 10], ["c5", 5], ["c6", 5]])
  assert.deepEqual(data.categoryChips.other, { categories: 2, count: 4 })
  assert.equal(data.categoryChips.selected, null)
  assert.equal(data.filterNames.category, null)
  assert.equal(callsTo("asset.groupBy").length, 1, "result all: the ranking rows are the chip counts")
})

test("อื่น ๆ under another result reuses the six ranked over every result, so each result chip counts against the six its link opens (P2-R11)", async () => {
  const overAll: Record<string, number> = { c1: 40, c2: 30, c3: 20, c4: 10, c5: 5, c6: 5, c7: 3, c8: 1 }
  const notFound: Record<string, number> = { c7: 9, c2: 2, c8: 1 }
  const rowsOf = (sizes: Record<string, number>) => Object.entries(sizes).reverse().map(([categoryId, count]) => ({ categoryId, _count: { _all: count } }))
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "asset.groupBy") {
      const where = (args.where as { auditItems: { some: unknown } }).auditItems.some
      return isDeepStrictEqual(where, itemWhere({ result: "not_found" }, { categoryId: null })) ? rowsOf(notFound) : rowsOf(overAll)
    }
    if (call === "assetCategory.findMany") return Object.keys(overAll).map((id) => ({ id, code: id.toUpperCase(), name: `หมวดหมู่ ${id}` }))
    return undefined
  }
  const data = await loadPage({ categoryId: "other", result: "not_found" })
  assert.ok(data)
  const top = ["c1", "c2", "c3", "c4", "c5", "c6"]
  assert.equal(callsTo("asset.groupBy").length, 2)
  assert.deepEqual(listCall()?.where, itemWhere({ categoryId: "other", result: "not_found" }, { shownCategoryIds: top }))
  assert.ok(hasWhere("auditItem.groupBy", itemWhere({ categoryId: "other" }, { result: "all", shownCategoryIds: top })), "the result chips read the same six")
  assert.deepEqual(data.categoryChips.top.map((chip) => [chip.id, chip.count]), [["c1", 0], ["c2", 2], ["c3", 0], ["c4", 0], ["c5", 0], ["c6", 0]])
  assert.deepEqual(data.categoryChips.other, { categories: 2, count: 10 }, "c7 and c8, within ไม่พบ")
})

test("the list's where carries the rooms Task 2's lookup names: the item's expected room by code or name (bug 11, P2-R5, P2-R25)", async () => {
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditItem.groupBy" && isDeepStrictEqual(args.by, ["expectedLocationId"])) return [{ expectedLocationId: "loc-1" }, { expectedLocationId: "loc-7" }]
    if (call === "location.findMany") return ids(args, "id").includes("loc-7") ? [{ id: "loc-7" }] : []
    return undefined
  }
  const data = await loadPage({ search: "B-1" })
  assert.ok(data)
  // One lookup, Task 2's; its chunks and its round-bound room list are pinned in tests/audit-round-list-lookups.test.ts.
  assert.equal(callsTo("location.findMany").length, 1)
  assert.deepEqual(listCall()?.where, itemWhere({ search: "B-1" }, { expectedLocationIds: ["loc-7"] }))
})

test("no search reads no room; a search that names no room leaves the room ids out", async () => {
  await loadPage()
  assert.equal(callsTo("location.findMany").length, 0)
  assert.equal(callsTo("auditItem.groupBy").some((args) => isDeepStrictEqual(args.by, ["expectedLocationId"])), false)
  state.respond = (call) => (call === "auditRound.findFirst" ? round : call === "auditItem.groupBy" ? [] : undefined)
  state.calls = []
  await loadPage({ search: "ZZZ" })
  assert.deepEqual(listCall()?.where, itemWhere({ search: "ZZZ" }))
})

test("ไม่ตรงเรื่องอะไร and เครื่องที่ส่วนควบไม่ครบ are round-wide, each the where of the list it opens; the review step counts the round's findings, the rows of the findings page (P2-R1, P2-R16, P2-R18, P2-R26)", async () => {
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditFinding.count") {
      // The findings page's where for status=pending&roundId= (buildAuditFindingWhere), and the person-decided rule.
      if (isDeepStrictEqual(args.where, { auditRoundId: "round-1", reviewStatus: "pending" })) return 5
      if (isDeepStrictEqual(args.where, auditRoundPersonDecidedFindingWhere("round-1"))) return 3
      return undefined
    }
    if (call !== "auditItem.count") return undefined
    if (isDeepStrictEqual(args.where, roundWide({ field: "department" }))) return 1
    if (isDeepStrictEqual(args.where, roundWide({ field: "condition" }))) return 1
    if (isDeepStrictEqual(args.where, withAuditRoundOwnItems({ AND: [{ auditRoundId: "round-1" }, auditRoundAnyFieldFindingWhere] }))) return 1
    if (isDeepStrictEqual(args.where, roundWide({ components: "missing" }))) return 2
    return undefined
  }
  // Active filters on the list: the cards ignore every one of them.
  const data = await loadPage({ categoryId: "cat-desk", companyId: "co-1", result: "not_found" })
  assert.ok(data)
  for (const field of ["location", "department", "custodian", "condition"] as const) assert.ok(hasWhere("auditItem.count", roundWide({ field })), field)
  assert.deepEqual(data.fieldBars, { counts: { location: 0, department: 1, custodian: 0, condition: 1 }, distinctItems: 1, multipleFields: true })
  assert.equal(data.componentsMissing, 2)
  // Step 2 counts findings (P2-R26): รอ 5 is the close checklist's own count, พิจารณาแล้ว 3 the findings a person decided.
  assert.deepEqual(data.steps.review, { pendingFindings: 5, decidedFindings: 3 })
  assert.equal(data.steps.close.checklist.pendingFindings, 5)
  assert.equal(hasWhere("auditItem.count", roundWide({ result: "pending_review" })), false, "no item count for step 2")
})

test("step 3 reads the close API's own checklist; the opener is told and never offered the close (spec §8, R2)", async () => {
  const ready = { checklist: { pendingItems: 0, pendingFindings: 0, openActions: 0, canClose: true }, openedByViewer: false, canClose: true }
  assert.deepEqual((await loadPage())?.steps.close, ready)
  assert.ok(hasWhere("auditItem.count", { auditRoundId: "round-1", auditStatus: "pending" }))
  assert.ok(hasWhere("auditFinding.count", { auditRoundId: "round-1", reviewStatus: "pending" }))
  assert.ok(hasWhere("auditFinding.count", { auditRoundId: "round-1", actionStatus: { in: ["planned", "in_progress", "done"] } }))
  assert.deepEqual((await loadPage({}, { userId: "user-opener" }))?.steps.close, { ...ready, openedByViewer: true, canClose: false })
  state.respond = (call) => (call === "auditRound.findFirst" ? { ...round, status: "closed" } : undefined)
  assert.equal((await loadPage())?.steps.close.canClose, false)
  state.respond = (call, args) => (call === "auditFinding.count" && isDeepStrictEqual(args.where, { auditRoundId: "round-1", reviewStatus: "pending" }) ? 2 : undefined)
  assert.deepEqual(await getAuditRoundCloseChecklist("round-1"), { pendingItems: 0, pendingFindings: 2, openActions: 0, canClose: false })
})

test("รูปหลักฐาน reads the photos of the checked items in chunks of 2,000 and counts the own ones (bug 10, R17)", async () => {
  const checked = Array.from({ length: 2000 }, (_, index) => ({ assetId: `a${index}`, auditStatus: "scanned", auditResult: "found", asset: { categoryId: "desk" } }))
  const outOfScope = { assetId: "x1", auditStatus: "reviewed", auditResult: "out_of_scope", asset: { categoryId: "desk" } }
  const photos = [{ assetId: "a0", originalName: "ด้านหน้า - 1.jpg" }, { assetId: "a1", originalName: "อื่น ๆ.jpg" }, { assetId: "x1", originalName: "ด้านหน้า - 2.jpg" }]
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditItem.findMany" && args.skip === undefined) return [...checked, outOfScope]
    if (call === "attachment.findMany") return photos.filter((photo) => ids(args, "assetId").includes(photo.assetId))
    if (call === "systemSetting.findMany") return [{ key: "asset_category_photo_checklist:desk", value: JSON.stringify(["ด้านหน้า"]) }]
    return undefined
  }
  const data = await loadPage()
  assert.ok(data)
  assert.deepEqual(callsTo("auditItem.findMany").find((args) => args.skip === undefined), {
    where: { auditRoundId: "round-1", auditStatus: { not: "pending" } },
    select: { assetId: true, auditStatus: true, auditResult: true, asset: { select: { categoryId: true } } },
  })
  const attachments = callsTo("attachment.findMany")
  assert.deepEqual(attachments.map((args) => ids(args, "assetId").length), [2000, 1])
  assert.deepEqual(attachments[1], { where: { assetId: { in: ["x1"] }, module: "asset", isActive: true, uploadedAt: { gte: round.startDate } }, select: { assetId: true, originalName: true } })
  assert.deepEqual(callsTo("systemSetting.findMany")[0], { where: { key: { in: ["asset_category_photo_checklist:desk"] } }, select: { key: true, value: true } })
  assert.deepEqual(data.evidence, { checked: 2000, withPhoto: 2, withoutPhoto: 1998, checklistComplete: 1, checklistIncomplete: 1999 })
})

test("each row carries who checked it and when, its photo, its missing components and its own correction history, read for the page's items only (spec §8, P2-R9, P2-R17)", async () => {
  const scannedAt = new Date("2026-10-07T02:00:00.000Z")
  const reportedAt = new Date("2026-10-08T03:00:00.000Z")
  const asset = (id: string, parentComponents: unknown[] = []) => ({ id, assetTag: `TAG-${id}`, name: id, currentLocation: { code: "R1", name: "ห้อง 1" }, custodian: null, condition: null, parentComponents, installedInLinks: [] })
  const parent = {
    id: "item-1", assetId: "asset-1", auditStatus: "scanned", auditResult: "found", scannedBy: "user-a", scannedAt, findings: [],
    asset: asset("asset-1", [
      { componentRole: "adapter", slotNo: "1", componentAsset: { id: "asset-c1", assetTag: "GRL-COM-26-0017-01", name: "Adapter 65W", auditItems: [{ id: "item-c1" }] } },
      { componentRole: "monitor", slotNo: "2", componentAsset: { id: "asset-c2", assetTag: "GRL-COM-26-0017-02", name: "Monitor", auditItems: [] } },
    ]),
  }
  const missing = {
    id: "item-2", assetId: "asset-2", auditStatus: "reviewed", auditResult: "not_found", scannedBy: null, scannedAt: null, asset: asset("asset-2"),
    findings: [{ id: "f-1", findingType: "not_found", expectedValue: "{\"assetTag\":\"TAG-asset-2\"}", actualValue: null, reviewStatus: "pending", actionTaken: "pending_investigation", reportedBy: "user-b", reportedAt }],
  }
  const waiting = { id: "item-3", assetId: "asset-3", auditStatus: "pending", auditResult: null, scannedBy: null, scannedAt: null, findings: [], asset: asset("asset-3") }
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditItem.findMany" && args.skip !== undefined) return [parent, missing, waiting]
    if (call === "auditItem.findMany") return [parent, missing].map((item) => ({ assetId: item.assetId, auditStatus: item.auditStatus, auditResult: item.auditResult, asset: { categoryId: "desk" } }))
    if (call === "attachment.findMany") return [{ assetId: "asset-1", originalName: "ด้านหน้า - 1.jpg" }]
    if (call === "systemLog.findMany") {
      return [{ id: "log-1", action: "scan_result_corrected", module: "audit", recordId: "item-1", oldValue: JSON.stringify({ auditResult: "wrong_location" }), newValue: JSON.stringify({ auditResult: "found", assetId: "asset-1" }), remark: null, createdAt: new Date("2026-10-09T01:00:00.000Z"), user: { username: "somchai", displayName: "สมชาย ใจดี" } }]
    }
    if (call === "user.findMany") return [{ id: "user-opener", username: "opener", displayName: "ผู้เปิด" }, { id: "user-a", username: "somchai", displayName: "สมชาย ใจดี" }, { id: "user-b", username: "suda", displayName: "suda" }]
    return undefined
  }
  const data = await loadPage()
  assert.ok(data)
  assert.deepEqual(callsTo("systemLog.findMany")[0], {
    where: { module: "audit", action: "scan_result_corrected", recordId: { in: ["item-1", "item-2", "item-3"] } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: { user: { select: { username: true, displayName: true } } },
  }, "no take: every item on the page keeps its latest correction (P2-R9)")
  assert.deepEqual([...ids(callsTo("user.findMany")[0], "id")].sort(), ["user-a", "user-b", "user-opener"])
  assert.equal(data.round.createdByLabel, "ผู้เปิด (opener)")
  assert.equal(data.round.cancelledByLabel, null)
  assert.deepEqual(data.rows.map((row) => row.checkedBy), [{ label: "สมชาย ใจดี (somchai)", at: scannedAt }, { label: "suda", at: reportedAt }, null])
  assert.deepEqual(data.rows.map((row) => row.hasPhoto), [true, false, null])
  assert.deepEqual(data.rows[0].missingComponents, [{ id: "asset-c1", assetTag: "GRL-COM-26-0017-01", name: "Adapter 65W" }])
  assert.deepEqual(data.rows.map((row) => row.correctionHistory.length), [1, 0, 0])
  assert.equal(data.rows[0].correctionHistory[0].userLabel, "สมชาย ใจดี")
})

test("the close API and the round page read one checklist; the page reads its data from one timed load and runs no query itself", () => {
  const route = read("src/app/api/audit-rounds/[id]/route.ts")
  assert.match(route, /^import \{ getAuditRoundCloseChecklist \} from "@\/lib\/audit-round-close"$/m)
  assert.match(route, /const checklist = await getAuditRoundCloseChecklist\(id\)/)
  assert.doesNotMatch(route, /function getCloseChecklist/)
  assert.match(read("src/lib/audit-round-close.ts"), /export async function getAuditRoundCloseChecklist\(auditRoundId: string\): Promise<AuditRoundCloseChecklist>/)

  const data = read("src/lib/audit-round-page-data.ts")
  assert.match(data, /export async function getAuditRoundPageData\(\{ roundId, filters, page, pageSize, user \}: AuditRoundPageDataInput\)/)
  assert.match(data, /getAuditRoundCloseChecklist\(roundId\)/)
  // One room lookup, Task 2's (P2-R25): no search file of this task's own.
  assert.match(data, /^import \{ countAuditRoundItemCategories, findAuditRoundSearchLocationIds \} from "@\/lib\/audit-round-list-lookups"$/m)
  assert.equal(existsSync("src/lib/audit-round-search.ts"), false)
  assert.doesNotMatch(data, /prisma\.location\.findMany|prisma\.asset\.groupBy/)
  assert.match(data, /processedItems: walk\.checked \+ resultCard\.outOfScope,/)
  assert.match(data, /auditItems: \{ where: \{ auditRoundId: roundId, auditResult: "not_found" \}, select: \{ id: true \} \}/)
  assert.doesNotMatch(data, /take: 100/)
  assert.doesNotMatch(data, /\.(create|update|upsert|delete)(Many)?\(|\$executeRaw|\$queryRaw/)

  const page = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx")
  // The page's names from here on (Tasks 4-5): filters, page and pageSize; Task 5 folds the destructure into the parse.
  assert.match(page, /const \{ page, pageSize, \.\.\.filters \} = /)
  assert.match(page, /await withPerformanceTiming\(\n\s+"audit-round\.page-data",\n\s+\(\) => getAuditRoundPageData\(\{ roundId: id, filters, page, pageSize, user \}\),/)
  assert.match(page, /if \(!data\) notFound\(\)/)
  assert.doesNotMatch(page, /from "@\/lib\/db"|\bprisma\.|resolveAuditRoundListWhereInput/)
  assert.doesNotMatch(page, /function getEvidenceSummary|getAuditRoundCounts|correctionHistoryByItemId/)
  // The stale category redirect is this task's, through the one href builder (P2-R31).
  assert.match(page, /const staleCategory = Boolean\(filters\.categoryId && filters\.categoryId !== "other" && !filterCategory\)/)
  assert.match(page, /redirect\(buildAuditRoundPageHref\(locale, round\.id, filters, \{ companyId: filterCompany \? filters\.companyId : null, branchId: filterBranch \? filters\.branchId : null, categoryId: staleCategory \? null : filters\.categoryId, pageSize, returnTo: returnToHref \}\)\)/)
})
```

`tests/performance-route-instrumentation.test.ts`: after the rounds-list entry (`:35-38`) add:

```ts
  {
    file: "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx",
    labels: ["audit-round.page-data"],
  },
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `node --test tests/audit-round-page-rules.test.ts tests/audit-round-page-data.test.ts tests/performance-route-instrumentation.test.ts`
Expected: FAIL.
- `audit-round-page-rules.test.ts`: `src/lib/audit-round-page-rules.ts` does not exist (import error).
- `audit-round-page-data.test.ts`: the same, for `src/lib/audit-round-page-rules.ts` and `src/lib/audit-round-page-data.ts`.
- `performance-route-instrumentation.test.ts`: the round page has no `withPerformanceTiming`.

- [ ] **Step 3: Implement**

- **`src/lib/audit-round-close.ts`** (new, server). Move the route's `getCloseChecklist` (`route.ts:165-183`) here, unchanged except its name, its type and the shared action list:

  ```ts
  import { prisma } from "@/lib/db"
  import { openAuditFindingActionStatuses } from "@/lib/audit-finding-filters"

  export type AuditRoundCloseChecklist = { pendingItems: number; pendingFindings: number; openActions: number; canClose: boolean }

  // The close API's checklist (group 2 spec §8 step 3, R2): nothing pending, no finding awaiting a decision, no open action
  // plan (done included). The PATCH close and the round page read this one function, so the card lists what the API
  // checks. The opener rule is apart (isSameAuditActor): the route refuses it before this runs, the page names it.
  export async function getAuditRoundCloseChecklist(auditRoundId: string): Promise<AuditRoundCloseChecklist> {
    const [pendingItems, pendingFindings, openActions] = await Promise.all([
      prisma.auditItem.count({ where: { auditRoundId, auditStatus: "pending" } }),
      prisma.auditFinding.count({ where: { auditRoundId, reviewStatus: "pending" } }),
      prisma.auditFinding.count({ where: { auditRoundId, actionStatus: { in: [...openAuditFindingActionStatuses] } } }),
    ])
    return { pendingItems, pendingFindings, openActions, canClose: pendingItems === 0 && pendingFindings === 0 && openActions === 0 }
  }
  ```
- **`src/app/api/audit-rounds/[id]/route.ts`:**
  - Add `import { getAuditRoundCloseChecklist } from "@/lib/audit-round-close"` after `:8`.
  - `:109` becomes `const checklist = await getAuditRoundCloseChecklist(id)`.
  - `:165-183` (`async function getCloseChecklist`) goes.
  - The 400 body (`{ error, checklist }`, `:111`) and the log's `newValue: { status, checklist }` (`:128`) keep the same shape.
  - `getCancellationImpact` (`:185-196`) stays.
- **`src/lib/audit-rounds-list-rules.ts:166-167`**: the comment `// The close API's checklist (\`api/audit-rounds/[id]/route.ts\` \`getCloseChecklist\`, R2)` now names `\`src/lib/audit-round-close.ts\` \`getAuditRoundCloseChecklist\``. Comment only.
- **The room search:** no file of this task's own (P2-R25). The data module imports `findAuditRoundSearchLocationIds` and `countAuditRoundItemCategories` from Task 2's `src/lib/audit-round-list-lookups.ts`, with their signatures as Task 2 wrote them.
- **`src/lib/audit-round-page-rules.ts`** (new, pure). Header comment, then:

  ```ts
  // The round page's rules (group 2 spec §5, §8): who decided a finding, the field bars' distinct items, a person's name,
  // the category chips, the photo count, who checked a row, a parent's missing components. Pure and client-safe:
  // `import type` and relative .ts imports only, so node --test imports it.
  import type { Prisma } from "@prisma/client"
  import { foldTopCategories, isAuditRoundOwnItem } from "./audit-round-counts-rules.ts"
  import { auditCountedFindingReviewStatuses, auditFindingFields, auditFindingTypeByField, type AuditFindingField } from "./audit-round-result-filters.ts"
  ```
  - `AUDIT_STALE_FINDING_REVIEW_REMARK` and `auditSystemFindingDecisionActions` as in the Interfaces. Comment: "The scan closes a finding itself in four ways. A re-scan rejects stale findings with this remark (scan/route.ts:44, :623-639). Three paths set these actionTaken values (scan/route.ts:346-357, :359-372, :466-479). None of them is a person's decision. An approval written by an approver's scan (`master_asset_updated_from_audit_scan`) is one."
  - `auditPersonDecidedFindingWhere` and `auditRoundPersonDecidedFindingWhere` are the literals the test pins. `AND`, so the round never overwrites the rule's own `AND`. Comments: "reviewRemark and actionTaken are nullable; Prisma's `not` / `notIn` drop NULL rows, so the null branch is spelled out." and, on `auditRoundPersonDecidedFindingWhere`, "Step 2's พิจารณาแล้ว counts findings, as its รอ and its button do, so the step equals the findings page it opens (P2-R26)."
  - `auditRoundAnyFieldFindingWhere`: `findingType: { in: auditFindingFields.map((field) => auditFindingTypeByField[field]) }`, `reviewStatus: { in: [...auditCountedFindingReviewStatuses] }`.
  - `hasMultipleAuditFieldFindings`: the sum of the counts is greater than `distinctItems`.
  - `formatAuditUserLabel`: no user → `fallbackId`. Otherwise `displayName === username ? username : \`${displayName} (${username})\``, the page's format today (`page.tsx:274-278`).
  - The category fold (one private helper used by both exports): sort the rows by `id` (`<`/`>`, not `localeCompare`), then `foldTopCategories(sorted, 6)`. Ties keep id order, so the six shown, and with them `categoryId=other`, are the same on every request and the same six Task 2's `resolveAuditRoundListWhereInput` leaves out of the exports (its rows come in id order too).
    - `auditRoundTopCategoryIds` returns the ids of `top`.
    - `buildAuditRoundCategoryChips`:
      - `all` is the sum of every row's count (the rows with the category not applied: "ทุกหมวดหมู่ N");
      - `top` maps each row to `{ id, code, name, count }` from `names` (`""` when a name is missing). With `topIds` (the six ranked over every result, P2-R11), `top` is those ids in that order, each with its count from `rows` (0 when it has none);
      - `other` is the fold's. With `topIds`, it is the rows of `rows` whose id is not in `topIds` (`categories` and the summed `count`);
      - `selected` is the chosen id when it is not in `top` and `names` has it, with its count from `rows` (0 when absent);
      - `visible` is `rows.length > 1` (P2-R24).
  - `foldAuditRoundEvidence`: skip an item with `auditStatus === "pending"` or `!isAuditRoundOwnItem(item)`. Count `checked` for the rest, and `withPhoto` when it has at least one attachment name. For a category with a checklist, count the item complete when every label has a name starting `"<label> - "`, else incomplete (the rule of `page.tsx:944-957`). `withoutPhoto = checked - withPhoto`.
  - `resolveAuditRoundRowChecker`: when `scannedBy` and `scannedAt` are set, return those. Else, for `auditResult === "not_found"`, take the last `not_found` finding in the array: the rows load findings in `reportedAt asc, id asc` order, so the last is the latest. Else `null`.
  - `listAuditRoundMissingComponents`: the links whose `componentAsset.auditItems` is not empty, mapped to `{ id, assetTag, name }`.
- **`src/lib/audit-round-page-data.ts`** (new, server). The tests pin every where and value. This is the shape:

  ```ts
  import type { Prisma } from "@prisma/client"
  import { prisma } from "@/lib/db"
  import { buildAuditCorrectionHistoryByItemId } from "@/lib/audit-correction-history"
  import { buildFindingValueLabels } from "@/lib/audit-finding-labels"
  import { getAuditRoundCloseChecklist } from "@/lib/audit-round-close"
  import { chunkAuditIds, withAuditRoundOwnItems } from "@/lib/audit-round-counts-rules"
  import { countAuditRoundItemCategories, findAuditRoundSearchLocationIds } from "@/lib/audit-round-list-lookups"
  import {
    auditRoundAnyFieldFindingWhere,
    auditRoundPersonDecidedFindingWhere,
    auditRoundTopCategoryIds,
    buildAuditRoundCategoryChips,
    foldAuditRoundEvidence,
    formatAuditUserLabel,
    hasMultipleAuditFieldFindings,
    listAuditRoundMissingComponents,
    resolveAuditRoundRowChecker,
  } from "@/lib/audit-round-page-rules"
  import {
    auditFindingFields,
    buildAuditRoundItemWhere,
    foldAuditRoundResultCounts,
    parseAuditRoundListFilters,
    type AuditFindingField,
    type AuditRoundListFilters,
  } from "@/lib/audit-round-result-filters"
  import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
  import { isSameAuditActor } from "@/lib/audit-segregation"
  import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"

  // The round page's data (group 2 spec §5, §8): one server load, so every number and the rows it opens come from one
  // where. The result card, the next-step card and "ไม่ตรงเรื่องอะไร" are round-wide (their links clear the other
  // filters); every chip counts within the other active filters; the list follows them all. It never writes.

  const roundSelect = {
    id: true, auditNo: true, name: true, status: true, startDate: true, endDate: true,
    createdBy: true, cancelledAt: true, cancelledBy: true, cancelReason: true,
  } satisfies Prisma.AuditRoundSelect

  function rowInclude(roundId: string) {
    return {
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          currentLocation: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
          condition: { select: { nameTh: true } },
          parentComponents: {
            where: { status: "installed", removedAt: null },
            select: {
              componentRole: true,
              slotNo: true,
              // The components' own not-found items in this round: the row's "ไม่พบ: <name> (<tag>)" (spec §8, P2-R19).
              componentAsset: { select: { id: true, assetTag: true, name: true, auditItems: { where: { auditRoundId: roundId, auditResult: "not_found" }, select: { id: true } } } },
            },
          },
          installedInLinks: {
            where: { status: "installed", removedAt: null },
            select: { componentRole: true, slotNo: true, parentAsset: { select: { id: true, assetTag: true, name: true } } },
          },
        },
      },
      // สิ่งที่ต่าง, พิจารณา and a not-found row's ตรวจโดย (Task 5).
      findings: {
        orderBy: [{ reportedAt: "asc" }, { id: "asc" }],
        select: { id: true, findingType: true, expectedValue: true, actualValue: true, reviewStatus: true, actionTaken: true, reportedBy: true, reportedAt: true },
      },
    } satisfies Prisma.AuditItemInclude
  }

  type ItemWhereInput = Parameters<typeof buildAuditRoundItemWhere>[0]
  type CountRow = { auditStatus: string; auditResult: string | null; _count: { _all: number } }
  const toCountRows = (rows: readonly CountRow[]) => rows.map((row) => ({ auditStatus: row.auditStatus, auditResult: row.auditResult, count: row._count._all }))

  export type AuditRoundPageDataInput = { roundId: string; filters: AuditRoundListFilters; page: number; pageSize: number; user: { id: string } }

  export async function getAuditRoundPageData({ roundId, filters, page, pageSize, user }: AuditRoundPageDataInput) {
    // A. The round, and the rooms the search names (the item's expected room, bug 11, P2-R5): Task 2's lookup, the one
    // the exports use (P2-R25).
    const [round, expectedLocationIds] = await Promise.all([
      prisma.auditRound.findFirst({ where: { id: roundId, isActive: true }, select: roundSelect }),
      findAuditRoundSearchLocationIds(roundId, filters.search),
    ])
    if (!round) return null
    const listFilters: AuditRoundListFilters = expectedLocationIds.length > 0 ? { ...filters, expectedLocationIds } : filters
    const roundWideFilters = parseAuditRoundListFilters({})
    const roundWideWhere = (overrides: Partial<ItemWhereInput>) => buildAuditRoundItemWhere({ ...roundWideFilters, ...overrides, roundId })

    // B. The category chips count within every other filter (spec §5). "อื่น ๆ" (categoryId=other) is every category but
    // the six shown (P2-R11), so the list, its total and the result chips need those six first. Task 2's count, the
    // exports' too, so both fold the same rows (in id order) to the same six. The six are ranked over every result (the
    // same where with no category and result all), so a result chip under อื่น ๆ counts against the same six its link
    // opens. Each chip's count is within the result in use (`categoryCounts`).
    const rankingRows = await countAuditRoundItemCategories(buildAuditRoundItemWhere({ ...listFilters, categoryId: null, result: "all", roundId }))
    const categoryRows = filters.result === "all" ? rankingRows : await countAuditRoundItemCategories(buildAuditRoundItemWhere({ ...listFilters, categoryId: null, roundId }))
    const categoryCounts = categoryRows.map((row) => ({ id: row.categoryId, count: row.count }))
    const topCategoryIds = auditRoundTopCategoryIds(rankingRows.map((row) => ({ id: row.categoryId, count: row.count })))
    const shownCategoryIds = filters.categoryId === "other" ? topCategoryIds : undefined
    const listWhere = (overrides: Partial<ItemWhereInput> = {}) => buildAuditRoundItemWhere({ ...listFilters, ...overrides, roundId, shownCategoryIds })
    const rowsWhere = listWhere()
    const selectedCategoryId = filters.categoryId && filters.categoryId !== "other" ? filters.categoryId : null
    const categoryNameIds = [...new Set([...topCategoryIds, ...(selectedCategoryId ? [selectedCategoryId] : [])])]

    // C. The list and every count, in parallel.
    const [
      [roundRows, chipRows, outOfScopeInFilters, pendingReviewInFilters, componentsMissingInFilters, items, total],
      [fieldItemCounts, fieldItems, componentsMissing, reviewDecidedFindings, checklist, approvedFindings, scanHistoryRows, evidenceItems],
      [categories, company, branch],
    ] = await Promise.all([
      Promise.all([
        prisma.auditItem.groupBy({ by: ["auditStatus", "auditResult"], where: { auditRoundId: roundId }, _count: { _all: true } }),
        prisma.auditItem.groupBy({ by: ["auditStatus", "auditResult"], where: listWhere({ result: "all" }), _count: { _all: true } }),
        prisma.auditItem.count({ where: listWhere({ result: "out_of_scope" }) }),
        prisma.auditItem.count({ where: listWhere({ result: "pending_review" }) }),
        prisma.auditItem.count({ where: listWhere({ components: "missing" }) }),
        prisma.auditItem.findMany({
          where: rowsWhere,
          orderBy: [{ auditStatus: "asc" }, { createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: rowInclude(roundId),
        }),
        prisma.auditItem.count({ where: rowsWhere }),
      ]),
      Promise.all([
        Promise.all(auditFindingFields.map((field) => prisma.auditItem.count({ where: roundWideWhere({ field }) }))),
        prisma.auditItem.count({ where: withAuditRoundOwnItems({ AND: [{ auditRoundId: roundId }, auditRoundAnyFieldFindingWhere] }) }),
        prisma.auditItem.count({ where: roundWideWhere({ components: "missing" }) }),
        // Step 2 counts findings (P2-R26): its รอ n is the checklist's pendingFindings below, the findings page's rows.
        prisma.auditFinding.count({ where: auditRoundPersonDecidedFindingWhere(roundId) }),
        getAuditRoundCloseChecklist(roundId),
        prisma.auditFinding.count({ where: { auditRoundId: roundId, reviewStatus: "approved" } }),
        prisma.auditScanHistory.count({ where: { auditRoundId: roundId } }),
        // Every checked item, out-of-scope finds included: the row photo column reads them; the count keeps own items.
        prisma.auditItem.findMany({
          where: { auditRoundId: roundId, auditStatus: { not: "pending" } },
          select: { assetId: true, auditStatus: true, auditResult: true, asset: { select: { categoryId: true } } },
        }),
      ]),
      Promise.all([
        categoryNameIds.length > 0 ? prisma.assetCategory.findMany({ where: { id: { in: categoryNameIds } }, select: { id: true, code: true, name: true } }) : Promise.resolve([]),
        // AuditItem.expectedCompanyId / expectedBranchId have no relation, so the chips' names need their own reads.
        filters.companyId ? prisma.company.findUnique({ where: { id: filters.companyId }, select: { code: true, nameTh: true } }) : Promise.resolve(null),
        filters.branchId ? prisma.branch.findUnique({ where: { id: filters.branchId }, select: { name: true, company: { select: { code: true } } } }) : Promise.resolve(null),
      ]),
    ])

    // D. What the page's rows and the photo count need: the page's correction history (its item ids only, P2-R9), the
    // people, the finding values, and the photos of the checked items in chunks of 2,000 (bug 10, R17).
    const findings = items.flatMap((item) => item.findings)
    const userIds = [...new Set([round.createdBy, round.cancelledBy, ...items.map((item) => item.scannedBy), ...findings.map((finding) => finding.reportedBy)].filter((id): id is string => Boolean(id)))]
    const evidenceAssetIds = [...new Set(evidenceItems.map((item) => item.assetId))]
    const evidenceCategoryIds = [...new Set(evidenceItems.map((item) => item.asset.categoryId))]
    const [logs, users, findingValueLabels, attachmentChunks, checklistSettings] = await Promise.all([
      items.length > 0
        ? prisma.systemLog.findMany({
            where: { module: "audit", action: "scan_result_corrected", recordId: { in: items.map((item) => item.id) } },
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            include: { user: { select: { username: true, displayName: true } } },
          })
        : Promise.resolve([]),
      userIds.length > 0 ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, displayName: true } }) : Promise.resolve([]),
      findings.length > 0 ? buildFindingValueLabels(findings) : Promise.resolve(new Map<string, string>()),
      Promise.all(
        chunkAuditIds(evidenceAssetIds).map((chunk) =>
          prisma.attachment.findMany({
            where: { assetId: { in: chunk }, module: "asset", isActive: true, uploadedAt: { gte: round.startDate } },
            select: { assetId: true, originalName: true },
          }),
        ),
      ),
      evidenceCategoryIds.length > 0
        ? prisma.systemSetting.findMany({ where: { key: { in: evidenceCategoryIds.map(categoryPhotoChecklistKey) } }, select: { key: true, value: true } })
        : Promise.resolve([]),
    ])

    const usersById = new Map(users.map((entry) => [entry.id, entry]))
    const userLabel = (id: string | null) => formatAuditUserLabel(id ? usersById.get(id) : null, id)
    const attachmentNamesByAssetId = new Map<string, string[]>()
    for (const attachment of attachmentChunks.flat()) {
      if (!attachment.assetId) continue
      attachmentNamesByAssetId.set(attachment.assetId, [...(attachmentNamesByAssetId.get(attachment.assetId) ?? []), attachment.originalName])
    }
    const checklistByCategoryId = new Map(checklistSettings.map((setting) => [setting.key.replace("asset_category_photo_checklist:", ""), parsePhotoChecklist(setting.value)]))
    const correctionHistoryByItemId = buildAuditCorrectionHistoryByItemId(logs)
    const categoryNames = new Map(categories.map((category) => [category.id, { code: category.code, name: category.name }]))
    const resultCard = foldAuditRoundResultCounts(toCountRows(roundRows))
    const walk = { checked: resultCard.all - resultCard.pending, total: resultCard.all, left: resultCard.pending }
    const fieldCounts = Object.fromEntries(auditFindingFields.map((field, index) => [field, fieldItemCounts[index]])) as Record<AuditFindingField, number>
    const openedByViewer = isSameAuditActor(user.id, round.createdBy)

    return {
      round: { ...round, createdByLabel: userLabel(round.createdBy), cancelledByLabel: userLabel(round.cancelledBy) },
      resultCard,
      resultChips: { ...foldAuditRoundResultCounts(toCountRows(chipRows)), outOfScope: outOfScopeInFilters, pendingReview: pendingReviewInFilters },
      categoryChips: buildAuditRoundCategoryChips({ rows: categoryCounts, names: categoryNames, selectedCategoryId, topIds: topCategoryIds }),
      fieldBars: { counts: fieldCounts, distinctItems: fieldItems, multipleFields: hasMultipleAuditFieldFindings(fieldCounts, fieldItems) },
      componentsMissing,
      componentsMissingInFilters,
      steps: {
        walk,
        review: { pendingFindings: checklist.pendingFindings, decidedFindings: reviewDecidedFindings },
        close: { checklist, openedByViewer, canClose: !isAuditRoundReadOnlyStatus(round.status) && checklist.canClose && !openedByViewer },
      },
      evidence: foldAuditRoundEvidence({
        items: evidenceItems.map((item) => ({ assetId: item.assetId, categoryId: item.asset.categoryId, auditStatus: item.auditStatus, auditResult: item.auditResult })),
        attachmentNamesByAssetId,
        checklistByCategoryId,
      }),
      cancelImpact: {
        pendingItems: walk.left,
        processedItems: walk.checked + resultCard.outOfScope,
        pendingFindings: checklist.pendingFindings,
        approvedFindings,
        openActions: checklist.openActions,
        scanHistoryRows,
      },
      rows: items.map((item) => {
        const checker = resolveAuditRoundRowChecker(item)
        return {
          ...item,
          correctionHistory: correctionHistoryByItemId.get(item.id) ?? [],
          missingComponents: listAuditRoundMissingComponents(item.asset.parentComponents),
          hasPhoto: item.auditStatus === "pending" ? null : attachmentNamesByAssetId.has(item.assetId),
          checkedBy: checker ? { label: userLabel(checker.userId) ?? checker.userId, at: checker.at } : null,
        }
      }),
      total,
      findingValueLabels,
      filterNames: { company, branch, category: selectedCategoryId ? (categoryNames.get(selectedCategoryId) ?? null) : null },
    }
  }

  export type AuditRoundPageData = NonNullable<Awaited<ReturnType<typeof getAuditRoundPageData>>>
  export type AuditRoundPageRow = AuditRoundPageData["rows"][number]
  ```
  Notes for the implementer:
  - Pass `expectedLocationIds` only when the lookup found rooms, so a search that names no room keeps Task 1's code/name OR (the test pins it).
  - Step 2 reads no item count: "รอ n" is `checklist.pendingFindings` and the decided count is a findings count (P2-R26). The "รอพิจารณา" result chip still counts items (`resultChips.pendingReview`, P2-R3).
  - The C block runs about 20 queries at once (the page ran 16 before). If tsc cannot infer a groupBy inside `Promise.all`, hoist its args into a `const … satisfies Prisma.AuditItemGroupByArgs`. The pinned text does not change.
- **Round page `audit/rounds/[id]/page.tsx`** (data only; the markup stays until Tasks 4-5):
  - **Imports:**
    - drop `prisma` (`:5`);
    - drop `categoryPhotoChecklistKey, parsePhotoChecklist` (`:14`), `isSameAuditActor` (`:30`) and `countSuccessfulAuditResultRows, isVarianceAuditResult` (`:35`);
    - drop `getAuditRoundCounts` and `emptyAuditRoundCounts` (`:37-38`);
    - drop `buildAuditCorrectionHistoryByItemId` (`:39`; keep `type AuditCorrectionHistoryItem`);
    - drop every result-filters import the edit leaves unused (`buildAuditRoundItemWhere` and any other Task 2 left; lint reports them), and the `resolveAuditRoundListWhereInput` import (the exports keep it);
    - add `buildAuditRoundPageHref` to the result-filters import (the stale-filter redirect);
    - add `import { getAuditRoundPageData } from "@/lib/audit-round-page-data"` and `import { withPerformanceTiming } from "@/lib/performance-timing"`.
  - **The data block:** Task 2's `resultWhereInput` and `resultItemWhere` lines (master `:73-76` as Task 2 left them), the `Promise.all` (`:78-245`), `cancelledByUser` (`:248-253`), the correction history (`:255-268`), the count locals (`:270-290`) and the evidence call (`:292-295`) are replaced. Task 1's `itemFilters` line stays: the old links spread it until Task 5. In the same place, after the filters are parsed, it reads:

    ```tsx
    // The page's names from here on (Tasks 4-5 read filters, page and pageSize; Task 5 folds this into the parse).
    const { page, pageSize, ...filters } = resultListState
    const data = await withPerformanceTiming(
      "audit-round.page-data",
      () => getAuditRoundPageData({ roundId: id, filters, page, pageSize, user }),
      { route: "/audit/rounds/[id]", locale, result: filters.result, hasSearch: Boolean(filters.search) }
    )
    if (!data) notFound()
    const { round } = data
    const resultItems = data.rows
    const resultItemTotal = data.total
    const filterCompany = data.filterNames.company
    const filterBranch = data.filterNames.branch
    const filterCategory = data.filterNames.category
    const isRoundCreator = data.steps.close.openedByViewer
    const isRoundReadOnly = isAuditRoundReadOnlyStatus(round.status)
    // The round's exports need audit:export (their routes check it; the E2E suite's AU1, M1).
    const canExportRound = round.status !== "cancelled" && hasPermission(user, "audit", "export")
    const cancelledByDisplayName = data.round.cancelledByLabel
    const pendingCount = data.steps.walk.left
    const processedCount = data.steps.walk.checked
    const foundCount = data.resultCard.found
    const notFoundCount = data.resultCard.notFound
    const mismatchCount = data.resultCard.mismatch
    const progress = data.steps.walk.total > 0 ? Math.round((data.steps.walk.checked / data.steps.walk.total) * 100) : 0
    ```
    `resultListState` (Task 1's parse) and `itemFilters` stay for the old markup until Task 5; the new code reads `filters`, `page` and `pageSize`. The `canExportRound` line and its comment stay word for word (`tests/e2e-fixes.test.ts:71`).
  - **The stale-filter redirect** (`:297-300`, P2-R31: this task's, and no later task adds another): an unknown category drops its filter too. "อื่น ๆ" is a filter value, not a category. It goes through the one href builder, which keeps every other filter (page 1, the page size and the way back kept):

    ```tsx
    // An unknown or stale company, branch or category drops only its own filter, so the list never sits under a chip it cannot name.
    const staleCategory = Boolean(filters.categoryId && filters.categoryId !== "other" && !filterCategory)
    if ((filters.companyId && !filterCompany) || (filters.branchId && !filterBranch) || staleCategory) {
      redirect(buildAuditRoundPageHref(locale, round.id, filters, { companyId: filterCompany ? filters.companyId : null, branchId: filterBranch ? filters.branchId : null, categoryId: staleCategory ? null : filters.categoryId, pageSize, returnTo: returnToHref }))
    }
    ```
    `returnToHref` is defined just above it (master `:296`).
  - **The row mapping** (`:351`): `const correctionHistory = correctionHistoryByItemId.get(item.id) ?? []` becomes `const correctionHistory = item.correctionHistory`.
  - **The close checklist** (`:391-397`):
    - `value`/`ok` of `closePendingItems` read `data.steps.close.checklist.pendingItems`;
    - `closePendingFindings` reads `data.steps.close.checklist.pendingFindings`;
    - `closeOpenActions` reads `data.steps.close.checklist.openActions`;
    - the opener row keeps `isRoundCreator`;
    - `const canCloseRound = data.steps.close.canClose`.
  - **The cancel impact** (`:398-405`) becomes `const cancelImpact = data.cancelImpact`.
  - **The old result card** (`:435-443`, the input of `buildAuditRoundResultSummaryGroups` in whatever form Tasks 1-2 left it; Task 4 replaces it):
    - `found` → `foundCount`;
    - the location, custodian and condition boxes → `data.fieldBars.counts.location`, `.custodian`, `.condition`;
    - `not_found` → `notFoundCount`;
    - `out_of_scope` → `data.resultCard.outOfScope`;
    - `pending_review` → `data.steps.review.pendingFindings`: findings, as master counted this box, until Task 4 removes it. The round-wide card has no รอพิจารณา cell; the result chip (Task 5) counts items (P2-R3).
  - **The markup values:**
    - StatStrip `totalExpected` (`:550`) → `value: formatCount(data.steps.walk.total)`;
    - `<AuditProgressBar total={…}` (`:559`) → `total={data.steps.walk.total}`;
    - the photo StatStrip (`:590-593`) → `data.evidence.withPhoto`, `data.evidence.withoutPhoto`, `data.evidence.checklistComplete`, `data.evidence.checklistIncomplete`.
    - The keys and labels stay. Task 4 replaces the photo box with "รูปหลักฐาน: มี x จาก y ที่ตรวจแล้ว".
  - **`getEvidenceSummary`** (`:900-965`) goes.
- **E2E:** no step changes. No step reads the round page's numbers. The rows, the chips and the buttons the E2E clicks keep their markup.

- [ ] **Step 4: Rewrite these pins**

- `tests/audit-round-counts.test.ts:93-106`, the whole test → (the page no longer counts; the data does):

  ```ts
  test("the round page's total, checked and progress come from the page data's round-wide fold of its own items (group 2 spec §5, §8)", () => {
    const page = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx")
    assert.match(page, /const pendingCount = data\.steps\.walk\.left\n\s+const processedCount = data\.steps\.walk\.checked/)
    assert.match(page, /const progress = data\.steps\.walk\.total > 0 \? Math\.round\(\(data\.steps\.walk\.checked \/ data\.steps\.walk\.total\) \* 100\) : 0/)
    assert.match(page, /\{ key: "totalExpected", label: t\("totalExpected"\), value: formatCount\(data\.steps\.walk\.total\) \}/)
    assert.match(page, /\{ key: "scanned", label: t\("scanned"\), value: formatCount\(processedCount\) \}/)
    assert.match(page, /<AuditProgressBar\s+total=\{data\.steps\.walk\.total\}\s+processed=\{processedCount\}\s+pending=\{pendingCount\}/)
    assert.match(page, /const cancelImpact = data\.cancelImpact/)
    // The cancel dialog's "work done" stays the API's count (route.ts getCancellationImpact): every non-pending item.
    assert.match(read("src/lib/audit-round-page-data.ts"), /processedItems: walk\.checked \+ resultCard\.outOfScope,/)
    assert.doesNotMatch(page, /getAuditRoundCounts|roundCountsById|emptyAuditRoundCounts|_count\.items|round\._count|scannedCount|statusCounts/)
  })
  ```
- `tests/audit-round-result-drilldown.test.ts:275-276` (the correction history's read moved) → add `const data = readFileSync("src/lib/audit-round-page-data.ts", "utf8")` beside `page` (`:270`), then:

  ```ts
  assert.match(data, /buildAuditCorrectionHistoryByItemId\(logs\)/)
  assert.match(data, /action: "scan_result_corrected"/)
  ```
  `:277-279` (`latestCorrection`, `correctionHistoryLatest`, `correctionHistoryFields` in the page) stay.
- `tests/audit-round-result-drilldown.test.ts:373-376` (`:373` as Task 2 rewrote it, `resolveAuditRoundListWhereInput` / `buildAuditRoundItemWhere(resultWhereInput)`; `:374-376` the count and the company and branch reads) → the data's:

  ```ts
  const data = readFileSync("src/lib/audit-round-page-data.ts", "utf8").replace(/\r\n/g, "\n")
  assert.match(data, /const rowsWhere = listWhere\(\)/)
  assert.match(data, /prisma\.auditItem\.count\(\{ where: rowsWhere \}\)/, "the number above the list counts the filtered list")
  assert.match(data, /prisma\.company\.findUnique\(\{ where: \{ id: filters\.companyId \}, select: \{ code: true, nameTh: true \} \}\)/)
  assert.match(data, /prisma\.branch\.findUnique\(\{ where: \{ id: filters\.branchId \}, select: \{ name: true, company: \{ select: \{ code: true \} \} \} \}\)/)
  ```
  `:377` (the redirect) → `assert.match(page, /if \(\(\w+\.companyId && !filterCompany\) \|\| \(\w+\.branchId && !filterBranch\) \|\| staleCategory\) \{\n\s+redirect\(/, "an unknown company, branch or category drops its filter")`. The rest of the test stays as Tasks 1-2 left it; `:384` stays as Task 2 rewrote it (the page's export-href pin).
- `tests/audit-round-result-drilldown.test.ts:154` (`resultItems\.map`) stays: the page keeps `const resultItems = data.rows`.
- `tests/audit-round-cancellation.test.ts:99` (`/cancelledByUser/`) → `assert.match(detail, /const cancelledByDisplayName = data\.round\.cancelledByLabel/)`. `:100` (`cancelledByDisplayName`) and `:101` (`t("cancelledBy")`) stay.
- `tests/audit-round-exports.test.ts`, Task 2's test "the round page lists the out-of-scope finds as items …": add `const data = read("src/lib/audit-round-page-data.ts")` beside `page`, then:
  - the `resolveAuditRoundListWhereInput(id, resultListState)` pin → `assert.match(data, /findAuditRoundSearchLocationIds\(roundId, filters\.search\)/)` (the page's list where is the data's now; the exports keep `resolveAuditRoundListWhereInput`);
  - the page `orderBy` pin → the same regex on `data`;
  - `\{ result: "out_of_scope", count: roundCounts\.outOfScope \}` → `\{ result: "out_of_scope", count: data\.resultCard\.outOfScope \}`;
  - the page's `prisma\.auditScanHistory\.count\(\{ where: \{ auditRoundId: id \} \}\)` → on `data`: `/prisma\.auditScanHistory\.count\(\{ where: \{ auditRoundId: roundId \} \}\)/`.

  The edit-gate, company-chip and export pins stay as Task 2 wrote them.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-round-page-rules.test.ts tests/audit-round-page-data.test.ts tests/audit-round-list-lookups.test.ts tests/audit-round-exports.test.ts tests/performance-route-instrumentation.test.ts tests/audit-round-counts.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-round-cancellation.test.ts tests/audit-rounds-list-rules.test.ts tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/e2e-fixes.test.ts tests/e2e-cross-cutting.test.ts tests/audit-round-status.test.ts tests/audit-item-status-labels.test.ts && npx tsc --noEmit`
Expected: PASS.
- `e2e-cross-cutting.test.ts:136` still finds the PATCH handler's `requirePermission(user, "audit", "approve")` before its first `prisma.`. The checklist's reads moved out of the file.
- `audit-pages-sweep-ui.test.ts:121-135` and `list-pages-ui.test.ts:357-370` still find the old markup (the UI is unchanged).

Then run: `npm test && npm run lint`
Expected: PASS. A pin that fails outside this list is rewritten in this commit and named in the report.

**Messages:** none. This task adds no word and changes none.

- [ ] **Step 6: Commit**

```bash
git add src/lib/audit-round-close.ts src/lib/audit-round-page-rules.ts src/lib/audit-round-page-data.ts "src/app/api/audit-rounds/[id]/route.ts" "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" src/lib/audit-rounds-list-rules.ts tests/audit-round-page-rules.test.ts tests/audit-round-page-data.test.ts tests/performance-route-instrumentation.test.ts tests/audit-round-counts.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-round-cancellation.test.ts tests/audit-round-exports.test.ts
git commit -m "feat(audit-round): one timed data load for the round page, with the close API's own checklist, round-wide cards, chips counted within the other filters, the room search through the shared lookup, step 2 counted in findings, the stale category redirect, own checked items' photos in chunks and each row's checker, photo and missing components (group 2 plan 2 task 3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Round page top: header with menus, the next-step card, the result card, "ไม่ตรงเรื่องอะไร"

The top of the round page is redrawn in §8's order:
1. `PageHeader`:
   - the trail and the title;
   - the meta: number, status, dates, "เหลือ / เลยกำหนด N วัน", "เปิดโดย <name>";
   - "ส่งออก ▾" (audit:export), then "อื่น ๆ ▾" holding "ยกเลิกรอบตรวจ" (audit:approve, open round).
2. The phone `ActionBar`, as today, without a scan item for a person without audit:edit.
3. One of two blocks:
   - a cancelled round: its cancel details box, kept as it is;
   - any other round: the next-step card "ขั้นถัดไป: …". It holds three `Steps`, each step's detail line under the rail, and the main button in the card's head. At step 3 that button is "ปิดรอบตรวจ" (§13 bug 2).
4. Two cards side by side from xl:
   - the result card: a `DistributionBar` beside a `StatStrip` of five cells, with "พบเพิ่มนอกขอบเขต N" apart;
   - "ไม่ตรงเรื่องอะไร": a `PaceBar` per field, the line for items that differ in several fields, the photo line and the components line.

The four total boxes, `AuditProgressBar`, the two result groups, the evidence panel and the close/cancel grid go. So do
`AuditProgressBar` itself and `buildAuditRoundResultSummaryGroups`, because nothing else reads them. The list section
(`#audit-result-list`) is Task 5's. In this task it keeps whatever Task 3 left, except the links that this task's
closure replaces (noted below).

**Files:**
- Create: `src/components/audit/audit-round-header-menus.tsx` (client: the two header menus and the cancel dialog)
- Modify: `src/lib/audit-round-page-rules.ts` (Task 3's file: append the steps and the main action; Task 5 appends the row rules)
- Modify: `src/lib/audit-round-result-filters.ts`:
  - add `auditRoundHrefQuery` (`buildAuditRoundExportHref` and `AuditRoundExportEndpoint` are Task 1's: this task uses them as they are);
  - delete `buildAuditRoundResultSummaryGroups`, `AuditRoundResultSummaryInput`, `AuditRoundResultSummaryItem`, `auditRoundNormalResultOrder`, `auditRoundNeedsReviewResultOrder` and `buildAuditRoundResultSummaryItems` (master `:38-55`, `:77-86`, `:96-104`), if Task 1 left them.
- Modify: `src/components/audit/audit-round-cancel-button.tsx` (a handle: `ref`, `hideTrigger`, `returnFocusRef`, the impact type exported)
- Modify: `src/components/audit/audit-round-close-button.tsx` (the button only; the card writes the conditions)
- Delete: `src/components/audit/audit-progress-bar.tsx`
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`:
  - the imports;
  - the derived values after Task 3's data read;
  - the render from `<div className={actionBarPagePadding.single}>` to the line before `<section id="audit-result-list"` (master `:468-609`);
  - the three export hrefs (Task 2's lines) read `filters` (Task 2 already deleted the local `buildAuditRoundExportHref`, master `:882-898`).
- Modify: `src/lib/dashboard-overview-rules.ts:76` (the comment that names `audit-progress-bar.tsx`)
- Modify: `DESIGN.md:294` (The Data Bars Rule's last two sentences)
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- Modify, only if Step 8 finds a squeeze: the file that holds it (P2-R30).
- Test:
  - Extend `tests/audit-round-page-rules.test.ts` (Task 3's); create `tests/audit-round-page-ui.test.ts`.
  - Modify the pins named in Step 6.

**Interfaces:**
- Consumes:
  - **Task 1** (`@/lib/audit-round-result-filters`):
    - `AuditRoundListFilters`, `AuditRoundResultFilter` (with `pending` and `mismatch`), `AuditFindingField`;
    - `auditFindingFields` = `["location","department","custodian","condition"]`, `auditFindingTypeByField`;
    - `parseAuditRoundListFilters(params)`;
    - `buildAuditRoundPageHref(locale, roundId, filters, overrides?)` and `type AuditRoundPageHrefOverrides`. This task assumes four things about it:
      - its `overrides` accept `{ page?, pageSize?, returnTo?, ...Partial<AuditRoundListFilters> }`, a `null` filter value clearing that filter;
      - it drops defaults (result `all`, page 1, page size 25);
      - it keeps `returnTo` when given;
      - it ends the list's links with `#audit-result-list`.
    - `buildAuditRoundExportHref(roundId: string, endpoint: AuditRoundExportEndpoint, filters: AuditRoundListHrefFilters)`: the list's filters, no page, page size, returnTo or hash (Task 2 already builds the three export hrefs with it).
  - **Task 3** (`@/lib/audit-round-page-data`), read as `const data = await getAuditRoundPageData({ roundId: id, filters, page, pageSize, user })` inside `withPerformanceTiming`:
    - `data.round.createdByLabel: string | null`: the opener as the cancel box names a person (`displayName (username)`, `username` when they are equal, or the raw id).
    - `data.resultCard: { all; pending; found; mismatch; notFound; outOfScope }`: round-wide, own items, P2-R2.
    - `data.fieldBars: { counts: Record<AuditFindingField, number>; distinctItems: number; multipleFields: boolean }`:
      - `distinctItems` counts the own items with any counted field finding (pending or approved, P2-R1);
      - `multipleFields` is `sum(counts) > distinctItems`.
    - `data.componentsMissing: number`: round-wide, P2-R16.
    - `data.steps`:
      - `walk: { checked; total; left }`;
      - `review: { pendingFindings; decidedFindings }`: findings, the findings page's rows (P2-R26);
      - `close: { checklist: { pendingItems; pendingFindings; openActions; canClose }; openedByViewer: boolean; canClose: boolean }`: the close API's own `getAuditRoundCloseChecklist` result (`src/lib/audit-round-close.ts`, P2-R27), whether the viewer opened the round, and whether this viewer may close now (open round, checklist clear, not the opener).
    - `data.evidence: { checked; withPhoto; withoutPhoto; checklistComplete; checklistIncomplete }`: own checked items only, bug 10.
    - `data.cancelImpact` (the six counts the cancel dialog shows).
  - **Task 3's page body** (names this task reads):
    - `filters`, `page`, `pageSize` (`const { page, pageSize, ...filters } = resultListState`);
    - `round`, `returnToHref`, `isRoundReadOnly`, `canApprove`;
    - `canExportRound` (pin `tests/e2e-fixes.test.ts:71` keeps its exact line);
    - `cancelImpact` (the six counts the cancel dialog shows);
    - `roundDetailReturnHref`, `pendingHref`, `scanHref`, `pendingReviewFindingsHref`, `openActionFindingsHref` (master `:301-303`, `:389-390`; pins `tests/operational-return-navigation.test.ts:63-65`);
    - the cancelled box (master `:533-545`), unchanged.
  - **Plan 1**: `buildAuditRoundDueLine(status, endDate, today)` (`@/lib/audit-rounds-list-rules`), `startOfBangkokDay` (`@/lib/waiting-work-rules`), and the keys `daysLeft`, `daysOverdue`, `nextStepContinueScan`, `openActionsCount`.
  - **Shared parts** (props read from the source):
    - `Steps({ label, steps: { id, label, state }[], className? })` (`src/components/ui/steps.tsx:33`; no detail slot, P2-R8);
    - `DistributionBar({ segments: { key, count, tone, href?, title? }[] })` (`distribution-bar.tsx:13`);
    - `PaceBar({ value, pace, label, behind })` (`pace-bar.tsx:12`);
    - `StatStrip({ items, className })`, where an item is `{ key, label, value, foot?, href? }` (`stat-strip.tsx:8-29`);
    - `ContentPanel` with `divided`, `title`, `description` and `actions` (`content-panel.tsx:19-36`; the divided head wraps, so there is no bug-2 squeeze here; Step 8 checks the other panels with `actions`, P2-R30);
    - `ActionBar({ label, actions })` (`action-bar.tsx:45`);
    - `PageHeader({ breadcrumbs, title, meta, actions, className })` (`page-header.tsx:29`);
    - `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent` (`align`, `onCloseAutoFocus`), `DropdownMenuItem` (`asChild`, `variant`, `onSelect`), `DropdownMenuItemText`, `DropdownMenuItemDescription` (`dropdown-menu.tsx:289-307`);
    - `toneIcons` (`tone-icons.ts:5`).
- Produces:
  - `src/lib/audit-round-page-rules.ts` (appended to Task 3's file):
    - `auditRoundPageStepKeys = ["walk","review","close"] as const`, with the type `AuditRoundPageStepKey`;
    - `buildAuditRoundPageSteps({ status, pendingItems, pendingFindings }): { states: StepState[]; current: AuditRoundPageStepKey | null } | null`;
    - `buildAuditRoundPageMainAction({ steps, pendingItems, pendingFindings, canClose, openedByViewer, canScan, canApprove }): AuditRoundPageMainAction`, where `AuditRoundPageMainAction` = `{ kind: "walk"; count; target: "scan" | "pending" } | { kind: "review"; count } | { kind: "close"; disabled } | null`.
  - `src/lib/audit-round-result-filters.ts`:
    - `auditRoundHrefQuery(href: string): URLSearchParams` (Task 5's search reads its hidden inputs with it).
  - In the page:
    - the closure `pageHref(target, overrides?)`, `roundWideFilters`, `allResultHref`, `canScan`, `mainAction` and `mainLink`. Task 5 uses `pageHref`, `roundWideFilters`, `allResultHref` and `canScan` (and defines `listHref` itself: nothing in this task reads it).
  - `AuditRoundCancelButtonHandle = { open: () => void }` and the exported `AuditRoundCancellationImpact`.
  - `AuditRoundHeaderMenus({ exports, cancel })`.
  - **The markup Task 7's E2E stands on:**
    - **Header** (`[data-slot="page-header"]`):
      - the h1 is the round's name;
      - `[data-slot="page-header-meta"]` holds the number, one status badge ("เปิดตรวจ" / "ปิดรอบแล้ว" / "ยกเลิก"), the dates, then on an open round "เหลือ N วัน" or "เลยกำหนด N วัน" (alone in its span), then "เปิดโดย <name>".
    - **"ส่งออก ▾"**:
      - Who sees it: `getByRole("button", { name: "ส่งออก" })`, for audit:export (the IT head) on a round that is not cancelled. IT staff and the viewer have no such button, and no `main a[href^="/api/audit-rounds/<id>/"]` (reports.spec M1 still holds).
      - Its menu holds three `menuitem` links whose names start with "Excel ผลตรวจ", "PDF ผลตรวจ" and "รายงานผลต่าง". Each has the second line "ตามตัวกรองที่เลือก", so match the name with `/^Excel ผลตรวจ/`.
      - Each `href` is `/api/audit-rounds/<id>/export|export-pdf|variance-export?<the list's filters>`: no page, no pageSize, no returnTo.
    - **"อื่น ๆ ▾"**:
      - Who sees it: `getByRole("button", { name: "อื่น ๆ" })`, for audit:approve on an open round.
      - Its one item is `menuitem` "ยกเลิกรอบตรวจ". It opens `dialog` "ยืนยันยกเลิกรอบตรวจ". The dialog's ids (`#audit-round-cancel-reason`, `-error`) and buttons ("ยืนยันยกเลิก") do not change. Closing the dialog returns focus to "อื่น ๆ".
    - **The next-step card** (not on a cancelled round): a `section` whose h2 reads one of:
      - "ขั้นถัดไป: เดินตรวจ";
      - "ขั้นถัดไป: หัวหน้า IT พิจารณา";
      - "ขั้นถัดไป: ปิดรอบ";
      - "รอบนี้ปิดแล้ว" (a closed round).

      Inside the card:
      - `list` "ขั้นตอนของรอบตรวจ" (the `Steps` `ol`). The current step's `li` has `aria-current="step"`. On a closed round all three are complete.
      - The walk line "ตรวจแล้ว x / y · เหลือ z". "เหลือ z" is a link to `/pending` when z > 0.
      - The review line "รอ n · พิจารณาแล้ว m", both in findings (P2-R26): n is the round's pending findings, m the findings a person decided. "รอ n" is a link to `/audit/findings?status=pending&roundId=<id>` (the rows it counts) when n > 0. The "รอพิจารณา" result chip (Task 5) still counts items.
      - The four close conditions, each in its own `li`:
        - "ไม่มีรายการรอตรวจ" or the link "รายการรอตรวจ x";
        - "ไม่มีรายการไม่ตรงรอพิจารณา" or the link "รายการไม่ตรงรอพิจารณา x";
        - "ไม่มีแผนแก้ไขค้าง" or the link "แผนแก้ไขค้าง x";
        - for anyone but the opener, "ผู้ปิดรอบต้องไม่ใช่ผู้สร้างรอบ" (met). For the opener (whatever their permissions, at any step) it reads "ผู้เปิดรอบปิดรอบเองไม่ได้ ให้หัวหน้าคนอื่นปิด" instead, so the opener never sees the first sentence.
      - The main button in the card's head:
        - walk: link "เดินตรวจต่อ (N)". It goes to `/scan` for audit:edit and to `/pending` for anyone else.
        - review: link "พิจารณา N รายการ" to `/audit/findings?status=pending&roundId=<id>`. N is the pending findings, the findings page's rows, the same n as "รอ n" (P2-R26).
        - step 3: `button` "ปิดรอบตรวจ", for audit:approve only. It is disabled while an action plan is open or when the viewer opened the round. The confirm dialog is unchanged: alertdialog "ยืนยันปิดรอบตรวจนับนี้?".
      - Step 3 is reached only when nothing is pending and no finding awaits a decision. Before that there is no "ปิดรอบตรวจ" button at all, so `toHaveCount(0)` holds, not `toBeDisabled()`.
    - **The result card** (`section` with h2 "สรุปผลตรวจนับ"):
      - a `StatStrip` whose cell links are named exactly "ทั้งหมด", "พบตรง", "ไม่ตรง", "ไม่พบ" and "รอตรวจ". The value sits in the cell's `dd`. A cell at 0 is plain text.
      - Each link opens `?result=<value>#audit-result-list` with every other filter cleared. "ทั้งหมด" opens the bare list.
      - The line "พบเพิ่มนอกขอบเขต N" is a link to `?result=out_of_scope` when N > 0.
    - **"ไม่ตรงเรื่องอะไร"** (`section` with h2 "ไม่ตรงเรื่องอะไร"):
      - `list` "ไม่ตรงเรื่องอะไร" with four `listitem`s in the order ที่ตั้งไม่ตรง, แผนกไม่ตรง, ผู้ถือครองไม่ตรง, สภาพไม่ตรง (the `auditFinding.type_*` words). Each item's text is `^<label>\s*<count>$`, and the label alone is a link (its name exactly the label) to `?field=<field>` when the count is above 0. The count sits beside the link in the same item; the `PaceBar` is a `role="img"` with its own label and no text.
      - Then, when it applies, "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง".
      - Then "รูปหลักฐาน: มี x จาก y ที่ตรวจแล้ว".
      - Then the link "เครื่องที่ส่วนควบไม่ครบ N" (`?components=missing`), when N > 0.
    - **Phone `ActionBar`** (open rounds only, `group` "การดำเนินการ"), up to four links:
      1. the main link as primary ("เดินตรวจต่อ (N)" or "พิจารณา N รายการ");
      2. "รายการรอตรวจ", unless the main link already opens it;
      3. "ไปพิจารณารายการไม่ตรง", unless the main link is the review;
      4. "กลับ".
    - A person without audit:edit gets no `/scan` href anywhere on the page (P2-R7).

- [ ] **Step 1: Write the failing tests**

Append to `tests/audit-round-page-rules.test.ts` (Task 3's file). Add `buildAuditRoundPageMainAction` and `buildAuditRoundPageSteps` to its `audit-round-page-rules.ts` import, and add the result-filters import line below (the file has `assert` and `test` already):

```ts
import { auditRoundHrefQuery, buildAuditRoundExportHref, buildAuditRoundPageHref, parseAuditRoundListFilters } from "../src/lib/audit-round-result-filters.ts"

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
```

Create `tests/audit-round-page-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Group 2 plan 2 (spec §8, §13 bugs 2, 9, 10, 12, P2-R7, P2-R8, P2-R16): the round page's header, next-step card,
// result card and "ไม่ตรงเรื่องอะไร" (Task 4), then its list (Task 5). Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx"
const MENUS = "src/components/audit/audit-round-header-menus.tsx"
const at = (source: string, needle: string, from = 0) => {
  const index = source.indexOf(needle, from)
  assert.ok(index !== -1, needle)
  return index
}
const between = (source: string, start: string, end: string) => {
  const from = at(source, start)
  return source.slice(from, at(source, end, from))
}

test("the round page in the spec's order: header, phone bar, the cancel box or the next-step card, the result card and ไม่ตรงเรื่องอะไร, then the list (group 2 spec §8)", () => {
  const page = read(PAGE)
  const order = [
    "<PageHeader",
    "<ActionBar label={tCommon(\"actions\")} actions={barActions} />",
    '<ContentPanel title={t("statusCancelled")} className="mb-6">',
    '<Steps label={t("stepsLabel")} steps={stepItems} />',
    '<ContentPanel divided title={t("resultDashboard")} description={t("resultDashboardHelp")}>',
    '<ContentPanel divided title={t("mismatchFieldsTitle")}>',
    '<section id="audit-result-list" className="scroll-mt-24">',
  ].map((needle) => at(page, needle))
  assert.deepEqual(order, [...order].sort((a, b) => a - b))
  assert.doesNotMatch(page, /AuditProgressBar|resultNormalGroup|resultNeedsReviewGroup|buildAuditRoundResultSummaryGroups|evidenceSummary|t\("totalExpected"\)|t\("scanned"\)|<AuditRoundCancelButton\b/)
  assert.equal(existsSync("src/components/audit/audit-progress-bar.tsx"), false)
})

test("the header: number, status, dates, days left or overdue on an open round, the opener; ส่งออก ▾ for audit:export, อื่น ๆ ▾ for audit:approve on an open round (group 2 spec §8, §13 bug 12)", () => {
  const page = read(PAGE)
  const meta = between(page, "meta={", "actions={")
  assert.match(meta, /<span className="tag">\{round\.auditNo\}<\/span>/)
  assert.match(meta, /\{due \? <span className=\{due\.kind === "overdue" \? "text-danger" : "text-warning"\}>\{due\.kind === "overdue" \? t\("daysOverdue", \{ days: formatCount\(due\.days\) \}\) : t\("daysLeft", \{ days: formatCount\(due\.days\) \}\)\}<\/span> : null\}/)
  assert.match(meta, /\{data\.round\.createdByLabel \? <span>\{t\("openedBy", \{ name: data\.round\.createdByLabel \}\)\}<\/span> : null\}/)
  assert.match(page, /const due = buildAuditRoundDueLine\(round\.status, round\.endDate, startOfBangkokDay\(new Date\(\)\)\)/)
  assert.match(page, /actions=\{\s*canExportRound \|\| \(canApprove && !isRoundReadOnly\) \? \(\s*<AuditRoundHeaderMenus\s+exports=\{canExportRound \? \{ excel: auditRoundExportHref, pdf: auditRoundExportPdfHref, variance: auditRoundVarianceHref \} : null\}\s+cancel=\{canApprove && !isRoundReadOnly \? \{ roundId: round\.id, impact: cancelImpact \} : null\}\s+\/>\s*\) : undefined\s*\}/)
  assert.match(page, /const pageHref = \(target: AuditRoundListFilters, overrides: AuditRoundPageHrefOverrides = \{\}\) =>\n\s+buildAuditRoundPageHref\(locale, round\.id, target, \{ pageSize, returnTo: returnToHref, \.\.\.overrides \}\)/)
  // Task 1's export builder over the list's filters (no page, page size or way back).
  for (const [name, endpoint] of [["auditRoundExportHref", "export"], ["auditRoundExportPdfHref", "export-pdf"], ["auditRoundVarianceHref", "variance-export"]]) {
    assert.match(page, new RegExp(`const ${name} = buildAuditRoundExportHref\\(round\\.id, "${endpoint}", filters\\)`), name)
  }
  assert.doesNotMatch(page, /<a href=|download className=|t\("scan"\)|t\("exportResult"\)|function buildAuditRoundExportHref/, "the exports live in the menu; the header has no scan link")
})

test("ส่งออก ▾ holds Excel ผลตรวจ, PDF ผลตรวจ and รายงานผลต่าง, each ตามตัวกรองที่เลือก; อื่น ๆ ▾ opens the cancel dialog outside the menu and gives focus back (group 2 spec §8, R-m)", () => {
  const menus = read(MENUS)
  assert.match(menus, /^"use client"/)
  for (const [href, label] of [["exports\\.excel", "exportResult"], ["exports\\.pdf", "exportResultPdf"], ["exports\\.variance", "exportVariance"]]) {
    assert.match(menus, new RegExp(`<DropdownMenuItem asChild>\\s*<a href=\\{${href}\\} download>\\s*<\\w+ aria-hidden="true" \\/>\\s*<DropdownMenuItemText>\\s*\\{t\\("${label}"\\)\\}\\s*<DropdownMenuItemDescription>\\{t\\("exportFilteredHint"\\)\\}<\\/DropdownMenuItemDescription>`), label)
  }
  assert.match(menus, /<Button variant="outline" size="md">\s*<Download aria-hidden="true" \/>\s*\{tCommon\("export"\)\}\s*<ChevronDown aria-hidden="true" \/>/)
  assert.match(menus, /<DropdownMenu modal=\{false\}>/)
  assert.match(menus, /<Button ref=\{moreTriggerRef\} variant="outline" size="md">\s*\{t\("more"\)\}\s*<ChevronDown aria-hidden="true" \/>/)
  assert.match(menus, /onCloseAutoFocus=\{\(event\) => \{\s*if \(!openingDialogRef\.current\) return\s*openingDialogRef\.current = false\s*event\.preventDefault\(\)\s*\}\}/)
  assert.match(menus, /<DropdownMenuItem\s+variant="destructive"\s+onSelect=\{\(\) => \{\s*openingDialogRef\.current = true\s*cancelDialogRef\.current\?\.open\(\)\s*\}\}\s*>/)
  assert.match(menus, /<\/DropdownMenu>[\s\S]*\{cancel \? <AuditRoundCancelButton ref=\{cancelDialogRef\} hideTrigger returnFocusRef=\{moreTriggerRef\} roundId=\{cancel\.roundId\} impact=\{cancel\.impact\} \/> : null\}/, "the dialog sits outside the menu")
})

test("the next-step card: three Steps, each step's line under them, the main button that follows the step, and ปิดรอบตรวจ in the card at step 3 (group 2 spec §8, §13 bug 2, P2-R7, P2-R8)", () => {
  const page = read(PAGE)
  assert.match(page, /const canScan = hasPermission\(user, "audit", "edit"\)/)
  assert.match(page, /const stepsState = buildAuditRoundPageSteps\(\{ status: round\.status, pendingItems: data\.steps\.close\.checklist\.pendingItems, pendingFindings: data\.steps\.close\.checklist\.pendingFindings \}\)/)
  assert.match(page, /const mainAction = buildAuditRoundPageMainAction\(\{ steps: stepsState, pendingItems: data\.steps\.close\.checklist\.pendingItems, pendingFindings: data\.steps\.close\.checklist\.pendingFindings, canClose: data\.steps\.close\.canClose, openedByViewer: data\.steps\.close\.openedByViewer, canScan, canApprove \}\)/)
  // The walk opens the scan page only for audit:edit; anyone else gets the pending list (spec §5, P2-R7).
  assert.match(page, /href: mainAction\.target === "scan" \? scanHref : pendingHref/)
  assert.equal(page.match(/\bscanHref\b/g)?.length, 2, "defined once, used once, behind canScan")
  const card = between(page, "{stepsState ? (", '<ContentPanel divided title={t("resultDashboard")}')
  assert.match(card, /<ContentPanel\s+divided\s+title=\{stepsState\.current \? t\("nextStepTitle", \{ step: stepLabels\[stepsState\.current\] \}\) : t\("stepsClosedTitle"\)\}/)
  assert.match(card, /mainAction\?\.kind === "close" \? \(\s*<AuditRoundCloseButton roundId=\{round\.id\} disabled=\{mainAction\.disabled\} \/>/)
  assert.match(card, /<Link href=\{mainLink\.href\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(card, /t\("stepWalkChecked", \{ checked: formatCount\(data\.steps\.walk\.checked\), total: formatCount\(data\.steps\.walk\.total\) \}\)/)
  // Step 2 counts findings (P2-R26): "รอ n" opens the findings page whose rows it counts, as "พิจารณา n รายการ" does.
  assert.match(card, /\{data\.steps\.review\.pendingFindings > 0 \? \(\s*<Link href=\{pendingReviewFindingsHref\}/)
  assert.match(card, /t\("stepReviewWaiting", \{ count: formatCount\(data\.steps\.review\.pendingFindings\) \}\)/)
  assert.match(card, /t\("stepReviewDecided", \{ count: formatCount\(data\.steps\.review\.decidedFindings\) \}\)/)
  assert.doesNotMatch(card, /result: "pending_review"/, "the step's count is findings, not the items of the list")
  assert.match(card, /\{closeConditions\.map\(\(condition\) => \(/)
  assert.doesNotMatch(card, /truncate|whitespace-nowrap|w-30/, "nothing in the card is cut")
  assert.match(page, /\{ key: "opener", ok: !data\.steps\.close\.openedByViewer, label: data\.steps\.close\.openedByViewer \? t\("closeOwnRoundNotice"\) : t\("closeSeparateApprover"\) \}/)
  const close = read("src/components/audit/audit-round-close-button.tsx")
  assert.match(close, /export function AuditRoundCloseButton\(\{ roundId, disabled \}: \{ roundId: string; disabled: boolean \}\)/)
  assert.match(close, /return \(\s*<Button onClick=\{closeRound\} busy=\{saving\} disabled=\{disabled\}>\s*<Lock aria-hidden="true" \/>\s*\{t\("closeRound"\)\}\s*<\/Button>\s*\)/)
  assert.doesNotMatch(close, /ContentPanel|StatStrip|Notice|checklist/)
})

test("the phone bar: the main step first, the pending list, the findings to decide, back; no scan item without audit:edit (spec §8, P2-R7)", () => {
  const page = read(PAGE)
  assert.match(page, /const barActions: ActionBarLink\[\] = \[\n\s+\.\.\.\(mainLink \? \[\{ \.\.\.mainLink, primary: true \}\] : \[\]\),\n\s+\.\.\.\(mainLink\?\.href === pendingHref \? \[\] : \[\{ href: pendingHref, label: t\("pendingAssets"\), icon: <ListChecks className="h-4 w-4" \/> \}\]\),\n\s+\.\.\.\(mainAction\?\.kind === "review" \? \[\] : \[\{ href: pendingReviewFindingsHref, label: t\("openFindingReview"\), icon: <FileText className="h-4 w-4" \/> \}\]\),\n\s+\{ href: returnToHref, label: tCommon\("back"\), icon: <ArrowLeft className="h-4 w-4" \/> \},\n\s+\]/)
  assert.match(page, /\{!isRoundReadOnly \? <ActionBar label=\{tCommon\("actions"\)\} actions=\{barActions\} \/> : null\}/)
})

test("the result card is round-wide: a DistributionBar beside five cells whose links clear the other filters, and พบเพิ่มนอกขอบเขต apart (group 2 spec §5, §8, P2-R2)", () => {
  const page = read(PAGE)
  assert.match(page, /const roundWideFilters = parseAuditRoundListFilters\(\{\}\)/)
  assert.match(page, /\["found", t\("found"\), data\.resultCard\.found, "success"\],\n\s+\["mismatch", t\("mismatchShort"\), data\.resultCard\.mismatch, "warning"\],\n\s+\["not_found", t\("notFound"\), data\.resultCard\.notFound, "danger"\],\n\s+\["pending", t\("pending"\), data\.resultCard\.pending, "muted"\],/)
  assert.match(page, /\.map\(\(\[result, label, count, tone\]\) => \(\{ result, label, count, tone, href: pageHref\(roundWideFilters, \{ result \}\) \}\)\)/)
  const card = between(page, '<ContentPanel divided title={t("resultDashboard")}', '<ContentPanel divided title={t("mismatchFieldsTitle")}>')
  assert.match(card, /<DistributionBar segments=\{resultCells\.map\(\(cell\) => \(\{ key: cell\.result, count: cell\.count, tone: cell\.tone, href: cell\.href, title: t\("resultSegmentTitle", \{ result: cell\.label, count: formatCount\(cell\.count\) \}\) \}\)\)\} \/>/)
  assert.match(card, /\{ key: "all", label: t\("viewAll"\), value: formatCount\(data\.resultCard\.all\), href: data\.resultCard\.all > 0 \? pageHref\(roundWideFilters\) : undefined \}/)
  assert.match(card, /\.\.\.resultCells\.map\(\(cell\) => \(\{ key: cell\.result, label: cell\.label, value: formatCount\(cell\.count\), href: cell\.count > 0 \? cell\.href : undefined, foot: data\.resultCard\.all > 0 \? formatPercent\(cell\.count \/ data\.resultCard\.all\) : undefined \}\)\)/)
  assert.match(card, /pageHref\(roundWideFilters, \{ result: "out_of_scope" \}\)/)
  assert.match(card, /t\("outOfScopeExtra", \{ count: formatCount\(data\.resultCard\.outOfScope\) \}\)/)
})

test("ไม่ตรงเรื่องอะไร: a bar per field that opens field= with the other filters cleared, the several-fields line, the photo line over checked items, the components line (group 2 spec §8, P2-R16, P2-R18, bugs 9, 10)", () => {
  const page = read(PAGE)
  assert.match(page, /const fieldBarRows = auditFindingFields\.map\(\(field\) => \(\{\n\s+field,\n\s+label: tFinding\(`type_\$\{auditFindingTypeByField\[field\]\}`\),\n\s+count: data\.fieldBars\.counts\[field\],\n\s+href: pageHref\(roundWideFilters, \{ field \}\),\n\s+\}\)\)/)
  const card = between(page, '<ContentPanel divided title={t("mismatchFieldsTitle")}>', '<section id="audit-result-list"')
  assert.match(card, /<ul aria-label=\{t\("mismatchFieldsTitle"\)\} className="space-y-3">/)
  assert.match(card, /<PaceBar value=\{data\.fieldBars\.distinctItems > 0 \? bar\.count \/ data\.fieldBars\.distinctItems : 0\} pace=\{null\} label=\{t\("fieldBarLabel", \{ field: bar\.label, count: formatCount\(bar\.count\), total: formatCount\(data\.fieldBars\.distinctItems\) \}\)\} behind=\{false\} \/>/)
  assert.match(card, /\{data\.fieldBars\.multipleFields \? <p className="mt-3 text-sm text-muted-foreground">\{t\("multipleFieldsNote"\)\}<\/p> : null\}/)
  assert.match(card, /t\("evidenceLine", \{ withPhoto: formatCount\(data\.evidence\.withPhoto\), checked: formatCount\(data\.evidence\.checked\) \}\)/)
  assert.match(card, /\{data\.componentsMissing > 0 \? \(/)
  assert.match(card, /pageHref\(roundWideFilters, \{ components: "missing" \}\)/)
})
```

Add the cancel button to the handle list in `tests/dialog-trigger-handles.test.ts:14-18`:

```ts
const cancelRound = "src/components/audit/audit-round-cancel-button.tsx"
// … in the for list:
  [cancelRound, "AuditRoundCancelButtonHandle"],
```

and a test after the not-found one:

```ts
test("the round cancel dialog opens through its handle and gives focus back to อื่น ๆ (group 2 spec §8)", () => {
  const source = read(cancelRound)
  assert.match(source, /useImperativeHandle\(ref, \(\) => \(\{ open: \(\) => setDialogOpen\(true\) \}\)\)/)
  assert.match(source, /\{hideTrigger \? null : \(/)
  assert.match(source, /<AccessibleDialog[\s\S]*?returnFocusRef=\{returnFocusRef\}[\s\S]*?onClose=\{closeDialog\}/)
  assert.match(source, /^export type AuditRoundCancellationImpact = \{/m)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/audit-round-page-rules.test.ts tests/audit-round-page-ui.test.ts tests/dialog-trigger-handles.test.ts`
Expected: FAIL.
- `audit-round-page-rules.ts` (Task 3's) has no step rules yet, and `auditRoundHrefQuery` is not in RF.
- The page still has the StatStrip totals, `AuditProgressBar` and the three `<a download>` exports.
- The cancel button has no handle.

- [ ] **Step 3: Add and change the words**

Write the change file in the session scratchpad (an absolute path, for example `<scratchpad>/g2p2-task4-messages.json`), run `node scripts/messages-edit.mjs <file>`, then delete the file. Namespace `auditRound`:

| Key | th | en |
|---|---|---|
| `openedBy` (new) | เปิดโดย {name} | Opened by {name} |
| `more` (new) | อื่น ๆ | More |
| `exportResult` (changed) | Excel ผลตรวจ | Excel results |
| `exportResultPdf` (changed) | PDF ผลตรวจ | PDF results |
| `exportVariance` (bug 12; th already set by Task 2, so only en changes here) | รายงานผลต่าง | Variance report |
| `exportFilteredHint` (new) | ตามตัวกรองที่เลือก | With the filters in use |
| `stepsLabel` (new) | ขั้นตอนของรอบตรวจ | Steps of the round |
| `stepWalk` (new) | เดินตรวจ | Walk |
| `stepReview` (new) | หัวหน้า IT พิจารณา | IT head decides |
| `stepClose` (new) | ปิดรอบ | Close |
| `nextStepTitle` (new) | ขั้นถัดไป: {step} | Next step: {step} |
| `stepsClosedTitle` (new) | รอบนี้ปิดแล้ว | This round is closed |
| `stepWalkChecked` (new) | ตรวจแล้ว {checked} / {total} | Checked {checked} / {total} |
| `stepWalkLeft` (new) | เหลือ {count} | {count} left |
| `stepReviewWaiting` (new) | รอ {count} | {count} waiting |
| `stepReviewDecided` (new) | พิจารณาแล้ว {count} | {count} decided |
| `nextStepReviewItems` (new) | พิจารณา {count} รายการ | Decide {count} items |
| `closeNoPendingItems` (new) | ไม่มีรายการรอตรวจ | No pending assets |
| `closePendingItemsCount` (new) | รายการรอตรวจ {count} | {count} pending assets |
| `closeNoPendingFindings` (new) | ไม่มีรายการไม่ตรงรอพิจารณา | No discrepancies waiting for a decision |
| `closePendingFindingsCount` (new) | รายการไม่ตรงรอพิจารณา {count} | {count} discrepancies waiting for a decision |
| `closeNoOpenActions` (new) | ไม่มีแผนแก้ไขค้าง | No open action plans |
| `closeOwnRoundNotice` (new) | ผู้เปิดรอบปิดรอบเองไม่ได้ ให้หัวหน้าคนอื่นปิด | You opened this round, so another head must close it |
| `resultDashboardHelp` (changed; also P2-R15's "ผู้ตรวจสอบ") | นับทั้งรอบ ไม่ขึ้นกับตัวกรองของรายการด้านล่าง พบตรง ไม่ตรง ไม่พบ และรอตรวจ รวมกันเท่ากับทั้งหมด | The whole round, whatever the list below is filtered by: matched, mismatched, not found and pending add up to the total |
| `mismatchShort` (new) | ไม่ตรง | Mismatched |
| `resultSegmentTitle` (new) | {result} {count} รายการ | {result}: {count} items |
| `outOfScopeExtra` (new) | พบเพิ่มนอกขอบเขต {count} | {count} more found out of scope |
| `mismatchFieldsTitle` (new) | ไม่ตรงเรื่องอะไร | What did not match |
| `fieldBarLabel` (new) | {field} {count} จาก {total} รายการที่มีเรื่องไม่ตรง | {field}: {count} of {total} items with a mismatch |
| `multipleFieldsNote` (new) | บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง | Some items differ in more than one field |
| `evidenceLine` (new) | รูปหลักฐาน: มี {withPhoto} จาก {checked} ที่ตรวจแล้ว | Photo evidence: {withPhoto} of {checked} checked |
| `evidenceChecklistLine` (new) | รูปครบตามรายการตรวจ {complete} · ยังไม่ครบ {incomplete} | Photo checklist complete {complete} · incomplete {incomplete} |
| `componentsMissingLine` (new) | เครื่องที่ส่วนควบไม่ครบ {count} | {count} assets missing a component |

Kept and reused:
- `resultDashboard` "สรุปผลตรวจนับ";
- `found`, `notFound`, `pending`, `viewAll`;
- `closeRound`, `closeConfirm`, `closeSuccess`;
- `closeSeparateApprover`: the met opener condition, which E2E `e2e-audit.test.ts:213` reads;
- `openActionsCount` "แผนแก้ไขค้าง {count}";
- `nextStepContinueScan` "เดินตรวจต่อ ({count})";
- `daysLeft`, `daysOverdue`;
- `pendingAssets`, `openFindingReview`;
- `cancelRound` and the `cancel*` keys;
- `statusCancelled`, `cancelledAt`, `cancelledBy`, `cancelledReadOnlyNotice`.

Glossary checks:
- "รายการไม่ตรง" in sentences and "ไม่ตรง" on the short cell (spec §5);
- "พิจารณา", never ตรวจทาน or Review;
- "แผนแก้ไข";
- no "หมวด" alone.

The `en` values avoid the Thai-only rules; `tests/thai-glossary.test.ts` reads th only.

Delete these keys; nothing reads them after this task:
- `resultNormalGroup`, `resultNeedsReviewGroup`;
- `viewResultItems`, `viewPendingReviewAssets`;
- `evidenceSummary`, `evidenceSummaryHelp`, `evidenceAttached`, `evidenceMissing`;
- `totalExpected`, `scanned`, `scan`;
- `closeChecklist`, `closeChecklistHelp`;
- `closePendingItems`, `closePendingFindings`, `closeOpenActions`;
- `checklistDrilldown`.

Before deleting each one, run `rg -n 't\("<key>"\)' src`. Keep the key if any reader's translator is `getTranslations("auditRound")` or `useTranslations("auditRound")`. `evidenceAttached` has readers in the print pages under another namespace, so check the namespace, not just the hit. Keep these, because other files read them:
- `progress` (the rounds list);
- `mismatch` (RF's label map);
- `status`, `items`, `result`, `assetTag`, `assetName`, `expectedLocation`, `expectedCustodian` (Task 5 decides them).

- [ ] **Step 4: Implement**

**`src/lib/audit-round-page-rules.ts`** (Task 3's file, still pure: relative `.ts` imports only). Add the import beside Task 3's imports, add "the next-step card's three steps and the main button that follows them" to the header comment's list, then append:

```ts
import { getLinearStepStates, type StepState } from "./step-states.ts"

export const auditRoundPageStepKeys = ["walk", "review", "close"] as const
export type AuditRoundPageStepKey = (typeof auditRoundPageStepKeys)[number]
export type AuditRoundPageSteps = { states: StepState[]; current: AuditRoundPageStepKey | null }

// The walk until nothing is pending, then the decisions, then the close: the close API's own first two conditions
// (audit-round-close.ts getAuditRoundCloseChecklist), so step 3 is reached exactly when only the plans and the opener
// rule can block it.
// A closed round has every step complete; a cancelled round has no card (its cancel box instead, P2-R8). A leftover
// draft reads as open (spec §14).
export function buildAuditRoundPageSteps({ status, pendingItems, pendingFindings }: { status: string; pendingItems: number; pendingFindings: number }): AuditRoundPageSteps | null {
  if (status === "cancelled") return null
  if (status === "closed") return { states: getLinearStepStates(auditRoundPageStepKeys.length, auditRoundPageStepKeys.length - 1, "complete"), current: null }
  const index = pendingItems > 0 ? 0 : pendingFindings > 0 ? 1 : 2
  return { states: getLinearStepStates(auditRoundPageStepKeys.length, index), current: auditRoundPageStepKeys[index] }
}

export type AuditRoundPageMainAction =
  | { kind: "walk"; count: number; target: "scan" | "pending" }
  | { kind: "review"; count: number }
  | { kind: "close"; disabled: boolean }
  | null

// The card's main button follows the step (spec §8): "เดินตรวจต่อ (N)" opens the scan page for audit:edit and the
// pending list for anyone else (spec §5, P2-R7); "พิจารณา N รายการ" counts the pending findings, the rows of the
// findings page it opens; at step 3 "ปิดรอบตรวจ" for audit:approve, disabled while a plan is open or for the opener
// (the API refuses both).
export function buildAuditRoundPageMainAction({ steps, pendingItems, pendingFindings, canClose, openedByViewer, canScan, canApprove }: {
  steps: AuditRoundPageSteps | null
  pendingItems: number
  pendingFindings: number
  canClose: boolean
  openedByViewer: boolean
  canScan: boolean
  canApprove: boolean
}): AuditRoundPageMainAction {
  if (!steps?.current) return null
  if (steps.current === "walk") return { kind: "walk", count: pendingItems, target: canScan ? "scan" : "pending" }
  if (steps.current === "review") return { kind: "review", count: pendingFindings }
  return canApprove ? { kind: "close", disabled: !canClose || openedByViewer } : null
}
```

**`src/lib/audit-round-result-filters.ts`**: add this after `buildAuditRoundPageHref`, then delete the summary-group code named in **Files**. `buildAuditRoundExportHref` and `AuditRoundExportEndpoint` stay as Task 1 wrote them (the filters in, the same params the page link writes, no page, page size, returnTo or hash).

```ts
// The query of a round-page link as URLSearchParams: the search's hidden inputs read it (Task 5), so the one writer
// (buildAuditRoundPageHref) decides every name and default (group 2 plan 2).
export function auditRoundHrefQuery(href: string): URLSearchParams {
  return new URLSearchParams(href.split("#")[0].split("?")[1] ?? "")
}
```

**`src/components/audit/audit-round-cancel-button.tsx`**:
- The import becomes `import { useImperativeHandle, useState, type FormEvent, type Ref, type RefObject } from "react"`.
- `type AuditRoundCancellationImpact` becomes `export type AuditRoundCancellationImpact`.
- Add `export type AuditRoundCancelButtonHandle = { open: () => void }`.
- The signature becomes:

```tsx
// The round's cancel dialog (spec 2D M26). Its owner, the round page header's อื่น ๆ menu (group 2 spec §8), renders it
// outside the menu with hideTrigger, opens it through the handle and passes its trigger as returnFocusRef (R-m).
export function AuditRoundCancelButton({
  roundId,
  impact,
  ref,
  hideTrigger = false,
  returnFocusRef,
}: {
  roundId: string
  impact: AuditRoundCancellationImpact
  ref?: Ref<AuditRoundCancelButtonHandle>
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
```

- After the state hooks, add `useImperativeHandle(ref, () => ({ open: () => setDialogOpen(true) }))`.
- The trigger is wrapped as `{hideTrigger ? null : (` … `)}`. Its inner `<Button variant="danger" busy={saving} onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">` block keeps its exact three lines, so pin `tests/audit-round-cancellation.test.ts:161` still matches.
- `<AccessibleDialog` gains `returnFocusRef={returnFocusRef}` before `onClose={closeDialog}`.
- The form, Field, footer and validate stay byte-for-byte. Pins `audit-round-cancellation:159-167`, `v-track2-u.test.ts:100-112`, `form-migration-guards.test.ts:111` (still `[1, 0, 0]`) and `validation-guards.test.ts:32,108` hold.

**`src/components/audit/audit-round-close-button.tsx`**: the button only.

```tsx
"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useApiError } from "@/components/ui/use-api-error"

// The close action of the round page's next-step card, shown at step 3 (group 2 spec §8, §13 bug 2): the card writes
// the four conditions the close API checks, this button asks first, then PATCHes { action: "close" } and refreshes.
export function AuditRoundCloseButton({ roundId, disabled }: { roundId: string; disabled: boolean }) {
  // router, apiError, t, tCommon, confirm, saving and closeRound(): unchanged from master :39-59
  return (
    <Button onClick={closeRound} busy={saving} disabled={disabled}>
      <Lock aria-hidden="true" />
      {t("closeRound")}
    </Button>
  )
}
```

**`src/components/audit/audit-round-header-menus.tsx`** (new):

```tsx
"use client"

import { useRef } from "react"
import { AlertTriangle, ChevronDown, Download, FileSpreadsheet, FileText, Scale } from "lucide-react"
import { useTranslations } from "next-intl"
import { AuditRoundCancelButton, type AuditRoundCancelButtonHandle, type AuditRoundCancellationImpact } from "@/components/audit/audit-round-cancel-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemDescription,
  DropdownMenuItemText,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type AuditRoundExportLinks = { excel: string; pdf: string; variance: string }

// The round page header's client part (group 2 spec §8): "ส่งออก ▾" with the three exports, each following the list's
// filters (the page builds the hrefs), then "อื่น ๆ ▾" with "ยกเลิกรอบตรวจ". The cancel dialog sits outside the menu
// with hideTrigger and opens through its handle; focus returns to "อื่น ๆ" (asset-detail-actions.tsx, R-m).
// exports comes only for audit:export, cancel only for audit:approve on an open round.
export function AuditRoundHeaderMenus({ exports, cancel }: { exports: AuditRoundExportLinks | null; cancel: { roundId: string; impact: AuditRoundCancellationImpact } | null }) {
  const t = useTranslations("auditRound")
  const tCommon = useTranslations("common")
  const moreTriggerRef = useRef<HTMLButtonElement | null>(null)
  const openingDialogRef = useRef(false)
  const cancelDialogRef = useRef<AuditRoundCancelButtonHandle | null>(null)

  return (
    <>
      {exports ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="md">
              <Download aria-hidden="true" />
              {tCommon("export")}
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuItem asChild>
              <a href={exports.excel} download>
                <FileSpreadsheet aria-hidden="true" />
                <DropdownMenuItemText>
                  {t("exportResult")}
                  <DropdownMenuItemDescription>{t("exportFilteredHint")}</DropdownMenuItemDescription>
                </DropdownMenuItemText>
              </a>
            </DropdownMenuItem>
            {/* the same item twice more: exports.pdf with <FileText aria-hidden="true" /> and t("exportResultPdf"),
                exports.variance with <Scale aria-hidden="true" /> and t("exportVariance") */}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {cancel ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button ref={moreTriggerRef} variant="outline" size="md">
              {t("more")}
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(event) => {
              if (!openingDialogRef.current) return
              openingDialogRef.current = false
              event.preventDefault()
            }}
          >
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                openingDialogRef.current = true
                cancelDialogRef.current?.open()
              }}
            >
              <AlertTriangle aria-hidden="true" />
              {t("cancelRound")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {cancel ? <AuditRoundCancelButton ref={cancelDialogRef} hideTrigger returnFocusRef={moreTriggerRef} roundId={cancel.roundId} impact={cancel.impact} /> : null}
    </>
  )
}
```

Write the two other export items out in full; the Step 1 test reads each one. `Scale` exists in lucide-react; if lint or tsc says it does not, use `FileDown`.

**The page** (`src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`).

Imports:
- Add:
  - `AuditRoundHeaderMenus`;
  - `ActionBarLink` (type) to the `@/components/ui/action-bar` import, which keeps its form `import { ActionBar, actionBarPagePadding, type ActionBarLink }`. Pin `mobile-action-bar.test.ts:106` reads `^import \{ ActionBar, actionBarPagePadding \} from`, so that line changes; see Step 6.
  - `DistributionBar`, `PaceBar`, `Steps`, `toneIcons`;
  - `formatPercent`, to the `@/lib/display-format` import;
  - `buildAuditRoundDueLine` (`@/lib/audit-rounds-list-rules`), `startOfBangkokDay` (`@/lib/waiting-work-rules`);
  - `auditRoundPageStepKeys`, `buildAuditRoundPageMainAction`, `buildAuditRoundPageSteps`, `type AuditRoundPageStepKey` (`@/lib/audit-round-page-rules`);
  - from RF: `auditFindingFields`, `auditFindingTypeByField`, `buildAuditRoundPageHref`, `parseAuditRoundListFilters`, `type AuditRoundListFilters`, `type AuditRoundPageHrefOverrides` (`buildAuditRoundExportHref` is imported since Task 2);
  - from lucide: `Check`, `ChevronRight`, `ListChecks`.
- Drop:
  - `AuditProgressBar`, `AuditRoundCancelButton`;
  - `buildAuditRoundResultSummaryGroups`, `type StatStripItem`;
  - `Download`, `AlertTriangle`, and any import lint reports unused.

At module level:

```ts
const WarningIcon = toneIcons.warning
```

After Task 3's data read and `returnToHref`:

```ts
  // Who may do what here (group 2 spec §5, P2-R7): audit:edit scans and corrects, audit:approve cancels and closes,
  // audit:export exports. Nobody is offered a control the API would refuse.
  const canScan = hasPermission(user, "audit", "edit")
  // Every link of the page's list (cards, chips, bars, paging, exports): one builder, the list's way back and page size
  // kept (group 2 plan 2). The cards are round-wide, so their links start from roundWideFilters (spec §5).
  const roundWideFilters = parseAuditRoundListFilters({})
  const pageHref = (target: AuditRoundListFilters, overrides: AuditRoundPageHrefOverrides = {}) =>
    buildAuditRoundPageHref(locale, round.id, target, { pageSize, returnTo: returnToHref, ...overrides })
  // The exports follow the list's filters (spec §8 "ตามตัวกรองที่เลือก"): Task 1's builder, Task 2's three lines, now
  // over the page's filters.
  const auditRoundExportHref = buildAuditRoundExportHref(round.id, "export", filters)
  const auditRoundExportPdfHref = buildAuditRoundExportHref(round.id, "export-pdf", filters)
  const auditRoundVarianceHref = buildAuditRoundExportHref(round.id, "variance-export", filters)
  const allResultHref = pageHref(roundWideFilters)
  // "เหลือ / เลยกำหนด N วัน" on an open round only, display only (spec §8, §15; plan 1 R26).
  const due = buildAuditRoundDueLine(round.status, round.endDate, startOfBangkokDay(new Date()))
```

`allResultHref` replaces master `:365`, and the list's empty states keep reading it. These master lines go:
- the per-bucket `*ResultHref` consts (`:366-372`);
- `resultSummaryGroups`, `resultSummaryItemConfig`, `resultNormalGroup`, `resultNeedsReviewGroup`, `resultStatItems` (`:435-466`);
- `closeChecklist`, `canCloseRound` (`:391-397`);
- Task 2's three export lines (master `:406-407`), replaced by the three above;
- `pendingCount`, `processedCount`, `foundCount`, `notFoundCount`, `mismatchCount` and `progress` (Task 3's locals) once nothing reads them (lint reports them).

Keep `isRoundCreator` only if something still reads it; `data.steps.close.openedByViewer` replaces it here.

The steps, the main action and the conditions:

```ts
  const stepsState = buildAuditRoundPageSteps({ status: round.status, pendingItems: data.steps.close.checklist.pendingItems, pendingFindings: data.steps.close.checklist.pendingFindings })
  const mainAction = buildAuditRoundPageMainAction({ steps: stepsState, pendingItems: data.steps.close.checklist.pendingItems, pendingFindings: data.steps.close.checklist.pendingFindings, canClose: data.steps.close.canClose, openedByViewer: data.steps.close.openedByViewer, canScan, canApprove })
  const stepLabels: Record<AuditRoundPageStepKey, string> = { walk: t("stepWalk"), review: t("stepReview"), close: t("stepClose") }
  const stepItems = stepsState ? auditRoundPageStepKeys.map((key, index) => ({ id: key, label: stepLabels[key], state: stepsState.states[index] })) : []
  // The main step as a link (the close is a button, in the card only): the card's head and the phone bar's primary.
  const mainLink =
    mainAction?.kind === "walk"
      ? { href: mainAction.target === "scan" ? scanHref : pendingHref, label: t("nextStepContinueScan", { count: formatCount(mainAction.count) }), icon: mainAction.target === "scan" ? <ScanLine className="h-4 w-4" /> : <ListChecks className="h-4 w-4" /> }
      : mainAction?.kind === "review"
        ? { href: pendingReviewFindingsHref, label: t("nextStepReviewItems", { count: formatCount(mainAction.count) }), icon: <FileText className="h-4 w-4" /> }
        : null
  // The four conditions the close API checks (audit-round-close.ts getAuditRoundCloseChecklist, and the route's
  // closeOwnRound), each linked to its rows while it blocks; the counts are the API's (findings, P2-R3). The opener is
  // told they cannot close (spec §8).
  const checklist = data.steps.close.checklist
  const closeConditions = [
    { key: "pendingItems", ok: checklist.pendingItems === 0, label: checklist.pendingItems === 0 ? t("closeNoPendingItems") : t("closePendingItemsCount", { count: formatCount(checklist.pendingItems) }), href: pendingHref },
    { key: "pendingFindings", ok: checklist.pendingFindings === 0, label: checklist.pendingFindings === 0 ? t("closeNoPendingFindings") : t("closePendingFindingsCount", { count: formatCount(checklist.pendingFindings) }), href: pendingReviewFindingsHref },
    { key: "openActions", ok: checklist.openActions === 0, label: checklist.openActions === 0 ? t("closeNoOpenActions") : t("openActionsCount", { count: formatCount(checklist.openActions) }), href: openActionFindingsHref },
    { key: "opener", ok: !data.steps.close.openedByViewer, label: data.steps.close.openedByViewer ? t("closeOwnRoundNotice") : t("closeSeparateApprover") },
  ]
  const barActions: ActionBarLink[] = [
    ...(mainLink ? [{ ...mainLink, primary: true }] : []),
    ...(mainLink?.href === pendingHref ? [] : [{ href: pendingHref, label: t("pendingAssets"), icon: <ListChecks className="h-4 w-4" /> }]),
    ...(mainAction?.kind === "review" ? [] : [{ href: pendingReviewFindingsHref, label: t("openFindingReview"), icon: <FileText className="h-4 w-4" /> }]),
    { href: returnToHref, label: tCommon("back"), icon: <ArrowLeft className="h-4 w-4" /> },
  ]
  // The result card is round-wide (spec §5, §8): each cell opens its result with every other filter cleared, so its
  // count is the rows it opens; พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด (P2-R2). Out-of-scope finds sit apart.
  const resultCells = ([
    ["found", t("found"), data.resultCard.found, "success"],
    ["mismatch", t("mismatchShort"), data.resultCard.mismatch, "warning"],
    ["not_found", t("notFound"), data.resultCard.notFound, "danger"],
    ["pending", t("pending"), data.resultCard.pending, "muted"],
  ] as const).map(([result, label, count, tone]) => ({ result, label, count, tone, href: pageHref(roundWideFilters, { result }) }))
  // ไม่ตรงเรื่องอะไร (spec §8, P2-R16): round-wide, so each bar opens its field with the other filters cleared.
  const fieldBarRows = auditFindingFields.map((field) => ({
    field,
    label: tFinding(`type_${auditFindingTypeByField[field]}`),
    count: data.fieldBars.counts[field],
    href: pageHref(roundWideFilters, { field }),
  }))
```

The `"opener"` entry has no `href`, so the closures that render it narrow on `condition.href`. `scanHref` and `pendingHref` keep their master definitions (`:302-303`).

The render, from the root to just before `<section id="audit-result-list"`:

```tsx
    <div className={actionBarPagePadding.single}>
      <PageHeader
        className="mb-6"
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: round.auditNo, code: true },
        ]}
        title={round.name}
        meta={
          <>
            <span className="tag">{round.auditNo}</span>
            <StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={effectiveAuditRoundStatus(round.status)} />
            <span>
              {formatDate(round.startDate)} – {formatDate(round.endDate)}
            </span>
            {due ? <span className={due.kind === "overdue" ? "text-danger" : "text-warning"}>{due.kind === "overdue" ? t("daysOverdue", { days: formatCount(due.days) }) : t("daysLeft", { days: formatCount(due.days) })}</span> : null}
            {data.round.createdByLabel ? <span>{t("openedBy", { name: data.round.createdByLabel })}</span> : null}
          </>
        }
        actions={
          canExportRound || (canApprove && !isRoundReadOnly) ? (
            <AuditRoundHeaderMenus
              exports={canExportRound ? { excel: auditRoundExportHref, pdf: auditRoundExportPdfHref, variance: auditRoundVarianceHref } : null}
              cancel={canApprove && !isRoundReadOnly ? { roundId: round.id, impact: cancelImpact } : null}
            />
          ) : undefined
        }
      />
      {!isRoundReadOnly ? <ActionBar label={tCommon("actions")} actions={barActions} /> : null}

      {/* the cancelled box: master :533-545, unchanged (pins audit-pages-sweep-ui:123-124) */}

      {stepsState ? (
        <ContentPanel
          divided
          title={stepsState.current ? t("nextStepTitle", { step: stepLabels[stepsState.current] }) : t("stepsClosedTitle")}
          className="mb-6"
          actions={
            mainAction?.kind === "close" ? (
              <AuditRoundCloseButton roundId={round.id} disabled={mainAction.disabled} />
            ) : mainLink ? (
              <Link href={mainLink.href} className={buttonVariants({ size: "md" })}>
                {mainLink.icon}
                {mainLink.label}
              </Link>
            ) : undefined
          }
        >
          <Steps label={t("stepsLabel")} steps={stepItems} />
          {/* Steps holds one short label per step (P2-R8): each step's line sits under the rail, its heading for the
              phone, where the rail's labels are screen-reader only. */}
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-meta font-medium text-muted-foreground md:sr-only">{stepLabels.walk}</h3>
              <p className="text-foreground">
                <span className="num">{t("stepWalkChecked", { checked: formatCount(data.steps.walk.checked), total: formatCount(data.steps.walk.total) })}</span>
                {" · "}
                {data.steps.walk.left > 0 ? (
                  <Link href={pendingHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>{t("stepWalkLeft", { count: formatCount(data.steps.walk.left) })}</Link>
                ) : (
                  <span className="text-muted-foreground">{t("stepWalkLeft", { count: formatCount(0) })}</span>
                )}
              </p>
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-meta font-medium text-muted-foreground md:sr-only">{stepLabels.review}</h3>
              <p className="text-foreground">
                {/* Findings, so "รอ n" is the rows of the findings page it opens, as "พิจารณา n รายการ" is (P2-R26). */}
                {data.steps.review.pendingFindings > 0 ? (
                  <Link href={pendingReviewFindingsHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>{t("stepReviewWaiting", { count: formatCount(data.steps.review.pendingFindings) })}</Link>
                ) : (
                  <span className="text-muted-foreground">{t("stepReviewWaiting", { count: formatCount(0) })}</span>
                )}
                {" · "}
                <span className="num">{t("stepReviewDecided", { count: formatCount(data.steps.review.decidedFindings) })}</span>
              </p>
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-meta font-medium text-muted-foreground md:sr-only">{stepLabels.close}</h3>
              <ul className="space-y-1">
                {closeConditions.map((condition) => (
                  <li key={condition.key} className="flex items-start gap-2">
                    {condition.ok ? (
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <WarningIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                    )}
                    {!condition.ok && condition.href ? (
                      <Link href={condition.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>{condition.label}</Link>
                    ) : (
                      <span className={condition.ok ? "text-muted-foreground" : "text-foreground"}>{condition.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ContentPanel>
      ) : null}

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <ContentPanel divided title={t("resultDashboard")} description={t("resultDashboardHelp")}>
          <DistributionBar segments={resultCells.map((cell) => ({ key: cell.result, count: cell.count, tone: cell.tone, href: cell.href, title: t("resultSegmentTitle", { result: cell.label, count: formatCount(cell.count) }) }))} />
          {/* The cells are the bar's words (The Data Bars Rule): every count and the same links. */}
          <StatStrip
            className="mt-4"
            items={[
              { key: "all", label: t("viewAll"), value: formatCount(data.resultCard.all), href: data.resultCard.all > 0 ? pageHref(roundWideFilters) : undefined },
              ...resultCells.map((cell) => ({ key: cell.result, label: cell.label, value: formatCount(cell.count), href: cell.count > 0 ? cell.href : undefined, foot: data.resultCard.all > 0 ? formatPercent(cell.count / data.resultCard.all) : undefined })),
            ]}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            {data.resultCard.outOfScope > 0 ? (
              <Link href={pageHref(roundWideFilters, { result: "out_of_scope" })} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>{t("outOfScopeExtra", { count: formatCount(data.resultCard.outOfScope) })}</Link>
            ) : (
              t("outOfScopeExtra", { count: formatCount(0) })
            )}
          </p>
        </ContentPanel>

        <ContentPanel divided title={t("mismatchFieldsTitle")}>
          <ul aria-label={t("mismatchFieldsTitle")} className="space-y-3">
            {fieldBarRows.map((bar) => (
              <li key={bar.field} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
                {bar.count > 0 ? (
                  <Link href={bar.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>{bar.label}</Link>
                ) : (
                  <span className="text-muted-foreground">{bar.label}</span>
                )}
                <span className="num font-semibold text-foreground">{formatCount(bar.count)}</span>
                <span className="col-span-2 block">
                  <PaceBar value={data.fieldBars.distinctItems > 0 ? bar.count / data.fieldBars.distinctItems : 0} pace={null} label={t("fieldBarLabel", { field: bar.label, count: formatCount(bar.count), total: formatCount(data.fieldBars.distinctItems) })} behind={false} />
                </span>
              </li>
            ))}
          </ul>
          {data.fieldBars.multipleFields ? <p className="mt-3 text-sm text-muted-foreground">{t("multipleFieldsNote")}</p> : null}
          <div className="mt-4 space-y-1 border-t border-border-soft pt-4 text-sm text-muted-foreground">
            <p>{t("evidenceLine", { withPhoto: formatCount(data.evidence.withPhoto), checked: formatCount(data.evidence.checked) })}</p>
            {data.evidence.checklistComplete + data.evidence.checklistIncomplete > 0 ? (
              <p>{t("evidenceChecklistLine", { complete: formatCount(data.evidence.checklistComplete), incomplete: formatCount(data.evidence.checklistIncomplete) })}</p>
            ) : null}
            {data.componentsMissing > 0 ? (
              <p>
                <Link href={pageHref(roundWideFilters, { components: "missing" })} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
                  {t("componentsMissingLine", { count: formatCount(data.componentsMissing) })}
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              </p>
            ) : null}
          </div>
        </ContentPanel>
      </div>
```

Notes for the implementer:
- The bars are scaled to `distinctItems`, the items with any counted field finding. Each bar reads "N of the items that differ", and the bars may add up to more than 100% (P2-R18). The checklist line keeps Appendix A §8's "รูปครบ / ไม่ครบตามรายการตรวจ".
- Only one `ArrowLeft` is left on the page: the bar's back item. Guard LB1's exact count of 1 holds (`tests/list-frame-guards.test.ts:148`). Do not add another back control.
- `getAuditRoundStatusLabel` and the single header `StatusBadge` stay. Pin `tests/audit-round-status.test.ts:48-49` holds: exactly one.

`src/lib/dashboard-overview-rules.ts:76`: the comment becomes `/** A whole percent, as the round page and the rounds list show it. */`, because `audit-progress-bar.tsx` is gone.

`DESIGN.md:294`: replace the rule's last two sentences, keeping them in the same paragraph (no blank line):

> The audit scan header's bar is an older progress bar; it keeps its own markup until group 2 plan 3 moves it onto `PaceBar`. The rounds list draws each round's progress and the year's coverage with `PaceBar` (group 2 plan 1); the round page draws its result as a `DistributionBar` beside the cells that carry every count and link, and its field bars as `PaceBar`s (group 2 plan 2).

Delete `src/components/audit/audit-progress-bar.tsx` (`git rm`).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-round-page-rules.test.ts tests/audit-round-page-ui.test.ts tests/dialog-trigger-handles.test.ts`
Expected: PASS.

- [ ] **Step 6: Rewrite the pins this task breaks**

`tests/audit-pages-sweep-ui.test.ts`:
- `:14-23`: delete the "audit progress bar" test (the component is gone).
- `:25-35` ("audit round close"): the title becomes "audit round close: the shared busy Button only; the next-step card writes the conditions (spec 2D D7; group 2 spec §8, §13 bug 2)". Keep `:28` and `:34`. Replace `:27` and `:29-33` with:

  ```ts
  assert.doesNotMatch(source, /<ContentPanel\b|<StatStrip\b|<Notice\b|checklist/)
  ```

- `:121` title: append "; group 2 spec §8: the next-step card, the result card and ไม่ตรงเรื่องอะไร".
- `:125` becomes:

  ```ts
  assert.match(source, /<ContentPanel\s+divided\s+title=\{stepsState\.current \?/)
  ```

- `:126-128` become:

  ```ts
  for (const key of ["resultDashboard", "mismatchFieldsTitle"]) assert.match(source, new RegExp(`<ContentPanel divided title=\\{t\\("${key}"\\)\\}`), key)
  ```

- `:134`: drop `text-danger|` from the alternation. The due line uses it, as the rounds list's dates do (plan 1 Task 6). Add after it:

  ```ts
  assert.equal(source.match(/text-danger/g)?.length, 1, "only the overdue line")
  ```

`tests/audit-round-result-drilldown.test.ts`:
- `:9`: remove `buildAuditRoundResultSummaryGroups` from the import. `:86-108`: delete the "summary separates normal results" test.
- `:139-142`, `:144`: replace with

  ```ts
  assert.match(page, /href: pageHref\(roundWideFilters, \{ result \}\)/)
  assert.match(page, /href: cell\.count > 0 \? cell\.href : undefined/)
  ```

  Keep `:143`, `:145-153`. `:154` is Task 5's.
- `:157-167` (export links): the title becomes "audit round exports follow every filter of the list (group 2 spec §8 ตามตัวกรองที่เลือก)", and the body becomes:

  ```ts
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  const menus = readFileSync("src/components/audit/audit-round-header-menus.tsx", "utf8")
  assert.match(page, /const auditRoundExportHref = buildAuditRoundExportHref\(round\.id, "export", filters\)/)
  assert.match(page, /const auditRoundExportPdfHref = buildAuditRoundExportHref\(round\.id, "export-pdf", filters\)/)
  assert.match(menus, /href=\{exports\.excel\}/)
  assert.match(menus, /href=\{exports\.pdf\}/)
  ```

- `:246-267` (close checklist): keep `:252`, `:253`, `:255-257` (the conditions keep `href: pendingHref`, `href: pendingReviewFindingsHref`, `href: openActionFindingsHref`). Replace `:254` with `assert.match(page, /closeConditions/)`. Replace `:259-262` with:

  ```ts
  assert.doesNotMatch(closeButton, /href\?: string|<StatStrip\b/)
  ```

  `:264-266` check `closeNoPendingItems` instead of `checklistDrilldown`.
- `:384` (Task 2's export-href pin, `buildAuditRoundExportHref(round.id, "export", resultListState)`; `:157-167` above now pins the export hrefs over `filters`) becomes:

  ```ts
  assert.match(page, /const pageHref = \(target: AuditRoundListFilters, overrides: AuditRoundPageHrefOverrides = \{\}\) =>/)
  ```

`tests/audit-round-counts.test.ts`, the test Task 3 rewrote (master `:93-106`): delete its `pendingCount` / `processedCount`, `progress`, `totalExpected`, `scanned` and `<AuditProgressBar` asserts (the totals StatStrip and the bar are gone), then add:

```ts
assert.doesNotMatch(page, /AuditProgressBar|t\("totalExpected"\)/, "the next-step card replaced the totals (spec §8)")
```

Its `cancelImpact`, `processedItems` and `doesNotMatch` asserts stay as Task 3 wrote them.

`tests/audit-round-list-filters.test.ts` (Task 1), the test "the round page keeps every parsed filter …": delete the `for` loop over `wrongLocation` / `wrongCustodian` / `wrongCondition` (the boxes and their `*ResultHref` consts are gone; the field bars' `pageHref(roundWideFilters, { field })` is pinned in `audit-round-page-ui.test.ts`). The rest of that test stays until Task 5.

`tests/audit-round-exports.test.ts` (Task 2's round-page test, as Task 3 left it):
- the three `buildAuditRoundExportHref\(round\.id, "…", resultListState\)` pins read `filters` in place of `resultListState`;
- delete the `\{ result: "out_of_scope", count: data\.resultCard\.outOfScope \}` pin: the box is gone, and the result card's "พบเพิ่มนอกขอบเขต" line (pinned in `audit-round-page-ui.test.ts`) reads the same count.

`tests/phase2d-final-ui.test.ts:135-138` become:

```ts
const roundMenus = read(`${C}audit/audit-round-header-menus.tsx`)
assert.match(roundMenus, /<a href=\{exports\.excel\} download>/)
assert.match(roundMenus, /<a href=\{exports\.pdf\} download>/)
assert.match(roundMenus, /<a href=\{exports\.variance\} download>/)
```

`C` is the file's `src/components/` constant, already used at `:140`.

`tests/operational-return-navigation.test.ts:66` becomes:

```ts
assert.match(detailSource, /href: pageHref\(roundWideFilters, \{ result \}\)/)
```

`:63-65` hold (`roundDetailReturnHref`, `pendingHref`, `scanHref`).

`tests/list-pages-ui.test.ts:364` (`current: resultListState.result === item.result`, the old bucket cell): delete it. Task 5 pins the TabNav's `current`.

`tests/mobile-action-bar.test.ts:106`: the import pin becomes

```ts
/^import \{ ActionBar, actionBarPagePadding, type ActionBarLink \} from "@\/components\/ui\/action-bar"$/m
```

for the audit round only. Split the loop's assertion at `:106` as `route === "audit/rounds/[id]" ? <new> : <old>`. `:101` (the round's root-padding pin) and `:120` hold.

`tests/audit-round-cancellation.test.ts:95` becomes:

```ts
assert.match(detail, /<AuditRoundHeaderMenus\b/)
assert.match(readFileSync("src/components/audit/audit-round-header-menus.tsx", "utf8"), /<AuditRoundCancelButton ref=\{cancelDialogRef\} hideTrigger/)
```

`tests/audit-rounds-ux.test.ts:186-190`: the title becomes "DESIGN.md: the rounds list and the round page draw their bars with the shared parts; the scan header's bar waits for plan 3 (group 2 plans 1 and 2)". The asserts become:

```ts
assert.ok(rule.includes("The audit scan header's bar is an older progress bar; it keeps its own markup until group 2 plan 3 moves it onto `PaceBar`."))
assert.ok(rule.includes("The rounds list draws each round's progress and the year's coverage with `PaceBar` (group 2 plan 1); the round page draws its result as a `DistributionBar`"))
assert.ok(!rule.includes("AuditProgressBar"))
```

`tests/data-bars.test.ts:91`: the phrase `` "`AuditProgressBar`" `` becomes `"The audit scan header's bar"`.

These stay unchanged and must pass:
- `tests/e2e-fixes.test.ts:71`;
- `tests/audit-round-status.test.ts:41-49`;
- `tests/list-pages-ui.test.ts:359` (`<StatStrip` is the result card's), `:362`, `:363`;
- `tests/list-frame-guards.test.ts` (LB1 1 for the page; LN2: no local function named like a shared part);
- `tests/breadcrumbs-ui.test.ts:51`;
- `tests/audit-pages-sweep-ui.test.ts:37-45` (the cancel dialog body), `:123-124`, `:129-133`;
- `tests/audit-round-cancellation.test.ts:96-122`, `:159-167`;
- `tests/dropdown-menus-ui.test.ts`.

- [ ] **Step 7: Run everything**

Run: `node --test tests/audit-round-page-rules.test.ts tests/audit-round-page-ui.test.ts tests/dialog-trigger-handles.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-round-counts.test.ts tests/audit-round-list-filters.test.ts tests/audit-round-exports.test.ts tests/phase2d-final-ui.test.ts tests/operational-return-navigation.test.ts tests/list-pages-ui.test.ts tests/mobile-action-bar.test.ts tests/audit-round-cancellation.test.ts tests/audit-rounds-ux.test.ts tests/data-bars.test.ts tests/audit-round-status.test.ts tests/e2e-fixes.test.ts tests/list-frame-guards.test.ts tests/breadcrumbs-ui.test.ts tests/v-track2-u.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit`
Expected: PASS, and `tsc` is clean.

Then run `npm test` and `npm run lint`. Expected: both pass. If a pin outside this list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 8: Check `ContentPanel`'s actions box elsewhere (§13 bug 2's second half, P2-R30)**

The close button's squeeze came from its panel's actions box. Check every other `ContentPanel` that passes `actions` for the same squeeze:
1. List them: `rg -l -U "<ContentPanel[^>]*?\bactions=" src --glob "*.tsx"` (23 files on master `f8269894`, the round page and `audit-round-close-button.tsx` among them; both are this task's).
2. For each other file, read what it puts in `actions`. A squeeze is an action cut, overflowing its panel or pushed over its edge at 1280 or 1440 with the sidebar open, or at 375: a fixed width on a button (`w-30`, `w-32`, …), `whitespace-nowrap` or `truncate` on a long label, or `shrink-0` controls in a row that cannot wrap. `ContentPanel` itself wraps its head (`flex-wrap` on the divided head, `flex-col` then `sm:flex-row sm:flex-wrap` on the plain one), so most uses are fine.
3. Fix only a squeeze found, in that file, with shared classes and parts (no new tokens). Do not change `content-panel.tsx` unless the squeeze is in it; if it is, pin the fix in `tests/audit-round-page-ui.test.ts`.
4. Write the list and the verdict per file (fine, or what was fixed) in the task report.
5. This task's own panel: "ปิดรอบตรวจ" (and the other main buttons) sit in the next-step card's head as ContentPanel `actions` (P2-R8). That button must not overflow, be cut or be pushed past the card's edge at 390px and at 1440px with the sidebar open. The look step checks it at both widths; record the result in the task report.

If anything changed, run Step 7 again and add the changed files to the commit.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" src/components/audit/audit-round-header-menus.tsx src/components/audit/audit-round-cancel-button.tsx src/components/audit/audit-round-close-button.tsx src/lib/audit-round-page-rules.ts src/lib/audit-round-result-filters.ts src/lib/dashboard-overview-rules.ts DESIGN.md messages/th.json messages/en.json tests/audit-round-page-rules.test.ts tests/audit-round-page-ui.test.ts tests/dialog-trigger-handles.test.ts tests/audit-pages-sweep-ui.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-round-counts.test.ts tests/audit-round-list-filters.test.ts tests/audit-round-exports.test.ts tests/phase2d-final-ui.test.ts tests/operational-return-navigation.test.ts tests/list-pages-ui.test.ts tests/mobile-action-bar.test.ts tests/audit-round-cancellation.test.ts tests/audit-rounds-ux.test.ts tests/data-bars.test.ts
# plus any file Step 8 fixed
git rm src/components/audit/audit-progress-bar.tsx
git commit -m "feat(audit-round): the round page's top: ส่งออก ▾ with the three exports following the list's filters and อื่น ๆ ▾ holding the cancel, the opener and the days left in the header, a next-step card of three Steps with each step's line and ปิดรอบตรวจ inside it at step 3, a round-wide result card (DistributionBar and five cells, out-of-scope apart) and ไม่ตรงเรื่องอะไร per field with the photo and missing-component lines (group 2 plan 2 task 4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Round page list: result and category chips, the filter row, the search bar, the new columns, phone cards

The list section `#audit-result-list` is redrawn (spec §8 "Filters above the table", "The table", "Phone"):
1. **Head:** the title and help, "N รายการตรวจ", and "ไปพิจารณารายการไม่ตรง". The review link follows the field in use (`wrong_department` included) or the review result.
2. **Result chips:** a `TabNav` "ผลตรวจ" with counts. ทั้งหมด / รอตรวจ / พบตรง / ไม่ตรง / ไม่พบ / นอกขอบเขต / รอพิจารณา, each counting within every other filter (§5).
3. **Category chips:** a `TabNav` "หมวดหมู่": "ทุกหมวดหมู่ N", the top six, then "อื่น ๆ N".
   - It counts within the result in use and the other filters.
   - A selected category outside the six stays as its own chip (P2-R11).
   - The row is hidden at ≤ 1 category (P2-R24).
4. **Filter row:** a `FilterChipList` of company, branch, category, field and "ส่วนควบไม่ครบ N". Each chip is removable and keeps the rest; "ล้างตัวกรองทั้งหมด" clears them all.
5. **The table frame:**
   - The search sits in the top bar. Its placeholder names code, name and the location.
   - Then the phone cards, the table and the pagination.
6. **Columns:** ผล / ทรัพย์สิน (name, code under it) / สิ่งที่ต่าง / ตรวจโดย + เวลา / รูป / พิจารณา / ⋯.
   - The row keeps its extras: the component badges, the latest correction box and "ไม่พบ: <name> (<tag>)" for missing components. The tag opens this round page searched by it (P2-R17).
   - ⋯ holds "แก้ไขผลตรวจ", shown only with audit:edit and never on an out-of-scope row (P2-R4, P2-R7), and "ดู".

Every href in the section comes from Task 4's `pageHref`.

**Files:**
- Modify: `src/lib/audit-round-page-rules.ts`: add `auditRoundResultBadge`, `auditRoundItemReviewState`, `auditRoundReviewStateTone`, `auditRoundDifferences`
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`:
  - the derived list values (master `:304-332`, `:333-364`, `:373-388`, `:408-434` as Task 3 left them);
  - the `<section id="audit-result-list">` render (master `:611-833`);
  - the module-level parts after `getAuditRoundStatusLabel`;
  - `buildAuditRoundComponentRelationshipLines` stays.
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- Test:
  - extend `tests/audit-round-page-rules.test.ts` and `tests/audit-round-page-ui.test.ts`;
  - modify `tests/list-pages-ui.test.ts:359, 365, 367, 369`, `tests/audit-round-result-drilldown.test.ts:154, 372, 380-383`, `tests/audit-item-status-labels.test.ts:69-74`;
  - modify the earlier tasks' page pins this task retires: `tests/audit-round-list-filters.test.ts` (Task 1's "until Task 5" test) and `tests/audit-round-exports.test.ts` (Task 2's edit-gate pins).

**Interfaces:**
- Consumes:
  - **Task 4:** `pageHref(target, overrides?)`, `roundWideFilters`, `allResultHref`, `canScan`, `pendingReviewFindingsHref`, and the RF helpers `auditRoundHrefQuery` (Task 4), `auditFindingTypeByField` (Task 1), `auditRoundResultPageSizeOptions` (master).
  - **Task 1:** `AuditRoundResultFilter` (`all | pending | found | mismatch | not_found | out_of_scope | pending_review`), `AuditRoundListFilters` (`categoryId` may be `"other"`, `field: AuditFindingField | null`, `components: "missing" | null`), `auditFindingFields`, `parseAuditRoundResultListParams`.
  - **Task 3** (`data`, and the page's `filters`, `page`, `pageSize`, `filterCompany`, `filterBranch`):
    - `data.resultChips: { all; pending; found; mismatch; notFound; outOfScope; pendingReview }`, each within the filters with the result not applied (`pendingReview` counts items, P2-R3).
    - `data.categoryChips: AuditRoundCategoryChips` = `{ visible; all; top; other; selected }`:
      - `visible` is false when the round holds ≤ 1 category (P2-R24);
      - `all` is "ทุกหมวดหมู่ N" (the rows with the category not applied);
      - `top` is the six largest over every result, `{ id; code; name; count }`, equal counts in id order, each counted within the result in use (0 allowed, P2-R11);
      - `other` is `{ categories; count }`, the rest, "อื่น ๆ N" (`categoryId=other`, P2-R11);
      - `selected` is the chosen category when it is outside the six (its own chip, P2-R11), else `null`.
    - `data.filterNames.category: { code; name } | null`, read for a real `categoryId`. An unknown id redirects in Task 3, as the company does (P2-R31; this task adds no redirect of its own).
    - `data.componentsMissingInFilters: number`.
    - `data.findingValueLabels: Map<string, string>`, read with `formatFindingValue(findingType, value, labels)` (`src/lib/audit-finding-labels.ts`).
    - `data.total: number`, and `data.rows: AuditRoundPageRow[]` where a row is:
      - `{ id; assetId; auditStatus: string; auditResult: string | null; scannedBy; scannedAt }` (the item);
      - `asset: { id; assetTag; name; currentLocation; custodian; condition; parentComponents; installedInLinks }` (Task 3's `rowInclude`);
      - `findings: { id; findingType; expectedValue: string | null; actualValue: string | null; reviewStatus; actionTaken: string | null; reportedBy; reportedAt }[]` in `reportedAt`, `id` order;
      - `checkedBy: { label: string; at: Date } | null`: the scanner and the first scan time (`scannedAt`), or for a not-found the latest `not_found` finding's reporter and time, because mark-not-found sets neither;
      - `hasPhoto: boolean | null` (`null` for a pending item), by the per-asset attachment rule;
      - `missingComponents: { id; assetTag; name }[]`;
      - `correctionHistory: AuditCorrectionHistoryItem[]`, latest first (its first is the row's latest correction).
    - `resultListTotal` (= `data.total`; pin `audit-pages-sweep-ui:129`).
  - **Shared parts:**
    - `TabNav({ "aria-label", items: { key, label, href, count? }[], current })` (`tab-nav.tsx:43`);
    - `FilterChipList({ chips, label, removeLabel, clearAll?, className? })` (`filter-chips.tsx:24`);
    - `RowActions({ code, name, menuLabel, next, groups })`, where a link item is `{ kind: "link", key, label, href, icon? }` and `next={undefined}` leaves no 120px slot (`row-actions.tsx:43-54`, `:296`);
    - `MasterDataSearch({ action, defaultValue, placeholder, submitLabel, hiddenInputs })`;
    - `ClickableTableRow({ href, label })`;
    - `StatusBadge({ label, tone })`, `Chip`, `KeyValueList`, `Nil`, `Notice`.
- Produces:
  - `src/lib/audit-round-page-rules.ts`:
    - `auditRoundResultBadge(auditStatus, auditResult): { labelKey: "pending" | "found" | "confirmedWithParent" | "mismatch" | "notFound" | "outOfScope"; tone: StatusTone }`;
    - `auditRoundItemReviewState(reviewStatuses: readonly string[]): "pending" | "exception" | "approved" | "rejected" | null`;
    - `auditRoundReviewStateTone`;
    - `auditRoundDifferences(findings)`.
  - In the page: `listHref = pageHref(filters, { page })`, the way back of each row's "แก้ไขผลตรวจ"; and `const { page, pageSize, ...filters } = parseAuditRoundResultListParams(rawSearchParams)` in place of Task 1's `resultListState` and Task 3's destructure (`itemFilters` goes too).
  - **The markup Task 7's E2E stands on** (all inside `section#audit-result-list`):
    - **Count line:** `<span class="num …">N</span> รายการตรวจ`. N is the filtered rows.
    - **`navigation` "ผลตรวจ"** (the first `[data-slot="tab-nav"]` in `<main>`, so plan 1's `expectTabs` works):
      - seven links in this order: ทั้งหมด, รอตรวจ, พบตรง, ไม่ตรง, ไม่พบ, นอกขอบเขต, รอพิจารณา;
      - each name matches `^<label>\s*<count>$`, and the current one has `aria-current="page"`.
    - **`navigation` "หมวดหมู่"** (only with ≥ 2 categories):
      - "ทุกหมวดหมู่ N", then the category names (up to six, each href `categoryId=<id>`), then "อื่น ๆ N" (`categoryId=other`, when categories are left over or it is chosen), then the chosen category when it is outside the six;
      - `aria-current="page"` on the chosen one, or on "ทุกหมวดหมู่".
    - **`group` "ตัวกรองที่ใช้อยู่"**:
      - links named "ล้างตัวกรองนี้: บริษัท: …", "ล้างตัวกรองนี้: สาขา: …", "ล้างตัวกรองนี้: หมวดหมู่: <name>" (or "หมวดหมู่: อื่น ๆ"), "ล้างตัวกรองนี้: <field word>" (for example "ล้างตัวกรองนี้: แผนกไม่ตรง") and "ล้างตัวกรองนี้: ส่วนควบไม่ครบ N";
      - then the link "ล้างตัวกรองทั้งหมด".
    - **Search:**
      - `search` form whose field is named "ค้นหา", with the placeholder "ค้นหารหัสทรัพย์สิน ชื่อ หรือที่ตั้ง";
      - submitting keeps every filter and goes to page 1.
    - **Desktop rows:** `tbody tr`, each named "ดู: <tag>". The cells in order:
      1. the ผล badge: รอตรวจ, พบตรง, ยืนยันกับทรัพย์สินหลัก, รายการไม่ตรง, ไม่พบ or นอกขอบเขต;
      2. the name, then the tag under it;
      3. the differences, one `li` each: "<field word>: <expected> → <actual>", followed by the chip "ส่วนควบ" on a component's;
      4. the checker's name and the date and time;
      5. "มีรูป" or "ไม่มีรูป";
      6. the review badge: รอพิจารณา, ต้องตรวจสอบพิเศษ, อนุมัติแล้ว or ปฏิเสธแล้ว;
      7. ⋯.

      An unchecked row shows the empty value (—) in cells 3-6.
    - **Phone cards:** `article`. The tag link, the ผล badge, the name, the same extras, and a `KeyValueList` with สิ่งที่ต่าง / ตรวจโดย / รูป / พิจารณา. The "แก้ไขผลตรวจ" outline link appears for audit:edit only, and not on an out-of-scope row.
    - **Missing components:** under the name, one `li` per component: "ไม่พบ: <name> (<tag>)". The tag is a link named exactly the tag; its href is this round page with `search=<tag>` and no other filter.
    - **⋯:**
      - `button` "การดำเนินการของ <tag>" opens `menuitem` "แก้ไขผลตรวจ" (audit:edit, not out-of-scope) and `menuitem` "ดู".
      - The ⋯ menu is on the desktop table only. The phone card has no ⋯: its tag link opens the asset, and "แก้ไขผลตรวจ" is the card's outline link (audit:edit only, not on an out-of-scope row).
      - The viewer gets only "ดู" in the desktop ⋯, and no "แก้ไขผลตรวจ" link on the phone card.
    - **Paging:** the shared `Pagination`, with every link keeping every filter.

- [ ] **Step 1: Write the failing tests**

Append to `tests/audit-round-page-rules.test.ts` (and add the four new names to its rules import):

```ts
test("the ผล badge: รอตรวจ while pending, success for a match or a part confirmed with its parent, danger for not found, info out of scope, warning for every variance and for a checked item with no result (spec §8, P2-R2)", () => {
  assert.deepEqual(auditRoundResultBadge("pending", null), { labelKey: "pending", tone: "muted" })
  assert.deepEqual(auditRoundResultBadge("scanned", "found"), { labelKey: "found", tone: "success" })
  assert.deepEqual(auditRoundResultBadge("scanned", "confirmed_with_parent"), { labelKey: "confirmedWithParent", tone: "success" })
  assert.deepEqual(auditRoundResultBadge("reviewed", "not_found"), { labelKey: "notFound", tone: "danger" })
  assert.deepEqual(auditRoundResultBadge("reviewed", "out_of_scope"), { labelKey: "outOfScope", tone: "info" })
  for (const result of ["wrong_location", "wrong_department", "need_review", "mismatch", null]) {
    assert.deepEqual(auditRoundResultBadge("reviewed", result), { labelKey: "mismatch", tone: "warning" }, String(result))
  }
})

test("พิจารณา: a pending finding first, then one that needs a special check, then approved, then rejected; none without findings", () => {
  assert.equal(auditRoundItemReviewState([]), null)
  assert.equal(auditRoundItemReviewState(["approved", "pending"]), "pending")
  assert.equal(auditRoundItemReviewState(["rejected", "exception"]), "exception")
  assert.equal(auditRoundItemReviewState(["rejected", "approved"]), "approved")
  assert.equal(auditRoundItemReviewState(["rejected"]), "rejected")
  assert.deepEqual(auditRoundReviewStateTone, { pending: "warning", exception: "warning", approved: "success", rejected: "muted" })
})

test("สิ่งที่ต่าง: the field findings that still stand, in the card's field order, a component's marked; not found, out of scope and rejected ones left out (spec §8, P2-R1)", () => {
  const finding = (id: string, findingType: string, reviewStatus: string, actionTaken: string | null = null) => ({ id, findingType, reviewStatus, actionTaken, expectedValue: `${id}-was`, actualValue: `${id}-is` })
  const rows = auditRoundDifferences([
    finding("c", "wrong_condition", "pending"),
    finding("n", "not_found", "pending"),
    finding("l", "wrong_location", "rejected"),
    finding("d", "wrong_department", "approved", "component_confirmed_with_parent_mismatch"),
    finding("o", "out_of_scope", "pending"),
    finding("u", "wrong_custodian", "exception"),
  ])
  assert.deepEqual(rows.map((row) => [row.id, row.field, row.component]), [["d", "department", true], ["u", "custodian", false], ["c", "condition", false]])
  assert.equal(rows[0].expectedValue, "d-was", "the row's own finding passes through (Task 3's row findings)")
})
```

Append to `tests/audit-round-page-ui.test.ts`:

```ts
test("the list's top: the result chips and the category chips as TabNav with counts, the filter row with clear-all, the search in the table's bar (group 2 spec §5, §8, P2-R11, P2-R24)", () => {
  const page = read(PAGE)
  const list = page.slice(at(page, '<section id="audit-result-list" className="scroll-mt-24">'))
  const order = [
    "{formatCount(resultListTotal)}</span> {t(\"items\")}",
    '<TabNav aria-label={t("result")} items={resultTabs} current={filters.result} />',
    '<TabNav aria-label={t("categoryChipsLabel")} items={categoryTabs} current={filters.categoryId ?? "all"} />',
    '<FilterChipList chips={resultFilterChips} label={t("activeFilters")} removeLabel={t("clearFilter")} clearAll={{ href: allResultHref, label: t("clearAllFilters") }} />',
    '<div className={cn(getPanelClasses(), "overflow-hidden")}>',
    'placeholder={t("searchItems")}',
  ].map((needle) => at(list, needle))
  assert.deepEqual(order, [...order].sort((a, b) => a - b))
  assert.match(list, /\{categoryTabs\.length > 0 \? <TabNav aria-label=\{t\("categoryChipsLabel"\)\}/)
  assert.match(page, /\["all", t\("viewAll"\), data\.resultChips\.all\],\n\s+\["pending", t\("pending"\), data\.resultChips\.pending\],\n\s+\["found", t\("found"\), data\.resultChips\.found\],\n\s+\["mismatch", t\("mismatchShort"\), data\.resultChips\.mismatch\],\n\s+\["not_found", t\("notFound"\), data\.resultChips\.notFound\],\n\s+\["out_of_scope", t\("outOfScope"\), data\.resultChips\.outOfScope\],\n\s+\["pending_review", t\("pendingReview"\), data\.resultChips\.pendingReview\],/)
  assert.match(page, /\.map\(\(\[result, label, count\]\) => \(\{ key: result, label, count: formatCount\(count\), href: pageHref\(filters, \{ result, page: 1 \}\) \}\)\)/)
  // Task 3's chips: the six, then อื่น ๆ, then a chosen category outside the six; hidden at one category (P2-R11, P2-R24).
  assert.match(page, /const categoryTabs = data\.categoryChips\.visible\n/)
  assert.match(page, /\{ key: "all", label: t\("categoryAll"\), count: formatCount\(data\.categoryChips\.all\), href: pageHref\(filters, \{ categoryId: null, page: 1 \}\) \}/)
  assert.match(page, /\{ id: "other", name: t\("categoryOther"\), count: data\.categoryChips\.other\.count \}/)
  assert.match(page, /\.\.\.categoryChipItems\.map\(\(chip\) => \(\{ key: chip\.id, label: chip\.name, count: formatCount\(chip\.count\), href: pageHref\(filters, \{ categoryId: chip\.id, page: 1 \}\) \}\)\)/)
  for (const [key, override] of [["companyId", "companyId: null"], ["branchId", "branchId: null"], ["categoryId", "categoryId: null"], ["field", "field: null"], ["components", "components: null"]]) {
    assert.match(page, new RegExp(`key: "${key}",[\\s\\S]{0,300}?href: pageHref\\(filters, \\{ ${override}, page: 1 \\}\\)`), key)
  }
  assert.match(page, /label: t\("componentsMissingChip", \{ count: formatCount\(data\.componentsMissingInFilters\) \}\)/)
  assert.match(list, /hiddenInputs=\{Object\.fromEntries\(auditRoundHrefQuery\(pageHref\(filters, \{ search: "", page: 1 \}\)\)\)\}/)
  assert.doesNotMatch(list, /<StatusBadge label=\{resultFilterLabels|t\("viewAll"\)\}\s*<\/Link>/, "the bucket badge and the old ทั้งหมด button go: the tabs show the result in use")
})

test("ไปพิจารณารายการไม่ตรง follows the field in use, the department included, or the review and mismatch results (spec §8, Appendix A §8)", () => {
  const page = read(PAGE)
  assert.match(page, /const resultFindingReviewHref = filters\.field\n\s+\? `\/\$\{locale\}\/audit\/findings\?status=pending&roundId=\$\{round\.id\}&findingType=\$\{auditFindingTypeByField\[filters\.field\]\}`\n\s+: filters\.result === "pending_review" \|\| filters\.result === "mismatch"\n\s+\? pendingReviewFindingsHref\n\s+: null/)
})

test("the table: ผล / ทรัพย์สิน / สิ่งที่ต่าง / ตรวจโดย / รูป / พิจารณา, then ⋯ with แก้ไขผลตรวจ for audit:edit only and never on an out-of-scope row (spec §8, P2-R4, P2-R7, P2-R17)", () => {
  const page = read(PAGE)
  const heads = [...page.matchAll(/<DataTableHead(?: [^>]*)?>\{(?:t|tCommon)\("(\w+)"\)\}<\/DataTableHead>/g)].map((match) => match[1])
  assert.deepEqual(heads, ["result", "assetColumn", "differenceColumn", "checkedByColumn", "photoColumn", "reviewColumn", "actions"])
  assert.equal(page.match(/<TableEmptyRow\s+colSpan=\{7\}/g)?.length, 1)
  assert.match(page, /const editHref = canScan && !isRoundReadOnly && item\.auditResult !== "out_of_scope" \? buildAuditRoundScanEditHref\(\{ locale, roundId: round\.id, assetId: item\.asset\.id, returnTo: listHref \}\) : null/)
  assert.match(page, /<RowActions\s+code=\{item\.asset\.assetTag\}\s+name=\{item\.asset\.name\}\s+menuLabel=\{tCommon\("moreActionsFor", \{ code: item\.asset\.assetTag \}\)\}\s+next=\{undefined\}\s+groups=\{item\.groups\}\s*\/>/)
  assert.match(page, /\.\.\.\(editHref \? \[\{ kind: "link" as const, key: "edit", label: t\("editScanResult"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\] : \[\]\),/)
  assert.match(page, /\{ kind: "link" as const, key: "view", label: tCommon\("view"\), href: assetHref, icon: <Eye aria-hidden="true" \/> \},/)
  assert.match(page, /missingComponents: item\.missingComponents\.map\(\(component\) => \(\{ \.\.\.component, href: pageHref\(roundWideFilters, \{ search: component\.assetTag \}\) \}\)\)/)
  assert.equal(page.match(/<RoundItemDifferences\b/g)?.length, 2, "the phone card and the table")
  assert.equal(page.match(/<RoundItemMissingComponents\b/g)?.length, 2, "the phone card and the table")
  assert.match(page, /\{item\.editHref \? \(\s*<div className="mt-3 flex justify-end">\s*<Link href=\{item\.editHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.doesNotMatch(page, /item\.asset\.currentLocation|item\.asset\.custodian|t\("expectedLocation"\)/, "the table shows what differed, not the asset's current values")
})

test("every list link comes from the one builder: paging, page size and the past-last-page redirect keep every filter (group 2 plan 2 global constraint)", () => {
  const page = read(PAGE)
  assert.match(page, /previousHref=\{pageHref\(filters, \{ page: page - 1 \}\)\}/)
  assert.match(page, /nextHref=\{pageHref\(filters, \{ page: page \+ 1 \}\)\}/)
  assert.match(page, /pageSizes=\{auditRoundResultPageSizeOptions\.map\(\(value\) => \(\{ value, href: pageHref\(filters, \{ page: 1, pageSize: value \}\) \}\)\)\}/)
  assert.match(page, /redirect\(pageHref\(filters, \{ page: resultLastPage \}\)\)/)
  // The row's way back is the list as it stands, page included.
  assert.match(page, /const listHref = pageHref\(filters, \{ page \}\)/)
  assert.match(page, /const \{ page, pageSize, \.\.\.filters \} = parseAuditRoundResultListParams\(rawSearchParams\)/)
  assert.doesNotMatch(page, /buildAuditRoundResultListHref|resultListState\b|\bitemFilters\b/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/audit-round-page-rules.test.ts tests/audit-round-page-ui.test.ts`
Expected: FAIL. The row rules do not exist, and the list still has its old head, the company and branch chips only, the old columns and `next={{ label: t("editScanResult") … }}`.

- [ ] **Step 3: Add and change the words**

Change file in the session scratchpad, as in Task 4. Namespace `auditRound`:

| Key | th | en |
|---|---|---|
| `categoryChipsLabel` (new) | หมวดหมู่ | Category |
| `categoryAll` (new) | ทุกหมวดหมู่ | All categories |
| `categoryOther` (new) | อื่น ๆ | Other |
| `categoryFilterChip` (new) | หมวดหมู่: {category} | Category: {category} |
| `componentsMissingChip` (new) | ส่วนควบไม่ครบ {count} | Missing components {count} |
| `clearAllFilters` (new) | ล้างตัวกรองทั้งหมด | Clear all filters |
| `searchItems` (new) | ค้นหารหัสทรัพย์สิน ชื่อ หรือที่ตั้ง | Search code, name or location |
| `assetColumn` (new) | ทรัพย์สิน | Asset |
| `differenceColumn` (new) | สิ่งที่ต่าง | Differences |
| `checkedByColumn` (new) | ตรวจโดย | Checked by |
| `photoColumn` (new) | รูป | Photo |
| `reviewColumn` (new) | พิจารณา | Decision |
| `photoAttached` (new) | มีรูป | Has a photo |
| `photoMissing` (new) | ไม่มีรูป | No photo |
| `componentMark` (new) | ส่วนควบ | Component |
| `missingComponentPrefix` (new) | ไม่พบ: | Not found: |
| `componentHasChildren` (changed, spec §8) | มีส่วนควบ {count} ชิ้น | Has {count} installed components |
| `componentInstalledInParent` (changed, spec §8) | ติดตั้งอยู่ใน {assetTag} ({role}) | Installed in {assetTag} ({role}) |
| `resultListHelp` (changed) | เลือกผลตรวจหรือหมวดหมู่ หรือค้นหารหัส ชื่อ ที่ตั้ง เพื่อดูเฉพาะรายการที่ต้องการ | Choose a result or a category, or search a code, name or location, to see only those items |

Kept and reused:
- `result` "ผลตรวจ" (the TabNav name and the first column);
- `viewAll`, `pending`, `found`, `mismatchShort` (Task 4), `notFound`, `outOfScope`, `pendingReview`;
- `activeFilters`, `clearFilter`, `companyFilterChip`, `branchFilterChip`;
- `items`, `expectedAssets`, `resultListFilteredTitle`, `resultListFilteredHelp`;
- the `empty*` keys, `editScanResult`, `openFindingReview`;
- `correctionHistory*`, `correctionField_*`, `confirmedWithParent`;
- `auditFinding.type_*` (the field words) and `auditFinding.status_*` (the review words).

Glossary checks:
- "หมวดหมู่", never "หมวด" (the board's "ทุกหมวด" becomes "ทุกหมวดหมู่");
- "ที่ตั้ง" for a location;
- "พิจารณา";
- "ส่วนควบ".

Delete these keys if `rg` finds no `auditRound` reader after this task (same check as Task 4):
- `wrongLocation`, `wrongCustodian`, `wrongCondition`;
- `assetTag`, `assetName`, `expectedLocation`, `expectedCustodian`, `status`.

The pending page reads its own `auditPending` keys, so those are not affected.

- [ ] **Step 4: Implement**

**`src/lib/audit-round-page-rules.ts`** (append; add `import type { StatusTone } from "./status-tone.ts"` at the top. Task 3's import from `./audit-round-result-filters.ts` already brings `auditFindingFields`, `auditFindingTypeByField` and `type AuditFindingField`):

```ts
export type AuditRoundResultBadgeKey = "pending" | "found" | "confirmedWithParent" | "mismatch" | "notFound" | "outOfScope"

// The ผล column (spec §8): one badge per row. A checked item with no result reads ไม่ตรง, as it counts (P2-R2).
export function auditRoundResultBadge(auditStatus: string, auditResult: string | null): { labelKey: AuditRoundResultBadgeKey; tone: StatusTone } {
  if (auditStatus === "pending") return { labelKey: "pending", tone: "muted" }
  if (auditResult === "found") return { labelKey: "found", tone: "success" }
  if (auditResult === "confirmed_with_parent") return { labelKey: "confirmedWithParent", tone: "success" }
  if (auditResult === "not_found") return { labelKey: "notFound", tone: "danger" }
  if (auditResult === "out_of_scope") return { labelKey: "outOfScope", tone: "info" }
  return { labelKey: "mismatch", tone: "warning" }
}

export type AuditRoundReviewState = "pending" | "exception" | "approved" | "rejected"
const auditRoundReviewStateOrder: readonly AuditRoundReviewState[] = ["pending", "exception", "approved", "rejected"]

// The พิจารณา column (spec §8): what is left to do first, so one waiting finding reads รอพิจารณา however many were decided.
export function auditRoundItemReviewState(reviewStatuses: readonly string[]): AuditRoundReviewState | null {
  return auditRoundReviewStateOrder.find((state) => reviewStatuses.includes(state)) ?? null
}

export const auditRoundReviewStateTone: Record<AuditRoundReviewState, StatusTone> = { pending: "warning", exception: "warning", approved: "success", rejected: "muted" }

type AuditRoundDifferenceFinding = { findingType: string; reviewStatus: string; actionTaken: string | null }
const auditFindingFieldByType = new Map(auditFindingFields.map((field) => [auditFindingTypeByField[field], field]))

// สิ่งที่ต่าง (spec §8): the item's field findings that still stand (a rejected one, the system's "ยกเลิกเพราะแก้ผลตรวจ"
// included, is gone; P2-R1), in the card's field order; a component confirmed with its parent but different is marked.
export function auditRoundDifferences<T extends AuditRoundDifferenceFinding>(findings: readonly T[]): Array<T & { field: AuditFindingField; component: boolean }> {
  return findings
    .flatMap((finding) => {
      const field = auditFindingFieldByType.get(finding.findingType)
      return field && finding.reviewStatus !== "rejected" ? [{ ...finding, field, component: finding.actionTaken === "component_confirmed_with_parent_mismatch" }] : []
    })
    .sort((left, right) => auditFindingFields.indexOf(left.field) - auditFindingFields.indexOf(right.field))
}
```

If Task 1 typed `auditFindingTypeByField` as `Record<AuditFindingField, string>`, the Map's key type is `string`. Leave it that way.

**The page.** Imports:
- Add `TabNav`, `Eye`, `auditRoundHrefQuery`, `auditRoundResultBadge`, `auditRoundItemReviewState`, `auditRoundReviewStateTone`, `auditRoundDifferences`, `formatFindingValue` (from `@/lib/audit-finding-labels`) and `type RowActionGroup` (from `@/components/ui/row-actions`).
- Drop `getAuditRoundItemStatusLabelKey`, `getAuditRoundItemResultLabelKey`, `getAuditItemStatusLabelKey` and `buildAuditRoundResultListHref`, if they are left unused.

The parse: Task 1's `const resultListState = parseAuditRoundResultListParams(rawSearchParams)`, Task 3's `const { page, pageSize, ...filters } = resultListState` and Task 1's `itemFilters` line become one line where the parse was:

```ts
  const { page, pageSize, ...filters } = parseAuditRoundResultListParams(rawSearchParams)
```

Every other `resultListState.<x>` left in the page reads `filters.<x>`, `page` or `pageSize`.

The derived list values (they replace master `:304-388` and `:408-434`, or Task 3's version of them; Task 3's stale-filter redirect stays as it is, P2-R31):

```ts
  // Each row's "แก้ไขผลตรวจ" comes back to the list as it stands, page included.
  const listHref = pageHref(filters, { page })
  const resultFilterLabels: Record<AuditRoundResultFilter, string> = {
    all: t("viewAll"),
    pending: t("pending"),
    found: t("found"),
    mismatch: t("mismatchShort"),
    not_found: t("notFound"),
    out_of_scope: t("outOfScope"),
    pending_review: t("pendingReview"),
  }
  const resultListTotal = data.total
  // A page past the last one (an old link, or rows that moved to another result) shows the last page (spec 2B I21).
  const resultLastPage = lastListPage(resultListTotal, pageSize)
  if (data.rows.length === 0 && resultListTotal > 0 && page > resultLastPage) {
    redirect(pageHref(filters, { page: resultLastPage }))
  }
  const { start: resultStart, end: resultEnd, totalPages: resultTotalPages } = paginationRange(page, pageSize, resultListTotal)
  // The result chips count within every other filter (spec §5); choosing one keeps them and goes back to page 1.
  const resultTabs = ([
    ["all", t("viewAll"), data.resultChips.all],
    ["pending", t("pending"), data.resultChips.pending],
    ["found", t("found"), data.resultChips.found],
    ["mismatch", t("mismatchShort"), data.resultChips.mismatch],
    ["not_found", t("notFound"), data.resultChips.notFound],
    ["out_of_scope", t("outOfScope"), data.resultChips.outOfScope],
    ["pending_review", t("pendingReview"), data.resultChips.pendingReview],
  ] as const).map(([result, label, count]) => ({ key: result, label, count: formatCount(count), href: pageHref(filters, { result, page: 1 }) }))
  // The category chips (spec decision 2): within the result in use and the other filters, the six largest then อื่น ๆ
  // (a real filter value, P2-R11), then a chosen category outside the six as its own chip; hidden at one category or
  // none (P2-R24). Task 3's data.categoryChips holds each part.
  const categoryChipItems = [
    ...data.categoryChips.top,
    ...(data.categoryChips.other.categories > 0 || filters.categoryId === "other" ? [{ id: "other", name: t("categoryOther"), count: data.categoryChips.other.count }] : []),
    ...(data.categoryChips.selected ? [data.categoryChips.selected] : []),
  ]
  const categoryTabs = data.categoryChips.visible
    ? [
        { key: "all", label: t("categoryAll"), count: formatCount(data.categoryChips.all), href: pageHref(filters, { categoryId: null, page: 1 }) },
        ...categoryChipItems.map((chip) => ({ key: chip.id, label: chip.name, count: formatCount(chip.count), href: pageHref(filters, { categoryId: chip.id, page: 1 }) })),
      ]
    : []
  // The filter row (spec §8): each chip removes only itself; the dashboard's company and branch sit beside the category.
  const resultFilterChips: FilterChipItem[] = []
  if (filterCompany) {
    resultFilterChips.push({
      key: "companyId",
      label: t("companyFilterChip", { company: `${filterCompany.code} - ${filterCompany.nameTh}` }),
      href: pageHref(filters, { companyId: null, page: 1 }),
    })
  }
  if (filterBranch) {
    resultFilterChips.push({
      key: "branchId",
      label: t("branchFilterChip", { branch: auditRoundBranchFilterName({ name: filterBranch.name, companyCode: filterBranch.company.code }, Boolean(filterCompany)) }),
      href: pageHref(filters, { branchId: null, page: 1 }),
    })
  }
  if (filters.categoryId) {
    resultFilterChips.push({
      key: "categoryId",
      label: t("categoryFilterChip", { category: filters.categoryId === "other" ? t("categoryOther") : (data.filterNames.category?.name ?? t("categoryOther")) }),
      href: pageHref(filters, { categoryId: null, page: 1 }),
    })
  }
  if (filters.field) {
    resultFilterChips.push({
      key: "field",
      label: tFinding(`type_${auditFindingTypeByField[filters.field]}`),
      href: pageHref(filters, { field: null, page: 1 }),
    })
  }
  if (filters.components) {
    resultFilterChips.push({
      key: "components",
      label: t("componentsMissingChip", { count: formatCount(data.componentsMissingInFilters) }),
      href: pageHref(filters, { components: null, page: 1 }),
    })
  }
  // "ไปพิจารณารายการไม่ตรง" follows the field in use (wrong_department included) or the review and mismatch results.
  const resultFindingReviewHref = filters.field
    ? `/${locale}/audit/findings?status=pending&roundId=${round.id}&findingType=${auditFindingTypeByField[filters.field]}`
    : filters.result === "pending_review" || filters.result === "mismatch"
      ? pendingReviewFindingsHref
      : null
  const hasResultBucketFilter = filters.result !== "all"
  const hasResultListSearch = Boolean(filters.search)
  // resultListTitle, resultListDescription, emptyResultTitle, emptyResultDescription: master :411-422 with
  // resultListState.result → filters.result
  const resultRows = data.rows.map((item) => {
    const badge = auditRoundResultBadge(item.auditStatus, item.auditResult)
    const review = auditRoundItemReviewState(item.findings.map((finding) => finding.reviewStatus))
    const assetHref = `/${locale}/assets/${item.asset.id}`
    const editHref = canScan && !isRoundReadOnly && item.auditResult !== "out_of_scope" ? buildAuditRoundScanEditHref({ locale, roundId: round.id, assetId: item.asset.id, returnTo: listHref }) : null
    return {
      id: item.id,
      asset: item.asset,
      assetHref,
      resultLabel: t(badge.labelKey),
      resultTone: badge.tone,
      // A value as the findings page shows it (Task 3's labels); an empty one stays null, so the cell shows Nil, never "-".
      differences: auditRoundDifferences(item.findings).map((difference) => ({
        key: difference.id,
        label: tFinding(`type_${difference.findingType}`),
        expected: difference.expectedValue ? formatFindingValue(difference.findingType, difference.expectedValue, data.findingValueLabels) : null,
        actual: difference.actualValue ? formatFindingValue(difference.findingType, difference.actualValue, data.findingValueLabels) : null,
        component: difference.component,
      })),
      checkedBy: item.checkedBy?.label ?? null,
      checkedAt: item.checkedBy?.at ?? null,
      photo: item.hasPhoto === null ? null : item.hasPhoto ? t("photoAttached") : t("photoMissing"),
      review: review ? { label: tFinding(`status_${review}`), tone: auditRoundReviewStateTone[review] } : null,
      componentRelationshipLines: buildAuditRoundComponentRelationshipLines(item.asset, t),
      missingComponents: item.missingComponents.map((component) => ({ ...component, href: pageHref(roundWideFilters, { search: component.assetTag }) })),
      latestCorrection: item.correctionHistory[0] ?? null,
      editHref,
      // ⋯: "แก้ไขผลตรวจ" for audit:edit on an open round, never on an out-of-scope row until plan 3 (P2-R4, P2-R7); "ดู".
      groups: [{ key: "row", items: [
        ...(editHref ? [{ kind: "link" as const, key: "edit", label: t("editScanResult"), href: editHref, icon: <Pencil aria-hidden="true" /> }] : []),
        { kind: "link" as const, key: "view", label: tCommon("view"), href: assetHref, icon: <Eye aria-hidden="true" /> },
      ] }] satisfies RowActionGroup[],
    }
  })
```

The pin `href={item.editHref}` (`drilldown:196`) is the phone card's button and stays.

The section render (it replaces master `:611-833`):

```tsx
      <section id="audit-result-list" className="scroll-mt-24">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{resultListTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{resultListDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              <span className="num font-medium text-foreground">{formatCount(resultListTotal)}</span> {t("items")}
            </span>
            {resultFindingReviewHref && !isRoundReadOnly ? (
              <Link href={resultFindingReviewHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                <FileText aria-hidden="true" />
                {t("openFindingReview")}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <TabNav aria-label={t("result")} items={resultTabs} current={filters.result} />
          {categoryTabs.length > 0 ? <TabNav aria-label={t("categoryChipsLabel")} items={categoryTabs} current={filters.categoryId ?? "all"} /> : null}
          <FilterChipList chips={resultFilterChips} label={t("activeFilters")} removeLabel={t("clearFilter")} clearAll={{ href: allResultHref, label: t("clearAllFilters") }} />
        </div>

        <div className={cn(getPanelClasses(), "overflow-hidden")}>
          {/* The table's top bar (spec §8): the search, which finds code, name and the expected location (P2-R5) and keeps
              every filter. MasterDataSearch's mb-4 is the bar's bottom space. */}
          <div className="border-b border-border-soft px-4 pt-4">
            <MasterDataSearch
              action={`/${locale}/audit/rounds/${round.id}`}
              defaultValue={filters.search}
              placeholder={t("searchItems")}
              submitLabel={tCommon("search")}
              hiddenInputs={Object.fromEntries(auditRoundHrefQuery(pageHref(filters, { search: "", page: 1 })))}
            />
          </div>
          <div className={`${getMobileCardListClasses()} p-3`}>
            {resultRows.length === 0 ? (
              {/* ActionEmptyState as master :654-661 (actionHref={allResultHref}) */}
            ) : (
              resultRows.map((item) => (
                <article key={item.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={item.assetHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                      <span className="tag font-medium">{item.asset.assetTag}</span>
                    </Link>
                    <StatusBadge label={item.resultLabel} tone={item.resultTone} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.asset.name}</p>
                  {/* component Chips, as master :669-675 (pin: exactly 2 such Chips) */}
                  <RoundItemMissingComponents components={item.missingComponents} prefix={t("missingComponentPrefix")} />
                  {/* latest correction Notice, as master :676-683 (pin: exactly 2) */}
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "difference", label: t("differenceColumn"), value: item.differences.length > 0 ? <RoundItemDifferences lines={item.differences} componentLabel={t("componentMark")} /> : null },
                      { key: "checkedBy", label: t("checkedByColumn"), value: item.checkedBy || item.checkedAt ? <RoundItemChecker name={item.checkedBy} at={item.checkedAt} /> : null },
                      { key: "photo", label: t("photoColumn"), value: item.photo },
                      { key: "review", label: t("reviewColumn"), value: item.review ? <StatusBadge label={item.review.label} tone={item.review.tone} /> : null },
                    ]}
                  />
                  {item.editHref ? (
                    <div className="mt-3 flex justify-end">
                      <Link href={item.editHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                        {t("editScanResult")}
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
          <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={resultListTitle} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("result")}</DataTableHead>
                <DataTableHead>{t("assetColumn")}</DataTableHead>
                <DataTableHead>{t("differenceColumn")}</DataTableHead>
                <DataTableHead>{t("checkedByColumn")}</DataTableHead>
                <DataTableHead>{t("photoColumn")}</DataTableHead>
                <DataTableHead>{t("reviewColumn")}</DataTableHead>
                <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {resultRows.length === 0 ? (
                <TableEmptyRow colSpan={7} emptyState={{ /* master :738-745 */ }} />
              ) : (
                resultRows.map((item) => (
                  <ClickableTableRow key={item.id} href={item.assetHref} label={`${tCommon("view")}: ${item.asset.assetTag}`}>
                    <DataTableCell className="whitespace-nowrap">
                      <StatusBadge label={item.resultLabel} tone={item.resultTone} />
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-foreground">
                      <div className="font-medium">{item.asset.name}</div>
                      <div className="mt-0.5 text-meta text-muted-foreground"><span className="tag">{item.asset.assetTag}</span></div>
                      {/* component Chips, as master :759-765 */}
                      <RoundItemMissingComponents components={item.missingComponents} prefix={t("missingComponentPrefix")} />
                      {/* latest correction Notice, as master :766-773 */}
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-foreground">
                      <RoundItemDifferences lines={item.differences} componentLabel={t("componentMark")} />
                    </DataTableCell>
                    <DataTableCell className="min-w-40 text-foreground">
                      <RoundItemChecker name={item.checkedBy} at={item.checkedAt} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{item.photo ?? <Nil />}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      {item.review ? <StatusBadge label={item.review.label} tone={item.review.tone} /> : <Nil />}
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
                        code={item.asset.assetTag}
                        name={item.asset.name}
                        menuLabel={tCommon("moreActionsFor", { code: item.asset.assetTag })}
                        next={undefined}
                        groups={item.groups}
                      />
                    </DataTableCell>
                  </ClickableTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
          {resultListTotal > 0 ? (
            <DataTableFoot>
              <Pagination
                page={page}
                totalPages={resultTotalPages}
                previousHref={pageHref(filters, { page: page - 1 })}
                nextHref={pageHref(filters, { page: page + 1 })}
                pageSize={pageSize}
                pageSizes={auditRoundResultPageSizeOptions.map((value) => ({ value, href: pageHref(filters, { page: 1, pageSize: value }) }))}
                labels={{ /* master :820-828 with resultListState.page → page */ }}
              />
            </DataTableFoot>
          ) : null}
        </div>
      </section>
```

Write the elided parts out in full from master. They are the empty states, the Chip and Notice blocks and the labels. Each Chip and Notice block keeps its exact JSX, so pins `audit-pages-sweep-ui:132-133` (exactly 2 each) hold. There is exactly one `<TableEmptyRow colSpan={7}`.

Module-level parts, after `getAuditRoundStatusLabel` (server-safe; the names avoid guard LN2's shared names):

```tsx
type RoundItemDifference = { key: string; label: string; expected: string | null; actual: string | null; component: boolean }

// สิ่งที่ต่าง (spec §8): "ตามระบบ → ที่พบ" per field finding that still stands; a component's carries ส่วนควบ.
function RoundItemDifferences({ lines, componentLabel }: { lines: RoundItemDifference[]; componentLabel: string }) {
  if (lines.length === 0) return <Nil />
  return (
    <ul className="space-y-1">
      {lines.map((line) => (
        <li key={line.key} className="min-w-0 break-words">
          <span className="text-muted-foreground">{line.label}: </span>
          {line.expected ?? <Nil />} → {line.actual ?? <Nil />}
          {line.component ? <Chip className="ms-1.5">{componentLabel}</Chip> : null}
        </li>
      ))}
    </ul>
  )
}

// "ไม่พบ: <name> (<tag>)" for each installed component found missing in this round (spec §8, decision 6); the tag opens
// this round page searched by it, where the component's own row is (P2-R17).
function RoundItemMissingComponents({ components, prefix }: { components: Array<{ id: string; assetTag: string; name: string; href: string }>; prefix: string }) {
  if (components.length === 0) return null
  return (
    <ul className="mt-1 space-y-0.5 text-meta text-muted-foreground">
      {components.map((component) => (
        <li key={component.id}>
          {prefix} {component.name} (<Link href={component.href} className={cn(linkVariants({ size: "inherit" }), "tag inline-flex min-h-11 items-center md:min-h-0")}>{component.assetTag}</Link>)
        </li>
      ))}
    </ul>
  )
}

// ตรวจโดย + เวลา (spec §8): the scanner, or for a not-found the one who recorded it (Task 3's data).
function RoundItemChecker({ name, at }: { name: string | null; at: Date | null }) {
  if (!name && !at) return <Nil />
  return (
    <>
      <span className="block">{name ?? <Nil />}</span>
      {at ? <span className="block text-meta text-muted-foreground">{formatDateTime(at)}</span> : null}
    </>
  )
}
```

`buildAuditRoundComponentRelationshipLines` and `formatAuditCorrectionFields` stay as they are. Their keys' new words come from Step 3.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-round-page-rules.test.ts tests/audit-round-page-ui.test.ts`
Expected: PASS.

- [ ] **Step 6: Rewrite the pins this task breaks**

`tests/list-pages-ui.test.ts`:
- `:357` title: "audit round detail: PageHeader, the round-wide StatStrip, the result and category TabNavs, the result list on DataTable with RowActions' ⋯ and the shared Pagination (spec 2B §5.4; group 2 spec §8)".
- `:359`: the part list gains `"<TabNav"` and `"<FilterChipList"`.
- `:365` becomes:

  ```ts
  assert.match(source, /next=\{undefined\}\n\s+groups=\{item\.groups\}/, "แก้ไขผลตรวจ sits in ⋯ (group 2 spec §8, Appendix A §8)")
  ```

- `:367` becomes:

  ```ts
  assert.match(source, /pageSizes=\{auditRoundResultPageSizeOptions\.map\(\(value\) => \(\{ value, href: pageHref\(filters, \{ page: 1, pageSize: value \}\) \}\)\)\}/, "the result list keeps its own page and pageSize params")
  ```

- `:369` becomes:

  ```ts
  assert.match(source, /if \(data\.rows\.length === 0 && resultListTotal > 0 && page > resultLastPage\) \{\n\s+redirect\(pageHref\(filters, \{ page: resultLastPage \}\)\)/, "a result page past the last one shows the last page (I21)")
  ```

- Add, in place of Task 4's deleted `:364`:

  ```ts
  assert.match(source, /<TabNav aria-label=\{t\("result"\)\} items=\{resultTabs\} current=\{filters\.result\} \/>/, "the result in view is the current tab")
  ```

`tests/audit-round-result-drilldown.test.ts`:
- `:138` becomes `assert.match(page, /buildAuditRoundPageHref/)`. Task 5's own test bans `buildAuditRoundResultListHref` from the page.
- `:154` becomes `assert.match(page, /data\.rows\.map/)`.
- `:380` becomes:

  ```ts
  assert.match(page, /<FilterChipList chips=\{resultFilterChips\} label=\{t\("activeFilters"\)\} removeLabel=\{t\("clearFilter"\)\} clearAll=\{\{ href: allResultHref, label: t\("clearAllFilters"\) \}\} \/>/)
  ```

- `:381-382` become one assertion; the search's hidden inputs come from the one builder, which keeps company and branch:

  ```ts
  assert.match(page, /hiddenInputs=\{Object\.fromEntries\(auditRoundHrefQuery\(pageHref\(filters, \{ search: "", page: 1 \}\)\)\)\}/, "the search keeps every filter")
  ```

- `:383` becomes:

  ```ts
  assert.match(page, /previousHref=\{pageHref\(filters, \{ page: page - 1 \}\)\}/)
  ```

- `:372` (Task 1's `itemFilters` pin) becomes `assert.match(page, /const \{ page, pageSize, \.\.\.filters \} = parseAuditRoundResultListParams\(rawSearchParams\)/)`. The parse replaces `resultListState` and `itemFilters`, and Task 5's own test bans both names.
- `:378-379` hold (the chip labels).
- `:385` holds: no `*ResultHref` const is built from `buildAuditRoundResultListHref`.
- `:371` holds; `:373-377` are Task 3's.

`tests/audit-item-status-labels.test.ts:69-74`:
- The title becomes "audit round page labels every row by its result through the round page rules, never a code (group 2 spec §8)".
- The body becomes:

  ```ts
  assert.match(page, /const badge = auditRoundResultBadge\(item\.auditStatus, item\.auditResult\)/)
  assert.match(page, /resultLabel: t\(badge\.labelKey\)/)
  assert.doesNotMatch(page, /statusLabelKey \? t\(statusLabelKey\) : item\.auditStatus,|: item\.auditResult\)/)
  assert.match(page, /getTranslations\("auditFinding"\)/)
  ```

`tests/audit-round-list-filters.test.ts` (Task 1): delete the test "the round page keeps every parsed filter in its where and its links until Task 5 rebuilds them (P2-R22)" as Task 4 left it. This task's tests pin what replaced it: the one builder for every link, the search's hidden inputs, `filters` in place of `resultListState`, and "ไปพิจารณารายการไม่ตรง" following `filters.field`.

`tests/audit-round-exports.test.ts` (Task 2's round-page test, as Tasks 3-4 left it):
- `editHref: item\.auditResult === "out_of_scope" \? null : buildAuditRoundScanEditHref\(` → `/const editHref = canScan && !isRoundReadOnly && item\.auditResult !== "out_of_scope" \? buildAuditRoundScanEditHref\(/` (P2-R4 and P2-R7 in one gate);
- the count of `\{!isRoundReadOnly && item\.editHref \? \(` (2) → `assert.equal(page.match(/\{item\.editHref \? \(/g)?.length, 1, "the phone card's button; the table's is in ⋯ (item.groups)")`;
- the company-chip pin (`if \(filterCompany\) \{\n\s+resultFilterChips\.push`) stays.

These stay unchanged and must pass:
- `tests/audit-pages-sweep-ui.test.ts:129-133` (the count line, the frame, the link classes, exactly 2 Chips, exactly 2 info Notices);
- `tests/audit-round-result-drilldown.test.ts:189-205` (`buildAuditRoundScanEditHref`, `href={item.editHref}`, `t("editScanResult")`), `:228-244`, `:269-290`;
- `tests/list-pages-ui.test.ts:362-363`, `:366`, `:368`;
- `tests/list-frame-guards.test.ts`: LT3 (only `TableEmptyRow`), LN1 (no hand `aria-current`; TabNav sets it), LN2, LV2 (no typed `"-"`);
- `tests/asset-detail-frame.test.ts:54` (a comment only).

- [ ] **Step 7: Run everything**

Run: `node --test tests/audit-round-page-rules.test.ts tests/audit-round-page-ui.test.ts tests/list-pages-ui.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-item-status-labels.test.ts tests/audit-round-list-filters.test.ts tests/audit-round-exports.test.ts tests/audit-pages-sweep-ui.test.ts tests/list-frame-guards.test.ts tests/operational-return-navigation.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit`
Expected: PASS, and `tsc` is clean.

Then run `npm test` and `npm run lint`. Expected: both pass. If a pin outside this list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" src/lib/audit-round-page-rules.ts messages/th.json messages/en.json tests/audit-round-page-rules.test.ts tests/audit-round-page-ui.test.ts tests/list-pages-ui.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-item-status-labels.test.ts tests/audit-round-list-filters.test.ts tests/audit-round-exports.test.ts
git commit -m "feat(audit-round): the round page's list: result chips and category chips (top six and อื่น ๆ) as TabNav with counts within the other filters, company, branch, category, field and ส่วนควบไม่ครบ as removable chips, the search in the table's bar, ผล / ทรัพย์สิน / สิ่งที่ต่าง / ตรวจโดย / รูป / พิจารณา with the missing components named and linked, แก้ไขผลตรวจ in ⋯ for audit:edit only, and every link from the one builder (group 2 plan 2 task 5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The pending list (§9): the round's header, expected room and custodian in rows and search, room chips with counts, two row buttons for `audit:edit`, and a not-found dialog that names the asset

The pending list (AU-Pending) is rebuilt to spec §9:
1. The header: the title "รายการรอตรวจ N รายการ" (N round-wide, P2-R12), the trail รอบตรวจนับ › AUD-… › รายการรอตรวจ, the meta (number, status, "ตรวจแล้ว x / y", "เหลือ N วัน"), the back button (still `returnTo`, Appendix A §9) and "เดินตรวจต่อ (N)" for `audit:edit`.
2. The room chips: "ทุกห้อง N", the six rooms with the most pending items, the selected room even outside the six or at 0, then "อื่น ๆ N" (`locationId=other`, P2-R11). A `TabNav`, with the search at its right from `lg`.
3. The rows, the search and the chips read the item's **expected** room and custodian (bug 13, P2-R10). AuditItem has no relation to Location or Employee (`prisma/schema.prisma:663-700`), so the search matches rooms and people by code or name through chunked id lookups, and the where carries the matched ids. The room half is Task 2's `findAuditRoundSearchLocationIds` (the round page's lookup, P2-R25), kept to the rooms that still have pending items; the custodian half reads the round's own pending custodians.
4. The table: ทรัพย์สิน (the name links the asset, the code under it, the custodian under that) / ที่ตั้งตามระบบ / ตรวจล่าสุด (date and time, P2-R13; its source moves from audit movements to audit items, P2-R32), then "สแกนรายการนี้" and "บันทึกไม่พบ" as two buttons for `audit:edit` only (bug 14, P2-R14, P2-R7). The row stays wholly clickable to the asset (`ClickableTableRow`, Appendix A §9, P2-R28); the two buttons, and the not-found dialog that opens from the row, stop the click from reaching it.
5. Unknown rooms read "ไม่ทราบห้อง", never the raw id (bug 16).
6. The not-found dialog names the asset (name, code, expected room, custodian), says "รายการนี้จะออกจากรอตรวจ และส่งให้หัวหน้า IT พิจารณา ทะเบียนยังไม่เปลี่ยน", and "ผู้ตรวจสอบ" becomes "ผู้พิจารณา" (bug 15, P2-R15).
7. ตรวจล่าสุด reads the asset page's rule (user decision 2026-10-27, P2-R32). On master the pending list reads the asset's latest movement whose `movementType` contains "audit" (`pending/page.tsx:112-117`, `:372-375`), but a found-in-place scan writes no movement, so an asset checked fine in an earlier round reads "ยังไม่เคยตรวจ". The rule, today written once in the asset page's frame (`src/lib/asset-detail-frame.ts:45-49`, `:63-66`; shown by `describeAssetAudit`, `src/lib/asset-detail-frame-rules.ts:68-82`):
   - the asset's audit items with `auditResult` not null, in a round that is `isActive` and not cancelled (`auditRoundCoverageWhere`);
   - the latest by `lastScanAt desc, updatedAt desc` (SQL Server sorts a null `lastScanAt` last in `desc`, so a marked-not-found item with no scan comes after every scanned one);
   - its date is `lastScanAt ?? updatedAt`.

   The rule moves into a new pure `src/lib/latest-audit-result-rules.ts`, and the asset page's frame reads it from there (its behaviour is unchanged). The pending list loads it in one `auditItem.findMany` over the page's asset ids (at most 100, the largest page size, so far under SQL Server's 2,100 parameters and not chunked), never one read per row, and keeps date + time (P2-R13, Appendix A §9).

What stays (Appendix A §9, copied as a checklist): the phone cards with สแกน / ดูทรัพย์สิน / บันทึกไม่พบ; paging, page size and the jump to the last page; the empty states with "ล้างคำค้น"; the back button honouring `returnTo` from the scan page; the room and employee codes beside their names; the date and time in ตรวจล่าสุด (its source changes, item 7); the whole-row click to the asset (P2-R28: the skeleton's "no longer wholly clickable" is withdrawn).

**Files:**
- Create: `src/lib/audit-pending-list-rules.ts` (pure: `import type` from `@prisma/client`, relative `.ts` imports only)
- Create: `src/lib/audit-pending-list-data.ts` (server)
- Create: `src/lib/latest-audit-result-rules.ts` (pure: `import type` from `@prisma/client`, relative `.ts` imports only; the asset's latest audit result, extracted from the asset page's frame, P2-R32)
- Modify: `src/lib/asset-detail-frame.ts` (`:3-5` imports, `:45-49` the latest-item read, `:63-66` its date: the same rule, now read from `latest-audit-result-rules.ts`)
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx` (master `:1-419`, rewritten; `resolveAuditPendingScanReturnTo` `:377-386`, `buildAuditPendingScanHref` `:388-391`, `buildAuditPendingListHref` `:394-414` and `resolveFirstSearchParam` `:416-419` stay as they are)
- Modify: `src/components/audit/audit-mark-not-found-button.tsx`:
  - `:22` (the variant type);
  - `:38-54` (a new exported type and the `asset` prop);
  - `:114-136` (the `row` trigger, and the wrapper that keeps the row's click out, moved from `audit-pending-row-actions.tsx`);
  - `:147-172` (the asset's facts and the result line in the body).
- Delete: `src/components/audit/audit-pending-row-actions.tsx` (its only caller was the pending page's `RowActions`; its `stopPortalEvent` wrapper moves into the not-found button's `row` variant)
- Modify: `DESIGN.md:621` (the Rows (ช1) bullet: the pending list's exception) and `DESIGN.md:628` (the wrapper list drops `audit-pending-row-actions.tsx` and "บันทึกไม่พบ")
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- Test:
  - `tests/audit-pending-list-rules.test.ts` (new, by value)
  - `tests/latest-audit-result-rules.test.ts` (new, by value)
  - `tests/audit-pending-list-page.test.ts` (new, source)
  - `tests/audit-not-found-dialog.test.ts` (new tests at the end)
  - `tests/performance-route-instrumentation.test.ts:5-42` (one entry added)
  - pins rewritten: `tests/list-pages-ui.test.ts:372-388` (the comment above the test, then the test), `:390-408`; `tests/asset-detail-frame.test.ts:194`; `tests/audit-pending-mobile-ux.test.ts:11-13`, `:42`, `:44`; `tests/audit-pages-sweep-ui.test.ts:137-146`; `tests/operational-return-navigation.test.ts:90-100`; `tests/breadcrumbs-ui.test.ts:45-46`

**Interfaces:**
- Consumes:
  - plan 1: `getAuditRoundCounts(roundIds, where?)` (`src/lib/audit-round-counts.ts:8`); `chunkAuditIds`, `emptyAuditRoundCounts`, `foldTopCategories(rows, top = 6)`, `type AuditRoundCounts` (`src/lib/audit-round-counts-rules.ts:30-73`); `buildAuditRoundDueLine(status, endDate, today)` (`src/lib/audit-rounds-list-rules.ts:215`); `auditRoundStatusLabelKey`, `effectiveAuditRoundStatus`, `isAuditRoundReadOnlyStatus` (`src/lib/audit-round-status.ts`);
  - `auditRoundCoverageWhere` = `{ not: "cancelled" }` (`src/lib/audit-round-status.ts:5`; that file has no imports, so the pure rules file imports it as `./audit-round-status.ts`);
  - `startOfBangkokDay(now)` (`src/lib/waiting-work-rules.ts:46`); `hasPermission(user, module, action)` (`src/lib/auth-utils.ts:56`); `withPerformanceTiming(label, operation)` (`src/lib/performance-timing.ts:25`); `appendOperationalReturnTo` (`src/lib/operational-return-navigation.ts:44`); `listPageWindow`, `type ListPageState` (`src/lib/list-pagination.ts:8,37`);
  - shared parts, with the props they have today: `PageHeader({ title, meta, actions, back, breadcrumbs })`, `PageBackLink({ href, label })` (`page-header.tsx:8-23,53-61`); `TabNav({ "aria-label", items: { key, label, href, count? }[], current, scroll?, className? })` (`tab-nav.tsx:5-31`); `StatusBadge({ label, status })`; `ClickableTableRow({ href, label })` (`clickable-table-row.tsx:12`: a row click ignores a click whose target is inside `a`, `button`, `input`, `select`, `textarea` or `[data-no-row-click]`), `DataTableHead({ align, sticky, hideLabel })`, `DataTableCell({ align, sticky, className })`, `TableEmptyRow({ colSpan, emptyState })`; `KeyValueList({ items: { key, label, value, nilLabel? }[], className })`; `Notice({ tone, children })`; `Button({ variant, size, busy, onClick })`; `MasterDataSearch` (props unchanged); `ActionEmptyState`, `Pagination`, `Nil` (unchanged).
  - Task 2: `findAuditRoundSearchLocationIds(roundId: string, search: string): Promise<string[]>` (`src/lib/audit-round-list-lookups.ts`): the round's rooms whose code or name holds the text, read in chunks of 2,000 (P2-R25). It is the room half of the pending search; this task writes no room lookup of its own.
  - Tasks 1 and 3-5 change nothing else this task reads. Task 4 rewrites `auditRound.resultDashboardHelp` (the result card, P2-R15 applied) in th and en and keeps reading it; this task does not touch that key.
- Produces, in `src/lib/audit-pending-list-rules.ts`:
  - `AUDIT_PENDING_ROOM_ALL = "all"`, `AUDIT_PENDING_ROOM_OTHER = "other"`, `AUDIT_PENDING_TOP_ROOMS = 6`
  - `auditPendingBaseWhere(roundId: string): Prisma.AuditItemWhereInput` = `{ auditRoundId: roundId, auditStatus: "pending" }`
  - `auditPendingIdMatchWhere(field: "expectedLocationId" | "expectedCustodianId", all: readonly string[], matched: readonly string[]): Prisma.AuditItemWhereInput | null`
  - `type AuditPendingSearchLookups = { roomIds: readonly string[]; matchedRoomIds: readonly string[]; custodianIds: readonly string[]; matchedCustodianIds: readonly string[] }`
  - `buildAuditPendingSearchWhere(searchText: string, lookups: AuditPendingSearchLookups): Prisma.AuditItemWhereInput | null`
  - `auditPendingRoomWhere(locationFilter: string, topRoomIds: readonly string[]): Prisma.AuditItemWhereInput | null`
  - `buildAuditPendingListWhere({ roundId, search, room }: { roundId: string; search: Prisma.AuditItemWhereInput | null; room: Prisma.AuditItemWhereInput | null }): Prisma.AuditItemWhereInput` = `{ AND: [base, search?, room?] }`
  - `type AuditPendingRoomGroup = { locationId: string; count: number }`
  - `type AuditPendingRoomChip = { key: "all"; kind: "all"; count: number } | { key: string; kind: "room"; locationId: string; count: number } | { key: "other"; kind: "other"; count: number }`
  - `foldAuditPendingRoomChips(groups: readonly AuditPendingRoomGroup[], locationFilter: string): { chips: AuditPendingRoomChip[]; topRoomIds: string[]; current: string }`
  - `type AuditPendingPlace = { code: string; name: string }`
  - `type AuditPendingCustodian = { kind: "none" } | { kind: "unknown" } | { kind: "person"; code: string; name: string }`
  - `describeAuditPendingPlace(locationId: string, places: ReadonlyMap<string, AuditPendingPlace>): AuditPendingPlace | null`
  - `describeAuditPendingCustodian(custodianId: string | null, people: ReadonlyMap<string, AuditPendingPlace>): AuditPendingCustodian`
  - `type AuditPendingRoomChipLabel = { place: AuditPendingPlace | null; showCode: boolean }`
  - `labelAuditPendingRoomChips(chips: readonly AuditPendingRoomChip[], places: ReadonlyMap<string, AuditPendingPlace>): Map<string, AuditPendingRoomChipLabel>` (room chips only, by key)
  - `buildAuditPendingContinueScanHref({ locale, roundId, returnToHref, scanReturnToHref }: { locale: string; roundId: string; returnToHref: string; scanReturnToHref: string }): string`
- Produces, in `src/lib/latest-audit-result-rules.ts` (the asset page's rule, one copy, P2-R32):
  - `latestAuditResultWhere: Prisma.AuditItemWhereInput` = `{ auditResult: { not: null }, auditRound: { isActive: true, status: auditRoundCoverageWhere } }` (spread after the asset's id: `{ assetId, ...latestAuditResultWhere }` or `{ assetId: { in: assetIds }, ...latestAuditResultWhere }`)
  - `latestAuditResultOrderBy: Prisma.AuditItemOrderByWithRelationInput[]` = `[{ lastScanAt: "desc" }, { updatedAt: "desc" }]`
  - `latestAuditResultSelect` = `{ assetId: true, auditResult: true, lastScanAt: true, updatedAt: true, auditRound: { select: { isActive: true, status: true } } } satisfies Prisma.AuditItemSelect`
  - `latestAuditResultAt(item: { lastScanAt: Date | null; updatedAt: Date }): Date` = `item.lastScanAt ?? item.updatedAt`
  - `type LatestAuditResultRow = { assetId: string; auditResult: string | null; lastScanAt: Date | null; updatedAt: Date; auditRound: { isActive: boolean; status: string } }`
  - `pickLatestAuditResultAt(rows: readonly LatestAuditResultRow[]): Map<string, Date>` (asset id → the date of its latest result; the rule applied by value as well as in the where, so the value test covers it and the pick does not rest on the rows' order)
- Produces, in `src/lib/audit-pending-list-data.ts`:
  - `type AuditPendingListItem` (an AuditItem with `asset: { id, assetTag, name }`)
  - `type AuditPendingListData = { counts: AuditRoundCounts; roomChips: { chips: AuditPendingRoomChip[]; current: string }; items: AuditPendingListItem[]; total: number; places: Map<string, AuditPendingPlace>; people: Map<string, AuditPendingPlace>; lastAuditAt: Map<string, Date> }` (`lastAuditAt`: asset id → ตรวจล่าสุด; an asset with no entry reads "ยังไม่เคยตรวจ")
  - `getAuditPendingListData({ roundId, searchText, locationFilter, listPage }: { roundId: string; searchText: string; locationFilter: string; listPage: ListPageState }): Promise<AuditPendingListData>`
- Produces, in `src/components/audit/audit-mark-not-found-button.tsx`:
  - `type AuditNotFoundAsset = { name: string; tag: string; location: AuditPendingPlace | null; custodian: AuditPendingCustodian }`
  - the prop `asset: AuditNotFoundAsset` (required) and the variant `"row"` (outline `sm`, not full width). In a clickable row, so its trigger and its dialog sit in `<div data-no-row-click className="contents" onClick={stopRowEvent} onKeyDown={stopRowEvent}>`: React sends the dialog's events (a portal) up the component tree, and the wrapper stops them before `ClickableTableRow` (P2-R28; the wrapper of the deleted `audit-pending-row-actions.tsx`). `ref`, `hideTrigger`, `returnFocusRef` and the `"icon"` variant stay (pinned by `tests/dialog-trigger-handles.test.ts:14-29,43-50`).
- Produces the timing label `audit-pending.page-data`.
- Produces (the markup Task 7's E2E stands on):
  - **Title:** the page's one `h1` reads "รายการรอตรวจ {N} รายการ", N = the round's pending own items (the same N as "เดินตรวจต่อ (N)").
  - **Trail:** `getByRole("navigation", { name: "เส้นทางหน้า" })` (`common.breadcrumb`) holds the links "รอบตรวจนับ" (`/th/audit/rounds`) and "AUD-…" (the round page), then "รายการรอตรวจ" (`aria-current="page"`).
  - **Meta** (`[data-slot="page-header-meta"]`): the round number in `.tag`, the status badge "เปิดตรวจ", "ตรวจแล้ว {checked} / {total}", "เหลือ {days} วัน" or "เลยกำหนด {days} วัน", each its own element.
  - **"เดินตรวจต่อ ({N})":** a link in `[data-slot="page-header-actions"]`, for `audit:edit` and N > 0 only. Its href is the scan page the person came from (`returnTo`) when there is one, otherwise `/th/audit/rounds/<id>/scan?returnTo=<round page>`.
  - **Room chips:** the first `[data-slot="tab-nav"]` in `<main>`, named "ห้อง (ตามที่ตั้งตามระบบ)" (`getByRole("navigation", { name: "ห้อง (ตามที่ตั้งตามระบบ)" })`). Links in order: "ทุกห้อง {n}", up to six rooms "{room name} {n}" (the name with its code in `.tag` after it only when two chips share a name), the selected room when outside the six, then "อื่น ๆ {n}" (only when rooms are left over, or it is selected). Each name matches `^<label>\s*<count>$` (the `round-steps.ts` `tab` pattern). The current chip has `aria-current="page"`: "ทุกห้อง" without `locationId`, the room with `locationId=<id>`, "อื่น ๆ" with `locationId=other`. An unknown `locationId` reads "ไม่ทราบห้อง 0".
  - **Counts equal rows:** a chip's count equals the rows its link opens (the pager's range total; on one page at 25 rows, the `tbody tr` count on desktop or the `article` count on the phone).
  - **Search:** `form[role="search"]` (its field named "ค้นหา") after the chips; a search keeps the room.
  - **Desktop row:** a `ClickableTableRow` (`tbody tr`, `tabindex="0"`, labelled "ดู: <tag>", as on master), whose click or Enter opens `/th/assets/<assetId>` (P2-R28). Cell 1 holds the link named by the asset's name (the same href), the code in `.tag`, and the custodian line ("<code> - <name>" or "ไม่มีผู้ถือครอง"). Cell 2 is "<room code> - <room name>". Cell 3 is the date and time, or "ยังไม่เคยตรวจ". Cell 4 (only for `audit:edit`, with a hidden "การดำเนินการ" head) holds the link "สแกนรายการนี้" (href `/th/audit/rounds/<id>/scan?assetId=<assetId>&returnTo=…`) and the button "บันทึกไม่พบ"; neither, nor anything in the dialog, opens the asset. The row is found by `page.getByRole("main").locator("tbody tr").filter({ hasText: tag })`.
  - **Phone card:** `article` with the code, the name, the facts list (ที่ตั้งตามระบบ, ผู้ถือครองตามระบบ, ตรวจล่าสุด), then "สแกนรายการนี้" (link), "ดูทรัพย์สิน" (link) and "บันทึกไม่พบ" (button). Without `audit:edit` only "ดูทรัพย์สิน".
  - **Viewer:** without `audit:edit` the page has no visible `main a[href*="/scan"]`, no "สแกนรายการนี้", no button "บันทึกไม่พบ" and no "เดินตรวจต่อ". The trail and the back button point at the round page.
  - **Dialog:** `getByRole("dialog", { name: "บันทึกทรัพย์สินนี้ว่าไม่พบ" })` (unchanged). Inside it, before the remark field: a `[data-slot="key-value-list"]` with ทรัพย์สิน "<name> <tag>", ที่ตั้งตามระบบ "<code> - <name>" (or "ไม่ทราบห้อง"), ผู้ถือครองตามระบบ "<code> - <name>" (or "ไม่มีผู้ถือครอง"), then the line "รายการนี้จะออกจากรอตรวจ และส่งให้หัวหน้า IT พิจารณา ทะเบียนยังไม่เปลี่ยน". The confirm "ยืนยันว่าไม่พบ", the request and the toast "บันทึกว่าไม่พบ และสร้างรายการไม่ตรงรอพิจารณาแล้ว" are unchanged.
  - **Empty states:** a search with no rows shows "ล้างคำค้น"; a room with no rows and no search shows "ไม่มีรายการรอตรวจในห้องนี้" with "ดูทุกห้อง"; a round with nothing left shows "ไม่มีรายการรอตรวจคงเหลือ" with "กลับ".
- For Task 7: `e2e/audit/pending-steps.ts:15-21` (`markNotFound` on desktop opens ⋯ "การดำเนินการของ <tag>" → menuitem) must move to the row's own button "บันทึกไม่พบ" (the row label "ดู: <tag>" of `:9-11` stays, but Task 7 finds rows by their text on both screens). E2E is not run in this task; the steps break until Task 7.

- [ ] **Step 1: Write the failing tests**

`tests/audit-pending-list-rules.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  AUDIT_PENDING_ROOM_ALL,
  AUDIT_PENDING_ROOM_OTHER,
  AUDIT_PENDING_TOP_ROOMS,
  auditPendingBaseWhere,
  auditPendingIdMatchWhere,
  auditPendingRoomWhere,
  buildAuditPendingContinueScanHref,
  buildAuditPendingListWhere,
  buildAuditPendingSearchWhere,
  describeAuditPendingCustodian,
  describeAuditPendingPlace,
  foldAuditPendingRoomChips,
  labelAuditPendingRoomChips,
} from "../src/lib/audit-pending-list-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const room = (id: string, count: number) => ({ key: id, kind: "room" as const, locationId: id, count })
const all = (count: number) => ({ key: "all" as const, kind: "all" as const, count })
const other = (count: number) => ({ key: "other" as const, kind: "other" as const, count })

test("the pending list's where: the round's pending items, then the search and the room in one AND list (group 2 spec §9)", () => {
  assert.equal(AUDIT_PENDING_ROOM_ALL, "all")
  assert.equal(AUDIT_PENDING_ROOM_OTHER, "other")
  assert.equal(AUDIT_PENDING_TOP_ROOMS, 6)
  assert.deepEqual(auditPendingBaseWhere("r1"), { auditRoundId: "r1", auditStatus: "pending" })
  assert.equal(auditPendingRoomWhere("", ["l1"]), null)
  assert.deepEqual(auditPendingRoomWhere("l7", ["l1"]), { expectedLocationId: "l7" })
  // "อื่น ๆ" is a real filter: every room but the six shown (P2-R11).
  assert.deepEqual(auditPendingRoomWhere("other", ["l1", "l2"]), { expectedLocationId: { notIn: ["l1", "l2"] } })
  assert.deepEqual(buildAuditPendingListWhere({ roundId: "r1", search: null, room: null }), { AND: [{ auditRoundId: "r1", auditStatus: "pending" }] })
  const search = { OR: [{ asset: { assetTag: { contains: "PC" } } }] }
  assert.deepEqual(buildAuditPendingListWhere({ roundId: "r1", search, room: { expectedLocationId: "l1" } }), {
    AND: [{ auditRoundId: "r1", auditStatus: "pending" }, search, { expectedLocationId: "l1" }],
  })
})

test("a matched room or custodian goes into the where as the smaller list: the matched ids, or notIn the rest of the round's ids (P2-R10)", () => {
  assert.equal(auditPendingIdMatchWhere("expectedLocationId", ["a", "b", "c"], []), null)
  assert.deepEqual(auditPendingIdMatchWhere("expectedLocationId", ["a", "b", "c"], ["b"]), { expectedLocationId: { in: ["b"] } })
  assert.deepEqual(auditPendingIdMatchWhere("expectedLocationId", ["a", "b", "c", "d"], ["a", "b"]), { expectedLocationId: { in: ["a", "b"] } }, "a tie keeps in")
  assert.deepEqual(auditPendingIdMatchWhere("expectedLocationId", ["a", "b", "c"], ["a", "c"]), { expectedLocationId: { notIn: ["b"] } })
  assert.deepEqual(auditPendingIdMatchWhere("expectedLocationId", ["a"], ["a"]), { expectedLocationId: { notIn: [] } }, "every room matches")
  assert.deepEqual(auditPendingIdMatchWhere("expectedCustodianId", ["p1", "p2"], ["p1"]), { expectedCustodianId: { in: ["p1"] } })
  assert.deepEqual(auditPendingIdMatchWhere("expectedCustodianId", ["p1", "p2", "p3"], ["p1", "p3"]), {
    AND: [{ expectedCustodianId: { not: null } }, { expectedCustodianId: { notIn: ["p2"] } }],
  })
  // A broad word ("นาย") in a big round: the list never passes half of the round's ids, so it stays under 2,100 parameters.
  const ids = Array.from({ length: 4001 }, (_, index) => `p${index}`)
  for (const size of [1, 2000, 2001, 4000, 4001]) {
    const where = auditPendingIdMatchWhere("expectedCustodianId", ids, ids.slice(0, size))
    const list = JSON.stringify(where).match(/"p\d+"/g) ?? []
    assert.ok(list.length <= 2000, `${size} matched: ${list.length} ids`)
  }
})

test("the search matches the asset's code and name, and the item's expected room and custodian through their ids (bug 13)", () => {
  assert.equal(buildAuditPendingSearchWhere("", { roomIds: ["l1"], matchedRoomIds: ["l1"], custodianIds: [], matchedCustodianIds: [] }), null)
  assert.deepEqual(buildAuditPendingSearchWhere("บัญชี", { roomIds: ["l1", "l2", "l3"], matchedRoomIds: ["l2"], custodianIds: ["p1", "p2"], matchedCustodianIds: [] }), {
    OR: [{ asset: { assetTag: { contains: "บัญชี" } } }, { asset: { name: { contains: "บัญชี" } } }, { expectedLocationId: { in: ["l2"] } }],
  })
  assert.deepEqual(buildAuditPendingSearchWhere("E001", { roomIds: ["l1"], matchedRoomIds: [], custodianIds: ["p1", "p2"], matchedCustodianIds: ["p1"] }), {
    OR: [{ asset: { assetTag: { contains: "E001" } } }, { asset: { name: { contains: "E001" } } }, { expectedCustodianId: { in: ["p1"] } }],
  })
})

test("room chips: ทุกห้อง, the six largest (equal counts in id order), the selected room kept, then อื่น ๆ (spec §9, P2-R11)", () => {
  const groups = [
    { locationId: "l9", count: 2 },
    { locationId: "l1", count: 5 },
    { locationId: "l3", count: 3 },
    { locationId: "l2", count: 4 },
    { locationId: "l8", count: 1 },
    { locationId: "l6", count: 2 },
    { locationId: "l5", count: 2 },
    { locationId: "l4", count: 2 },
  ]
  const six = [room("l1", 5), room("l2", 4), room("l3", 3), room("l4", 2), room("l5", 2), room("l6", 2)]
  assert.deepEqual(foldAuditPendingRoomChips(groups, ""), { chips: [all(21), ...six, other(3)], topRoomIds: ["l1", "l2", "l3", "l4", "l5", "l6"], current: "all" })
  assert.deepEqual(foldAuditPendingRoomChips(groups, "l2"), { chips: [all(21), ...six, other(3)], topRoomIds: ["l1", "l2", "l3", "l4", "l5", "l6"], current: "l2" })
  // A room outside the six stays visible beside them; "อื่น ๆ" still counts it, as its link opens it too.
  assert.deepEqual(foldAuditPendingRoomChips(groups, "l8").chips, [all(21), ...six, room("l8", 1), other(3)])
  assert.equal(foldAuditPendingRoomChips(groups, "other").current, "other")
  // A room with nothing left (from the scan page) or an unknown id keeps its chip at 0, so the page never reads as unfiltered.
  assert.deepEqual(foldAuditPendingRoomChips(groups, "gone").chips, [all(21), ...six, room("gone", 0), other(3)])
  assert.deepEqual(foldAuditPendingRoomChips([{ locationId: "l1", count: 2 }, { locationId: "l2", count: 1 }], ""), { chips: [all(3), room("l1", 2), room("l2", 1)], topRoomIds: ["l1", "l2"], current: "all" })
  assert.deepEqual(foldAuditPendingRoomChips([{ locationId: "l1", count: 2 }], "other").chips, [all(2), room("l1", 2), other(0)])
  assert.deepEqual(foldAuditPendingRoomChips([], ""), { chips: [all(0)], topRoomIds: [], current: "all" })
})

test("names: a room the lookup cannot find has no place (ไม่ทราบห้อง, bug 16); two rooms of one name show their codes", () => {
  const places = new Map([
    ["l1", { code: "B1-201", name: "ห้องบัญชี" }],
    ["l2", { code: "B2-201", name: "ห้องบัญชี" }],
    ["l3", { code: "B1-301", name: "ห้องประชุม" }],
  ])
  assert.deepEqual(describeAuditPendingPlace("l3", places), { code: "B1-301", name: "ห้องประชุม" })
  assert.equal(describeAuditPendingPlace("gone", places), null)
  const labels = labelAuditPendingRoomChips([all(9), room("l1", 4), room("l2", 3), room("l3", 1), room("gone", 0), other(1)], places)
  assert.deepEqual([...labels.entries()], [
    ["l1", { place: { code: "B1-201", name: "ห้องบัญชี" }, showCode: true }],
    ["l2", { place: { code: "B2-201", name: "ห้องบัญชี" }, showCode: true }],
    ["l3", { place: { code: "B1-301", name: "ห้องประชุม" }, showCode: false }],
    ["gone", { place: null, showCode: false }],
  ])
  const people = new Map([["p1", { code: "E001", name: "สมชาย ใจดี" }]])
  assert.deepEqual(describeAuditPendingCustodian(null, people), { kind: "none" })
  assert.deepEqual(describeAuditPendingCustodian("p9", people), { kind: "unknown" })
  assert.deepEqual(describeAuditPendingCustodian("p1", people), { kind: "person", code: "E001", name: "สมชาย ใจดี" })
})

test("เดินตรวจต่อ goes back to the scan page the person came from, or opens a walk that returns to the round page (spec §9, Appendix A §9)", () => {
  const scan = "/th/audit/rounds/r1/scan?returnTo=%2Fth%2Faudit%2Frounds%2Fr1"
  assert.equal(buildAuditPendingContinueScanHref({ locale: "th", roundId: "r1", returnToHref: scan, scanReturnToHref: "/th/audit/rounds/r1" }), scan)
  assert.equal(buildAuditPendingContinueScanHref({ locale: "th", roundId: "r1", returnToHref: "/th/audit/rounds/r1/scan", scanReturnToHref: "/th/audit/rounds/r1" }), "/th/audit/rounds/r1/scan")
  const roundPage = "/th/audit/rounds/r1?returnTo=%2Fth%2Faudit%2Frounds"
  assert.equal(
    buildAuditPendingContinueScanHref({ locale: "th", roundId: "r1", returnToHref: roundPage, scanReturnToHref: roundPage }),
    "/th/audit/rounds/r1/scan?returnTo=%2Fth%2Faudit%2Frounds%2Fr1%3FreturnTo%3D%252Fth%252Faudit%252Frounds",
  )
})

test("the pending list rules are pure: node --test imports them", () => {
  const source = read("src/lib/audit-pending-list-rules.ts")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
})
```

`tests/latest-audit-result-rules.test.ts` (new):

```ts
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
```

`tests/audit-pending-list-page.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx"
const DATA = "src/lib/audit-pending-list-data.ts"
const DIALOG = "src/components/audit/audit-mark-not-found-button.tsx"

test("the data: one load per page, the rows' where with the room, the chips' groupBy without it, names by id active or not (spec §9, bug 13, P2-R10)", () => {
  const data = read(DATA)
  assert.match(data, /export async function getAuditPendingListData\(\{ roundId, searchText, locationFilter, listPage \}: \{ roundId: string; searchText: string; locationFilter: string; listPage: ListPageState \}\): Promise<AuditPendingListData>/)
  assert.match(data, /getAuditRoundCounts\(\[roundId\]\)/)
  // The room chips count within the search (spec §5): the rows' where without the room.
  assert.match(data, /prisma\.auditItem\.groupBy\(\{ by: \["expectedLocationId"\], where: buildAuditPendingListWhere\(\{ roundId, search, room: null \}\), _count: \{ _all: true \} \}\)/)
  assert.match(data, /const where = buildAuditPendingListWhere\(\{ roundId, search, room: auditPendingRoomWhere\(locationFilter, roomChips\.topRoomIds\) \}\)/)
  // The room half is the round page's lookup (Task 2, P2-R25), kept to the pending rooms; the custodians come from the
  // round's own pending items, matched in chunks of 2,000.
  assert.match(data, /^import \{ findAuditRoundSearchLocationIds \} from "@\/lib\/audit-round-list-lookups"$/m)
  assert.match(data, /findAuditRoundSearchLocationIds\(roundId, searchText\)/)
  assert.match(data, /matchedRoomIds: roundRoomMatches\.filter\(\(id\) => pendingRoomIds\.has\(id\)\)/)
  assert.doesNotMatch(data, /prisma\.location\.findMany\(\{ where: \{ id: \{ in: chunk \}/, "no room lookup of its own")
  assert.match(data, /chunkAuditIds\(custodianIds\)\.map\(\(chunk\) => prisma\.employee\.findMany\(\{ where: \{ id: \{ in: chunk \}, OR: \[\{ code: \{ contains: searchText \} \}, \{ fullNameTh: \{ contains: searchText \} \}\] \}, select: \{ id: true \} \}\)\)/)
  assert.match(data, /buildAuditPendingSearchWhere\(searchText, \{/)
  // Rows show the item's expected room and custodian, never the asset's current ones.
  assert.doesNotMatch(data, /currentLocation|custodian: \{ select/)
  // ตรวจล่าสุด: the asset page's rule from the audit items, one read for the page's assets, never a movement (P2-R32).
  assert.match(data, /^import \{ latestAuditResultOrderBy, latestAuditResultSelect, latestAuditResultWhere, pickLatestAuditResultAt \} from "@\/lib\/latest-audit-result-rules"$/m)
  assert.match(data, /prisma\.auditItem\.findMany\(\{ where: \{ assetId: \{ in: assetIds \}, \.\.\.latestAuditResultWhere \}, orderBy: latestAuditResultOrderBy, select: latestAuditResultSelect \}\)/)
  assert.equal(data.match(/latestAuditResultWhere \}/g)?.length, 1, "one read, not one per row")
  assert.match(data, /lastAuditAt: pickLatestAuditResultAt\(auditRows\),/)
  assert.doesNotMatch(data, /movements|movementType|performedAt/)
  assert.doesNotMatch(data, /isActive/, "a room or person closed during the round keeps its name")
  assert.doesNotMatch(data, /\.(create|update|upsert|delete)(Many)?\(|\$queryRaw/)
})

test("the header: the round-wide pending count in the title, the trail, the round's facts and เดินตรวจต่อ for audit:edit (spec §9, P2-R12)", () => {
  const page = read(PAGE)
  assert.match(page, /const user = await requirePagePermission\(locale, "audit", "view"\)/)
  assert.match(page, /const canScan = hasPermission\(user, "audit", "edit"\)/)
  assert.match(page, /select: \{ id: true, auditNo: true, name: true, status: true, endDate: true \}/)
  assert.match(page, /withPerformanceTiming\("audit-pending\.page-data", \(\) =>\s*getAuditPendingListData\(\{ roundId: round\.id, searchText, locationFilter, listPage \}\),?\s*\)/)
  assert.match(page, /breadcrumbs=\{\[\n\s+\{ label: tRound\("title"\), href: `\/\$\{locale\}\/audit\/rounds` \},\n\s+\{ label: round\.auditNo, href: scanReturnToHref, code: true \},\n\s+\{ label: t\("title"\) \},\n\s+\]\}/)
  assert.match(page, /title=\{t\("titleWithCount", \{ count: formatCount\(data\.counts\.pending\) \}\)\}/)
  const at = (needle: string) => {
    const index = page.indexOf(needle)
    assert.ok(index !== -1, needle)
    return index
  }
  const meta = [
    '<span className="tag">{round.auditNo}</span>',
    '<StatusBadge label={tRound(auditRoundStatusLabelKey(round.status) ?? "statusOpen")} status={effectiveAuditRoundStatus(round.status)} />',
    't("checkedOfTotal", { checked: formatCount(data.counts.checked), total: formatCount(data.counts.total) })',
    'dueLine.kind === "left" ? tRound("daysLeft", { days: formatCount(dueLine.days) }) : tRound("daysOverdue", { days: formatCount(dueLine.days) })',
  ].map(at)
  assert.deepEqual(meta, [...meta].sort((a, b) => a - b))
  assert.match(page, /const dueLine = buildAuditRoundDueLine\(round\.status, round\.endDate, startOfBangkokDay\(new Date\(\)\)\)/)
  assert.match(page, /const continueScanHref = buildAuditPendingContinueScanHref\(\{ locale, roundId: round\.id, returnToHref, scanReturnToHref \}\)/)
  assert.match(page, /actions=\{\n\s+canScan && data\.counts\.pending > 0 \? \(\n\s+<Link href=\{continueScanHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+<ScanLine aria-hidden="true" \/>\n\s+\{tRound\("nextStepContinueScan", \{ count: formatCount\(data\.counts\.pending\) \}\)\}/)
  assert.doesNotMatch(page, /<ContentPanel|t\("pendingCount"|t\("roomFilter"|t\("subtitle"/)
})

test("room chips: a TabNav of rooms counted within the search, the search at its right (spec §9, P2-R11, bug 16)", () => {
  const page = read(PAGE)
  assert.match(page, /const roomLabels = labelAuditPendingRoomChips\(data\.roomChips\.chips, data\.places\)/)
  assert.match(page, /label: chip\.kind === "all" \? t\("roomAll"\) : chip\.kind === "other" \? t\("roomOther"\) : formatAuditPendingRoomChip\(roomLabels\.get\(chip\.key\), t\("roomUnknown"\)\),/)
  assert.match(page, /count: formatCount\(chip\.count\),\n\s+href: listHref\(\{ locationId: chip\.kind === "all" \? "" : chip\.key \}\),/)
  assert.match(page, /<TabNav aria-label=\{t\("roomChips"\)\} items=\{roomTabs\} current=\{data\.roomChips\.current\} scroll=\{false\}/)
  assert.ok(page.indexOf("<TabNav") < page.indexOf("<MasterDataSearch"), "the search sits after the chips")
  assert.doesNotMatch(page, /locationFilterLabel|prisma\.location\./, "no raw id label and no lookup of its own")
})

test("rows: the expected room and custodian, the whole row and the name open the asset, two buttons for audit:edit only that the row ignores; the phone card the same (spec §9, Appendix A §9, bugs 13 and 14, P2-R7, P2-R14, P2-R28)", () => {
  const page = read(PAGE)
  assert.match(page, /<ClickableTableRow key=\{item\.id\} href=\{assetHref\} label=\{`\$\{tCommon\("view"\)\}: \$\{item\.asset\.assetTag\}`\}>/)
  assert.match(page, /<Link href=\{assetHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "font-semibold"\)\}>\{item\.asset\.name\}<\/Link>/)
  assert.match(page, /formatAuditPendingCustodian\(facts\.custodian, t\("noCustodian"\)\) \?\? <Nil \/>/)
  assert.match(page, /formatAuditPendingLocation\(facts\.location, t\("roomUnknown"\)\)/)
  assert.match(page, /formatAuditPendingLastAudit\(facts\.lastAuditAt\) \?\? t\("lastAuditNever"\)/)
  assert.match(page, /formatAuditPendingLastAudit\(facts\.lastAuditAt\) \?\? labels\.lastAuditNever/, "the phone card reads the same date")
  assert.match(page, /function formatAuditPendingLastAudit\(at: Date \| null\) \{\n\s+return at \? formatDateTime\(at\) : null\n\}/, "date and time (P2-R13)")
  assert.doesNotMatch(page, /movements/)
  assert.match(page, /\{canScan \? \(\n\s+<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>\n\s+\) : null\}/)
  assert.match(page, /\{canScan \? \(\n\s+<DataTableCell align="right" sticky="right">\n\s+<div className="flex items-center justify-end gap-2">\n\s+<Link href=\{scanHref\} className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}>/)
  assert.match(page, /<AuditMarkNotFoundButton itemId=\{item\.id\} variant="row" asset=\{facts\.notFound\} \/>/)
  assert.match(page, /colSpan=\{canScan \? 4 : 3\}/)
  // The phone card: scan and not found for audit:edit, "ดูทรัพย์สิน" for everyone.
  assert.match(page, /\{canScan \? \(\n\s+<Link href=\{scanHref\} className=\{buttonVariants\(\)\}>/)
  assert.match(page, /\{canScan \? <AuditMarkNotFoundButton itemId=\{item\.id\} variant="button" asset=\{facts\.notFound\} \/> : null\}/)
  assert.match(page, /function describeAuditPendingItem\(item: AuditPendingListItem, places: ReadonlyMap<string, AuditPendingPlace>, people: ReadonlyMap<string, AuditPendingPlace>, lastAuditAt: ReadonlyMap<string, Date>\): AuditPendingItemFacts/)
  assert.doesNotMatch(page, /<DataTableRow\b|AuditPendingRowActions|currentLocation|asset\.custodian/)
  assert.equal(existsSync("src/components/audit/audit-pending-row-actions.tsx"), false)
})

test("empty states: ล้างคำค้น for a search, ดูทุกห้อง for a room, กลับ when the round has nothing left (spec §5, Appendix A §9)", () => {
  const page = read(PAGE)
  assert.match(page, /const empty = searchText\n\s+\? \{ title: t\("emptySearchTitle"\), help: t\("emptySearchHelp"\), href: clearSearchHref, label: t\("clearSearch"\) \}\n\s+: locationFilter\n\s+\? \{ title: t\("roomEmptyTitle"\), help: t\("roomEmptyHelp"\), href: clearRoomFilterHref, label: t\("roomFilterClear"\) \}\n\s+: \{ title: t\("emptyTitle"\), help: t\("emptyHelp"\), href: returnToHref, label: tCommon\("back"\) \}/)
})

test("the not-found dialog names the asset and says what follows, with no before/after numbers (spec §9, bug 15, P2-R15)", () => {
  const source = read(DIALOG)
  assert.match(source, /import type \{ AuditPendingCustodian, AuditPendingPlace \} from "@\/lib\/audit-pending-list-rules"/)
  assert.match(source, /export type AuditNotFoundAsset = \{ name: string; tag: string; location: AuditPendingPlace \| null; custodian: AuditPendingCustodian \}/)
  assert.match(source, /type AuditMarkNotFoundButtonVariant = "icon" \| "button" \| "row"/)
  assert.match(source, /asset: AuditNotFoundAsset\n/)
  assert.match(source, /variant === "row" \? \(\n\s+<Button variant="outline" size="sm" busy=\{saving\} onClick=\{openDialog\}>/)
  // In the clickable row (P2-R28): the trigger and the dialog's portal events stop before the row.
  assert.match(source, /<div data-no-row-click className="contents" onClick=\{stopRowEvent\} onKeyDown=\{stopRowEvent\}>/)
  assert.match(source, /<RowClickGuard active=\{variant === "row"\}>/)
  for (const label of ['label: t("asset")', 'label: t("expectedLocation")', 'label: t("expectedCustodian")', 't("roomUnknown")', 't("noCustodian")']) {
    assert.ok(source.includes(label), label)
  }
  const facts = source.indexOf("<KeyValueList")
  const result = source.indexOf('<Notice tone="info">{t("notFoundResult")}</Notice>')
  const remark = source.indexOf("<Textarea")
  assert.ok(facts !== -1 && facts < result && result < remark, "the facts, then the result line, then the optional fields")
  assert.doesNotMatch(source, /→/, "no before/after numbers (spec §9, §15)")
})
```

At the end of `tests/audit-not-found-dialog.test.ts` (after `:63`, the closing `})` of the last test) add:

```ts
test("the not-found words: the result line, ผู้พิจารณา in place of ผู้ตรวจสอบ, and the asset's facts (group 2 spec §9, P2-R15, glossary row 11)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.auditPending.notFoundResult, "รายการนี้จะออกจากรอตรวจ และส่งให้หัวหน้า IT พิจารณา ทะเบียนยังไม่เปลี่ยน")
  assert.match(th.auditPending.notFoundDialogDescription, /ผู้พิจารณา/)
  for (const namespace of ["auditPending", "auditRound"]) {
    for (const [key, value] of Object.entries(th[namespace] as Record<string, string>)) assert.doesNotMatch(value, /ผู้ตรวจสอบ/, `${namespace}.${key}`)
  }
  for (const messages of [th, en]) {
    for (const key of ["notFoundResult", "asset", "noCustodian", "roomUnknown", "expectedLocation", "expectedCustodian"]) assert.equal(typeof messages.auditPending[key], "string", key)
  }
  assert.doesNotMatch(en.auditPending.notFoundDialogDescription, /review/i)
})
```

In `tests/performance-route-instrumentation.test.ts`, after the scan page's entry (`:39-42`) add:

```ts
  {
    file: "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx",
    labels: ["audit-pending.page-data"],
  },
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/audit-pending-list-rules.test.ts tests/latest-audit-result-rules.test.ts tests/audit-pending-list-page.test.ts tests/audit-not-found-dialog.test.ts tests/performance-route-instrumentation.test.ts`
Expected: FAIL.
- `audit-pending-list-rules.test.ts`: `src/lib/audit-pending-list-rules.ts` does not exist (import error).
- `latest-audit-result-rules.test.ts`: `src/lib/latest-audit-result-rules.ts` does not exist (import error).
- `audit-pending-list-page.test.ts`: `src/lib/audit-pending-list-data.ts` does not exist (ENOENT); the page has no `canScan`, no `titleWithCount`, still `AuditPendingRowActions` in its row; the dialog has no `asset` prop.
- `audit-not-found-dialog.test.ts`: `auditPending.notFoundResult` is undefined.
- `performance-route-instrumentation.test.ts`: the pending page has no `withPerformanceTiming`.

- [ ] **Step 3: Implement**

Line numbers below are master `f8269894`. Tasks 1-5 do not touch the pending page, the not-found button or `src/lib/asset-detail-frame.ts` (Task 5 edits only the `:54` comment of `tests/asset-detail-frame.test.ts`, so `:194` holds); Task 4's DESIGN.md edit (`:294`) keeps the line count, so `:621` and `:628` hold.

- **`src/lib/latest-audit-result-rules.ts`** (new), with the header comment "The asset's latest audit result (group 1 asset detail R54; group 2 plan 2 P2-R32): its latest audit item with a result, in a round that is active and not cancelled, by the latest scan, then the latest change; the date is the scan, or the change for a not-found record with no scan. The asset page's frame reads it for one asset; the pending list reads it for one page of assets in one query. Pure: `import type` and relative `.ts` imports only.":

  ```ts
  import type { Prisma } from "@prisma/client"
  import { auditRoundCoverageWhere } from "./audit-round-status.ts"

  export const latestAuditResultWhere: Prisma.AuditItemWhereInput = { auditResult: { not: null }, auditRound: { isActive: true, status: auditRoundCoverageWhere } }

  export const latestAuditResultOrderBy: Prisma.AuditItemOrderByWithRelationInput[] = [{ lastScanAt: "desc" }, { updatedAt: "desc" }]

  export const latestAuditResultSelect = {
    assetId: true,
    auditResult: true,
    lastScanAt: true,
    updatedAt: true,
    auditRound: { select: { isActive: true, status: true } },
  } satisfies Prisma.AuditItemSelect

  export type LatestAuditResultRow = { assetId: string; auditResult: string | null; lastScanAt: Date | null; updatedAt: Date; auditRound: { isActive: boolean; status: string } }

  export function latestAuditResultAt(item: { lastScanAt: Date | null; updatedAt: Date }): Date {
    return item.lastScanAt ?? item.updatedAt
  }

  // The where's rule applied by value too, so the pick does not rest on the rows' order: lastScanAt desc with a null
  // last (SQL Server's desc, the asset page's findFirst), then updatedAt desc.
  export function pickLatestAuditResultAt(rows: readonly LatestAuditResultRow[]): Map<string, Date> {
    const latest = new Map<string, LatestAuditResultRow>()
    for (const row of rows) {
      if (row.auditResult === null || !row.auditRound.isActive || row.auditRound.status === auditRoundCoverageWhere.not) continue
      const current = latest.get(row.assetId)
      if (!current || isLaterAuditResult(row, current)) latest.set(row.assetId, row)
    }
    return new Map([...latest].map(([assetId, row]) => [assetId, latestAuditResultAt(row)]))
  }

  function isLaterAuditResult(left: LatestAuditResultRow, right: LatestAuditResultRow): boolean {
    if (left.lastScanAt && right.lastScanAt && left.lastScanAt.getTime() !== right.lastScanAt.getTime()) return left.lastScanAt > right.lastScanAt
    if (left.lastScanAt && !right.lastScanAt) return true
    if (!left.lastScanAt && right.lastScanAt) return false
    return left.updatedAt > right.updatedAt
  }
  ```
- **`src/lib/asset-detail-frame.ts`** (the same rule, now from the rules file; the asset page shows what it shows today):
  - `:5` becomes `import { auditRoundOperationalWhere } from "@/lib/audit-round-status"`, and after it `import { latestAuditResultAt, latestAuditResultOrderBy, latestAuditResultWhere } from "@/lib/latest-audit-result-rules"`.
  - `:46-47` become `where: { assetId, ...latestAuditResultWhere },` and `orderBy: latestAuditResultOrderBy,`; the `select` at `:48` stays.
  - `:65`: `at: latestItem.lastScanAt ?? latestItem.updatedAt` becomes `at: latestAuditResultAt(latestItem)`.

- **`src/lib/audit-pending-list-rules.ts`** (new):

  ```ts
  // The round's pending list (group 2 spec §9). The rows, the search and the room chips read the item's expected room
  // and custodian (bug 13), snapshotted when the round opened: the key the scan page groups its rooms by
  // (audit-scan-session.ts buildRoomOptions). AuditItem has no relation to Location or Employee, so the search matches
  // rooms and people by code or name through id lookups (the rooms through the round page's lookup, P2-R25), and the
  // where carries the matched ids of the round's own pending items (P2-R10). Every filter goes into one AND list. Pure:
  // `import type` and relative `.ts` imports only.
  import type { Prisma } from "@prisma/client"
  import { foldTopCategories } from "./audit-round-counts-rules.ts"
  import { appendOperationalReturnTo } from "./operational-return-navigation.ts"

  export const AUDIT_PENDING_ROOM_ALL = "all"
  export const AUDIT_PENDING_ROOM_OTHER = "other"
  export const AUDIT_PENDING_TOP_ROOMS = 6

  // A pending item is always the round's own: an out-of-scope find is created "reviewed" (scan route), and a pending
  // item's result is null.
  export function auditPendingBaseWhere(roundId: string): Prisma.AuditItemWhereInput {
    return { auditRoundId: roundId, auditStatus: "pending" }
  }

  // The smaller list goes into the where: the matched ids, or notIn the round's other ids. Both lists come from the
  // round's own pending items, so neither passes half of them, and a broad word ("นาย") that matches most custodians
  // stays under SQL Server's 2,100 parameters. Prisma reads notIn [] as every row. SQL's NOT IN never matches NULL; the
  // null branch is spelled out so the meaning does not rest on that.
  export function auditPendingIdMatchWhere(field: "expectedLocationId" | "expectedCustodianId", all: readonly string[], matched: readonly string[]): Prisma.AuditItemWhereInput | null {
    if (matched.length === 0) return null
    const hit = new Set(matched)
    const rest = all.filter((id) => !hit.has(id))
    if (matched.length <= rest.length) return field === "expectedLocationId" ? { expectedLocationId: { in: [...matched] } } : { expectedCustodianId: { in: [...matched] } }
    return field === "expectedLocationId"
      ? { expectedLocationId: { notIn: rest } }
      : { AND: [{ expectedCustodianId: { not: null } }, { expectedCustodianId: { notIn: rest } }] }
  }
  ```
  Then, in the Interfaces order:
  - `buildAuditPendingSearchWhere` (the two id branches are left out when `null`):

    ```ts
    export function buildAuditPendingSearchWhere(searchText: string, lookups: AuditPendingSearchLookups): Prisma.AuditItemWhereInput | null {
      if (!searchText) return null
      const room = auditPendingIdMatchWhere("expectedLocationId", lookups.roomIds, lookups.matchedRoomIds)
      const custodian = auditPendingIdMatchWhere("expectedCustodianId", lookups.custodianIds, lookups.matchedCustodianIds)
      return {
        OR: [{ asset: { assetTag: { contains: searchText } } }, { asset: { name: { contains: searchText } } }, ...(room ? [room] : []), ...(custodian ? [custodian] : [])],
      }
    }
    ```
  - `auditPendingRoomWhere` and `buildAuditPendingListWhere` (an unknown room id matches nothing; its chip names it "ไม่ทราบห้อง", bug 16):

    ```ts
    export function auditPendingRoomWhere(locationFilter: string, topRoomIds: readonly string[]): Prisma.AuditItemWhereInput | null {
      if (!locationFilter) return null
      if (locationFilter === AUDIT_PENDING_ROOM_OTHER) return { expectedLocationId: { notIn: [...topRoomIds] } }
      return { expectedLocationId: locationFilter }
    }

    export function buildAuditPendingListWhere({ roundId, search, room }: { roundId: string; search: Prisma.AuditItemWhereInput | null; room: Prisma.AuditItemWhereInput | null }): Prisma.AuditItemWhereInput {
      return { AND: [auditPendingBaseWhere(roundId), ...(search ? [search] : []), ...(room ? [room] : [])] }
    }
    ```
  - `foldAuditPendingRoomChips`, with the comment "The six rooms with the most pending items, equal counts in id order so the six (and so "อื่น ๆ") do not change between two loads; the selected room stays visible outside the six or at 0, and "อื่น ๆ" still counts it, because its link opens it too (P2-R11).":

    ```ts
    export function foldAuditPendingRoomChips(groups: readonly AuditPendingRoomGroup[], locationFilter: string): { chips: AuditPendingRoomChip[]; topRoomIds: string[]; current: string } {
      const byId = [...groups].sort((left, right) => (left.locationId < right.locationId ? -1 : left.locationId > right.locationId ? 1 : 0))
      const { top, other } = foldTopCategories(byId, AUDIT_PENDING_TOP_ROOMS)
      const topRoomIds = top.map((group) => group.locationId)
      const selected = locationFilter && locationFilter !== AUDIT_PENDING_ROOM_OTHER && !topRoomIds.includes(locationFilter) ? locationFilter : null
      const chips: AuditPendingRoomChip[] = [
        { key: AUDIT_PENDING_ROOM_ALL, kind: "all", count: groups.reduce((sum, group) => sum + group.count, 0) },
        ...top.map((group) => ({ key: group.locationId, kind: "room" as const, locationId: group.locationId, count: group.count })),
        ...(selected ? [{ key: selected, kind: "room" as const, locationId: selected, count: groups.find((group) => group.locationId === selected)?.count ?? 0 }] : []),
        ...(other.categories > 0 || locationFilter === AUDIT_PENDING_ROOM_OTHER ? [{ key: AUDIT_PENDING_ROOM_OTHER, kind: "other" as const, count: other.count }] : []),
      ]
      return { chips, topRoomIds, current: locationFilter || AUDIT_PENDING_ROOM_ALL }
    }
    ```
  - `describeAuditPendingPlace` returns `places.get(locationId) ?? null`; `describeAuditPendingCustodian` returns `{ kind: "none" }` for `null`, `{ kind: "person", ...person }` when found, `{ kind: "unknown" }` otherwise.
  - `labelAuditPendingRoomChips`: the room chips only (a type guard `chip.kind === "room"`), each `[chip.key, { place, showCode }]` in chip order; `showCode` is true when another room chip's place has the same name.
  - `buildAuditPendingContinueScanHref`, with the comment "เดินตรวจต่อ (spec §9): back to the scan page the person came from (its URL keeps its own returnTo), or a new walk whose back button returns to the round page.":

    ```ts
    export function buildAuditPendingContinueScanHref({ locale, roundId, returnToHref, scanReturnToHref }: { locale: string; roundId: string; returnToHref: string; scanReturnToHref: string }): string {
      const scanPath = `/${locale}/audit/rounds/${roundId}/scan`
      return returnToHref.split(/[?#]/)[0] === scanPath ? returnToHref : appendOperationalReturnTo(scanPath, scanReturnToHref)
    }
    ```
- **`src/lib/audit-pending-list-data.ts`** (new, server):

  ```ts
  import type { Prisma } from "@prisma/client"
  import { prisma } from "@/lib/db"
  import { getAuditRoundCounts } from "@/lib/audit-round-counts"
  import { chunkAuditIds, emptyAuditRoundCounts, type AuditRoundCounts } from "@/lib/audit-round-counts-rules"
  import { findAuditRoundSearchLocationIds } from "@/lib/audit-round-list-lookups"
  import { latestAuditResultOrderBy, latestAuditResultSelect, latestAuditResultWhere, pickLatestAuditResultAt } from "@/lib/latest-audit-result-rules"
  import { listPageWindow, type ListPageState } from "@/lib/list-pagination"
  import {
    auditPendingBaseWhere,
    auditPendingRoomWhere,
    buildAuditPendingListWhere,
    buildAuditPendingSearchWhere,
    foldAuditPendingRoomChips,
    type AuditPendingPlace,
    type AuditPendingRoomChip,
  } from "@/lib/audit-pending-list-rules"

  const pendingItemInclude = {
    asset: { select: { id: true, assetTag: true, name: true } },
  } satisfies Prisma.AuditItemInclude

  export type AuditPendingListItem = Prisma.AuditItemGetPayload<{ include: typeof pendingItemInclude }>

  export type AuditPendingListData = {
    counts: AuditRoundCounts
    roomChips: { chips: AuditPendingRoomChip[]; current: string }
    items: AuditPendingListItem[]
    total: number
    places: Map<string, AuditPendingPlace>
    people: Map<string, AuditPendingPlace>
    lastAuditAt: Map<string, Date>
  }

  // The pending list's data (group 2 spec §9): the round-wide counts (the title and "ตรวจแล้ว x / y"), the room chips
  // within the search, one page of rows, the names of the chips' rooms and the rows' rooms and custodians, and each
  // row's ตรวจล่าสุด. Every count comes from the rows' own where (spec §5). It never writes.
  export async function getAuditPendingListData({ roundId, searchText, locationFilter, listPage }: { roundId: string; searchText: string; locationFilter: string; listPage: ListPageState }): Promise<AuditPendingListData> {
    const [countsById, search] = await Promise.all([getAuditRoundCounts([roundId]), loadAuditPendingSearchWhere(roundId, searchText)])
    const roomGroups = await prisma.auditItem.groupBy({ by: ["expectedLocationId"], where: buildAuditPendingListWhere({ roundId, search, room: null }), _count: { _all: true } })
    const roomChips = foldAuditPendingRoomChips(roomGroups.map((group) => ({ locationId: group.expectedLocationId, count: group._count._all })), locationFilter)
    const where = buildAuditPendingListWhere({ roundId, search, room: auditPendingRoomWhere(locationFilter, roomChips.topRoomIds) })
    const { skip, take } = listPageWindow(listPage)
    const [items, total] = await Promise.all([
      prisma.auditItem.findMany({ where, include: pendingItemInclude, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip, take }),
      prisma.auditItem.count({ where }),
    ])
    // Names by id, active or not: a room closed during the round keeps its name. At most 7 chip rooms and one page of rows.
    const placeIds = [...new Set([...roomChips.chips.flatMap((chip) => (chip.kind === "room" ? [chip.locationId] : [])), ...items.map((item) => item.expectedLocationId)])]
    const personIds = [...new Set(items.flatMap((item) => (item.expectedCustodianId ? [item.expectedCustodianId] : [])))]
    const assetIds = [...new Set(items.map((item) => item.asset.id))]
    const [locations, employees, auditRows] = await Promise.all([
      placeIds.length > 0 ? prisma.location.findMany({ where: { id: { in: placeIds } }, select: { id: true, code: true, name: true } }) : [],
      personIds.length > 0 ? prisma.employee.findMany({ where: { id: { in: personIds } }, select: { id: true, code: true, fullNameTh: true } }) : [],
      // ตรวจล่าสุด (P2-R13, P2-R32): the asset page's rule from the audit items, in one read for the page's assets (at most
      // 100 ids, the largest page size, so no chunks). A found-in-place scan writes no movement, so the items say it.
      assetIds.length > 0 ? prisma.auditItem.findMany({ where: { assetId: { in: assetIds }, ...latestAuditResultWhere }, orderBy: latestAuditResultOrderBy, select: latestAuditResultSelect }) : [],
    ])
    return {
      counts: countsById.get(roundId) ?? { ...emptyAuditRoundCounts },
      roomChips: { chips: roomChips.chips, current: roomChips.current },
      items,
      total,
      places: new Map(locations.map((location) => [location.id, { code: location.code, name: location.name }])),
      people: new Map(employees.map((employee) => [employee.id, { code: employee.code, name: employee.fullNameTh }])),
      lastAuditAt: pickLatestAuditResultAt(auditRows),
    }
  }

  // The search's rooms and people (P2-R10), so the where carries ids of this round only. The rooms are the round page's
  // lookup (Task 2's findAuditRoundSearchLocationIds, P2-R25: the round's rooms by code or name, in chunks of 2,000),
  // kept to the rooms that still have pending items; the people are the round's own pending custodians, matched by code
  // or name in chunks of 2,000.
  async function loadAuditPendingSearchWhere(roundId: string, searchText: string): Promise<Prisma.AuditItemWhereInput | null> {
    if (!searchText) return null
    const base = auditPendingBaseWhere(roundId)
    const [roomGroups, custodianGroups, roundRoomMatches] = await Promise.all([
      prisma.auditItem.groupBy({ by: ["expectedLocationId"], where: base }),
      prisma.auditItem.groupBy({ by: ["expectedCustodianId"], where: { AND: [base, { expectedCustodianId: { not: null } }] } }),
      findAuditRoundSearchLocationIds(roundId, searchText),
    ])
    const roomIds = roomGroups.map((group) => group.expectedLocationId)
    const pendingRoomIds = new Set(roomIds)
    const custodianIds = custodianGroups.flatMap((group) => (group.expectedCustodianId ? [group.expectedCustodianId] : []))
    const matchedPeople = await Promise.all(
      chunkAuditIds(custodianIds).map((chunk) => prisma.employee.findMany({ where: { id: { in: chunk }, OR: [{ code: { contains: searchText } }, { fullNameTh: { contains: searchText } }] }, select: { id: true } })),
    )
    return buildAuditPendingSearchWhere(searchText, {
      roomIds,
      // Only the pending rooms, so the in / notIn list stays within them (auditPendingIdMatchWhere).
      matchedRoomIds: roundRoomMatches.filter((id) => pendingRoomIds.has(id)),
      custodianIds,
      matchedCustodianIds: matchedPeople.flat().map((match) => match.id),
    })
  }
  ```
  If tsc cannot infer the `groupBy` generics inside `Promise.all` or with `where` from a function, hoist the args into a `const args = { … } satisfies Prisma.AuditItemGroupByArgs`; the pinned text of the first `groupBy` stays on one line.
- **`src/components/audit/audit-mark-not-found-button.tsx`:**
  - Imports: add `import { KeyValueList } from "@/components/ui/key-value-list"`, `import { Notice } from "@/components/ui/notice"` and `import type { AuditPendingCustodian, AuditPendingPlace } from "@/lib/audit-pending-list-rules"`.
  - `:22` becomes `type AuditMarkNotFoundButtonVariant = "icon" | "button" | "row"`.
  - After `:38` add, with the comment "What the dialog names (spec §9, bug 15): the pending row's own facts, from the item's expected room and custodian.":
    `export type AuditNotFoundAsset = { name: string; tag: string; location: AuditPendingPlace | null; custodian: AuditPendingCustodian }`
  - The props (`:42-54`) gain `asset` after `itemId` (destructured and typed `asset: AuditNotFoundAsset` on its own line).
  - The trigger (`:114-132`) gains the row button between `"button"` and the icon:

    ```tsx
      ) : variant === "row" ? (
        <Button variant="outline" size="sm" busy={saving} onClick={openDialog}>
          {icon}
          {t("markNotFound")}
        </Button>
      ) : (
    ```
  - The return (`:134-183`): its fragment becomes `<RowClickGuard active={variant === "row"}>` … `</RowClickGuard>`, the trigger and the dialog inside as today. Add `type SyntheticEvent` and `type ReactNode` to the `react` import, and after the variant type, the guard moved from the deleted `audit-pending-row-actions.tsx`:

    ```tsx
    // React sends events up the component tree, so a click inside the not-found dialog (a portal outside the row) would
    // reach the pending list's clickable row and open the asset page (P2-R28). In a row, this wrapper stops them before
    // the row; ClickableTableRow already ignores the trigger itself (a button).
    function stopRowEvent(event: SyntheticEvent) {
      event.stopPropagation()
    }

    function RowClickGuard({ active, children }: { active: boolean; children: ReactNode }) {
      if (!active) return <>{children}</>
      return (
        <div data-no-row-click className="contents" onClick={stopRowEvent} onKeyDown={stopRowEvent}>
          {children}
        </div>
      )
    }
    ```
  - The body (`:147`), before the remark `Field`:

    ```tsx
            <KeyValueList
              items={[
                { key: "asset", label: t("asset"), value: <><span className="font-medium">{asset.name}</span> <span className="tag">{asset.tag}</span></> },
                { key: "location", label: t("expectedLocation"), value: asset.location ? <><span className="tag">{asset.location.code}</span> - {asset.location.name}</> : t("roomUnknown") },
                {
                  key: "custodian",
                  label: t("expectedCustodian"),
                  value: asset.custodian.kind === "person" ? <><span className="tag">{asset.custodian.code}</span> - {asset.custodian.name}</> : asset.custodian.kind === "none" ? t("noCustodian") : null,
                },
              ]}
            />
            <Notice tone="info">{t("notFoundResult")}</Notice>
    ```
    No before/after numbers (spec §9, §15). An unknown custodian id gets `null`, which `KeyValueList` shows as `Nil`.
- **The page `audit/rounds/[id]/pending/page.tsx`** (master `:1-419`):
  - Imports: keep `ClickableTableRow` (P2-R28); drop `ContentPanel`, `AuditPendingRowActions`, `listPageWindow` and `type Prisma`; add `hasPermission` (`@/lib/auth-utils`), `type AuditNotFoundAsset` (with `AuditMarkNotFoundButton`), `StatusBadge`, `TabNav`, `auditRoundStatusLabelKey`, `effectiveAuditRoundStatus`, `buildAuditRoundDueLine` (`@/lib/audit-rounds-list-rules`), `startOfBangkokDay` (`@/lib/waiting-work-rules`), `withPerformanceTiming` (`@/lib/performance-timing`), `getAuditPendingListData` and `type AuditPendingListItem` (`@/lib/audit-pending-list-data`), and from `@/lib/audit-pending-list-rules` `buildAuditPendingContinueScanHref`, `describeAuditPendingCustodian`, `describeAuditPendingPlace`, `labelAuditPendingRoomChips` and the types `AuditPendingCustodian`, `AuditPendingPlace`, `AuditPendingRoomChipLabel`.
  - `type AuditPendingItem` (`:33-43`) goes; `AuditPendingPageProps` (`:28-31`) stays as it is.
  - The load, after the unchanged `searchText`, `locationFilter` and `listPage` lines:

    ```tsx
      const user = await requirePagePermission(locale, "audit", "view")
      // audit:edit scans and records not found (group 2 spec §5, bug 14): a viewer gets no scan link, no not-found button
      // and no "เดินตรวจต่อ"; the asset's name still opens the asset.
      const canScan = hasPermission(user, "audit", "edit")
      const t = await getTranslations("auditPending")
      const tRound = await getTranslations("auditRound")
      const tCommon = await getTranslations("common")
      …
      const round = await prisma.auditRound.findFirst({
        where: { id, isActive: true },
        select: { id: true, auditNo: true, name: true, status: true, endDate: true },
      })
      if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()

      // One load after the read-only check (spec §9): the round-wide counts, the room chips within the search, one page of
      // rows and the names of their expected rooms and custodians.
      const data = await withPerformanceTiming("audit-pending.page-data", () =>
        getAuditPendingListData({ roundId: round.id, searchText, locationFilter, listPage }),
      )
      const { items, total } = data
      const returnToHref = normalizeAuditRoundWorkflowReturnTo(locale, round.id, rawSearchParams.returnTo)
      // Always the round page, with its own returnTo: the scan links' back target and the trail's AUD-… link.
      const scanReturnToHref = resolveAuditPendingScanReturnTo(locale, round.id, returnToHref)
      const continueScanHref = buildAuditPendingContinueScanHref({ locale, roundId: round.id, returnToHref, scanReturnToHref })
    ```
    `pendingHref`, `listHref`, the last-page redirect, `paginationRange`, `clearSearchHref`, `clearRoomFilterHref` and `pageSizeInput` stay as at master `:129-149`. `filterLocation` and `locationFilterLabel` (`:150-153`) go (bug 16: the chip names the room, or "ไม่ทราบห้อง"). Then:

    ```tsx
      const dueLine = buildAuditRoundDueLine(round.status, round.endDate, startOfBangkokDay(new Date()))
      const roomLabels = labelAuditPendingRoomChips(data.roomChips.chips, data.places)
      const roomTabs = data.roomChips.chips.map((chip) => ({
        key: chip.key,
        label: chip.kind === "all" ? t("roomAll") : chip.kind === "other" ? t("roomOther") : formatAuditPendingRoomChip(roomLabels.get(chip.key), t("roomUnknown")),
        count: formatCount(chip.count),
        href: listHref({ locationId: chip.kind === "all" ? "" : chip.key }),
      }))
      // A search with no rows offers "ล้างคำค้น"; a room with no rows "ดูทุกห้อง"; a round with nothing left the way back.
      const empty = searchText
        ? { title: t("emptySearchTitle"), help: t("emptySearchHelp"), href: clearSearchHref, label: t("clearSearch") }
        : locationFilter
          ? { title: t("roomEmptyTitle"), help: t("roomEmptyHelp"), href: clearRoomFilterHref, label: t("roomFilterClear") }
          : { title: t("emptyTitle"), help: t("emptyHelp"), href: returnToHref, label: tCommon("back") }
      const describe = (item: AuditPendingListItem) => describeAuditPendingItem(item, data.places, data.people, data.lastAuditAt)
    ```
  - The render: the root `<div className="space-y-6">` holds the header, the chip row and the list frame (the count `ContentPanel` at master `:167-179` goes: the count is in the title, the room in the chips):

    ```tsx
          <PageHeader
            breadcrumbs={[
              { label: tRound("title"), href: `/${locale}/audit/rounds` },
              { label: round.auditNo, href: scanReturnToHref, code: true },
              { label: t("title") },
            ]}
            title={t("titleWithCount", { count: formatCount(data.counts.pending) })}
            meta={
              <>
                <span className="tag">{round.auditNo}</span>
                <StatusBadge label={tRound(auditRoundStatusLabelKey(round.status) ?? "statusOpen")} status={effectiveAuditRoundStatus(round.status)} />
                <span>{t("checkedOfTotal", { checked: formatCount(data.counts.checked), total: formatCount(data.counts.total) })}</span>
                {dueLine ? <span>{dueLine.kind === "left" ? tRound("daysLeft", { days: formatCount(dueLine.days) }) : tRound("daysOverdue", { days: formatCount(dueLine.days) })}</span> : null}
              </>
            }
            back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
            actions={
              canScan && data.counts.pending > 0 ? (
                <Link href={continueScanHref} className={buttonVariants({ size: "md" })}>
                  <ScanLine aria-hidden="true" />
                  {tRound("nextStepContinueScan", { count: formatCount(data.counts.pending) })}
                </Link>
              ) : undefined
            }
          />

          {/* The room chips, counted by the expected room within the search (spec §5, §9); the search at their right from lg. */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
            <TabNav aria-label={t("roomChips")} items={roomTabs} current={data.roomChips.current} scroll={false} className="mb-4 min-w-0 lg:flex-1" />
            <div className="min-w-0 lg:w-104 lg:shrink-0">
              <MasterDataSearch
                …the master props at :181-187, unchanged (the hiddenInputs keep returnTo, the room and the page size)
              />
            </div>
          </div>
    ```
    The list frame keeps `<div className={cn(getPanelClasses(), "overflow-hidden")}>`. The phone list renders `ActionEmptyState` with `title={empty.title} description={empty.help} actionHref={empty.href} actionLabel={empty.label} actionVariant="secondary"` (icon unchanged), or one `AuditPendingMobileCard` per item with `facts={describe(item)}`, `canScan={canScan}`, `scanReturnToHref={scanReturnToHref}` and the labels below. The desktop table:

    ```tsx
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("asset")}</DataTableHead>
                  <DataTableHead>{t("expectedLocation")}</DataTableHead>
                  <DataTableHead>{t("lastAuditDate")}</DataTableHead>
                  {canScan ? (
                    <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
                  ) : null}
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {items.length === 0 ? (
                  <TableEmptyRow
                    colSpan={canScan ? 4 : 3}
                    emptyState={{ icon: <ScanLine className="h-6 w-6" />, title: empty.title, description: empty.help, actionHref: empty.href, actionLabel: empty.label, actionVariant: "secondary" }}
                  />
                ) : (
                  items.map((item) => {
                    const facts = describe(item)
                    const assetHref = `/${locale}/assets/${item.asset.id}`
                    const scanHref = buildAuditPendingScanHref({ locale, roundId: round.id, assetId: item.asset.id, returnTo: scanReturnToHref })
                    // The whole row opens the asset (Appendix A §9, P2-R28); its links and buttons are ignored by the row,
                    // and the not-found dialog's events stop in its "row" wrapper.
                    return (
                      <ClickableTableRow key={item.id} href={assetHref} label={`${tCommon("view")}: ${item.asset.assetTag}`}>
                        <DataTableCell className="min-w-64">
                          <Link href={assetHref} className={cn(linkVariants({ size: "inherit" }), "font-semibold")}>{item.asset.name}</Link>
                          <div className="mt-0.5 text-meta">
                            <span className="tag">{item.asset.assetTag}</span>
                          </div>
                          <div className="mt-0.5 text-meta text-muted-foreground">{formatAuditPendingCustodian(facts.custodian, t("noCustodian")) ?? <Nil />}</div>
                        </DataTableCell>
                        <DataTableCell className="min-w-56 text-muted-foreground">{formatAuditPendingLocation(facts.location, t("roomUnknown"))}</DataTableCell>
                        <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatAuditPendingLastAudit(facts.lastAuditAt) ?? t("lastAuditNever")}</DataTableCell>
                        {canScan ? (
                          <DataTableCell align="right" sticky="right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={scanHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                                <ScanLine aria-hidden="true" />
                                {t("scanPendingAsset")}
                              </Link>
                              <AuditMarkNotFoundButton itemId={item.id} variant="row" asset={facts.notFound} />
                            </div>
                          </DataTableCell>
                        ) : null}
                      </ClickableTableRow>
                    )
                  })
                )}
              </DataTableBody>
    ```
    The `DataTable` line (`:219`) and the `DataTableFoot` with `Pagination` (`:277-297`) stay as they are.
  - `AuditPendingMobileCard` (`:303-353`) takes `{ item: AuditPendingListItem; facts: AuditPendingItemFacts; locale; roundId; scanReturnToHref; canScan: boolean; labels: { expectedLocation; expectedCustodian; lastAuditDate; lastAuditNever; noCustodian; roomUnknown; scanPendingAsset; viewAsset } }`. It keeps `const scanHref = buildAuditPendingScanHref(…)`, the `article`, the code and the name. The `KeyValueList className="mt-3"` items read `formatAuditPendingLocation(facts.location, labels.roomUnknown)`, `formatAuditPendingCustodian(facts.custodian, labels.noCustodian)` and `formatAuditPendingLastAudit(facts.lastAuditAt) ?? labels.lastAuditNever`. The buttons:

    ```tsx
          <div className={cn("mt-4 grid gap-2", canScan && "sm:grid-cols-3")}>
            {canScan ? (
              <Link href={scanHref} className={buttonVariants()}>
                <ScanLine aria-hidden="true" />
                {labels.scanPendingAsset}
              </Link>
            ) : null}
            <Link href={`/${locale}/assets/${item.asset.id}`} className={buttonVariants({ variant: "outline" })}>
              <Eye aria-hidden="true" />
              {labels.viewAsset}
            </Link>
            {canScan ? <AuditMarkNotFoundButton itemId={item.id} variant="button" asset={facts.notFound} /> : null}
          </div>
    ```
  - The helpers after the card (replacing master `:355-375`):

    ```tsx
    type AuditPendingItemFacts = { location: AuditPendingPlace | null; custodian: AuditPendingCustodian; lastAuditAt: Date | null; notFound: AuditNotFoundAsset }

    // The item's expected room and custodian (bug 13), named by id; the not-found dialog names the same facts (bug 15).
    // ตรวจล่าสุด is the asset's latest audit result (P2-R32), null when it has none.
    function describeAuditPendingItem(item: AuditPendingListItem, places: ReadonlyMap<string, AuditPendingPlace>, people: ReadonlyMap<string, AuditPendingPlace>, lastAuditAt: ReadonlyMap<string, Date>): AuditPendingItemFacts {
      const location = describeAuditPendingPlace(item.expectedLocationId, places)
      const custodian = describeAuditPendingCustodian(item.expectedCustodianId, people)
      return { location, custodian, lastAuditAt: lastAuditAt.get(item.asset.id) ?? null, notFound: { name: item.asset.name, tag: item.asset.assetTag, location, custodian } }
    }

    // null when the asset has no audit result yet (formatDateTime would print a dash); date and time (P2-R13).
    function formatAuditPendingLastAudit(at: Date | null) {
      return at ? formatDateTime(at) : null
    }

    // "ไม่ทราบห้อง" for a room the lookup cannot name (bug 16), never its id.
    function formatAuditPendingLocation(location: AuditPendingPlace | null, unknownLabel: string) {
      return location ? <><span className="tag">{location.code}</span> - {location.name}</> : unknownLabel
    }

    // "ไม่มีผู้ถือครอง" when nobody holds the asset; null (the page shows Nil) for an id the lookup cannot name.
    function formatAuditPendingCustodian(custodian: AuditPendingCustodian, noneLabel: string) {
      if (custodian.kind === "none") return noneLabel
      return custodian.kind === "person" ? <><span className="tag">{custodian.code}</span> - {custodian.name}</> : null
    }

    // A room chip: its name, with its code when two chips share a name; "ไม่ทราบห้อง" for an unknown id (bug 16).
    function formatAuditPendingRoomChip(label: AuditPendingRoomChipLabel | undefined, unknownLabel: string) {
      if (!label?.place) return unknownLabel
      return label.showCode ? <>{label.place.name} <span className="tag">{label.place.code}</span></> : label.place.name
    }
    ```
    `formatAuditPendingLastAudit` (`:372-375`) is replaced by the one above (a date, not the movements list). `resolveAuditPendingScanReturnTo`, `buildAuditPendingScanHref`, `buildAuditPendingListHref` and `resolveFirstSearchParam` stay as they are.
- **Delete** `src/components/audit/audit-pending-row-actions.tsx`. Check first: `rg -n "audit-pending-row-actions|AuditPendingRowActions" src tests` lists only the page (now rewritten) and `tests/list-pages-ui.test.ts:392,399` (rewritten in Step 6).
- **`DESIGN.md`:**
  - `:621`, after "Clicking the row still opens its edit page.", add: "The round's pending list is the exception (group 2 spec §9): its row still opens the asset, and "สแกนรายการนี้" and "บันทึกไม่พบ" are two outline `sm` buttons in the row for `audit:edit`, with no ⋯, that the row's click ignores (the not-found dialog stops its own events); a viewer gets neither."
  - `:628`: `("พิจารณาคำขอ", "บันทึกตัดจำหน่าย", "บันทึกไม่พบ")` → `("พิจารณาคำขอ", "บันทึกตัดจำหน่าย")`, and `(`src/components/disposal/disposal-row-actions.tsx`, `src/components/audit/audit-pending-row-actions.tsx`)` → `(`src/components/disposal/disposal-row-actions.tsx`)`.
- **E2E:** none here. Task 7 rewrites `e2e/audit/pending-steps.ts:9-21` to the markup in Interfaces.

- [ ] **Step 4: Add and change the words**

Write the change file in the session scratchpad (an absolute path, for example `<scratchpad>/g2p2-task6-messages.json`), run `node scripts/messages-edit.mjs <file>` from the repo root, then delete it. Namespace `auditPending` unless named:

| Key | th | en |
|---|---|---|
| `titleWithCount` (new) | รายการรอตรวจ {count} รายการ | Pending assets: {count} |
| `checkedOfTotal` (new) | ตรวจแล้ว {checked} / {total} | Checked {checked} / {total} |
| `roomChips` (new) | ห้อง (ตามที่ตั้งตามระบบ) | Rooms (expected location) |
| `roomAll` (new) | ทุกห้อง | All rooms |
| `roomOther` (new) | อื่น ๆ | Others |
| `roomUnknown` (new) | ไม่ทราบห้อง | Unknown room |
| `roomEmptyTitle` (new) | ไม่มีรายการรอตรวจในห้องนี้ | Nothing left to check in this room |
| `roomEmptyHelp` (new) | รายการของห้องนี้ถูกตรวจหรือบันทึกผลแล้ว หรือห้องนี้ไม่อยู่ในรอบ | This room's items were checked or recorded, or the room is not in this round. |
| `asset` (new) | ทรัพย์สิน | Asset |
| `noCustodian` (new) | ไม่มีผู้ถือครอง | No custodian |
| `lastAuditNever` (new) | ยังไม่เคยตรวจ | Never checked |
| `notFoundResult` (new) | รายการนี้จะออกจากรอตรวจ และส่งให้หัวหน้า IT พิจารณา ทะเบียนยังไม่เปลี่ยน | This item leaves the pending list and goes to the IT head for a decision. The register does not change yet. |
| `notFoundDialogDescription` (changed) | บันทึกรายการรอตรวจนี้เป็นไม่พบเพื่อส่งให้ผู้พิจารณาดำเนินการต่อ โดยหมายเหตุและรูปหลักฐานไม่บังคับ | Record this expected asset as not found and send it for a decision. A remark and evidence photo are optional. |

`auditRound.resultDashboardHelp` belongs to Task 4. Task 4 Step 3 rewrote it to the round-wide sentence, which already applies P2-R15, and the result card still reads it. Leave it out of this change file and do not delete it. Check: `rg -n "ผู้ตรวจสอบ" messages/th.json` shows no `auditRound` key, so the new test still finds no "ผู้ตรวจสอบ" in `auditRound`.

Glossary (`docs/19_THAI_GLOSSARY.md`): "พิจารณา" / "ผู้พิจารณา" (row 11, already in `apiErrors.findingReviewerIsReporter`), "ที่ตั้ง", "ผู้ถือครอง", "ตรวจนับ" in the trail; en "decision" for review (§2.3). "ผู้ตรวจสอบ" stays only in `reportsPage.catalogAuditDescription` and `catalogSystemAudience`, which mean an internal auditor.

Kept and reused: `title` (the trail's last item and the table caption), `expectedLocation`, `expectedCustodian`, `lastAuditDate`, `roomFilterClear` "ดูทุกห้อง" (the room's empty state), `searchPlaceholder` (now true: it searches the expected room and custodian), `scanPendingAsset`, `viewAsset`, the `empty*` keys, `clearSearch`, `markNotFound`, the other `notFound*` keys; `auditRound.title`, `statusOpen`, `daysLeft`, `daysOverdue`, `nextStepContinueScan`.

Delete (nothing reads them after this task): `auditPending.subtitle`, `auditPending.pendingCount`, `auditPending.roomFilter`, `auditPending.assetTag`, `auditPending.assetName`. Check first: `rg -n 't\("(subtitle|pendingCount|roomFilter|assetTag|assetName)"' "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending" src/components/audit/audit-mark-not-found-button.tsx` prints nothing (the round page's `t("assetTag")` is the `auditRound` namespace and stays).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/audit-pending-list-rules.test.ts tests/latest-audit-result-rules.test.ts tests/audit-pending-list-page.test.ts tests/audit-not-found-dialog.test.ts tests/performance-route-instrumentation.test.ts tests/dialog-trigger-handles.test.ts tests/v-track2-u.test.ts tests/validation-guards.test.ts tests/audit-scan-result-semantics.test.ts tests/thai-glossary.test.ts tests/breadcrumbs-ui.test.ts && npx tsc --noEmit`
Expected: PASS.
- `dialog-trigger-handles.test.ts:14-29,43-50`: the handle, `hideTrigger` and `returnFocusRef` stay.
- `v-track2-u.test.ts:115-130`: the remark id and `validate()` are unchanged.
- `validation-guards.test.ts:33,109`: still one form in the dialog file.
- `audit-scan-result-semantics.test.ts:29`: the pending page still renders `AuditMarkNotFoundButton`.

- [ ] **Step 6: Rewrite these pins**

- `tests/breadcrumbs-ui.test.ts:45` → `assert.equal(sites.length, 13, "Breadcrumbs call sites")`; `:46` → `assert.equal(sites.filter((site) => /code: true/.test(site.element)).length, 9, "call sites that mark a code")`. The pending list's new trail marks the round's code on its middle item and ends on the page title (group 2 spec §9), so it is not added to `lastCode`. The `lastCode` map and the no-code list are unchanged.
- `tests/asset-detail-frame.test.ts:194` (the frame's latest-item where, now read from the rules file) becomes:

  ```ts
    assert.match(source, /where: \{ assetId, \.\.\.latestAuditResultWhere \},\s+orderBy: latestAuditResultOrderBy,/, "the asset's latest result: the rule in src/lib/latest-audit-result-rules.ts, shared with the pending list (group 2 plan 2 P2-R32)")
    assert.match(source, /at: latestAuditResultAt\(latestItem\)/)
  ```
  The rest of that test (`:185-198`) stays; its `doesNotMatch(source, /findMany\(|"use client"/)` still holds (the frame keeps `findFirst`).
- `tests/list-pages-ui.test.ts:372-388` (the comment `:372-374`, then the test) becomes:

  ```ts
  // Plan 2B-2 Task 11 (spec 2B §5.4 row pending, §5.9.2 row 4, bugs §5.10 #8 and #9, I21, R-m): the pending list of a
  // round. It pages like the B4 lists, but it is not in B4_LISTS: its load lives in src/lib/audit-pending-list-data.ts
  // (group 2 plan 2 Task 6), which has no fixed take since ตรวจล่าสุด moved from movements to audit items (P2-R32).
  test("the pending list of a round pages on the server and counts every pending item (spec 2B §5.9.2 row 4, bug §5.10 #8; group 2 spec §9)", () => {
    const source = read(`${D}audit/rounds/[id]/pending/page.tsx`)
    const data = read("src/lib/audit-pending-list-data.ts")
    assert.match(source, /const listPage = parseListPage\(\{ page: rawSearchParams\.page, pageSize: rawSearchParams\.pageSize \}\)/)
    assert.match(data, /const \{ skip, take \} = listPageWindow\(listPage\)/)
    assert.equal(data.match(/\btake: \d+/g), null, "no fixed take: one page of rows, and ตรวจล่าสุด in one read for the page's assets (P2-R32)")
    assert.equal(source.match(/\btake: \d+/g), null)
    assert.match(data, /await Promise\.all\(\[\n\s+prisma\.auditItem\.findMany\(\{ where, include: pendingItemInclude, orderBy: \[\{ createdAt: "asc" \}, \{ id: "asc" \}\], skip, take \}\),\n\s+prisma\.auditItem\.count\(\{ where \}\),\n\s+\]\)/, "findMany and count in one Promise.all, the old order plus id")
    assert.ok(source.indexOf("if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()") < source.indexOf("getAuditPendingListData("), "the items load only after the round passed the read-only check")
    assert.match(source, /title=\{t\("titleWithCount", \{ count: formatCount\(data\.counts\.pending\) \}\)\}/, "the title counts every pending item of the round, not the rows of one page (P2-R12)")
    assert.match(source, /^import \{ notFound, redirect \} from "next\/navigation"$/m)
    assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(items\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(listHref\(\{ page: lastPage \}\)\)/, "a page past the last one shows the last page (I21)")
    assert.match(source, /return appendOperationalReturnTo\(query \? `\$\{pendingHref\}\?\$\{query\}` : pendingHref, returnTo\)/, "every list link keeps the page's returnTo, the search and the room")
    assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  })
  ```
- `tests/list-pages-ui.test.ts:390-408` becomes:

  ```ts
  test("pending rows: the whole row and the name open the asset, and the row's two buttons and the phone card's scan and not-found are for audit:edit only (group 2 spec §9, Appendix A §9, bugs 14 and 15, P2-R14, P2-R28)", () => {
    const page = read(`${D}audit/rounds/[id]/pending/page.tsx`)
    for (const part of ["<PageHeader", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<DataTableFoot>", "<Pagination"]) {
      assert.ok(page.includes(part), `page: no ${part}`)
    }
    assert.match(page, /<div className="space-y-6">/)
    assert.match(page, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/, "the text link above the title became the back button (B2)")
    assert.match(page, /\{canScan \? \(\n\s+<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
    assert.match(page, /<AuditMarkNotFoundButton itemId=\{item\.id\} variant="row" asset=\{facts\.notFound\} \/>/)
    assert.match(page, /<AuditMarkNotFoundButton itemId=\{item\.id\} variant="button" asset=\{facts\.notFound\} \/>/, "the phone card keeps its own not-found button")
    assert.doesNotMatch(page, /AuditPendingRowActions|<RowActions/, "two visible buttons, not RowActions' one next slot (P2-R14)")
    assert.equal(existsSync(`${C}audit/audit-pending-row-actions.tsx`), false, "the ⋯ wrapper is gone")
  })
  ```
- `tests/audit-pending-mobile-ux.test.ts`:
  - `:11-13` become:

    ```ts
    const rules = readFileSync("src/lib/audit-pending-list-rules.ts", "utf8")
    assert.match(rules, /\{ asset: \{ assetTag: \{ contains: searchText \} \} \}/)
    assert.match(rules, /auditPendingIdMatchWhere\("expectedLocationId", lookups\.roomIds, lookups\.matchedRoomIds\)/)
    assert.match(rules, /auditPendingIdMatchWhere\("expectedCustodianId", lookups\.custodianIds, lookups\.matchedCustodianIds\)/)
    assert.doesNotMatch(page, /currentLocation|asset\.custodian/, "the search and the rows read the item's expected room and custodian (bug 13)")
    ```
  - `:42` (`subtitle`) becomes `assert.equal(typeof messages.auditPending.titleWithCount, "string")`; `:44` (`pendingCount`) becomes `assert.equal(typeof messages.auditPending.checkedOfTotal, "string")`.
  - The rest stay: `:8-10`, `:14`, `:15` (the hiddenInputs literal), `:16-24`, `:27-35`.
- `tests/audit-pages-sweep-ui.test.ts:137-146` becomes:

  ```ts
  test("audit pending page: the count in the title and the rooms as TabNav chips, the list frame on the panel classes, the phone card facts in a KeyValueList and the codes as tag (spec 2D D9, D19, M29, M33; group 2 spec §9)", () => {
    const source = read(`${D}audit/rounds/[id]/pending/page.tsx`)
    assert.doesNotMatch(source, /<ContentPanel\b|t\("pendingCount"/)
    assert.match(source, /<TabNav aria-label=\{t\("roomChips"\)\}/)
    assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
    assert.match(source, /<KeyValueList\s+className="mt-3"/)
    assert.match(source, /<span className="tag">\{location\.code\}<\/span> - \{location\.name\}/)
    assert.match(source, /<span className="tag">\{custodian\.code\}<\/span> - \{custodian\.name\}/)
    assert.doesNotMatch(source, /function PendingInfo\b|rounded-lg border|hover:underline|text-primary|\btext-xs\b|\borNil\b/)
  })
  ```
- `tests/operational-return-navigation.test.ts:90-100` becomes:

  ```ts
  test("the pending list can be narrowed to one room from the scan screen", () => {
    const pendingSource = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx", "utf8")
    const rules = readFileSync("src/lib/audit-pending-list-rules.ts", "utf8")
    assert.match(pendingSource, /const locationFilter = resolveFirstSearchParam\(rawSearchParams\.locationId \?\? ""\)\.trim\(\)/)
    assert.match(rules, /return \{ expectedLocationId: locationFilter \}/)
    assert.match(pendingSource, /t\("roomFilterClear"\)/)
    for (const locale of ["th", "en"]) {
      const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { auditPending: Record<string, unknown> }
      for (const key of ["roomFilterClear", "roomAll", "roomOther", "roomUnknown", "roomChips"]) assert.equal(typeof messages.auditPending[key], "string", key)
    }
  })
  ```
  `:68-73` (the pending page's searchParams type, the workflow normalizer, `href={returnToHref}`, the hiddenInputs literal, `resolveAuditPendingScanReturnTo`, `normalizeAuditRoundDetailReturnTo`) stay.
- These stay as they are: `tests/audit-not-found-dialog.test.ts:5-63` (the dialog, the FormData, the route, the keys), `tests/e2e-audit.test.ts:176-178` (the four `auditPending` words in `pending-steps.ts` keep their values), `tests/e2e-audit-rounds.test.ts:34` (`clearSearch`).

- [ ] **Step 7: Run the whole suite and lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. A pin that fails outside the lists above is rewritten in this commit and named in the report.

- [ ] **Step 8: Commit**

```bash
git add src/lib/audit-pending-list-rules.ts src/lib/audit-pending-list-data.ts src/lib/latest-audit-result-rules.ts src/lib/asset-detail-frame.ts "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx" src/components/audit/audit-mark-not-found-button.tsx DESIGN.md messages/th.json messages/en.json tests/audit-pending-list-rules.test.ts tests/latest-audit-result-rules.test.ts tests/asset-detail-frame.test.ts tests/audit-pending-list-page.test.ts tests/audit-not-found-dialog.test.ts tests/performance-route-instrumentation.test.ts tests/list-pages-ui.test.ts tests/audit-pending-mobile-ux.test.ts tests/audit-pages-sweep-ui.test.ts tests/operational-return-navigation.test.ts tests/breadcrumbs-ui.test.ts
git rm src/components/audit/audit-pending-row-actions.tsx
git commit -m "feat(audit-pending): the pending list reads each item's expected room and custodian in its rows, its search and its room chips (top six, the chosen room, อื่น ๆ, ไม่ทราบห้อง), counts the round in its title, shows scan and not-found to audit:edit only, reads ตรวจล่าสุด from the asset's latest audit result as the asset page does (one shared rule), and its not-found dialog names the asset and says what follows (group 2 plan 2 task 6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: E2E steps and the plan's docs

The audit E2E steps follow the new round page and the new pending list, and the new steps of spec §16 are added:
- The walk starts from the next-step card's "เดินตรวจต่อ (7)".
- After the walk, IT staff read the round page:
  - each result chip's count equals its rows;
  - the category chips count within the result in use, and each equals its rows;
  - each field bar of "ไม่ตรงเรื่องอะไร" equals its rows;
  - "ส่วนควบไม่ครบ" lists the walk's parent once and names the missing component.
- The pending list: the room chips equal their rows, the chosen room stays at 0, and the not-found dialog names the asset.
- The IT head closes from the next-step card, and the button sits whole inside it.
- On the IT head's own round, the opener is told in the card that they cannot close it, and the cancel is in "อื่น ๆ".
- After the review, the rejected condition leaves its bar. A category chip narrows the result chips, the rows and the Excel export.
- The viewer gets no scan, not-found or "เดินตรวจต่อ" control on the pending list, and the round page's next step opens the pending list for them.

The docs record the plan. The deploy note keeps the read-only Production SELECT for out-of-scope finds that exist only as scan history (recon RF §5) and records its result: run on 2026-10-27 at the user's request, 0 rows (and 0 scan-history rows with no item id), so no round's นอกขอบเขต number changes on Production.

**Files:**
- Create:
  - `e2e/audit/round-page-words.ts` (plain data, no imports: the words the round page and pending steps read)
  - `e2e/audit/round-page-steps.ts` (helpers for the round page's chips, rows and cards, shared with the pending list)
- Modify. Line numbers are master `f8269894`. Tasks 1-6 do not touch these files, so re-check them before editing:
  - `e2e/audit/pending-steps.ts` (whole file, 32 lines: the row, the room chips, the dialog)
  - `e2e/audit/field-audit.spec.ts`:
    - `:1-16` (header list);
    - three imports after `:29`;
    - `:133-135` (block 2: the round page's main button);
    - `:293-303` (block 3: the pending list);
    - a new block after `:309`;
    - `:382-386` (block 5: the close in the card);
    - `:431-433`, `:444-454` (block 6: the pending list, the opener's sentence, the cancel through "อื่น ๆ");
    - after `:484` (block 7, IT staff: no export menu);
    - a new test after `:514` (block 7, IT head).
  - `e2e/audit/rounds-list.spec.ts`:
    - `:6-11` (imports);
    - `:16` (timeout);
    - `:20` (keep the created assets);
    - new lines after `:98` (the viewer on the pending list and the round page).
  - `tests/e2e-audit.test.ts`:
    - new lines after `:115` (EA2) and after `:178` (EA3);
    - `:176` (EA3, rewritten);
    - new lines after `:200` (EA4);
    - `:213` (EA5, rewritten);
    - new lines after `:219` (EA5);
    - one new test after `:222`.
  - `tests/e2e-audit-rounds.test.ts` (three new tests after `:79`)
  - `docs/99_CHANGELOG.md` (a new `## 2026-10-27` heading and entry above `:7`)
  - `docs/07_UAT_CHECKLIST.md`:
    - `:302`, `:303`, `:304` (rewritten);
    - a new `## Audit Round B UAT (2026-10-27)` section between `:390` and `## Sign-Off` (`:392`).
  - `docs/06_WORKFLOWS.md` (`:69` rewritten, two lines after it)
  - `DEVELOPER_HANDOFF.md` (one line after `:57`, one bullet after `:1200`)
  - `docs/08_PRODUCTION_READINESS.md` (`:104` rewritten, one item after it recording the SELECT and its 2026-10-27 result, still under `## Deployment` `:95`)
  - `docs/11_FEATURE_LIST.md` (`:196`, `:202`, `:248` second cells)
- Unchanged and still passing:
  - `tests/e2e-audit.test.ts`:
    - `:175` (block 3 still reads "ของที่หาไม่เจอ → รายการค้าง"; the scan page is plan 3's);
    - `:177-178` (`pending-steps.ts` keeps the literals "บันทึกไม่พบ", "บันทึกทรัพย์สินนี้ว่าไม่พบ", "ยืนยันว่าไม่พบ", "บันทึกว่าไม่พบ และสร้างรายการไม่ตรงรอพิจารณาแล้ว");
    - `:187-189` (block 4 is untouched);
    - `:195-200` (block 5 keeps "ยืนยันปิดรอบตรวจนับนี้?", "ปิดรอบตรวจนับสำเร็จ" and the closed badge line);
    - `:211-212` (the two segregation bodies);
    - `:214` (block 6 keeps "กรุณาระบุเหตุผลการยกเลิก" and "ยกเลิกรอบตรวจสำเร็จ");
    - `:218-221` (the findings export and only the IT head holds `audit:export`).
  - `tests/e2e-audit-rounds.test.ts`:
    - `:63`, `:66`, `:70-71`, `:75-76` hold;
    - `:68`: no `status: "` is added to `rounds-list.spec.ts`;
    - `:72`: still exactly 2 `rounds.expectWhole(`;
    - `:73`: the line is kept, now three times.
  - `tests/e2e-fixes.test.ts:72`, `:243`, `:277-279`, `:360-362`, `:376-378`: these blocks of `field-audit.spec.ts` are untouched.
  - `tests/e2e-review.test.ts:88-112` (no hazard and no DELETE; the round is cancelled through the dialog or `cancelAsItHead`) and `tests/e2e-suite.test.ts:327` (no spec imports `@playwright/test`).
  - The docs pins:
    - `tests/e2e-docs.test.ts`, `tests/shell-docs.test.ts`: no template marker (`<N>`, `<today>`, …) is written;
    - `tests/v-track-docs.test.ts`, `tests/dark-mode-docs.test.ts`, `tests/phase2d-docs.test.ts`;
    - `tests/audit-round-cancellation.test.ts:144-157`: each file still names the cancel and that prior work is preserved.
  - Specs outside `e2e/audit` that open these pages, unchanged:
    - `e2e/dashboard/dashboard.spec.ts:109-119` reads only the KPI href's path;
    - `e2e/asset-detail/asset-detail.spec.ts:309-313` needs the round page to show the auditNo;
    - `e2e/cross-cutting/field-errors.spec.ts:331-333` needs `main` to show the round name;
    - `e2e/cross-cutting/reports.spec.ts:58-69` (M1): a closed menu renders no `/api/audit-rounds/<id>/` anchor;
    - `e2e/disposal/open-audit-block.spec.ts` uses the API only.
- No message changes. Every word the steps read is a `messages/th.json` value that Tasks 1-6 put there or that exists already. Step 1's guard test checks each one.

**Interfaces:**
- Consumes. This is the contract of Tasks 1-6 that the steps stand on. A reviewer checks each landed task against it:
  - **URL (Task 1, `buildAuditRoundPageHref`):**
    - `result` is one of `pending`, `found`, `mismatch`, `not_found`, `out_of_scope` or `pending_review`. "ทั้งหมด" writes no `result`.
    - `categoryId=<id>` or `other`.
    - `field` is one of `location`, `department`, `custodian` or `condition`.
    - `components=missing` and `search`.
    - A chip's href keeps the other filters.
    - The links of the result card, the "ไม่ตรงเรื่องอะไร" bars and the "เครื่องที่ส่วนควบไม่ครบ" line clear the other filters (result all).
    - The missing component's code links `/<locale>/audit/rounds/<id>?search=<its tag>` with no other filter. It may keep `returnTo` and the `#audit-result-list` hash. Without this, a `components=missing` kept in the link would hide the component's own row.
    - The pending list takes `locationId=<id>` or `other`.
    - The dashboard's `buildAuditRoundItemsHref(locale, roundId, filters)` still writes `/<locale>/audit/rounds/<id>?…#audit-result-list`, so `e2e/dashboard/dashboard.spec.ts:113` still reads the id as the path's last part.
  - **Counts (Tasks 1-3):**
    - The result chips count within the other filters. On the chain round after block 3 (recon tests-e2e C), they read ทั้งหมด 7, รอตรวจ 0, พบตรง 4, ไม่ตรง 1, ไม่พบ 2, นอกขอบเขต 1, รอพิจารณา 4.
    - รอพิจารณา counts items. The `pending_review` where stays unwrapped, so the out-of-scope find X1 counts (P2-R3, plan 1 R5/F1).
    - With `categoryId=<Computer Component>`, after block 5, they read ทั้งหมด 2, รอตรวจ 0, พบตรง 1, ไม่ตรง 0, ไม่พบ 1, นอกขอบเขต 0, รอพิจารณา 0.
    - The category chips count within the result: Desktop 5 and Component 2 under ทั้งหมด, 1 and 1 under ไม่พบ.
    - Step 2 of the next-step card counts findings (P2-R26). After block 3 the chain round waits on five (A2's department and condition, C2, A4, X1): "รอ 5" and "พิจารณา 5 รายการ", both to `/<locale>/audit/findings?status=pending&roundId=<id>`, the five the IT head decides in block 6.
    - Field bars, before the review: แผนกไม่ตรง 1, สภาพไม่ตรง 1, with "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง". After the review (condition rejected): แผนกไม่ตรง 1 and no สภาพไม่ตรง link (P2-R1, P2-R18).
    - "เครื่องที่ส่วนควบไม่ครบ 1" lists P1 once.
    - The pending title counts round-wide (P2-R12).
    - The room chips count within the search. The chosen room stays visible at 0 (P2-R11).
  - **Round page, Task 4:**
    - The next-step card is one `<section>` in `<main>` (a `ContentPanel`) whose `h2` begins with "ขั้นถัดไป" (`auditRound.nextStep`).
      - Inside it is the main link "เดินตรวจต่อ ({count})" (`auditRound.nextStepContinueScan`, the round's pending own items). It goes to `/<locale>/audit/rounds/<id>/scan…` for `audit:edit` and to `/<locale>/audit/rounds/<id>/pending…` for anyone else.
      - At step 2, the review line "รอ {count} · พิจารณาแล้ว {count}" (`auditRound.stepReviewWaiting`, `stepReviewDecided`) and the main link "พิจารณา {count} รายการ" (`auditRound.nextStepReviewItems`) count findings; "รอ n" and the main link both go to `/<locale>/audit/findings?status=pending&roundId=<id>` (P2-R26).
      - The `Button` "ปิดรอบตรวจ" (`auditRound.closeRound`) is inside the card only when step 3 is reached (nothing pending, nothing awaiting review) and the viewer holds `audit:approve`. Before step 3 it is absent, not disabled.
      - The sentence "ผู้เปิดรอบปิดรอบเองไม่ได้ ให้หัวหน้าคนอื่นปิด" shows in the card's close conditions when the viewer opened the round, at any step (Task 4 shows it to any opener). It does not show to anyone who did not open it.
      - A closed round's page has no "ปิดรอบตรวจ" button.
    - Header actions inside `<main>`:
      - A `Button` named exactly "ส่งออก" (the icon and chevron `aria-hidden`), only with `audit:export` on a round that is not cancelled. It opens a `DropdownMenu` of exactly 3 `menuitem` anchors (`<a href download>`). Each item contains "ตามตัวกรองที่เลือก". One contains "Excel ผลตรวจ", one "รายงานผลต่าง" (and the PDF one). Both hrefs carry the page's filters, `categoryId=<id>` included.
      - A `Button` named exactly "อื่น ๆ", only when it holds something (`audit:approve` on an operational round). It opens a menu whose item is named exactly "ยกเลิกรอบตรวจ". That item opens the same dialog "ยืนยันยกเลิกรอบตรวจ" with `#audit-round-cancel-reason` and `#audit-round-cancel-reason-error`.
    - "ไม่ตรงเรื่องอะไร" is one `<section>` whose `h2` reads exactly "ไม่ตรงเรื่องอะไร". It is shown on closed rounds too.
      - Each bar is one `listitem` of the `list` "ไม่ตรงเรื่องอะไร", whose text is the field word then the count. The field words are `auditFinding.type_*`: "ที่ตั้งไม่ตรง", "แผนกไม่ตรง", "ผู้ถือครองไม่ตรง", "สภาพไม่ตรง".
      - With a count above 0, the word is a link whose href holds `field=<field>` and whose accessible name is exactly the word; the count sits beside it in the same item. The drawn bar is a `PaceBar` (`role="img"` with its own label, no text).
      - A bar at 0 has no link.
      - The line "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง" shows when `multipleFields`.
      - When N > 0, the last line is a link whose href holds `components=missing`. Its accessible name begins with "เครื่องที่ส่วนควบไม่ครบ {count}". The arrow is an `aria-hidden` icon, not part of the message.
  - **Round page list, Task 5:**
    - The list stays `<section id="audit-result-list">`.
    - Inside it, the result chips are the first `TabNav` (`[data-slot="tab-nav"]`). There are seven links in this order: ทั้งหมด, รอตรวจ, พบตรง, ไม่ตรง, ไม่พบ, นอกขอบเขต, รอพิจารณา. Each passes `count` (formatCount), which TabNav draws as its last `span.num`. The chosen one has `aria-current="page"`.
    - The category chips are the second `TabNav` there, shown at more than one category, at every width.
      - Each category chip's href holds `categoryId=<id>`. Its label is the category's name.
      - The chosen category also shows in the `FilterChipList` (`label` "ตัวกรองที่ใช้อยู่", `removeLabel` "ล้างตัวกรองนี้"). The chip's label contains the category chip's label.
    - The "ส่วนควบไม่ครบ" filter shows as a `FilterChipList` chip labelled "ส่วนควบไม่ครบ {count}" (`auditRound.componentsMissingChip`, the count within the filters, P2-R16).
    - Rows are `article` cards on the phone and `tbody tr` rows on the desktop, inside `#audit-result-list`, 25 a page by default.
    - A parent row under `components=missing` contains "ไม่พบ: {name} ({code})" for each missing component: the prefix "ไม่พบ:" (`auditRound.missingComponentPrefix`), the name, then the code in brackets. The `{code}` is a link whose accessible name is exactly the component's tag.
  - **Pending list, Task 6:**
    - The `h1` reads exactly "รายการรอตรวจ {count} รายการ".
    - With `audit:edit`, a link "เดินตรวจต่อ ({count})" in `<main>` goes to `/<locale>/audit/rounds/<id>/scan…`. Without it, there is no such link.
    - The room chips are the first `TabNav` in `<main>`. The first link is "ทุกห้อง" with its count. Each room chip's href holds `locationId=<id>`, with its count last. Exactly the rooms with pending items, plus the chosen room. `aria-current="page"` marks the chosen chip, "ทุกห้อง" when none is chosen.
    - Rows are `main article` cards on the phone and `main tbody tr` rows on the desktop. The desktop row stays a `ClickableTableRow` labelled "ดู: <tag>" that opens the asset (P2-R28); its link and button stop the click from reaching the row.
    - On the desktop the asset's name is a link named exactly the name, to `/<locale>/assets/<id>` (a `?returnTo=` may follow). On the phone the card's "ดูทรัพย์สิน" link (`auditPending.viewAsset`) goes there; the name is text.
    - With `audit:edit`, each row holds the link "สแกนรายการนี้" and the button "บันทึกไม่พบ" on both screens. Without it, neither.
    - The dialog is still named "บันทึกทรัพย์สินนี้ว่าไม่พบ", with "ยืนยันว่าไม่พบ" and the toast "บันทึกว่าไม่พบ และสร้างรายการไม่ตรงรอพิจารณาแล้ว".
    - The dialog contains the asset's name, its tag, the expected room's code and name, and the expected custodian or "ไม่มีผู้ถือครอง". It also contains "รายการนี้จะออกจากรอตรวจ และส่งให้หัวหน้า IT พิจารณา ทะเบียนยังไม่เปลี่ยน".
  - **Words, as `messages/th.json` values:**
    - New: "ผู้เปิดรอบปิดรอบเองไม่ได้ ให้หัวหน้าคนอื่นปิด", "Excel ผลตรวจ", "รายงานผลต่าง", "ตามตัวกรองที่เลือก", "ไม่ตรงเรื่องอะไร", "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง", "เครื่องที่ส่วนควบไม่ครบ {count}", "ส่วนควบไม่ครบ {count}", "ไม่พบ:", "รอ {count}", "พิจารณา {count} รายการ", "ไม่ตรง", "รายการรอตรวจ {count} รายการ", "ทุกห้อง", "รายการนี้จะออกจากรอตรวจ และส่งให้หัวหน้า IT พิจารณา ทะเบียนยังไม่เปลี่ยน" (placeholder names free).
    - Existing: "ส่งออก", "อื่น ๆ", "ที่ตั้งไม่ตรง", "แผนกไม่ตรง", "ผู้ถือครองไม่ตรง", "สภาพไม่ตรง", "ไม่มีผู้ถือครอง", "ดูทรัพย์สิน".
  - **Existing helpers:**
    - `recordSettled`, `settleToasts` (`e2e/audit/settle.ts`);
    - `escapeRegExp` (`e2e/audit/scan-steps.ts:90`);
    - `fillTemplate` (`e2e/shell/shell-words.ts:24`);
    - `actAs`, `createAssets` (returns `DisposalAsset[]` = `{ id; assetTag; name }`), `createRoom`, `readAssetChoices`, `recordPrefix` (`e2e/disposal/disposal-support.ts`);
    - `cancelAsItHead`, `workViewChip`, `expectWhole` (`e2e/audit/round-steps.ts`);
    - `readRunState` (`e2e/support/state.ts`);
    - the chain's `masters.categoryDesktop` and `masters.categoryComponent` (`e2e/audit/audit-data.ts:13`).
- Produces:
  - `e2e/audit/round-page-words.ts`: `ROUND_PAGE_WORDS` (below).
  - `e2e/audit/round-page-steps.ts`:
    - `type AuditField = "location" | "department" | "custodian" | "condition"`;
    - `resultRows(page: Page, device: E2eDevice, tagPrefix: string): Locator`;
    - `resultChips(page: Page): Locator`;
    - `categoryChips(page: Page): Locator`;
    - `chipByLabel(row: Locator, label: string): Locator`;
    - `chipByHref(row: Locator, hrefPart: string): Locator`;
    - `chipCount(chip: Locator): Locator`;
    - `chipLabel(chip: Locator): Promise<string>`;
    - `expectChips(row: Locator, chips: readonly (readonly [string, number])[]): Promise<void>`;
    - `expectChip(row: Locator, hrefPart: string, count: number): Promise<void>`;
    - `expectChipsMatchRows(page: Page, row: Locator, rows: Locator): Promise<void>`;
    - `nextStepCard(page: Page): Locator`;
    - `mismatchCard(page: Page): Locator`;
    - `fieldBar(card: Locator, field: AuditField): Locator`;
    - `componentsMissingLine(card: Locator): Locator`;
    - `filterChip(page: Page, text: string): Locator`;
    - `expectInside(inner: Locator, outer: Locator): Promise<void>`.
  - `e2e/audit/pending-steps.ts`:
    - `type PendingAsset = { tag: string; name: string; room: { code: string; name: string }; custodian: string | null }`;
    - `pendingRows(page: Page, device: E2eDevice, text: string): Locator`;
    - `pendingEntry(page: Page, device: E2eDevice, tag: string): Locator`;
    - `roomChips(page: Page): Locator`;
    - `expectRoomChips(page: Page, all: number, rooms: Record<string, number>, current: string): Promise<void>`;
    - `markNotFound(page: Page, device: E2eDevice, asset: PendingAsset, onDialog?: () => Promise<unknown>): Promise<string>` (was `(page, device, tag: string, onDialog?)`).

- [ ] **Step 1: Write the words file, the guard tests and the new pins, so they fail**

`e2e/audit/round-page-words.ts`:

```ts
// The words the round page and pending list steps read (group 2 spec §8, §9, §16), each a value of messages/th.json
// (tests/e2e-audit-rounds.test.ts checks them). Plain data, no imports, so the node test can load it.
export const ROUND_PAGE_WORDS = {
  // The next-step card.
  nextStep: "ขั้นถัดไป",
  continueScan: "เดินตรวจต่อ ({count})",
  // Step 2 counts findings (P2-R26).
  reviewWaiting: "รอ {count}",
  reviewItems: "พิจารณา {count} รายการ",
  closeRound: "ปิดรอบตรวจ",
  openerCannotClose: "ผู้เปิดรอบปิดรอบเองไม่ได้ ให้หัวหน้าคนอื่นปิด",
  // The header's menus.
  exportMenu: "ส่งออก",
  exportExcel: "Excel ผลตรวจ",
  exportVariance: "รายงานผลต่าง",
  exportScope: "ตามตัวกรองที่เลือก",
  more: "อื่น ๆ",
  cancelRound: "ยกเลิกรอบตรวจ",
  // The result chips, in their order.
  resultAll: "ทั้งหมด",
  resultPending: "รอตรวจ",
  resultFound: "พบตรง",
  resultMismatch: "ไม่ตรง",
  resultNotFound: "ไม่พบ",
  resultOutOfScope: "นอกขอบเขต",
  resultPendingReview: "รอพิจารณา",
  // "ไม่ตรงเรื่องอะไร": the bars' words are the findings' (auditFinding.type_*), as Task 4 draws them.
  mismatchCard: "ไม่ตรงเรื่องอะไร",
  fieldLocation: "ที่ตั้งไม่ตรง",
  fieldDepartment: "แผนกไม่ตรง",
  fieldCustodian: "ผู้ถือครองไม่ตรง",
  fieldCondition: "สภาพไม่ตรง",
  multipleFields: "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง",
  componentsMissingLine: "เครื่องที่ส่วนควบไม่ครบ {count}",
  componentsMissingChip: "ส่วนควบไม่ครบ {count}",
  // A parent row's "ไม่พบ: <name> (<code>)": the prefix is the message, the name and the linked code follow it.
  missingComponentPrefix: "ไม่พบ:",
  activeFilters: "ตัวกรองที่ใช้อยู่",
  clearFilter: "ล้างตัวกรองนี้",
  // The pending list.
  pendingTitle: "รายการรอตรวจ {count} รายการ",
  allRooms: "ทุกห้อง",
  scanThis: "สแกนรายการนี้",
  viewAsset: "ดูทรัพย์สิน",
  markNotFound: "บันทึกไม่พบ",
  noCustodian: "ไม่มีผู้ถือครอง",
  notFoundResult: "รายการนี้จะออกจากรอตรวจ และส่งให้หัวหน้า IT พิจารณา ทะเบียนยังไม่เปลี่ยน",
} as const
```

`tests/e2e-audit-rounds.test.ts`, three tests after `:79`. `read`, `values` and `shape` are the file's own (`:9-12`), and it needs `readdirSync` from `node:fs` at `:2`:

```ts
test("the round page and pending list steps read the app's own words (group 2 plan 2 task 7)", async () => {
  const { ROUND_PAGE_WORDS } = await import("../e2e/audit/round-page-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(ROUND_PAGE_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  // The keys that stay from plan 1 and before.
  const round = th.auditRound as Record<string, string>
  assert.equal(ROUND_PAGE_WORDS.nextStep, round.nextStep)
  assert.equal(ROUND_PAGE_WORDS.continueScan, round.nextStepContinueScan)
  assert.equal(ROUND_PAGE_WORDS.closeRound, round.closeRound)
  assert.equal(ROUND_PAGE_WORDS.cancelRound, round.cancelRound)
  assert.equal(ROUND_PAGE_WORDS.activeFilters, round.activeFilters)
  assert.equal(ROUND_PAGE_WORDS.clearFilter, round.clearFilter)
  assert.equal(ROUND_PAGE_WORDS.scanThis, th.auditPending.scanPendingAsset)
  assert.equal(ROUND_PAGE_WORDS.viewAsset, th.auditPending.viewAsset)
  assert.equal(ROUND_PAGE_WORDS.markNotFound, th.auditPending.markNotFound)
  assert.equal(ROUND_PAGE_WORDS.noCustodian, th.asset.noCustodian)
  // The words Tasks 4-5 put on the page, by key.
  assert.equal(ROUND_PAGE_WORDS.reviewWaiting, round.stepReviewWaiting)
  assert.equal(ROUND_PAGE_WORDS.reviewItems, round.nextStepReviewItems)
  assert.equal(ROUND_PAGE_WORDS.componentsMissingChip, round.componentsMissingChip)
  assert.equal(ROUND_PAGE_WORDS.missingComponentPrefix, round.missingComponentPrefix)
  assert.equal(ROUND_PAGE_WORDS.fieldDepartment, th.auditFinding.type_wrong_department)
  assert.equal(ROUND_PAGE_WORDS.fieldCondition, th.auditFinding.type_wrong_condition)
  // Bug 12 and P2-R15: no English report name and no ผู้ตรวจสอบ left in the round and pending words.
  assert.deepEqual(values(round).filter((text) => text.includes("Variance")), [])
  assert.deepEqual([...values(round), ...values(th.auditPending)].filter((text) => text.includes("ผู้ตรวจสอบ")), [])
  // The result card's help is Task 4's round-wide sentence (P2-R15 applied there); Task 6 does not touch it.
  assert.match(round.resultDashboardHelp, /^นับทั้งรอบ ไม่ขึ้นกับตัวกรองของรายการด้านล่าง/)
})

test("the round page and pending steps stand on the result list's chips, the cards' headings and the rows (group 2 plan 2 task 7)", () => {
  const steps = read("e2e/audit/round-page-steps.ts")
  for (const name of ["resultRows", "resultChips", "categoryChips", "chipByLabel", "chipByHref", "chipCount", "chipLabel", "expectChips", "expectChip", "expectChipsMatchRows", "nextStepCard", "mismatchCard", "fieldBar", "componentsMissingLine", "filterChip", "expectInside"]) {
    assert.match(steps, new RegExp(`^export (?:async )?function ${name}\\(`, "m"), name)
  }
  const pending = read("e2e/audit/pending-steps.ts")
  for (const name of ["pendingRows", "pendingEntry", "roomChips", "expectRoomChips", "markNotFound"]) {
    assert.match(pending, new RegExp(`^export (?:async )?function ${name}\\(`, "m"), name)
  }
  // Spec §5: a chip row is checked against the rows each chip opens, never against a global count.
  assert.ok(steps.includes("await expect(rows, `${chip.text}: its count is its rows (spec §5)`).toHaveCount(Number(chip.count.replace(/,/g, \"\")))"))
  // The markup the steps read (Tasks 4-6): the result list's anchor, TabNav's count span, and the pending list's
  // TabNav room chips with the whole row still opening the asset (P2-R28).
  const audit = ["src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", ...readdirSync("src/components/audit").map((file) => `src/components/audit/${file}`)]
  assert.ok(audit.some((file) => read(file).includes('id="audit-result-list"')), "the result list's anchor")
  assert.match(read("src/components/ui/tab-nav.tsx"), /<span className=\{cn\("ms-1\.5 text-meta num"/)
  const pendingPage = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx")
  assert.match(pendingPage, /<TabNav\b/)
  assert.match(pendingPage, /<ClickableTableRow\b/)
})

test("the rounds list spec's viewer reads the pending list and the round page with no scan, not-found or menu (group 2 plan 2 task 7)", () => {
  const spec = read("e2e/audit/rounds-list.spec.ts")
  assert.ok(spec.includes("const assets = await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`])"))
  assert.ok(spec.includes(`await pending.expectRoomChips(page, 2, { [roomId]: 2 }, "all")`))
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByRole("button", { name: P.markNotFound, exact: true })).toHaveCount(0)`))
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByRole("link", { name: P.scanThis, exact: true })).toHaveCount(0)`))
  assert.ok(spec.includes(`await expect(roundPage.nextStepCard(page).getByRole("link", { name: nextName, exact: true })).toHaveAttribute("href", pendingHref)`))
  assert.ok(spec.includes(`await expect(page.getByRole("main").getByRole("button", { name: P.more, exact: true })).toHaveCount(0)`))
  // No visible scan link for the viewer: the rounds list, the pending list and the round page.
  assert.equal((spec.match(/await expect\(page\.locator\('main a\[href\*="\/scan"\]'\)\.filter\(\{ visible: true \}\)\)\.toHaveCount\(0\)/g) ?? []).length, 3)
})
```

`tests/e2e-audit.test.ts`:

After `:115` (EA2, inside the walk):

```ts
  // Group 2 plan 2 (spec §8): the walk opens the scan page from the next-step card's main button, not the old header link.
  assert.ok(walk.includes("await roundPage.nextStepCard(page).getByRole(\"link\", { name: fillTemplate(W.continueScan, { count: 7 }), exact: true }).click()"))
  assert.ok(!walk.includes(`{ name: "สแกนตรวจนับ" }`), "not the old header link")
```

`:176` (EA3) becomes:

```ts
  assert.ok(room.includes("const notFound = { ...assets.notFound, room: records.rooms.roomB, custodian: null }"))
  assert.ok(room.includes(`pending.markNotFound(page, e2eDevice, notFound, () => recordSettled(page, measure, "not found dialog"))`))
  // Group 2 plan 2 (spec §9): the title and the room chips count the rows; room B stays chosen at 0 after its last item (P2-R11, P2-R12).
  assert.ok(room.includes("await pending.expectRoomChips(page, 1, { [chain.rooms.roomB]: 1 }, chain.rooms.roomB)"))
  assert.ok(room.includes("await roundPage.expectChipsMatchRows(page, pending.roomChips(page), pending.pendingRows(page, e2eDevice, runTags))"))
  assert.ok(room.includes("await pending.expectRoomChips(page, 0, { [chain.rooms.roomB]: 0 }, chain.rooms.roomB)"))
```

After `:178` (EA3):

```ts
  // Spec §9 (bugs 14, 15): the button sits on the row on both screens, and the dialog names the asset.
  assert.ok(!pendingSteps.includes("การดำเนินการของ"), "no ⋯ on the desktop row")
  assert.ok(pendingSteps.includes("for (const text of [asset.name, asset.tag, asset.room.code, asset.room.name, asset.custodian ?? W.noCustodian, W.notFoundResult]) await expect(dialog).toContainText(text)"))
```

After `:200` (EA4, the IT head's block):

```ts
  // Group 2 plan 2 (spec §8, §13 bug 2): the close sits whole inside the next-step card, and the IT head did not open the round.
  assert.ok(head.includes(`const close = nextStep.getByRole("button", { name: "${thai("auditRound").closeRound}", exact: true })`))
  assert.ok(head.includes("await roundPage.expectInside(close, nextStep)"))
  assert.ok(head.includes("await expect(page.getByText(W.openerCannotClose)).toHaveCount(0)") && !head.includes("ผู้ปิดรอบต้องไม่ใช่ผู้สร้างรอบ"))
```

`:213` (EA5) becomes:

```ts
  // Group 2 plan 2 (spec §8, §9): the next-step card tells the opener, with no close before step 3; the cancel is in
  // "อื่น ๆ"; the room chips before and after the not-found.
  assert.ok(own.includes("await expect(nextStep.getByText(W.openerCannotClose)).toBeVisible()") && !own.includes("ผู้ปิดรอบต้องไม่ใช่ผู้สร้างรอบ"))
  assert.ok(own.includes(`await expect(nextStep.getByRole("button", { name: "${thai("auditRound").closeRound}", exact: true })).toHaveCount(0)`))
  assert.ok(own.includes(`await page.getByRole("main").getByRole("button", { name: W.more, exact: true }).click()`) && own.includes(`await page.getByRole("menuitem", { name: W.cancelRound, exact: true }).click()`))
  assert.ok(own.includes(`await pending.expectRoomChips(page, 2, { [chain.rooms.roomB]: 2 }, "all")`) && own.includes(`await pending.expectRoomChips(page, 1, { [chain.rooms.roomB]: 1 }, "all")`))
```

After `:219` (EA5, the exports block):

```ts
  // Group 2 plan 2 (spec §8, §16): IT staff get no export menu on the round page; after the review the IT head sees the
  // rejected condition leave its bar (P2-R1) and the Excel export follow the category.
  assert.ok(exports.includes(`await expect(page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true })).toHaveCount(0)`))
  assert.ok(exports.includes(`await page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true }).click()`))
  assert.ok(exports.includes(`await expect(roundPage.fieldBar(card, "condition")).toHaveCount(0)`))
  assert.ok(exports.includes(`expect(tags.sort(), "the category's items only").toEqual([assets.component1.tag, assets.component2.tag].sort())`))
```

After `:222`, a new test:

```ts
test("IT staff read the round page after the walk: each chip's count is its rows, the categories within the result, a bar per field, the parent with a component not found (group 2 plan 2 task 7)", () => {
  const spec = read(SPEC)
  const title = `test.describe("IT staff read the round page after the walk"`
  const after = block(spec, "IT staff read the round page after the walk")
  assert.ok(after.includes(`asUser("itStaff")`))
  // In the chain after room B and before the refusals: the walk's results, no decision yet.
  assert.ok(spec.indexOf(`test.describe("IT staff in room B, offline, and not found"`) < spec.indexOf(title) && spec.indexOf(title) < spec.indexOf(`test.describe("IT staff are refused the review and the close"`))
  // The walk's counts (spec §8, P2-R2, P2-R3): 7 = 4 + 1 + 2 + 0, the out-of-scope find apart, four items waiting.
  assert.ok(after.includes("await roundPage.expectChips(results, [[W.resultAll, 7], [W.resultPending, 0], [W.resultFound, 4], [W.resultMismatch, 1], [W.resultNotFound, 2], [W.resultOutOfScope, 1], [W.resultPendingReview, 4]])"))
  assert.equal((after.match(/await roundPage\.expectChipsMatchRows\(page, (?:results|categories), rows\)/g) ?? []).length, 3)
  for (const [category, count] of [["categoryDesktop", 5], ["categoryComponent", 2], ["categoryDesktop", 1], ["categoryComponent", 1]] as const) {
    assert.ok(after.includes(`await roundPage.expectChip(categories, \`categoryId=\${masters.${category}}\`, ${count})`), `${category} ${count}`)
  }
  assert.ok(after.includes(`for (const field of ["department", "condition"] as const) {`) && after.includes("await expect(card.getByText(W.multipleFields, { exact: true })).toBeVisible()"))
  assert.ok(after.includes("await expect(roundPage.filterChip(page, fillTemplate(W.componentsMissingChip, { count: 1 }))).toBeVisible()"))
  assert.ok(after.includes("`${W.missingComponentPrefix} ${assets.component2.name} (${assets.component2.tag})`"))
  // Step 2 counts findings, the rows of the findings page (P2-R26): the five the IT head decides in block 6.
  assert.ok(after.includes("fillTemplate(W.reviewWaiting, { count: 5 })") && after.includes("fillTemplate(W.reviewItems, { count: 5 })"))
  assert.ok(after.includes(`await parentRow.getByRole("link", { name: assets.component2.tag, exact: true }).click()`))
  // "ส่วนควบของ <parent>" on the findings page is plan 4's step (spec §16), not this block's.
})
```

- [ ] **Step 2: Run the guard tests to see them fail**

Run: `node --test tests/e2e-audit.test.ts tests/e2e-audit-rounds.test.ts`
Expected: FAIL. `e2e/audit/round-page-steps.ts` does not exist. `pending-steps.ts` still opens ⋯ and names no asset. The spec has no round page block and still clicks "สแกนตรวจนับ" and reads "ผู้ปิดรอบต้องไม่ใช่ผู้สร้างรอบ". `rounds-list.spec.ts` has no viewer steps on the pending list. The words test passes once Tasks 4-6 have landed.

- [ ] **Step 3: Write the helpers**

`e2e/audit/round-page-steps.ts`:

```ts
// The steps on the round page (group 2 spec §8) and the chip rows it shares with its pending list (§9): the result
// list's rows and chip rows, a chip row's counts against the rows each chip opens (spec §5 "counts equal lists"), the
// next-step card, the "ไม่ตรงเรื่องอะไร" card with its field bars and its components line, a removable filter chip, and
// a button that must sit whole inside its card (spec §13 bug 2).
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { ROUND_PAGE_WORDS } from "./round-page-words.ts"

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const formatted = (count: number) => count.toLocaleString("en-US")

// A finding's field as the URL names it (field=…, Task 1's auditFindingFields).
export type AuditField = "location" | "department" | "custodian" | "condition"

// The run's own rows of the result list: the phone's cards or the desktop table's rows (the other one is hidden).
export function resultRows(page: Page, device: E2eDevice, tagPrefix: string): Locator {
  return page.locator("#audit-result-list").locator(device === "phone" ? "article" : "tbody tr").filter({ hasText: tagPrefix })
}

// The result chips: the result list's first TabNav. The category chips: its second (hidden at one category).
export function resultChips(page: Page): Locator {
  return page.locator('#audit-result-list [data-slot="tab-nav"]').nth(0)
}

export function categoryChips(page: Page): Locator {
  return page.locator('#audit-result-list [data-slot="tab-nav"]').nth(1)
}

// One chip by its label, its count after it.
export function chipByLabel(row: Locator, label: string): Locator {
  return row.getByRole("link", { name: new RegExp(`^${escape(label)}\\s*[\\d,]*$`) })
}

// One chip by a part of its link (categoryId=…, locationId=…): the ids are the run's own, the labels may repeat.
export function chipByHref(row: Locator, hrefPart: string): Locator {
  return row.locator(`a[href*="${hrefPart}"]`)
}

// The count TabNav writes after a chip's label (its last span.num, src/components/ui/tab-nav.tsx).
export function chipCount(chip: Locator): Locator {
  return chip.locator("span.num").last()
}

export async function chipLabel(chip: Locator): Promise<string> {
  const [text, count] = await Promise.all([chip.textContent(), chipCount(chip).textContent()])
  const whole = (text ?? "").trim()
  return whole.slice(0, whole.length - (count ?? "").trim().length).trim()
}

// Exactly these chips in this order, each with its count.
export async function expectChips(row: Locator, chips: readonly (readonly [string, number])[]) {
  await expect(row.getByRole("link")).toHaveText(chips.map(([label, count]) => new RegExp(`^${escape(label)}\\s*${formatted(count)}$`)))
}

export async function expectChip(row: Locator, hrefPart: string, count: number) {
  const chip = chipByHref(row, hrefPart)
  await expect(chip).toHaveCount(1)
  await expect(chipCount(chip)).toHaveText(formatted(count))
}

// Spec §5: each chip of the row opens rows of its own count. Every chip's link is opened in turn, then the page the
// step started on. The rows are the run's own, so another run's data never counts.
export async function expectChipsMatchRows(page: Page, row: Locator, rows: Locator) {
  const start = page.url()
  const chips = await row.getByRole("link").evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute("href") ?? "",
      text: (link.textContent ?? "").trim(),
      count: Array.from(link.querySelectorAll("span.num")).pop()?.textContent?.trim() ?? "",
    })),
  )
  expect(chips.length, "the row has chips").toBeGreaterThan(0)
  for (const chip of chips) {
    expect(chip.count, `${chip.text}: a count`).toMatch(/^[\d,]+$/)
    await page.goto(chip.href)
    await expect(rows, `${chip.text}: its count is its rows (spec §5)`).toHaveCount(Number(chip.count.replace(/,/g, "")))
  }
  await page.goto(start)
}

// A card of the page: the ContentPanel section whose heading matches (the innermost, should panels nest).
function card(page: Page, heading: RegExp): Locator {
  return page.getByRole("main").locator("section").filter({ has: page.getByRole("heading", { level: 2, name: heading }) }).last()
}

// "ขั้นถัดไป: …" (spec §8): the steps, their lines, the main button and, at step 3, "ปิดรอบตรวจ".
export function nextStepCard(page: Page): Locator {
  return card(page, new RegExp(`^${escape(ROUND_PAGE_WORDS.nextStep)}`))
}

// "ไม่ตรงเรื่องอะไร" (spec §8): a bar per field, then "เครื่องที่ส่วนควบไม่ครบ N".
export function mismatchCard(page: Page): Locator {
  return card(page, new RegExp(`^${escape(ROUND_PAGE_WORDS.mismatchCard)}$`))
}

// A field's bar: a link only while its count is above 0. A `has:` filter must use a page-rooted locator; a locator
// chained from the card never matches inside an li.
export function fieldBar(mismatch: Locator, field: AuditField): Locator {
  return mismatch.locator(`a[href*="field=${field}"]`)
}

export function componentsMissingLine(mismatch: Locator): Locator {
  return mismatch.locator('a[href*="components=missing"]')
}

// A removable chip of the list's filters ("ล้างตัวกรองนี้: …"), by a part of its label.
export function filterChip(page: Page, text: string): Locator {
  return page
    .getByRole("group", { name: ROUND_PAGE_WORDS.activeFilters })
    .getByRole("link", { name: new RegExp(`^${escape(ROUND_PAGE_WORDS.clearFilter)}: .*${escape(text)}`) })
}

// Spec §13 bug 2: the button sits whole inside its card, not over its edge.
export async function expectInside(inner: Locator, outer: Locator) {
  await inner.scrollIntoViewIfNeeded()
  const [box, frame] = await Promise.all([inner.boundingBox(), outer.boundingBox()])
  if (!box || !frame) throw new Error("the button or its card is not on screen")
  expect(box.x, "the button starts inside its card").toBeGreaterThanOrEqual(frame.x - 1)
  expect(box.x + box.width, "the button ends inside its card").toBeLessThanOrEqual(frame.x + frame.width + 1)
  expect(box.y + box.height, "the button ends above its card's bottom").toBeLessThanOrEqual(frame.y + frame.height + 1)
}
```

`e2e/audit/pending-steps.ts`. The whole file becomes:

```ts
// The round's pending list (/th/audit/rounds/<id>/pending, group 2 spec §9; messages/th.json auditPending): its rows,
// its room chips, and "บันทึกไม่พบ" from the row, with the in-app dialog that names the asset. The list is cards on the
// phone and a table on the desktop; both are in the page and one of them is hidden.
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { chipByHref, chipByLabel, chipCount, expectChip } from "./round-page-steps.ts"
import { ROUND_PAGE_WORDS as W } from "./round-page-words.ts"

// The asset the not-found dialog names, with the item's expected room and custodian (spec §9, bug 13); a missing
// custodian reads "ไม่มีผู้ถือครอง".
export type PendingAsset = { tag: string; name: string; room: { code: string; name: string }; custodian: string | null }

// The rows that hold this text (a tag, or a run's prefix): cards on the phone, table rows on the desktop.
export function pendingRows(page: Page, device: E2eDevice, text: string): Locator {
  return page.getByRole("main").locator(device === "phone" ? "article" : "tbody tr").filter({ hasText: text })
}

// One item on the list, found by its tag on both screens. The desktop row still opens the asset as a whole ("ดู: <tag>",
// P2-R28); its scan link and not-found button stop the click from reaching it.
export function pendingEntry(page: Page, device: E2eDevice, tag: string): Locator {
  return pendingRows(page, device, tag)
}

// The room chips: the page's first TabNav, "ทุกห้อง N" and then the rooms.
export function roomChips(page: Page): Locator {
  return page.getByRole("main").locator('[data-slot="tab-nav"]').first()
}

// Exactly "ทุกห้อง" and these rooms (by id) with their counts; current is the chosen chip, "all" for ทุกห้อง.
export async function expectRoomChips(page: Page, all: number, rooms: Record<string, number>, current: string) {
  const row = roomChips(page)
  await expect(row.getByRole("link")).toHaveCount(1 + Object.keys(rooms).length)
  const allChip = chipByLabel(row, W.allRooms)
  await expect(chipCount(allChip)).toHaveText(all.toLocaleString("en-US"))
  for (const [locationId, count] of Object.entries(rooms)) await expectChip(row, `locationId=${locationId}`, count)
  await expect(current === "all" ? allChip : chipByHref(row, `locationId=${current}`)).toHaveAttribute("aria-current", "page")
}

// "บันทึกไม่พบ": a button on the row on both screens (spec §9, bug 14). The dialog names the asset (bug 15) and is
// confirmed with no remark (none is needed); answers the finding id the save returns. onDialog runs while the dialog
// is open (axe on it).
export async function markNotFound(page: Page, device: E2eDevice, asset: PendingAsset, onDialog?: () => Promise<unknown>): Promise<string> {
  await pendingEntry(page, device, asset.tag).getByRole("button", { name: "บันทึกไม่พบ", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "บันทึกทรัพย์สินนี้ว่าไม่พบ" })
  await expect(dialog).toBeVisible()
  for (const text of [asset.name, asset.tag, asset.room.code, asset.room.name, asset.custodian ?? W.noCustodian, W.notFoundResult]) await expect(dialog).toContainText(text)
  await onDialog?.()
  const marked = page.waitForResponse((response) => response.url().includes("/api/audit-items/") && response.url().endsWith("/mark-not-found"))
  await dialog.getByRole("button", { name: "ยืนยันว่าไม่พบ" }).click()
  const response = await marked
  expect(response.status(), "the not-found save").toBe(200)
  await expect(page.getByText("บันทึกว่าไม่พบ และสร้างรายการไม่ตรงรอพิจารณาแล้ว")).toBeVisible()
  await expect(dialog).toBeHidden()
  return ((await response.json()) as { findingId: string }).findingId
}
```

- [ ] **Step 4: Rewrite the field audit's round page and pending steps, and add the round page block**

`e2e/audit/field-audit.spec.ts`:
- `:1-16` (the header comment) becomes:

```ts
// The field audit walk and its review (spec §6.2, the user's second worry), in all four projects, the phone on WebKit
// (spec §8). One serial chain per project, on that project's own records (e2e/audit/audit-plan.ts); each block is one
// person's part:
// 1. IT staff open the round of the project's department on the round form, after it shows its errors under the
//    fields (spec §6.2.1, §6.7): no status choice, the department as a condition chip, the live count equal to the
//    round's items, the round open at once (group 2 spec §7, §14, §16);
// 2. IT staff walk room A by typing names and tags, from the round page's "เดินตรวจต่อ" (group 2 spec §8): one
//    matched, one mismatch (another department and the condition, with the photo the condition asks for), a parent
//    whose components are not all checked, an unknown and an out-of-scope search (spec §6.2.2);
// 3. in room B the phone goes offline, saves a check, comes back and sends it; one asset is marked not found from the
//    pending list, whose room chips count its rows and whose dialog names the asset (spec §6.2.2–3, group 2 spec §9);
// 4. IT staff read the round page after the walk: the result and category chips equal their rows, each field's bar
//    its rows, and the parent with a component not found is listed once (group 2 spec §8, §16);
// 5. IT staff are refused the review of their own findings and the close of the round they opened (spec §6.2.4);
// 6. the IT head reviews every finding and closes the round from the next-step card (spec §6.2.4, group 2 spec §8);
// 7. the IT head's own round: the room chips, their own finding and their own close are refused, the card says why,
//    and the round is cancelled from "อื่น ๆ";
// 8. the audit exports by permission (spec §6.2.5, §6.5): hidden from IT staff (finding AU1, fixed; the round page's
//    menu too), downloaded by the IT head (decision U1, DX6 (ก)), the round's Excel by a category (group 2 spec §16).
```

- After `:29` (the last import) add:

```ts
import { fillTemplate } from "../shell/shell-words.ts"
import * as roundPage from "./round-page-steps.ts"
import { ROUND_PAGE_WORDS as W } from "./round-page-words.ts"
```

- `:133-135` become:

```ts
    await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page")
    // Group 2 spec §8: the walk starts from the next-step card's main button; none of the round's seven items is checked yet.
    await roundPage.nextStepCard(page).getByRole("link", { name: fillTemplate(W.continueScan, { count: 7 }), exact: true }).click()
    await page.waitForURL(`**/th/audit/rounds/${chain.roundId}/scan**`)
```

- `:293-303` (from the comment "Not found: …" to `:303`'s `saveChain`) become:

```ts
    // Not found: from the room's pending list, the in-app dialog, no remark needed.
    await list.getByRole("button", { name: /^ยังไม่ตรวจ/ }).click()
    await page.getByRole("link", { name: "ของที่หาไม่เจอ → รายการค้าง" }).click()
    await page.waitForURL(`**/th/audit/rounds/${chain.roundId}/pending**`)
    // Group 2 spec §9: the title counts the round's pending items; the room chips count by the item's own room, room B
    // stays chosen from the scan page and room A has nothing left; each chip's count is its rows (P2-R11, P2-R12).
    const runTags = `${readRunState().runId}-${records.code}-`
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(W.pendingTitle, { count: 1 }) })).toBeVisible()
    await pending.expectRoomChips(page, 1, { [chain.rooms.roomB]: 1 }, chain.rooms.roomB)
    await roundPage.expectChipsMatchRows(page, pending.roomChips(page), pending.pendingRows(page, e2eDevice, runTags))
    await expect(pending.pendingEntry(page, e2eDevice, assets.notFound.tag)).toBeVisible()
    await measure.recordPage("pending list of room B")
    // The dialog names the asset with its room as the item has it and no custodian (spec §9, bug 15).
    const notFound = { ...assets.notFound, room: records.rooms.roomB, custodian: null }
    const findingId = await measure.timed("mark not found", () =>
      pending.markNotFound(page, e2eDevice, notFound, () => recordSettled(page, measure, "not found dialog")),
    )
    await expect(pending.pendingEntry(page, e2eDevice, assets.notFound.tag)).toHaveCount(0)
    // The chosen room stays, at 0 (P2-R11).
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(W.pendingTitle, { count: 0 }) })).toBeVisible()
    await pending.expectRoomChips(page, 0, { [chain.rooms.roomB]: 0 }, chain.rooms.roomB)
    saveChain(project, { ...chain, notFoundFindingId: findingId })
```

- After `:309` (the closing `})` of "IT staff in room B, offline, and not found"), a new block:

```ts
test.describe("IT staff read the round page after the walk", () => {
  asUser("itStaff")

  test("IT staff read the round page after the walk: each chip's count is its rows, the categories count within the result, each field's bar is its rows, the parent with a component not found is listed once", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(240_000)
    const chain = readChain(testInfo.project.name)
    const { assets, masters } = chain
    const roundHref = `/th/audit/rounds/${chain.roundId}`
    // The walk's own rows: every tag of the project's records starts with the run id and the project's code.
    const rows = roundPage.resultRows(page, e2eDevice, `${readRunState().runId}-${chain.records.code}-`)
    await measure.visit(roundHref, "round page after the walk (IT staff)")

    // The result chips (group 2 spec §8, P2-R2, P2-R3): the round's 7 items are พบตรง 4 (A1, P1, C1, A5) + ไม่ตรง 1 (A2)
    // + ไม่พบ 2 (A4, C2) + รอตรวจ 0; the out-of-scope find X1 apart; รอพิจารณา counts the 4 items with a finding still
    // waiting (A2, C2, A4, X1). Each chip opens rows of its count.
    const results = roundPage.resultChips(page)
    await roundPage.expectChips(results, [[W.resultAll, 7], [W.resultPending, 0], [W.resultFound, 4], [W.resultMismatch, 1], [W.resultNotFound, 2], [W.resultOutOfScope, 1], [W.resultPendingReview, 4]])
    await roundPage.expectChipsMatchRows(page, results, rows)

    // The category chips count within the result in use (decision 2): five desktops and two components in all, one of
    // each among the not-founds (A4, C2). Each chip opens rows of its count.
    const categories = roundPage.categoryChips(page)
    await roundPage.expectChip(categories, `categoryId=${masters.categoryDesktop}`, 5)
    await roundPage.expectChip(categories, `categoryId=${masters.categoryComponent}`, 2)
    await roundPage.expectChipsMatchRows(page, categories, rows)
    await roundPage.chipByLabel(results, W.resultNotFound).click()
    await page.waitForURL(/[?&]result=not_found(?:[&#]|$)/)
    await roundPage.expectChip(categories, `categoryId=${masters.categoryDesktop}`, 1)
    await roundPage.expectChip(categories, `categoryId=${masters.categoryComponent}`, 1)
    await roundPage.expectChipsMatchRows(page, categories, rows)

    // Step 2 of the next-step card counts findings (P2-R26): nothing is pending, and five findings wait (A2's department
    // and condition, C2, A4, X1), the rows of the findings page that "รอ 5" and the main button open; block 6 decides
    // those five.
    await page.goto(roundHref)
    const findingsHref = new RegExp(`^/th/audit/findings\\?status=pending&roundId=${chain.roundId}(?:&|$)`)
    const nextStep = roundPage.nextStepCard(page)
    await expect(nextStep.getByRole("link", { name: fillTemplate(W.reviewWaiting, { count: 5 }), exact: true })).toHaveAttribute("href", findingsHref)
    await expect(nextStep.getByRole("link", { name: fillTemplate(W.reviewItems, { count: 5 }), exact: true })).toHaveAttribute("href", findingsHref)

    // "ไม่ตรงเรื่องอะไร" (spec §8, P2-R1, P2-R18): the mismatch is wrong in its department and its condition, both
    // waiting, so each bar holds it once and the card says one item is wrong in more than one way. Each bar's word is
    // its link, its count beside it in the same item (Task 4); each bar opens its rows.
    const card = roundPage.mismatchCard(page)
    await expect(card.getByText(W.multipleFields, { exact: true })).toBeVisible()
    await recordSettled(page, measure, "round page, the mismatch card (IT staff)")
    for (const field of ["department", "condition"] as const) {
      const word = field === "department" ? W.fieldDepartment : W.fieldCondition
      await expect(roundPage.fieldBar(card, field)).toHaveAccessibleName(word)
      await expect(card.getByRole("listitem").filter({ has: page.locator(`a[href*="field=${field}"]`) })).toHaveText(new RegExp(`^${scan.escapeRegExp(word)}\\s*1$`))
      await roundPage.fieldBar(card, field).click()
      await page.waitForURL(new RegExp(`[?&]field=${field}(?:[&#]|$)`))
      await expect(rows).toHaveCount(1)
      await expect(rows).toContainText(assets.mismatch.tag)
      await page.goto(roundHref)
    }

    // "ส่วนควบไม่ครบ" (decision 6): the parent whose second component was marked not found in the walk, listed once,
    // with that component named under it; its code opens the component's own row on this page (P2-R17).
    const missingLine = roundPage.componentsMissingLine(card)
    await expect(missingLine).toHaveAccessibleName(new RegExp(`^${scan.escapeRegExp(fillTemplate(W.componentsMissingLine, { count: 1 }))}`))
    await missingLine.click()
    await page.waitForURL(/[?&]components=missing(?:[&#]|$)/)
    await expect(roundPage.filterChip(page, fillTemplate(W.componentsMissingChip, { count: 1 }))).toBeVisible()
    await expect(rows).toHaveCount(1)
    const parentRow = rows.filter({ hasText: assets.parent.tag })
    await expect(parentRow).toHaveCount(1)
    await expect(parentRow).toContainText(`${W.missingComponentPrefix} ${assets.component2.name} (${assets.component2.tag})`)
    await recordSettled(page, measure, "round page, parents with a component not found (IT staff)")
    await parentRow.getByRole("link", { name: assets.component2.tag, exact: true }).click()
    await page.waitForURL((url) => url.pathname === roundHref && url.searchParams.get("search") === assets.component2.tag && !url.searchParams.has("components"))
    await expect(rows).toHaveCount(1)
    await expect(rows).toContainText(assets.component2.tag)
  })
})
```

- `:382-386` (the comment "The checklist is clear …" through the opener check) become:

```ts
    // The checklist is clear and the IT head did not open the round: "ปิดรอบตรวจ" sits whole inside the next-step card
    // (group 2 spec §8, §13 bug 2), with no opener's sentence, and the close goes through.
    await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page (IT head)")
    const nextStep = roundPage.nextStepCard(page)
    const close = nextStep.getByRole("button", { name: "ปิดรอบตรวจ", exact: true })
    await expect(close).toBeEnabled()
    await roundPage.expectInside(close, nextStep)
    await expect(page.getByText(W.openerCannotClose)).toHaveCount(0)
```

`:387-397` stay. `:394` `await expect(close).toHaveCount(0)` now also covers a closed round's card.

- `:431-433` become:

```ts
    // They mark one asset not found from the pending list (group 2 spec §9): the title and the room chips count room B's
    // two items, each chip's count is its rows, and "เดินตรวจต่อ (2)" opens the scan page (the IT head holds audit:edit);
    // after the save one is left.
    await measure.visit(`/th/audit/rounds/${own.id}/pending`, "pending list of the IT head's round")
    const ownRows = pending.pendingRows(page, e2eDevice, `${readRunState().runId}-${records.code}-`)
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(W.pendingTitle, { count: 2 }) })).toBeVisible()
    await expect(page.getByRole("main").getByRole("link", { name: fillTemplate(W.continueScan, { count: 2 }), exact: true })).toHaveAttribute("href", new RegExp(`^/th/audit/rounds/${own.id}/scan(?:[?#]|$)`))
    await pending.expectRoomChips(page, 2, { [chain.rooms.roomB]: 2 }, "all")
    await roundPage.expectChipsMatchRows(page, pending.roomChips(page), ownRows)
    const findingId = await pending.markNotFound(page, e2eDevice, { ...assets.notFound, room: records.rooms.roomB, custodian: null })
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(W.pendingTitle, { count: 1 }) })).toBeVisible()
    await pending.expectRoomChips(page, 1, { [chain.rooms.roomB]: 1 }, "all")
    await expect(ownRows).toHaveCount(1)
```

- `:444-448` become:

```ts
    // Their own round: the next-step card tells the opener they cannot close it, and offers no close yet (room B's other
    // asset is still to check, so step 3 is not reached); the close route refuses the opener (spec §6.2.4: the rule as
    // the code has it, src/app/api/audit-rounds/[id]/route.ts closeOwnRound).
    await measure.visit(`/th/audit/rounds/${own.id}`, "the IT head's round")
    const nextStep = roundPage.nextStepCard(page)
    await expect(nextStep.getByText(W.openerCannotClose)).toBeVisible()
    await expect(nextStep.getByRole("button", { name: "ปิดรอบตรวจ", exact: true })).toHaveCount(0)
```

`:449-452` (the refusal) stay.

- `:453-454` become:

```ts
    // The round is cancelled from "อื่น ๆ" (group 2 spec §8) with a reason; an empty reason first shows its error under
    // the field.
    await page.getByRole("main").getByRole("button", { name: W.more, exact: true }).click()
    await recordSettled(page, measure, "the round's อื่น ๆ menu")
    await page.getByRole("menuitem", { name: W.cancelRound, exact: true }).click()
```

`:455-468` stay. The dialog, its error under the field, the focus and the cancelled notice are the same.

- In the IT staff export test, after `:484` (the PDF link check), add:

```ts
      // Nor the round page's export menu (group 2 spec §8: "ส่งออก ▾" needs audit:export).
      await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page (IT staff, no export)")
      await expect(page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true })).toHaveCount(0)
```

- After `:514` (the end of the IT head's findings export test, inside `test.describe("IT head", …)`), a new test:

```ts
    test("the round page after the review: the rejected finding leaves its bar, and a category narrows the result chips, the rows and the Excel export (group 2 spec §8, §16)", async ({ page, measure, e2eDevice }, testInfo) => {
      test.setTimeout(180_000)
      const chain = readChain(testInfo.project.name)
      const { assets, masters } = chain
      const rows = roundPage.resultRows(page, e2eDevice, `${readRunState().runId}-${chain.records.code}-`)
      await measure.visit(`/th/audit/rounds/${chain.roundId}`, "round page, closed (IT head)")

      // P2-R1: the rejected condition finding leaves its bar; the approved department stays, so one item, one field.
      const card = roundPage.mismatchCard(page)
      await expect(roundPage.fieldBar(card, "department")).toHaveAccessibleName(W.fieldDepartment)
      await expect(card.getByRole("listitem").filter({ has: page.locator('a[href*="field=department"]') })).toHaveText(new RegExp(`^${scan.escapeRegExp(W.fieldDepartment)}\\s*1$`))
      await expect(roundPage.fieldBar(card, "condition")).toHaveCount(0)
      await expect(card.getByText(W.multipleFields, { exact: true })).toHaveCount(0)

      // A category (decision 2): its chip joins the filter chips, the result chips count within it, the rows narrow to it.
      const component = roundPage.chipByHref(roundPage.categoryChips(page), `categoryId=${masters.categoryComponent}`)
      const label = await roundPage.chipLabel(component)
      await component.click()
      await page.waitForURL(new RegExp(`[?&]categoryId=${masters.categoryComponent}(?:[&#]|$)`))
      await expect(roundPage.filterChip(page, label)).toBeVisible()
      await roundPage.expectChips(roundPage.resultChips(page), [[W.resultAll, 2], [W.resultPending, 0], [W.resultFound, 1], [W.resultMismatch, 0], [W.resultNotFound, 1], [W.resultOutOfScope, 0], [W.resultPendingReview, 0]])
      await expect(rows).toHaveCount(2)
      for (const asset of [assets.component1, assets.component2]) await expect(rows.filter({ hasText: asset.tag })).toHaveCount(1)

      // "ส่งออก ▾" (spec §8): three exports, each of the chosen filters; the Excel one downloads the category's items only.
      await page.getByRole("main").getByRole("button", { name: W.exportMenu, exact: true }).click()
      const items = page.getByRole("menuitem")
      await expect(items).toHaveCount(3)
      for (const item of await items.all()) await expect(item).toContainText(W.exportScope)
      await expect(items.filter({ hasText: W.exportVariance })).toHaveAttribute("href", new RegExp(`[?&]categoryId=${masters.categoryComponent}(?:&|$)`))
      const excel = items.filter({ hasText: W.exportExcel })
      await expect(excel).toHaveAttribute("href", new RegExp(`[?&]categoryId=${masters.categoryComponent}(?:&|$)`))
      await recordSettled(page, measure, "the round's export menu (IT head)")
      const downloading = page.waitForEvent("download")
      await excel.click()
      const download = await downloading
      // The file as downloaded, kept in the report.
      const file = await download.path().catch(() => null)
      if (file) await testInfo.attach(`download ${download.suggestedFilename()}`, { path: file, contentType: "application/octet-stream" })
      expect(download.suggestedFilename(), "an Excel file").toMatch(/\.xlsx$/)
      expect(file, "the download completed").not.toBeNull()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(file ?? "")
      // The "Asset Tag" column (src/lib/audit-excel.ts auditResultColumns), found by its header on the export's one sheet.
      const sheet = workbook.worksheets[0]
      const tagColumn = ((sheet?.getRow(1).values ?? []) as unknown[]).indexOf("Asset Tag")
      expect(tagColumn, "the Asset Tag column").toBeGreaterThan(0)
      const tags: string[] = []
      sheet?.eachRow((row, rowNumber) => {
        if (rowNumber > 1) tags.push(String(row.getCell(tagColumn).value ?? ""))
      })
      expect(tags.sort(), "the category's items only").toEqual([assets.component1.tag, assets.component2.tag].sort())
    })
```

- [ ] **Step 5: Add the viewer's pending list and round page to the rounds list spec**

`e2e/audit/rounds-list.spec.ts`:
- `:1-5` (the header comment): after "…the next step whole, to the scan page for IT staff and to the pending list for a viewer;" insert "the viewer's pending list counts the room's items and offers no scan or not-found, and the viewer's round page opens the pending list (group 2 spec §8, §9);". The rest stays.
- After `:11` add:

```ts
import * as pending from "./pending-steps.ts"
import * as roundPage from "./round-page-steps.ts"
import { ROUND_PAGE_WORDS as P } from "./round-page-words.ts"
```

- `:16`: `test.setTimeout(180_000)` becomes `test.setTimeout(240_000)`.
- `:20` becomes `const assets = await createAssets(page, choices, roomId, [`${prefix}-A1`, `${prefix}-A2`])`.
- After `:98` (`await page.waitForURL(`**/th/audit/rounds/${round.id}/pending**`)`):

```ts
    // The pending list as the viewer (group 2 spec §9, §13 bug 14, P2-R7): the title and the room chip count the round's
    // two items, the rows show them with a way to the asset (the name on the desktop, whose whole row opens it too,
    // P2-R28; "ดูทรัพย์สิน" on the phone card), and nothing scans or records.
    await measure.recordPage("pending list (viewer)")
    await expect(page.getByRole("heading", { level: 1, name: fillTemplate(P.pendingTitle, { count: 2 }) })).toBeVisible()
    await pending.expectRoomChips(page, 2, { [roomId]: 2 }, "all")
    await expect(pending.pendingRows(page, e2eDevice, prefix)).toHaveCount(2)
    for (const asset of assets) {
      const assetLink = pending.pendingEntry(page, e2eDevice, asset.assetTag).getByRole("link", { name: e2eDevice === "phone" ? P.viewAsset : asset.name, exact: true })
      await expect(assetLink).toHaveAttribute("href", new RegExp(`^/th/assets/${asset.id}(?:[?#]|$)`))
    }
    await expect(page.getByRole("main").getByRole("button", { name: P.markNotFound, exact: true })).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("link", { name: P.scanThis, exact: true })).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("link", { name: new RegExp(`^${W.continueScan}`) })).toHaveCount(0)
    await expect(page.locator('main a[href*="/scan"]').filter({ visible: true })).toHaveCount(0)

    // The round page as the viewer (P2-R7): its next step opens the pending list; no scan link, no export or อื่น ๆ menu.
    await measure.visit(`/th/audit/rounds/${round.id}`, "round page (viewer)")
    await expect(roundPage.nextStepCard(page).getByRole("link", { name: nextName, exact: true })).toHaveAttribute("href", pendingHref)
    await expect(page.locator('main a[href*="/scan"]').filter({ visible: true })).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("button", { name: P.exportMenu, exact: true })).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("button", { name: P.more, exact: true })).toHaveCount(0)
```

`:100-112` (the IT head's cancel and the ยกเลิก tab) stay.

- [ ] **Step 6: Run the guard tests to see them pass**

Run: `node --test tests/e2e-audit.test.ts tests/e2e-audit-rounds.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no errors (tsconfig `include` covers `e2e/` and `tests/`).

- [ ] **Step 7: Rewrite these pins**

Each is written in Step 1. Only the two below are rewritten; the rest are additions:
- `tests/e2e-audit.test.ts:176`. It was `room.includes("pending.markNotFound(page, e2eDevice, assets.notFound.tag")`. Now it is the five assertions of Step 1: the `notFound` asset, the call with it, and the room chips before and after.
- `tests/e2e-audit.test.ts:213`. It was `own.includes(thai("auditRound").closeSeparateApprover)` ("ผู้ปิดรอบต้องไม่ใช่ผู้สร้างรอบ"). Now it is the four assertions of Step 1: the opener's sentence in the card, no close before step 3, the cancel through "อื่น ๆ", and the room chips. `closeSeparateApprover` may stay as the fourth close condition's label (Task 4). The E2E no longer reads it, because the card may list it whatever the viewer.

- [ ] **Step 8: Write the docs**

`docs/99_CHANGELOG.md`: a new `## 2026-10-27` heading above `## 2026-10-26` (`:7`), with this entry under it. Use the commit date instead if it is later.

```md
## 2026-10-27

### หน้ารอบตรวจและรายการรอตรวจ (กลุ่มหน้า 2 แผน 2)

Branch `feat/group2-audit-round-page` (จาก `master` `f8269894`) · spec `docs/superpowers/specs/2026-10-26-page-group-2-audit-design.md` (§5, §8, §9, §13, §15, §16) · plan `docs/superpowers/plans/2026-10-27-group2-audit-round-page.md`

- **หน้ารอบตรวจ:**
  - หัวหน้ามีเส้นทาง "รอบตรวจนับ › AUD-…" ชื่อรอบ สถานะ เลขรอบ ช่วงวันที่ "เหลือ / เลยกำหนด N วัน" และ "เปิดโดย …"
  - ปุ่ม "ส่งออก ▾" มี Excel ผลตรวจ PDF และรายงานผลต่าง ทั้งหมดตามตัวกรองที่เลือก แสดงเฉพาะผู้มีสิทธิ์ส่งออก
  - "อื่น ๆ ▾" มี "ยกเลิกรอบตรวจ" แทนแผงยกเลิกเดิม
  - การ์ด "ขั้นถัดไป" 3 ขั้น (เดินตรวจ / หัวหน้า IT พิจารณา / ปิดรอบ) แทนกล่องจำนวน 4 ช่องและแถบความคืบหน้า
    - มีเงื่อนไขปิดรอบครบ 4 ข้อ
    - ปุ่ม "ปิดรอบตรวจ" อยู่ในการ์ดเมื่อถึงขั้นที่ 3
    - ผู้เปิดรอบเห็น "ผู้เปิดรอบปิดรอบเองไม่ได้ ให้หัวหน้าคนอื่นปิด"
    - ปุ่มหลักเป็น "เดินตรวจต่อ (N)" (ไปหน้าสแกนสำหรับผู้มีสิทธิ์ตรวจ ไปรายการรอตรวจสำหรับคนอื่น) แล้ว "พิจารณา N รายการ"
    - ขั้นพิจารณา "รอ n · พิจารณาแล้ว m" นับรายการไม่ตรง เท่ากับหน้ารายการไม่ตรงที่ลิงก์เปิด
  - การ์ดผลตรวจมี พบตรง / ไม่ตรง / ไม่พบ / รอตรวจ รวมกันเท่ากับรายการของรอบ และ "พบเพิ่มนอกขอบเขต N" แยกไว้
  - การ์ด "ไม่ตรงเรื่องอะไร"
    - แถบ ที่ตั้ง / แผนก / ผู้ถือครอง / สภาพ นับรายการที่มีรายการไม่ตรงรอพิจารณาหรืออนุมัติแล้ว ไม่นับที่ปฏิเสธ
    - บรรทัด "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง"
    - "รูปหลักฐาน: มี x จาก y ที่ตรวจแล้ว"
    - "เครื่องที่ส่วนควบไม่ครบ N"
- **รายการผลตรวจ:**
  - ชิปผล ทั้งหมด / รอตรวจ / พบตรง / ไม่ตรง / ไม่พบ / นอกขอบเขต / รอพิจารณา จำนวนนับตามตัวกรองอื่น
  - ชิปหมวดหมู่ 6 อันดับแรกกับ "อื่น ๆ" นับตามผลที่เลือก ซ่อนเมื่อมีหมวดหมู่เดียว
  - ตัวกรองที่ล้างได้ บริษัท สาขา หมวดหมู่ เรื่องที่ไม่ตรง และ "ส่วนควบไม่ครบ"
  - ค้นหาด้วยรหัส ชื่อ และห้องตามระบบ
  - คอลัมน์ ผล / ทรัพย์สิน / สิ่งที่ต่าง (ตามระบบ → ที่พบ) / ตรวจโดย / รูป / พิจารณา
  - "แก้ไขผลตรวจ" อยู่ใน ⋯ และไม่มีในแถวนอกขอบเขต
  - เครื่องที่ส่วนควบไม่ครบบอก "ไม่พบ: ชื่อ (รหัส)" รหัสเปิดแถวของส่วนควบในหน้าเดียวกัน
  - ลิงก์ การแบ่งหน้า และไฟล์ส่งออกใช้ตัวกรองชุดเดียวกัน
  - ลิงก์เดิม `result=wrong_*` ยังเปิดได้ เป็นตัวกรองเรื่องที่ไม่ตรง
- **รายการรอตรวจ:**
  - หัวข้อ "รายการรอตรวจ N รายการ" นับทั้งรอบ
  - เส้นทาง "รอบตรวจนับ › AUD-… › รายการรอตรวจ" สถานะ เลขรอบ "ตรวจแล้ว x / y" "เหลือ N วัน" และ "เดินตรวจต่อ (N)"
  - ชิปห้อง "ทุกห้อง N" ตามด้วย 6 ห้องที่ค้างมากที่สุดและ "อื่น ๆ" นับตามห้องตามระบบ ห้องที่เลือกยังแสดงแม้เหลือ 0
  - แถวและการค้นหาใช้ห้องและผู้ถือครองตามระบบของรายการ
  - "ตรวจล่าสุด" อ่านผลตรวจล่าสุดของทรัพย์สินจากรายการตรวจ ด้วยกฎเดียวกับหน้าทรัพย์สิน (`src/lib/latest-audit-result-rules.ts`) แสดงวันที่และเวลา
  - "สแกนรายการนี้" และ "บันทึกไม่พบ" อยู่บนแถว แถวและชื่อยังเปิดหน้าทรัพย์สิน
  - หน้าต่างบันทึกไม่พบบอกชื่อ รหัส ห้อง และผู้ถือครอง พร้อม "รายการนี้จะออกจากรอตรวจ และส่งให้หัวหน้า IT พิจารณา ทะเบียนยังไม่เปลี่ยน"
- **ที่แก้:**
  - ปุ่ม "ปิดรอบตรวจ" ล้นกรอบ
  - รายการไม่ตรงเรื่องแผนกและของส่วนควบไม่อยู่ในกล่องใด ตัวเลขจึงรวมกันไม่ลงตัว
  - "ยังไม่มีรูป" นับรายการที่ยังไม่ตรวจ
  - ช่องค้นหาไม่ค้นห้อง
  - "รายงาน Variance" เป็นภาษาอังกฤษ (เปลี่ยนเป็น "รายงานผลต่าง")
  - รายการรอตรวจกรองด้วยห้องตามระบบ แต่แสดงและค้นด้วยห้องปัจจุบัน
  - "ตรวจล่าสุด" ในรายการรอตรวจขึ้น "ยังไม่เคยตรวจ" กับทรัพย์สินที่ตรวจพบตรงในรอบก่อน เพราะการสแกนที่พบตรงไม่บันทึกประวัติการเคลื่อนไหว
  - ผู้ดูอย่างเดียวเห็นปุ่มสแกนและปุ่มบันทึกไม่พบที่ API ไม่ยอมรับ
  - หน้าต่างบันทึกไม่พบไม่บอกว่าเป็นทรัพย์สินไหน
  - `locationId` ที่ไม่รู้จักแสดงรหัสดิบ
  - รอบที่มีเกินราว 2,100 รายการเปิดหน้ารอบไม่ได้ เพราะรายการรูปไม่แบ่งชุด
  - การแบ่งหน้าของผลตรวจซ้ำหรือหายรายการ เพราะเรียงโดยไม่มี `id` ต่อท้าย
  - "ผู้ตรวจสอบ" เปลี่ยนเป็น "ผู้พิจารณา"
- **นอกขอบเขต:**
  - นับและแสดงจากรายการตรวจ (`auditResult: "out_of_scope"`) แทนประวัติสแกน ทั้งหน้ารอบ รายการรอบ Excel PDF และรายงานผลต่าง
  - ใช้ตัวกรองบริษัท สาขา หมวดหมู่ และคำค้นได้แล้ว
  - รายงานผลต่างใช้ตัวกรองที่เลือก นับเฉพาะรายการของรอบ และนับแผนแก้ไขสถานะเสร็จแล้วเป็นแผนที่ค้าง
  - มุมมองงาน "รอพิจารณา" ของรายการรอบเปลี่ยนชื่อเป็น "มีรายการรอพิจารณา"
- **E2E:**
  - `e2e/audit/field-audit.spec.ts`:
    - เปิดหน้าสแกนจาก "เดินตรวจต่อ (7)" ในการ์ดขั้นถัดไป
    - ขั้นใหม่ เจ้าหน้าที่ IT อ่านหน้ารอบหลังเดินตรวจ:
      - จำนวนของชิปผลแต่ละอันเท่ากับแถวที่เปิด (ทั้งหมด 7 = พบตรง 4 + ไม่ตรง 1 + ไม่พบ 2 + รอตรวจ 0 · นอกขอบเขต 1 · รอพิจารณา 4)
      - ชิปหมวดหมู่นับตามผลที่เลือก
      - การ์ดขั้นถัดไปบอก "รอ 5" และ "พิจารณา 5 รายการ" ไปหน้ารายการไม่ตรงของรอบ
      - แถบแผนกและแถบสภาพเท่ากับแถวที่เปิด
      - "ส่วนควบไม่ครบ" แสดงเครื่องหลักครั้งเดียว พร้อมชื่อส่วนควบที่ไม่พบ
    - รายการรอตรวจ:
      - ชิปห้องเท่ากับแถว
      - ห้องที่เลือกยังอยู่เมื่อเหลือ 0
      - หน้าต่างบันทึกไม่พบบอกชื่อ รหัส ห้อง และ "ไม่มีผู้ถือครอง"
    - หัวหน้า IT ปิดรอบจากปุ่มที่อยู่ในกรอบการ์ดขั้นถัดไป
    - รอบของหัวหน้า IT เอง: การ์ดบอก "ผู้เปิดรอบปิดรอบเองไม่ได้ ให้หัวหน้าคนอื่นปิด" และยกเลิกผ่าน "อื่น ๆ"
    - หลังพิจารณา แถบสภาพที่ถูกปฏิเสธหายไป และเมื่อเลือกหมวดหมู่ ชิปผล แถว และไฟล์ Excel เหลือเฉพาะหมวดหมู่นั้น
    - เจ้าหน้าที่ IT ไม่เห็น "ส่งออก" บนหน้ารอบ
  - `e2e/audit/rounds-list.spec.ts`: ผู้ดูอย่างเดียวเห็นรายการรอตรวจโดยไม่มีปุ่มสแกน ปุ่มบันทึกไม่พบ หรือ "เดินตรวจต่อ" และ "เดินตรวจต่อ (2)" บนหน้ารอบพาไปรายการรอตรวจ
  - "ส่วนควบของ …" ในหน้ารายการไม่ตรงเป็นงานของแผน 4
- **deploy:**
  - ยังไม่ deploy · ไม่มี migration
  - SELECT แบบอ่านอย่างเดียวที่อยู่ใน `docs/08_PRODUCTION_READINESS.md` (รอบใดมีของนอกขอบเขตที่มีแค่ในประวัติสแกนหรือที่สแกนซ้ำ ซึ่งจะหายจากตัวเลขนอกขอบเขตหลัง deploy) รันบน Production แล้วเมื่อ 2026-10-27 ตามที่ผู้ใช้ขอ ได้ 0 แถว และไม่มีประวัติสแกนที่ไม่มีรหัสรายการเลย จึงไม่มีตัวเลขนอกขอบเขตของรอบใดเปลี่ยน · รันซ้ำก่อน deploy เฉพาะเมื่อมีการสแกนนอกขอบเขตบน Production หลังวันนั้น
  - รอบ `AUD-2026-0002` ยกเลิกผ่าน "อื่น ๆ" → "ยกเลิกรอบตรวจ" ตามแผน 1 ไม่รัน SQL
```

The controller adds the "ผล E2E" bullet after the targeted run (Step 11), between "E2E" and "deploy". Do not write a placeholder.

`docs/07_UAT_CHECKLIST.md` (each stays a `- [ ] ` item):
- `:302`: replace "mark the only item of the last page "บันทึกไม่พบ" (⋯ on desktop) and confirm the list lands on the new last page and the count box drops by one" with "mark the only item of the last page with the row's "บันทึกไม่พบ" and confirm the list lands on the new last page and the title "รายการรอตรวจ N รายการ" drops by one". The rest stays.
- `:303`: replace "the count box of `/th/audit/rounds/<id>/pending` counts every pending item (more than 200 when the round has more)" with "the title of `/th/audit/rounds/<id>/pending` counts every pending item of the round (more than 200 when the round has more), and "ทุกห้อง N" equals the pager total". The rest stays.
- `:304`: replace "do the same with ⋯ → "บันทึกไม่พบ" (focus returns to ⋯)" with "do the same with the row's "บันทึกไม่พบ" (focus returns to it)". The rest stays.
- A new section after Audit Rounds B UAT (`:390`), before `## Sign-Off` (`:392`):

```md
## Audit Round B UAT (2026-10-27)

The automated suite covers the round page and the pending list in all four projects (`e2e/audit/`): the chips against their rows, the field bars, "ส่วนควบไม่ครบ", the close inside the next-step card, the opener's sentence, the cancel in "อื่น ๆ", the room chips, the not-found dialog, the viewer's controls and the Excel export of a category. A person still checks:

- [ ] On a copy of Production data, open `AUD-2026-0002` (1,509 items) before it is cancelled. Confirm:
  - the round page opens;
  - the result card's four numbers add up to the round's items, with "พบเพิ่มนอกขอบเขต N" apart;
  - "รูปหลักฐาน: มี x จาก y ที่ตรวจแล้ว" counts only checked items;
  - Excel ผลตรวจ, PDF and รายงานผลต่าง download with a category, a company and a search chosen, each with the same rows as the page.
- [ ] The next-step card at each step of a real round:
  - the detail lines;
  - "แผนแก้ไขค้าง x" opening the open action plans;
  - "ปิดรอบตรวจ" inside the card at 1280 and 1440 with the sidebar open and closed;
  - a closed round reads complete;
  - a cancelled round shows its cancel details (time, by whom, reason) and no card.
- [ ] From the dashboard's company and branch links, the company and branch chips stay beside the category chip, and each result chip's count equals its rows.
- [ ] On a round with more than six categories, "อื่น ๆ" lists the rest, and a chosen category outside the six stays as its own chip.
- [ ] Old links: `?result=wrong_location`, `wrong_custodian` and `wrong_condition` open the matching field filter.
- [ ] Search by a room's code and by its name, on ทั้งหมด and on นอกขอบเขต.
- [ ] "ส่วนควบไม่ครบ" on real parents (for example a notebook with a missing adapter): the parent listed once, every missing component named, and each code opening that component's row.
- [ ] Pending list:
  - more than six rooms ("อื่น ๆ" opens the rest);
  - the chosen room kept at 0 after its last item;
  - `?locationId=<unknown>` goes back to all rooms and never shows a raw id;
  - after a move during the round, a search by the expected room and by the expected custodian finds the item;
  - the not-found dialog on a phone;
  - an asset found in place in an earlier round shows that scan's date and time under ตรวจล่าสุด, the same as its asset page, and an asset never checked reads "ยังไม่เคยตรวจ";
  - a viewer sees no scan, not-found or "เดินตรวจต่อ".
- [ ] NVDA:
  - the chips read their counts;
  - the filter chips read "ล้างตัวกรองนี้: …";
  - the steps read their state;
  - "ส่งออก" and "อื่น ๆ" open their menus and focus comes back after the cancel dialog.
- [ ] Both themes on a real monitor and phone.
- [ ] An English pass of the new messages.
```

`docs/06_WORKFLOWS.md`, "Audit Counting":
- `:69` becomes:

  - Every count of a round counts its own items only (`src/lib/audit-round-counts-rules.ts`, `getAuditRoundCounts`).
    - An out-of-scope find is an `AuditItem` with `auditResult: "out_of_scope"`. It is counted apart, from those items and never from the scan history. This holds on the round page, the rounds list, the Excel and PDF exports and the variance report (page group 2 plan 2).
    - พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = the round's items. A checked item with no result counts as ไม่ตรง.
    - Old `draft` rounds read as open everywhere, with no data update.

- After `:69` add two lines:

  - The round page (`/audit/rounds/{id}`, page group 2 plan 2) opens with:
    - **The header:**
      - the trail, status, number, dates, "เหลือ / เลยกำหนด N วัน" and "เปิดโดย …";
      - "ส่งออก ▾" for `audit:export`;
      - "อื่น ๆ ▾" with "ยกเลิกรอบตรวจ" for `audit:approve`.
    - **The next-step card:**
      - เดินตรวจ / หัวหน้า IT พิจารณา / ปิดรอบ, with the four close conditions;
      - "ปิดรอบตรวจ" sits in the card at step 3;
      - the opener reads "ผู้เปิดรอบปิดรอบเองไม่ได้ ให้หัวหน้าคนอื่นปิด".
    - **The round-wide cards:** the result card and "ไม่ตรงเรื่องอะไร".
    - **The result list:**
      - One filter state, `parseAuditRoundListFilters` in `src/lib/audit-round-result-filters.ts`, holds:
        - `result=all|pending|found|mismatch|not_found|out_of_scope|pending_review`;
        - `categoryId` (or `other`);
        - `field=location|department|custodian|condition`;
        - `components=missing`;
        - `companyId`, `branchId` and `search`.
      - It builds the list's where (`buildAuditRoundItemWhere`, one `AND` list) and every link, page and export (`buildAuditRoundPageHref`).
      - Each chip counts within the other filters.
      - The search matches the code, the name and the item's expected room.
      - Old `result=wrong_*` links open the field filter.
  - The pending list (`/audit/rounds/{id}/pending`):
    - It reads the item's expected room and custodian for its rows, its search and its room chips:
      - "ทุกห้อง N";
      - the six rooms with the most pending items;
      - "อื่น ๆ", which is `locationId=other`.
    - The chosen room stays, even at 0. An unknown `locationId` goes back to all rooms.
    - "สแกนรายการนี้" and "บันทึกไม่พบ" sit on each row, for `audit:edit` only.
    - The not-found dialog names the asset. It says the item leaves the pending list for the IT head's decision, and the register stays as it is.

`DEVELOPER_HANDOFF.md`:
- After `:57` add:

  - Audit round page and pending list (page group 2 plan 2):
    - One filter state serves the round page's list, links and exports: `parseAuditRoundListFilters`, `buildAuditRoundItemWhere` and `buildAuditRoundPageHref` in the pure `src/lib/audit-round-result-filters.ts`.
    - One server reader loads the page: `getAuditRoundPageData`, `src/lib/audit-round-page-data.ts`.
    - The next-step card holds the close.
    - Out-of-scope finds are counted and listed from their items everywhere; the scan history feeds no count.
    - The pending list reads the item's expected room and custodian. It hides scan and not-found without `audit:edit`.
    - ตรวจล่าสุด (the pending list and the asset page) reads one rule: the asset's latest audit result, `src/lib/latest-audit-result-rules.ts`.

- After `:1200` (the plan 1 bullet), one bullet. Write the commit date where it says so:

  - Page group 2, plan 2: the round page and the pending list.
    - The commit date, branch `feat/group2-audit-round-page`. Not deployed, no migration. Plan `docs/superpowers/plans/2026-10-27-group2-audit-round-page.md`.
    - Canvas B for `/audit/rounds/{id}` and `/audit/rounds/{id}/pending` (spec §8, §9; bugs 2 and 9-16).
    - **Filters:**
      - one filter state and where for the list, the chips, the paging and the three exports: `src/lib/audit-round-result-filters.ts`;
      - each filter in one `AND` list;
      - category `other` = not one of the six shown;
      - the room search through a chunked location lookup.
    - **Out-of-scope:** the finds moved onto their items for every reader. The rounds list's insight reads `counts.outOfScope`. The scan-history helpers are gone.
    - **Variance report:** follows the filters, counts own items, and counts `done` action plans as open.
    - **ID lists:** the attachment and reference-label IN lists are chunked (`chunkAuditIds`), and lists order with an `id` tie-break.
    - **ตรวจล่าสุด:** the pending list moved from audit movements to the asset page's rule, now one copy in `src/lib/latest-audit-result-rules.ts`, read in one query for the page's assets (user decision 2026-10-27).
    - **E2E:**
      - the round page and pending steps in `e2e/audit/field-audit.spec.ts`;
      - their helpers in `e2e/audit/round-page-steps.ts` and `e2e/audit/round-page-words.ts`;
      - the viewer's pending list and round page in `e2e/audit/rounds-list.spec.ts`.
    - **Deploy note:**
      - the read-only SELECT in `docs/08_PRODUCTION_READINESS.md` was run on Production on 2026-10-27 at the user's request: 0 rows, and no scan history without an item id, so no round's นอกขอบเขต number changes; re-run it before the deploy only if out-of-scope scans happen on Production before then;
      - `AUD-2026-0002` is cancelled through "อื่น ๆ" → "ยกเลิกรอบตรวจ".

`docs/08_PRODUCTION_READINESS.md`:
- `:104`: replace "through the round page ("ยกเลิกรอบตรวจ" with a reason)" with "through the round page ("อื่น ๆ" → "ยกเลิกรอบตรวจ" with a reason; the cancel moved into that menu in page group 2 plan 2)". The rest stays.
- After `:104` add:

```md
- [x] Before deploying page group 2 plan 2, this read-only SELECT was run on Production (`asset_management`) on 2026-10-27, by the controller at the user's request. Result: 0 rows, and 0 scan-history rows with no item id at all, so no round's นอกขอบเขต number changes on Production. Nothing was written.
  - **Re-run** it, read-only, before the deploy only if out-of-scope scans happen on Production before then, and keep that result with the deploy notes.
  - **Why the counts change:** from plan 2, every out-of-scope count reads the audit items with `auditResult = 'out_of_scope'`, never the scan history.
  - **historyOnly:** finds saved before 2026-05-18 (`9b7a580e`) exist only as scan history (`auditItemId` NULL, no audit item).
  - **rescanned:** finds whose asset was scanned again inside the round; their item now counts as the round's own.
  - **What leaves:** both kinds leave that round's นอกขอบเขต number on the round page and the rounds list. The scan history itself stays.
  - **If a listed round is still open** (`open` or `draft`), tell the IT head before the deploy.

  ```sql
  SELECT r.auditNo, r.status,
    SUM(CASE WHEN i.id IS NULL THEN 1 ELSE 0 END) AS historyOnly,
    SUM(CASE WHEN i.id IS NOT NULL AND (i.auditResult IS NULL OR i.auditResult <> 'out_of_scope') THEN 1 ELSE 0 END) AS rescanned
  FROM audit_scan_history h
  JOIN audit_rounds r ON r.id = h.auditRoundId
  LEFT JOIN audit_items i ON i.auditRoundId = h.auditRoundId AND i.assetId = h.assetId
  WHERE h.auditItemId IS NULL
  GROUP BY r.auditNo, r.status
  HAVING SUM(CASE WHEN i.id IS NULL OR i.auditResult IS NULL OR i.auditResult <> 'out_of_scope' THEN 1 ELSE 0 END) > 0
  ORDER BY r.auditNo;
  ```
```

`docs/11_FEATURE_LIST.md`:
- `:196` second cell becomes "Mark pending items as not found from the pending list without changing asset status to Lost automatically. The list pages on the server (25/50/100), titles itself with the round's pending count, and counts and searches by the item's expected room and custodian, with room chips ("ทุกห้อง", the six largest, "อื่น ๆ"). For `audit:edit` only, each row offers "สแกนรายการนี้" and "บันทึกไม่พบ"; the dialog names the asset. ตรวจล่าสุด shows the asset's latest audit result with its time, as the asset page does. Marking the last item of the last page lands on the new last page."
- `:202` second cell becomes "The round page's next-step card lists the close API's four conditions and holds "ปิดรอบตรวจ" at step 3; the opener is told they cannot close."
- `:248` second cell becomes "Audit round results Excel/PDF and the variance report (รายงานผลต่าง), each following the round page's filters (result, category, field, components, company, branch, search); findings Excel/PDF exports"

- [ ] **Step 9: Run the whole unit suite, the types and the lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. This includes:
- the two guard files;
- the docs pins: no template marker, and each changelog entry keeps its date heading;
- `tests/audit-round-cancellation.test.ts:144-157`;
- `tests/e2e-review.test.ts`: no DELETE and no hazard in the new e2e files.

- [ ] **Step 10: Commit**

```bash
git add e2e/audit/round-page-words.ts e2e/audit/round-page-steps.ts e2e/audit/pending-steps.ts e2e/audit/field-audit.spec.ts e2e/audit/rounds-list.spec.ts tests/e2e-audit.test.ts tests/e2e-audit-rounds.test.ts docs/99_CHANGELOG.md docs/07_UAT_CHECKLIST.md docs/06_WORKFLOWS.md DEVELOPER_HANDOFF.md docs/08_PRODUCTION_READINESS.md docs/11_FEATURE_LIST.md
git commit -m "test(e2e): the audit steps read the new round page (chips equal rows, field bars, components missing, the close in the next-step card, the cancel in อื่น ๆ, the Excel of a category) and pending list (room chips, the dialog names the asset, nothing for a viewer), and the docs record the plan with the Production SELECT and its 2026-10-27 result (group 2 plan 2 task 7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 11 (the controller, not the implementer): the plan's targeted E2E run**

The run needs the VPN, `scratchpad/stay-awake.ps1` and a clean build. Before it, the controller probes the database (`scratchpad/e2e-plan/tools/select-e2e-counts.cjs`) and runs `rm -rf .next && npm run build`.

Run: `npx playwright test e2e/audit e2e/smoke e2e/dashboard e2e/asset-detail e2e/cross-cutting/roles.spec.ts e2e/cross-cutting/reports.spec.ts e2e/cross-cutting/field-errors.spec.ts e2e/disposal/open-audit-block.spec.ts`

Expected: every test passes in all four projects (the setup project runs first). Why each one is in the run:
- `e2e/audit`: the round page, the pending list and the viewer.
- `e2e/smoke`: the cadence.
- `e2e/dashboard`: the round KPI's link to the round page.
- `e2e/asset-detail`: it opens the round page from the fact strip.
- `roles`: the viewer's lists.
- `reports` (M1): IT staff on any round page, with no export anchor.
- `field-errors`: it lands on the round page after a create.
- `open-audit-block`: it creates and cancels a round through the API.

The whole suite runs once after plan 4 (spec §16, §17).

Afterwards the controller adds the "ผล E2E" bullet to the changelog entry (run id, passed / failed per project) and the run id to the handoff bullet, in one commit on `feat/group2-audit-round-page`. It then updates the AssetSystem wiki (`ams-status`, `ams-log`, and `ams-open-questions`: the Production SELECT is answered, run 2026-10-27 with 0 rows, re-run only if out-of-scope scans happen on Production before the deploy; the pending list's ตรวจล่าสุด now reads audit items).

---

## Appendix: Rulings

Rulings bind the tasks. Where a task and a ruling disagree, the ruling wins; where a ruling and the spec disagree, the spec wins and the controller rules again. Plan 1's R1-R35 stand unless replaced here.

- P2-R1: Field bars count findings `pending` or `approved`; `exception` and every `rejected` (system rejections included) are left out of the bars. Step 2's "พิจารณาแล้ว" is P2-R26's findings count (findings decided by a person); this ruling's earlier item count is replaced by P2-R26.
- P2-R2: A checked own item with a null result counts as ไม่ตรง, in the fold and in the `mismatch` where (`OR` branch), so พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด always.
- P2-R3: "รอพิจารณา" counts items (the list's where), not findings. The close checklist keeps the API's finding count.
- P2-R4: Out-of-scope moves onto items now for the round page list, its chip, the rounds list, Excel, PDF and variance. "แก้ไขผลตรวจ" is hidden on out-of-scope rows until plan 3.
- P2-R5: Round-page search matches code, name, and the item's expected room (code or name) through a chunked id lookup in the page/route (RF stays pure).
- P2-R6: The variance export follows the filters, counts own items, and counts `done` plans as open.
- P2-R7: Without `audit:edit`: no scan link, no pending-scan link, no ActionBar scan item, no "แก้ไขผลตรวจ", no pending-list buttons.
- P2-R8: `Steps` draws the three states. Each step's detail line sits under the rail in the same card. The card's main button ("เดินตรวจต่อ (N)", "พิจารณา N รายการ", or at step 3 "ปิดรอบตรวจ") sits in the same card's head as ContentPanel `actions`, never outside the card. Closed round: all steps complete and the card says the round is closed; cancelled round: the card is replaced by the cancel details box.
- P2-R9: The correction history loads for the page's item ids only.
- P2-R10: Pending search and rows use expected room and custodian via chunked id lookups (no raw SQL).
- P2-R11: "อื่น ๆ" is a real filter value (`categoryId=other`, `locationId=other`) meaning "not one of the six shown", counted with the same where; a selected value outside the six stays visible as its own chip. The six are ranked over every result (the same where with no category and `result: "all"`), on the page and in the exports alike. Every chip counts within the result in use, so a ranked category may read 0, and each result chip under อื่น ๆ equals the rows it opens.
- P2-R12: The pending title's N is round-wide; the pagination line counts the filtered rows.
- P2-R13: ตรวจล่าสุด keeps date + time. Its source moves from audit movements to audit items in Task 6 (user decision 2026-10-27, P2-R32).
- P2-R14: Pending rows show both buttons for `audit:edit` (not RowActions' single next slot).
- P2-R15: "ผู้ตรวจสอบ" → "ผู้พิจารณา" (glossary row 11), including `auditRound.resultDashboardHelp`.
- P2-R16: The "ไม่ตรงเรื่องอะไร" card and its "เครื่องที่ส่วนควบไม่ครบ N" line are round-wide; the "ส่วนควบไม่ครบ" chip in the filter row counts within the filters.
- P2-R17: A missing component's tag links the same round page `?search=<tag>` (no audit-item page exists).
- P2-R18: An approved field finding counts under its bar even if the item now reads พบตรง; "บางรายการไม่ตรงมากกว่าหนึ่งเรื่อง" shows when the bars' sum exceeds the distinct items they count.
- P2-R19: A component whose not-found finding was rejected still counts as missing (the result stays ไม่พบ; spec says "result").
- P2-R20: Lists and exports order with an `id` tiebreak; the attachment and reference-label IN lists are chunked.
- P2-R21 (M8): the rounds list's `review` work view reads "มีรายการรอพิจารณา".
- P2-R22: Old `result=wrong_*` URLs keep working as `field=`.
- P2-R23: ไม่ตรง is `result=mismatch`; รอตรวจ is `result=pending`.
- P2-R24: The category chip row hides at ≤ 1 category (§8).
- P2-R25: The room-search lookup `findAuditRoundSearchLocationIds` lives in Task 2 (`src/lib/audit-round-list-lookups.ts`), bounded to the round's own expected rooms (chunked); Task 3 consumes it and writes no room-search file of its own; Task 6 reuses it for the room half of the pending search.
- P2-R26: Step 2 of the next-step card counts findings, so it equals the findings page its button opens: "รอ n" = the round's pending findings (`findings?status=pending&roundId=`), "พิจารณาแล้ว m" = findings decided by a person (system rejections and system closings left out, Task 3's rule); the main button "พิจารณา n รายการ" uses the same n. The "รอพิจารณา" result chip still counts items (P2-R3), because it opens the round page's own list.
- P2-R27: The close checklist moves to `src/lib/audit-round-close.ts` as `getAuditRoundCloseChecklist`; the close route imports it (one copy; routes export only handlers).
- P2-R28: The pending list's rows stay wholly clickable to the asset (Appendix A §9 is binding; the skeleton's "no longer wholly clickable" is withdrawn); the two buttons stop the click from reaching the row.
- P2-R29: The builder's list of the six categories shown is named `shownCategoryIds` in every task (one name, replacing the drafts' others); `categoryId=other` means "not one of `shownCategoryIds`".
- P2-R30: §13 bug 2's second half ("check `ContentPanel`'s actions box for the same squeeze elsewhere") is a check step in Task 4: list every `ContentPanel` with `actions`, and fix only a squeeze found; record the result in the task report.
- P2-R31: The stale `categoryId` redirect (an unknown id, never `other`) is Task 3's, through the shared href builder.
- P2-R32 (user decision 2026-10-27, replacing "keeps its current source"): "ตรวจล่าสุด" on the pending list moves to audit items in Task 6, because a found-in-place scan writes no movement, so an asset checked in an earlier round read "ยังไม่เคยตรวจ". It uses the asset page's rule, one copy in `src/lib/latest-audit-result-rules.ts` that the asset page's frame also reads: the asset's latest audit item with `auditResult` not null, in a round that is `isActive` and not cancelled, ordered `lastScanAt desc, updatedAt desc`, dated `lastScanAt ?? updatedAt`. It loads in one query over the page's asset ids (at most 100), keeps date + time (P2-R13), and an asset with none reads "ยังไม่เคยตรวจ".
- P2-R33: The targeted E2E run adds `e2e/cross-cutting/reports.spec.ts` and `e2e/cross-cutting/field-errors.spec.ts`, which open the round page.
