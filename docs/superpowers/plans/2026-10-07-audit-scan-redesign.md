# Audit Scan Redesign (Round 3 · Part B2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/[locale]/audit/rounds/[id]/scan` so a person walking a room on a phone can check each asset in 2 taps (room list or typed search), correct location/custodian/department in the same sheet, and see other auditors' progress — without reloading the whole round after every save.

**Architecture:** All decisions live in pure functions (`src/lib/audit-scan-session.ts`, `src/lib/audit-scan-rows.ts`) with unit tests. A client workspace holds the round's rows in memory, applies each save result locally, and polls a new `scan-status` endpoint for other people's changes. The 2,065-line `audit-scan-form.tsx` is replaced by single-purpose components; the scan/lookup APIs keep their contracts except two finding fixes and a partial-match lookup.

**Tech Stack:** Next.js 16.2.4 App Router, React 19.2, Tailwind 4, shadcn/ui on `radix-ui` (Sheet, Button, SearchableSelect from part A), next-intl 4 (th/en), Prisma 7.8 (mssql), `node --test` with type stripping.

**Spec:** `docs/superpowers/specs/2026-10-07-audit-scan-redesign-design.md` (commit `4f56bd7` + photo rule amendment in this plan's commit). Read it before each task.

## Global Constraints

- Branch `feat/audit-scan-redesign`. Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase`. Commit only the files your task names.
- Next.js 16.2.4 is not the version in your training data — read `node_modules/next/dist/docs/01-app/...` before using a Next API you have not seen used in this repo.
- Tests: `node --test` with type stripping. Tests **cannot import `.tsx`**; UI tests read source text with regex. Files under `src/lib` that tests import use relative `./x.ts` imports and no `@/`. Use `import type` for type-only imports.
- Every task ends with `npm test`, `npx tsc --noEmit`, `npm run lint` all green (pre-existing lint warnings are fine). Report any failure by name, even one you did not cause.
- **Do not run** `npm ci`, `npm install`, or `npm run build` (a dev server is running).
- Keep each existing file's line endings (check with `file <path>`; many `src/**/*.tsx` are CRLF, some `.ts` are LF). New files: LF. `messages/*.json` are LF — insert keys with the Edit tool after the anchor the task names; never re-serialise the JSON.
- UI rules (enforced by `tests/ui-overlay-guards.test.ts`): no `dark:`; no `window.confirm`; no `fixed inset-0` outside `src/components/ui/` and the shell; no `createPortal`; no `document|window.addEventListener("keydown"|"mousedown"|"pointerdown")`; no `bg-<tone>/NN` tints.
- Touch targets ≥ 44px below `md` (`min-h-11` / `size-11`).
- Overlays only from part A: `@/components/ui/sheet`, `@/components/ui/accessible-dialog`, `@/components/ui/searchable-select`, `@/components/ui/button`. A Sheet must have a Radix Trigger or an explicit focus-return target.
- Status colours via `StatusBadge` (`@/components/ui/status-badge`) tones: found → `success`, mismatch → `warning`, not_found → `danger`, out_of_scope → `info`, queued → `muted`.
- New user-facing copy is Thai-first; add every key to both `messages/th.json` and `messages/en.json` under `auditScan`.
- Field audit rules from the spec (exact values):
  - search starts at **≥ 2** characters (code points), never during IME composition; max **10** in-round results; Enter opens the first result
  - register (out-of-round) partial lookup needs **≥ 3** characters and returns at most **5** matches
  - room list shows **50** rows per "แสดงเพิ่ม"
  - other auditors' changes are pulled every **30 000 ms** while `document.visibilityState === "visible"`, on returning to the tab, on room change, and after each successful save; `since` = previous `serverTime`
  - check defaults: new check → expected values except **location = selected room**; edit (already checked) → saved actual values, never the room; out-of-scope → register values except location = selected room
  - mismatch rules mirror the server: location ignored for `software_license`; custodian compared only for `personal`; department and condition always
  - **photo rule (user decision 2026-10-07):** in-round saves require a photo **only when condition differs**; out-of-scope keeps the server rule (photo required when any field differs)
  - after a successful save: close the sheet, clear + focus the search field if the check started from search, show the saved banner, `navigator.vibrate?.(30)`, **no `router.refresh()`**
  - stale pending findings are closed as `reviewStatus: "rejected"`, `reviewRemark: "ยกเลิกเพราะแก้ผลตรวจ"`
- No database migration. Dev verification uses `asset_management_dev` only.
- Spec §6 lists file and function names as a sketch. Where this plan's names, signatures or file split differ (e.g. `audit-scan-check-form.tsx` + `audit-scan-check-panel.tsx` instead of `audit-scan-check-sheet.tsx`; components section inside the form; `useState` instead of `useReducer`), **this plan wins**. Behaviour still follows the spec.

## Review Focus

Inputs the spec implies but happy-path tests skip; each has a pinning test in the bracketed task:

1. **Another auditor saves the same asset while my sheet is open** → my sheet keeps my values, its status line says "เพิ่งถูกตรวจโดย …", and my save is sent as a correction (`resultCorrection: true`) instead of a silent second scan. [Tasks 2, 8]
2. **The phone goes offline mid-room and I save the same asset twice** → the queue holds one entry for that asset (the newer), rows show "รอส่ง", and reconnecting sends it without a tap. [Tasks 2, 8]
3. **The round is closed by someone else while I am scanning** → saving shows "รอบนี้ถูกปิดแล้ว บันทึกไม่ได้" with a link back, not a generic error or a silent queue. [Task 8]
4. **I edit an earlier result while standing in a different room** → the location stays the saved value; nothing moves the asset to my current room by accident. [Task 2]
5. **A lookup fails for a reason other than "not found"** (403, 500, offline) → the person sees that reason ("ค้นนอกรอบต้องใช้อินเทอร์เน็ต" / the server error), never "ไม่พบรหัสนี้". [Task 6]

---

## File Structure

**Pure (test-importable)**
- `src/lib/audit-scan-session.ts` — row/option types, room list, room options, progress, search + highlight, check mode/defaults/diff/photo rule, department suggestion, latest-value notes, payload mapping, applying save results, merging status updates.
- `src/lib/audit-scan-rows.ts` — maps a Prisma audit-item record to `AuditScanItemRow`.

**Server**
- `src/lib/audit-scan-data.ts` — `auditScanItemSelect`, `loadAuditScanRows(roundId, { since? })`.
- `src/app/api/audit-rounds/[id]/scan-status/route.ts` — new GET.
- Modify `src/app/api/audit-rounds/[id]/scan/route.ts` (stale findings, `scannedByName`), `src/app/api/audit-rounds/[id]/scan-lookup/route.ts` (partial matches), `src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx` (`locationId`), `src/lib/rbac-route-matrix.ts`, `src/lib/audit-options.ts` (employee `departmentId`), `src/lib/audit-offline-queue.ts` (`upsertQueuedAuditScanAsync`).

**UI** (`src/components/audit/`)
- `audit-scan-header.tsx` · `audit-scan-room-picker.tsx` · `audit-scan-room-list.tsx` · `audit-scan-search.tsx` · `audit-scan-lookup-card.tsx` · `audit-scan-camera.tsx` · `audit-scan-check-form.tsx` · `audit-scan-check-field.tsx` · `audit-scan-check-panel.tsx` · `audit-scan-component-missing-dialog.tsx` · `audit-scan-saved-banner.tsx` · `audit-scan-offline-bar.tsx` · `use-audit-scan-room.ts` · `audit-scan-workspace.tsx`
- Keep and trim: `audit-scan-panels.tsx` (only `AuditComponentPanel`, `AuditQrScannerOverlay`, `AuditScanTranslator`), `audit-scan-types.ts`, `audit-scan-helpers.ts` (only what new code imports).
- Delete: `audit-scan-form.tsx`.
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx`.

**Docs** — `docs/18_AUDIT_SCAN_GUIDE_TH.md`, `DESIGN.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` (Task 10). The spec's photo-rule amendment ships in the same commit as this plan.

---

### Task 1: Session helpers — rows, room list, room options, progress, search

**Files:**
- Create: `src/lib/audit-scan-session.ts`
- Test: `tests/audit-scan-session-list.test.ts`

**Interfaces:**
- Consumes: `filterAuditItemsByContext`, `type AuditScanContext` (`src/lib/audit-scan-context.ts`).
- Produces (all exported from `src/lib/audit-scan-session.ts`):
  - constants `auditScanListPageSize = 50`, `auditScanSearchLimit = 10`, `auditScanMinSearchLength = 2`, `auditScanPollIntervalMs = 30_000`
  - types `AuditScanOption = { id: string; label: string }`, `AuditScanEmployeeOption = AuditScanOption & { departmentId: string | null }`, `AuditScanOptions = { locations; departments; employees: AuditScanEmployeeOption[]; conditions }`
  - type `AuditScanItemRow` (fields below), `AuditScanRoom = AuditScanContext`, `AuditScanListTab = "pending" | "checked" | "all"`, `AuditItemBadge = "found" | "mismatch" | "not_found" | "out_of_scope"`
  - `isAuditItemChecked(item)`, `getAuditItemBadge(item): AuditItemBadge | null`, `summarizeProgress(items): { total; checked; mismatched }`
  - `buildRoomList({ items, room, tab, limit, locationLabels }): { rows; total; counts: { pending; checked; all } }`
  - `type AuditRoomOption = { locationId; label; pending; total; departments: Array<{ departmentId; label; total }> }`, `buildRoomOptions(items, locations, departments): AuditRoomOption[]`
  - `type AuditSearchField = "assetTag" | "serialNumber" | "fixedAssetCode" | "name" | "custodian"`, `type AuditSearchMatch = { item; field; value: string; tier: 0 | 1 | 2 }`
  - `isAuditSearchReady(term)`, `searchAuditItems(items, term, custodianLabels, limit?)`, `splitSearchHighlight(value, term): [string, string, string] | null`

- [ ] **Step 1: Write the failing test** — create `tests/audit-scan-session-list.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  auditScanListPageSize,
  buildRoomList,
  buildRoomOptions,
  getAuditItemBadge,
  isAuditSearchReady,
  searchAuditItems,
  splitSearchHighlight,
  summarizeProgress,
  type AuditScanItemRow,
} from "../src/lib/audit-scan-session.ts"

function row(overrides: Partial<AuditScanItemRow> = {}): AuditScanItemRow {
  return {
    itemId: "item-1",
    assetId: "asset-1",
    assetTag: "SNI-EQU-19-0271",
    name: "โน้ตบุ๊ก Dell Latitude 5420",
    serialNumber: "5CD123ABC",
    fixedAssetCode: "FA-0001",
    categoryId: "cat-1",
    ownershipType: "personal",
    expectedLocationId: "loc-1",
    expectedCustodianId: "emp-1",
    expectedDepartmentId: "dept-1",
    expectedConditionId: "cond-good",
    actualLocationId: null,
    actualCustodianId: null,
    actualDepartmentId: null,
    actualConditionId: null,
    auditStatus: "pending",
    auditResult: null,
    lastScanAt: null,
    scannedByName: null,
    currentLocationId: "loc-1",
    currentCustodianId: "emp-1",
    currentDepartmentId: "dept-1",
    componentCount: 0,
    ...overrides,
  }
}

const items: AuditScanItemRow[] = [
  row({ itemId: "i1", assetId: "a1", assetTag: "SNI-EQU-19-0271", expectedLocationId: "loc-1" }),
  row({ itemId: "i2", assetId: "a2", assetTag: "SNI-EQU-22-0310", name: "จอ Dell P2422H", serialNumber: "CN0X", expectedLocationId: "loc-1", auditStatus: "scanned", auditResult: "found", lastScanAt: "2026-10-07T03:00:00.000Z", scannedByName: "วิไล" }),
  row({ itemId: "i3", assetId: "a3", assetTag: "SNI-EQU-21-0102", name: "โน้ตบุ๊ก HP ProBook", serialNumber: "5CD1XYZ", expectedLocationId: "loc-2", expectedDepartmentId: "dept-2" }),
  row({ itemId: "i4", assetId: "a4", assetTag: "SNI-FUR-18-0084", name: "เก้าอี้", serialNumber: null, expectedLocationId: "loc-2", auditStatus: "scanned", auditResult: "wrong_location", lastScanAt: "2026-10-07T04:00:00.000Z" }),
  row({ itemId: "i5", assetId: "a5", assetTag: "SNI-EQU-26-0016", serialNumber: null, expectedLocationId: "loc-2", auditStatus: "reviewed", auditResult: "not_found" }),
]
const labels = new Map([["loc-1", "SNI_FL1 - ห้อง IT"], ["loc-2", "SNI_FL2 - บัญชี"]])

test("badges and progress follow the saved audit result", () => {
  assert.equal(getAuditItemBadge(items[0]), null)
  assert.equal(getAuditItemBadge(items[1]), "found")
  assert.equal(getAuditItemBadge(items[3]), "mismatch")
  assert.equal(getAuditItemBadge(items[4]), "not_found")
  assert.equal(getAuditItemBadge(row({ auditStatus: "reviewed", auditResult: "out_of_scope" })), "out_of_scope")
  assert.equal(getAuditItemBadge(row({ auditStatus: "scanned", auditResult: "confirmed_with_parent" })), "found")
  assert.deepEqual(summarizeProgress(items), { total: 5, checked: 3, mismatched: 1 })
})

test("the room list shows the selected room, splits pending and checked, and counts all three tabs", () => {
  const pending = buildRoomList({ items, room: { locationId: "loc-1", departmentId: "" }, tab: "pending", limit: 50, locationLabels: labels })
  assert.deepEqual(pending.rows.map((item) => item.itemId), ["i1"])
  assert.deepEqual(pending.counts, { pending: 1, checked: 1, all: 2 })

  const checked = buildRoomList({ items, room: { locationId: "loc-2", departmentId: "" }, tab: "checked", limit: 50, locationLabels: labels })
  assert.deepEqual(checked.rows.map((item) => item.itemId), ["i4", "i5"], "checked rows show the most recent first, unsaved times last")

  const department = buildRoomList({ items, room: { locationId: "loc-2", departmentId: "dept-2" }, tab: "all", limit: 50, locationLabels: labels })
  assert.deepEqual(department.rows.map((item) => item.itemId), ["i3"])
})

test("without a room the list covers the whole round ordered by place then tag, and respects the page limit", () => {
  const all = buildRoomList({ items, room: { locationId: "", departmentId: "" }, tab: "pending", limit: 50, locationLabels: labels })
  assert.deepEqual(all.rows.map((item) => item.itemId), ["i1", "i3"])

  const many = Array.from({ length: 120 }, (_, index) => row({ itemId: `m${index}`, assetTag: `TAG-${String(index).padStart(3, "0")}` }))
  const firstPage = buildRoomList({ items: many, room: { locationId: "", departmentId: "" }, tab: "pending", limit: auditScanListPageSize, locationLabels: labels })
  assert.equal(firstPage.rows.length, 50)
  assert.equal(firstPage.total, 120)
})

test("room options list only places that have items, with pending counts and their departments", () => {
  const options = buildRoomOptions(items, [{ id: "loc-1", label: "SNI_FL1 - ห้อง IT" }, { id: "loc-2", label: "SNI_FL2 - บัญชี" }, { id: "loc-9", label: "ว่าง" }], [{ id: "dept-1", label: "D01 - ไอที" }, { id: "dept-2", label: "D02 - บัญชี" }])

  assert.deepEqual(options.map((option) => [option.locationId, option.pending, option.total]), [["loc-1", 1, 2], ["loc-2", 1, 3]])
  assert.deepEqual(options[1].departments.map((department) => [department.departmentId, department.total]), [["dept-1", 2], ["dept-2", 1]])
})

test("search needs two characters and ranks exact codes, then prefixes, then contains, pending first", () => {
  const custodians = new Map([["emp-1", "E0412 - สมชาย ใจดี"]])
  assert.equal(isAuditSearchReady("5"), false)
  assert.equal(isAuditSearchReady("โน"), true)
  assert.deepEqual(searchAuditItems(items, "5", custodians), [])

  const serial = searchAuditItems(items, "5CD1", custodians)
  assert.deepEqual(serial.map((match) => [match.item.itemId, match.field, match.tier]), [["i1", "serialNumber", 1], ["i3", "serialNumber", 1]])

  const exact = searchAuditItems(items, "sni-equ-22-0310", custodians)
  assert.deepEqual(exact.map((match) => [match.item.itemId, match.tier]), [["i2", 0]])

  const byName = searchAuditItems(items, "สมชาย", custodians)
  assert.equal(byName[0].field, "custodian")

  const ranking = searchAuditItems(items, "SNI-EQU", custodians)
  assert.deepEqual(ranking.map((match) => match.item.itemId), ["i1", "i3", "i2", "i5"], "pending before checked within one tier")
})

test("search returns at most ten results", () => {
  const many = Array.from({ length: 30 }, (_, index) => row({ itemId: `m${index}`, assetTag: `ROOM-${index}` }))
  assert.equal(searchAuditItems(many, "ROOM", new Map()).length, 10)
})

test("highlight splits the first case-insensitive match", () => {
  assert.deepEqual(splitSearchHighlight("5CD123ABC", "cd1"), ["5", "CD1", "23ABC"])
  assert.equal(splitSearchHighlight("ABC", "zz"), null)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test tests/audit-scan-session-list.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/audit-scan-session.ts'`.

- [ ] **Step 3: Create `src/lib/audit-scan-session.ts`**

```ts
import { filterAuditItemsByContext, type AuditScanContext } from "./audit-scan-context.ts"

export const auditScanListPageSize = 50
export const auditScanSearchLimit = 10
export const auditScanMinSearchLength = 2
export const auditScanPollIntervalMs = 30_000

export type AuditScanOption = { id: string; label: string }
export type AuditScanEmployeeOption = AuditScanOption & { departmentId: string | null }
export type AuditScanOptions = {
  locations: AuditScanOption[]
  departments: AuditScanOption[]
  employees: AuditScanEmployeeOption[]
  conditions: AuditScanOption[]
}

/** One audit item as the scan screen needs it; ISO strings so it crosses the server/client boundary. */
export type AuditScanItemRow = {
  itemId: string
  assetId: string
  assetTag: string
  name: string
  serialNumber: string | null
  fixedAssetCode: string | null
  categoryId: string
  ownershipType: string | null
  expectedLocationId: string
  expectedCustodianId: string | null
  expectedDepartmentId: string | null
  expectedConditionId: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualDepartmentId: string | null
  actualConditionId: string | null
  auditStatus: string
  auditResult: string | null
  lastScanAt: string | null
  scannedByName: string | null
  currentLocationId: string
  currentCustodianId: string | null
  currentDepartmentId: string | null
  componentCount: number
}

export type AuditScanRoom = AuditScanContext
export type AuditScanListTab = "pending" | "checked" | "all"
export type AuditItemBadge = "found" | "mismatch" | "not_found" | "out_of_scope"

const foundResults = new Set(["found", "confirmed_with_parent"])

export function isAuditItemChecked(item: Pick<AuditScanItemRow, "auditStatus">) {
  return item.auditStatus !== "pending"
}

export function getAuditItemBadge(item: Pick<AuditScanItemRow, "auditStatus" | "auditResult">): AuditItemBadge | null {
  if (!isAuditItemChecked(item)) return null
  if (item.auditResult === "not_found") return "not_found"
  if (item.auditResult === "out_of_scope") return "out_of_scope"
  if (!item.auditResult || foundResults.has(item.auditResult)) return "found"
  return "mismatch"
}

export function summarizeProgress(items: readonly AuditScanItemRow[]) {
  let checked = 0
  let mismatched = 0
  for (const item of items) {
    if (!isAuditItemChecked(item)) continue
    checked += 1
    if (getAuditItemBadge(item) === "mismatch") mismatched += 1
  }
  return { total: items.length, checked, mismatched }
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "th")
}

export function buildRoomList({
  items,
  room,
  tab,
  limit,
  locationLabels,
}: {
  items: readonly AuditScanItemRow[]
  room: AuditScanRoom
  tab: AuditScanListTab
  limit: number
  locationLabels: ReadonlyMap<string, string>
}) {
  const inRoom = filterAuditItemsByContext([...items], room)
  const pending = inRoom.filter((item) => !isAuditItemChecked(item))
  const checked = inRoom.filter(isAuditItemChecked)
  const byPlace = (left: AuditScanItemRow, right: AuditScanItemRow) =>
    (room.locationId
      ? 0
      : compareText(locationLabels.get(left.expectedLocationId) ?? left.expectedLocationId, locationLabels.get(right.expectedLocationId) ?? right.expectedLocationId))
    || compareText(left.assetTag, right.assetTag)
  const byRecent = (left: AuditScanItemRow, right: AuditScanItemRow) =>
    (right.lastScanAt ?? "").localeCompare(left.lastScanAt ?? "") || compareText(left.assetTag, right.assetTag)
  const source = tab === "pending" ? pending.sort(byPlace) : tab === "checked" ? checked.sort(byRecent) : [...inRoom].sort(byPlace)

  return {
    rows: source.slice(0, limit),
    total: source.length,
    counts: { pending: pending.length, checked: checked.length, all: inRoom.length },
  }
}

export type AuditRoomOption = {
  locationId: string
  label: string
  pending: number
  total: number
  departments: Array<{ departmentId: string; label: string; total: number }>
}

export function buildRoomOptions(
  items: readonly AuditScanItemRow[],
  locations: readonly AuditScanOption[],
  departments: readonly AuditScanOption[],
): AuditRoomOption[] {
  const locationLabels = new Map(locations.map((option) => [option.id, option.label]))
  const departmentLabels = new Map(departments.map((option) => [option.id, option.label]))
  const byLocation = new Map<string, { pending: number; total: number; departments: Map<string, number> }>()

  for (const item of items) {
    const entry = byLocation.get(item.expectedLocationId) ?? { pending: 0, total: 0, departments: new Map<string, number>() }
    entry.total += 1
    if (!isAuditItemChecked(item)) entry.pending += 1
    if (item.expectedDepartmentId) {
      entry.departments.set(item.expectedDepartmentId, (entry.departments.get(item.expectedDepartmentId) ?? 0) + 1)
    }
    byLocation.set(item.expectedLocationId, entry)
  }

  return [...byLocation.entries()]
    .map(([locationId, entry]) => ({
      locationId,
      label: locationLabels.get(locationId) ?? locationId,
      pending: entry.pending,
      total: entry.total,
      departments: [...entry.departments.entries()]
        .map(([departmentId, total]) => ({ departmentId, label: departmentLabels.get(departmentId) ?? departmentId, total }))
        .sort((left, right) => compareText(left.label, right.label)),
    }))
    .sort((left, right) => compareText(left.label, right.label))
}

export type AuditSearchField = "assetTag" | "serialNumber" | "fixedAssetCode" | "name" | "custodian"
export type AuditSearchMatch = { item: AuditScanItemRow; field: AuditSearchField; value: string; tier: 0 | 1 | 2 }

const exactMatchFields = new Set<AuditSearchField>(["assetTag", "serialNumber", "fixedAssetCode"])

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function isAuditSearchReady(term: string) {
  return Array.from(term.trim()).length >= auditScanMinSearchLength
}

export function searchAuditItems(
  items: readonly AuditScanItemRow[],
  term: string,
  custodianLabels: ReadonlyMap<string, string>,
  limit = auditScanSearchLimit,
): AuditSearchMatch[] {
  if (!isAuditSearchReady(term)) return []
  const needle = normalizeSearchText(term)
  const matches: AuditSearchMatch[] = []

  for (const item of items) {
    const fields: Array<[AuditSearchField, string | null]> = [
      ["assetTag", item.assetTag],
      ["serialNumber", item.serialNumber],
      ["fixedAssetCode", item.fixedAssetCode],
      ["name", item.name],
      ["custodian", item.expectedCustodianId ? custodianLabels.get(item.expectedCustodianId) ?? null : null],
    ]
    let best: AuditSearchMatch | null = null
    for (const [field, raw] of fields) {
      if (!raw) continue
      const value = normalizeSearchText(raw)
      const tier = value === needle && exactMatchFields.has(field) ? 0 : value.startsWith(needle) ? 1 : value.includes(needle) ? 2 : null
      if (tier === null) continue
      if (!best || tier < best.tier) best = { item, field, value: raw, tier }
      if (tier === 0) break
    }
    if (best) matches.push(best)
  }

  return matches
    .sort((left, right) =>
      left.tier - right.tier
      || Number(isAuditItemChecked(left.item)) - Number(isAuditItemChecked(right.item))
      || compareText(left.item.assetTag, right.item.assetTag))
    .slice(0, limit)
}

export function splitSearchHighlight(value: string, term: string): [string, string, string] | null {
  const needle = normalizeSearchText(term)
  if (!needle) return null
  const index = value.toLocaleLowerCase().indexOf(needle)
  if (index < 0) return null
  return [value.slice(0, index), value.slice(index, index + needle.length), value.slice(index + needle.length)]
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `node --test tests/audit-scan-session-list.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Full checks, then commit**

Run `npm test`, `npx tsc --noEmit`, `npm run lint` — all green.

```bash
git add src/lib/audit-scan-session.ts tests/audit-scan-session-list.test.ts
git commit -m "feat(audit): scan session helpers for room lists and search

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Session helpers — check sheet rules, merging results, offline upsert

**Files:**
- Modify: `src/lib/audit-scan-session.ts` (append), `src/lib/audit-offline-queue.ts` (add one function)
- Test: `tests/audit-scan-session-check.test.ts`

**Interfaces:**
- Consumes: Task 1 types; `normalizeAssetOwnershipType`, `requiresCustodian` (`src/lib/asset-ownership.ts`); `loadQueuedAuditScansAsync`, `addQueuedAuditScanAsync`, `createAuditOfflineQueueKey`, types (`src/lib/audit-offline-queue.ts`).
- Produces:
  - `type AuditCheckMode = "scan" | "edit" | "out_of_scope"`, `type AuditCheckField = "location" | "custodian" | "department" | "condition"`, `type AuditCheckValues = Record<AuditCheckField, string>` (`""` = none)
  - `type AuditMasterValues = { locationId: string; custodianId: string | null; departmentId: string | null; conditionId: string | null }`
  - `getCheckMode(item): "scan" | "edit"`
  - `expectedCheckValues(item): AuditCheckValues`, `masterCheckValues(master): AuditCheckValues`
  - `buildCheckDefaults(input): AuditCheckValues` where input is `{ mode: "scan" | "edit"; item; room }` or `{ mode: "out_of_scope"; master; room }`
  - `diffCheckValues(values, expected, ownershipType): AuditCheckField[]`
  - `requiresCheckPhoto(mode, diff): boolean`
  - `suggestDepartmentForCustodian(employees, custodianId): string | null`
  - `getLatestValueNotes(item): Partial<Record<"location" | "custodian" | "department", string>>`
  - `toScanPayloadValues(values): { actualLocationId; actualCustodianId; actualDepartmentId; actualConditionId }` (`string | null` each)
  - `type AuditScanResultItem = { id; auditStatus; auditResult; actualLocationId; actualCustodianId; actualDepartmentId; actualConditionId; lastScanAt: string | Date | null }`
  - `applyScanResult(items, result: { item: AuditScanResultItem; scannedByName?: string | null }): AuditScanItemRow[]`
  - `mergeStatusUpdates(items, updates: readonly AuditScanItemRow[]): AuditScanItemRow[]`
  - `upsertQueuedAuditScanAsync(storage, roundId, payload, options?)` in `audit-offline-queue.ts` — same signature as `addQueuedAuditScanAsync`; keeps at most one entry per `assetId` (the new one)

- [ ] **Step 1: Write the failing test** — create `tests/audit-scan-session-check.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  applyScanResult,
  buildCheckDefaults,
  diffCheckValues,
  expectedCheckValues,
  getCheckMode,
  getLatestValueNotes,
  mergeStatusUpdates,
  requiresCheckPhoto,
  suggestDepartmentForCustodian,
  toScanPayloadValues,
  type AuditScanItemRow,
} from "../src/lib/audit-scan-session.ts"
import { loadQueuedAuditScansAsync, upsertQueuedAuditScanAsync, type AuditOfflineQueueStorage, type QueuedAuditScan } from "../src/lib/audit-offline-queue.ts"

function row(overrides: Partial<AuditScanItemRow> = {}): AuditScanItemRow {
  return {
    itemId: "item-1", assetId: "asset-1", assetTag: "SNI-EQU-21-0102", name: "โน้ตบุ๊ก HP", serialNumber: "5CD123ABC",
    fixedAssetCode: null, categoryId: "cat-1", ownershipType: "personal",
    expectedLocationId: "loc-2", expectedCustodianId: "emp-1", expectedDepartmentId: "dept-1", expectedConditionId: "cond-good",
    actualLocationId: null, actualCustodianId: null, actualDepartmentId: null, actualConditionId: null,
    auditStatus: "pending", auditResult: null, lastScanAt: null, scannedByName: null,
    currentLocationId: "loc-2", currentCustodianId: "emp-1", currentDepartmentId: "dept-1", componentCount: 0,
    ...overrides,
  }
}
const inRoomOne = { locationId: "loc-1", departmentId: "" }
const noRoom = { locationId: "", departmentId: "" }

test("pending and not-found items are new checks; anything already saved opens as an edit", () => {
  assert.equal(getCheckMode(row()), "scan")
  assert.equal(getCheckMode(row({ auditStatus: "reviewed", auditResult: "not_found" })), "scan")
  assert.equal(getCheckMode(row({ auditStatus: "scanned", auditResult: "found" })), "edit")
  assert.equal(getCheckMode(row({ auditStatus: "reviewed", auditResult: "out_of_scope" })), "edit")
})

test("a new check fills the current room as the location and nothing else", () => {
  assert.deepEqual(buildCheckDefaults({ mode: "scan", item: row(), room: inRoomOne }), { location: "loc-1", custodian: "emp-1", department: "dept-1", condition: "cond-good" })
  assert.deepEqual(buildCheckDefaults({ mode: "scan", item: row(), room: noRoom }), expectedCheckValues(row()))
})

test("editing a saved result keeps the saved values even when standing in another room", () => {
  const saved = row({ auditStatus: "scanned", auditResult: "wrong_location", actualLocationId: "loc-3", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "cond-good" })
  assert.deepEqual(buildCheckDefaults({ mode: "edit", item: saved, room: inRoomOne }), { location: "loc-3", custodian: "", department: "dept-1", condition: "cond-good" })
})

test("out-of-scope checks start from the register values with the current room as location", () => {
  const master = { locationId: "loc-9", custodianId: null, departmentId: "dept-4", conditionId: "cond-fair" }
  assert.deepEqual(buildCheckDefaults({ mode: "out_of_scope", master, room: inRoomOne }), { location: "loc-1", custodian: "", department: "dept-4", condition: "cond-fair" })
  assert.deepEqual(buildCheckDefaults({ mode: "out_of_scope", master, room: noRoom }).location, "loc-9")
})

test("mismatches mirror the server rules for ownership types", () => {
  const expected = expectedCheckValues(row())
  const values = { location: "loc-1", custodian: "emp-2", department: "dept-2", condition: "cond-poor" }
  assert.deepEqual(diffCheckValues(values, expected, "personal"), ["location", "custodian", "department", "condition"])
  assert.deepEqual(diffCheckValues(values, expected, "shared"), ["location", "department", "condition"])
  assert.deepEqual(diffCheckValues(values, expected, "software_license"), ["department", "condition"])
  assert.deepEqual(diffCheckValues(expected, expected, "personal"), [])
})

test("photos are required for a condition change, and for any out-of-scope difference", () => {
  assert.equal(requiresCheckPhoto("scan", ["location", "custodian"]), false)
  assert.equal(requiresCheckPhoto("edit", ["condition"]), true)
  assert.equal(requiresCheckPhoto("out_of_scope", ["department"]), true)
  assert.equal(requiresCheckPhoto("out_of_scope", []), false)
})

test("picking a custodian suggests that employee's department", () => {
  const employees = [{ id: "emp-1", label: "E1", departmentId: "dept-1" }, { id: "emp-2", label: "E2", departmentId: null }]
  assert.equal(suggestDepartmentForCustodian(employees, "emp-1"), "dept-1")
  assert.equal(suggestDepartmentForCustodian(employees, "emp-2"), null)
  assert.equal(suggestDepartmentForCustodian(employees, ""), null)
})

test("latest register values that moved after the round started are noted", () => {
  assert.deepEqual(getLatestValueNotes(row()), {})
  assert.deepEqual(getLatestValueNotes(row({ currentLocationId: "loc-1", currentCustodianId: null })), { location: "loc-1", custodian: "" })
})

test("payload values send null for empty selections", () => {
  assert.deepEqual(toScanPayloadValues({ location: "loc-1", custodian: "", department: "dept-1", condition: "" }), {
    actualLocationId: "loc-1", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: null,
  })
})

test("a save result updates only its row, and status updates replace or add rows", () => {
  const items = [row(), row({ itemId: "item-2", assetId: "asset-2" })]
  const saved = applyScanResult(items, {
    item: { id: "item-1", auditStatus: "scanned", auditResult: "wrong_location", actualLocationId: "loc-1", actualCustodianId: "emp-1", actualDepartmentId: "dept-1", actualConditionId: "cond-good", lastScanAt: new Date("2026-10-07T05:00:00Z") },
    scannedByName: "สมชาย",
  })
  assert.equal(saved[0].auditStatus, "scanned")
  assert.equal(saved[0].lastScanAt, "2026-10-07T05:00:00.000Z")
  assert.equal(saved[0].scannedByName, "สมชาย")
  assert.equal(saved[1], items[1])

  const merged = mergeStatusUpdates(saved, [row({ itemId: "item-2", assetId: "asset-2", auditStatus: "scanned", auditResult: "found" }), row({ itemId: "item-9", assetId: "asset-9" })])
  assert.deepEqual(merged.map((item) => [item.itemId, item.auditStatus]), [["item-1", "scanned"], ["item-2", "scanned"], ["item-9", "pending"]])
})

test("the offline queue keeps one entry per asset, the newest", async () => {
  const store = new Map<string, QueuedAuditScan[]>()
  const storage: AuditOfflineQueueStorage = {
    getQueue: async (key) => store.get(key) ?? [],
    setQueue: async (key, value) => { store.set(key, value) },
    removeQueue: async (key) => { store.delete(key) },
  }
  const payload = { assetId: "asset-1", actualLocationId: "loc-1", actualCustodianId: null, actualDepartmentId: null, actualConditionId: null, scanSource: "manual" as const, applyCorrections: false, resultCorrection: false, remark: null }

  await upsertQueuedAuditScanAsync(storage, "round-1", payload, { now: new Date("2026-10-07T01:00:00Z") })
  await upsertQueuedAuditScanAsync(storage, "round-1", { ...payload, actualLocationId: "loc-2" }, { now: new Date("2026-10-07T01:05:00Z") })
  await upsertQueuedAuditScanAsync(storage, "round-1", { ...payload, assetId: "asset-2" }, { now: new Date("2026-10-07T01:06:00Z") })

  const queue = await loadQueuedAuditScansAsync(storage, "round-1")
  assert.deepEqual(queue.map((entry) => [entry.assetId, entry.actualLocationId]), [["asset-1", "loc-2"], ["asset-2", "loc-1"]])
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test tests/audit-scan-session-check.test.ts`
Expected: FAIL — `getCheckMode` / `upsertQueuedAuditScanAsync` are not exported.

- [ ] **Step 3: Append to `src/lib/audit-scan-session.ts`**

Add this import at the top of the file (next to the existing one):

```ts
import { normalizeAssetOwnershipType, requiresCustodian } from "./asset-ownership.ts"
```

Append at the end:

```ts
export type AuditCheckMode = "scan" | "edit" | "out_of_scope"
export type AuditCheckField = "location" | "custodian" | "department" | "condition"
export type AuditCheckValues = Record<AuditCheckField, string>
export type AuditMasterValues = {
  locationId: string
  custodianId: string | null
  departmentId: string | null
  conditionId: string | null
}

export function getCheckMode(item: Pick<AuditScanItemRow, "auditStatus" | "auditResult">): "scan" | "edit" {
  if (item.auditStatus === "pending" || item.auditResult === "not_found") return "scan"
  return "edit"
}

export function expectedCheckValues(item: AuditScanItemRow): AuditCheckValues {
  return {
    location: item.expectedLocationId,
    custodian: item.expectedCustodianId ?? "",
    department: item.expectedDepartmentId ?? "",
    condition: item.expectedConditionId ?? "",
  }
}

export function masterCheckValues(master: AuditMasterValues): AuditCheckValues {
  return {
    location: master.locationId,
    custodian: master.custodianId ?? "",
    department: master.departmentId ?? "",
    condition: master.conditionId ?? "",
  }
}

export function buildCheckDefaults(
  input:
    | { mode: "scan" | "edit"; item: AuditScanItemRow; room: AuditScanRoom }
    | { mode: "out_of_scope"; master: AuditMasterValues; room: AuditScanRoom },
): AuditCheckValues {
  if (input.mode === "out_of_scope") {
    const values = masterCheckValues(input.master)
    return { ...values, location: input.room.locationId || values.location }
  }
  if (input.mode === "edit") {
    return {
      location: input.item.actualLocationId ?? input.item.expectedLocationId,
      custodian: input.item.actualCustodianId ?? "",
      department: input.item.actualDepartmentId ?? "",
      condition: input.item.actualConditionId ?? "",
    }
  }
  const expected = expectedCheckValues(input.item)
  return { ...expected, location: input.room.locationId || expected.location }
}

/** Same comparison as the scan route: location skipped for licences, custodian only for personal assets. */
export function diffCheckValues(values: AuditCheckValues, expected: AuditCheckValues, ownershipType: string | null): AuditCheckField[] {
  const type = normalizeAssetOwnershipType(ownershipType)
  const fields: AuditCheckField[] = []
  if (type !== "software_license" && values.location !== expected.location) fields.push("location")
  if (requiresCustodian(type) && values.custodian !== expected.custodian) fields.push("custodian")
  if (values.department !== expected.department) fields.push("department")
  if (values.condition !== expected.condition) fields.push("condition")
  return fields
}

export function requiresCheckPhoto(mode: AuditCheckMode, diff: readonly AuditCheckField[]) {
  return mode === "out_of_scope" ? diff.length > 0 : diff.includes("condition")
}

export function suggestDepartmentForCustodian(employees: readonly AuditScanEmployeeOption[], custodianId: string) {
  if (!custodianId) return null
  return employees.find((employee) => employee.id === custodianId)?.departmentId ?? null
}

export function getLatestValueNotes(item: AuditScanItemRow) {
  const notes: Partial<Record<"location" | "custodian" | "department", string>> = {}
  if (item.currentLocationId !== item.expectedLocationId) notes.location = item.currentLocationId
  if ((item.currentCustodianId ?? "") !== (item.expectedCustodianId ?? "")) notes.custodian = item.currentCustodianId ?? ""
  if ((item.currentDepartmentId ?? "") !== (item.expectedDepartmentId ?? "")) notes.department = item.currentDepartmentId ?? ""
  return notes
}

export function toScanPayloadValues(values: AuditCheckValues) {
  return {
    actualLocationId: values.location || null,
    actualCustodianId: values.custodian || null,
    actualDepartmentId: values.department || null,
    actualConditionId: values.condition || null,
  }
}

export type AuditScanResultItem = {
  id: string
  auditStatus: string
  auditResult: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualDepartmentId: string | null
  actualConditionId: string | null
  lastScanAt: string | Date | null
}

function toIsoString(value: string | Date | null) {
  if (!value) return null
  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString()
}

export function applyScanResult(
  items: readonly AuditScanItemRow[],
  result: { item: AuditScanResultItem; scannedByName?: string | null },
): AuditScanItemRow[] {
  return items.map((row) =>
    row.itemId !== result.item.id
      ? row
      : {
          ...row,
          auditStatus: result.item.auditStatus,
          auditResult: result.item.auditResult,
          actualLocationId: result.item.actualLocationId,
          actualCustodianId: result.item.actualCustodianId,
          actualDepartmentId: result.item.actualDepartmentId,
          actualConditionId: result.item.actualConditionId,
          lastScanAt: toIsoString(result.item.lastScanAt),
          scannedByName: result.scannedByName ?? row.scannedByName,
        },
  )
}

export function mergeStatusUpdates(items: readonly AuditScanItemRow[], updates: readonly AuditScanItemRow[]): AuditScanItemRow[] {
  const byItemId = new Map(updates.map((update) => [update.itemId, update]))
  const merged = items.map((row) => {
    const update = byItemId.get(row.itemId)
    if (!update) return row
    byItemId.delete(row.itemId)
    return update
  })
  return [...merged, ...byItemId.values()]
}
```

- [ ] **Step 4: Add `upsertQueuedAuditScanAsync` to `src/lib/audit-offline-queue.ts`** — insert directly after `addQueuedAuditScanAsync`:

```ts
/** One pending save per asset: a newer save replaces the older one instead of queueing twice. */
export async function upsertQueuedAuditScanAsync(
  storage: AuditOfflineQueueStorage,
  roundId: string,
  payload: AuditOfflineScanPayload,
  options: {
    photos?: AuditOfflinePhoto[]
    now?: Date
  } = {}
) {
  const now = options.now ?? new Date()
  const queued: QueuedAuditScan = {
    ...payload,
    id: `${now.getTime()}-${payload.assetId}`,
    queuedAt: now.toISOString(),
    syncStatus: "pending",
    lastSyncError: null,
    photos: options.photos ?? [],
  }
  const existing = (await loadQueuedAuditScansAsync(storage, roundId)).filter((entry) => entry.assetId !== payload.assetId)
  await storage.setQueue(createAuditOfflineQueueKey(roundId), [...existing, queued])
  return queued
}
```

- [ ] **Step 5: Run and confirm it passes**

Run: `node --test tests/audit-scan-session-check.test.ts tests/audit-offline-queue.test.ts`
Expected: PASS.

- [ ] **Step 6: Full checks, then commit**

```bash
git add src/lib/audit-scan-session.ts src/lib/audit-offline-queue.ts tests/audit-scan-session-check.test.ts
git commit -m "feat(audit): check-sheet rules, result merging and one-per-asset offline queue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Slim scan rows and the `scan-status` endpoint

**Files:**
- Create: `src/lib/audit-scan-rows.ts`, `src/lib/audit-scan-data.ts`, `src/app/api/audit-rounds/[id]/scan-status/route.ts`
- Modify: `src/lib/rbac-route-matrix.ts` (new entry after "Audit scan lookup"), `src/lib/audit-options.ts` (employee `departmentId`)
- Test: `tests/audit-scan-rows.test.ts`, `tests/audit-scan-status-route.test.ts`

**Interfaces:**
- Consumes: `type AuditScanItemRow` (Task 1).
- Produces:
  - `type AuditScanItemRecord` and `toAuditScanItemRow(record, { userNames: ReadonlyMap<string, string>; componentCounts: ReadonlyMap<string, number> }): AuditScanItemRow` (`src/lib/audit-scan-rows.ts`, pure)
  - `auditScanItemSelect`, `loadAuditScanRows(roundId: string, options?: { since?: Date }): Promise<AuditScanItemRow[]>` (`src/lib/audit-scan-data.ts`, server)
  - `GET /api/audit-rounds/[id]/scan-status?since=<ISO>` → `200 { serverTime: string; roundStatus: string; items: AuditScanItemRow[] }` · `400 { error: "Invalid since" }` · `404` unknown round · `403` without `audit:edit`
  - `getAuditRoundOptions().employees` items gain `departmentId: string | null`

- [ ] **Step 1: Write the failing tests**

Create `tests/audit-scan-rows.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { toAuditScanItemRow, type AuditScanItemRecord } from "../src/lib/audit-scan-rows.ts"

const record: AuditScanItemRecord = {
  id: "item-1",
  assetId: "asset-1",
  auditStatus: "scanned",
  auditResult: "wrong_location",
  expectedLocationId: "loc-2",
  expectedCustodianId: "emp-1",
  expectedDepartmentId: null,
  expectedConditionId: "cond-good",
  actualLocationId: "loc-1",
  actualCustodianId: "emp-1",
  actualDepartmentId: null,
  actualConditionId: "cond-good",
  lastScanAt: new Date("2026-10-07T03:42:00Z"),
  scannedBy: "user-7",
  asset: {
    assetTag: "SNI-EQU-21-0102",
    name: "โน้ตบุ๊ก HP",
    serialNumber: "5CD123ABC",
    fixedAssetCode: null,
    categoryId: "cat-1",
    ownershipType: "personal",
    currentLocationId: "loc-1",
    custodianId: "emp-1",
    departmentId: "dept-1",
  },
}

test("an audit item record becomes a scan row with names, counts and ISO times", () => {
  const row = toAuditScanItemRow(record, {
    userNames: new Map([["user-7", "วิไล"]]),
    componentCounts: new Map([["asset-1", 2]]),
  })

  assert.equal(row.itemId, "item-1")
  assert.equal(row.assetTag, "SNI-EQU-21-0102")
  assert.equal(row.lastScanAt, "2026-10-07T03:42:00.000Z")
  assert.equal(row.scannedByName, "วิไล")
  assert.equal(row.componentCount, 2)
  assert.equal(row.currentLocationId, "loc-1")
  assert.equal(row.currentDepartmentId, "dept-1")
})

test("missing names and counts fall back to null and zero", () => {
  const row = toAuditScanItemRow({ ...record, scannedBy: null, lastScanAt: null }, { userNames: new Map(), componentCounts: new Map() })

  assert.equal(row.scannedByName, null)
  assert.equal(row.lastScanAt, null)
  assert.equal(row.componentCount, 0)
})
```

Create `tests/audit-scan-status-route.test.ts`:

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

const state: { permissions: string[]; round: { id: string; status: string } | null; calls: Array<{ call: string; args: Record<string, unknown> }> } = {
  permissions: ["audit:edit"],
  round: { id: "round-1", status: "open" },
  calls: [],
}
Object.assign(globalThis, { __scanStatusState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request { get nextUrl() { return new URL(this.url) } }
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__scanStatusState
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: state().permissions } }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__scanStatusState
    const record = {
      id: "item-1", assetId: "asset-1", auditStatus: "scanned", auditResult: "found",
      expectedLocationId: "loc-1", expectedCustodianId: null, expectedDepartmentId: null, expectedConditionId: null,
      actualLocationId: "loc-1", actualCustodianId: null, actualDepartmentId: null, actualConditionId: null,
      lastScanAt: new Date("2026-10-07T03:42:00Z"), scannedBy: "user-7",
      asset: { assetTag: "SNI-EQU-19-0271", name: "Laptop", serialNumber: null, fixedAssetCode: null, categoryId: "cat-1", ownershipType: "personal", currentLocationId: "loc-1", custodianId: null, departmentId: null },
    }
    function log(call, args) { state().calls.push({ call, args: args ?? {} }) }
    export const prisma = {
      auditRound: { findFirst: async (args) => { log("auditRound.findFirst", args); return state().round } },
      auditItem: { findMany: async (args) => { log("auditItem.findMany", args); return [record] } },
      user: { findMany: async (args) => { log("user.findMany", args); return [{ id: "user-7", displayName: "วิไล" }] } },
      assetComponent: { groupBy: async (args) => { log("assetComponent.groupBy", args); return [{ parentAssetId: "asset-1", _count: { _all: 3 } }] } },
    }
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

type StatusRoute = { GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
const route = await import(pathToFileURL("src/app/api/audit-rounds/[id]/scan-status/route.ts").href) as StatusRoute

function get(query: string) {
  return route.GET(new Request(`http://localhost/api/audit-rounds/round-1/scan-status${query}`), { params: Promise.resolve({ id: "round-1" }) })
}

beforeEach(() => {
  state.permissions = ["audit:edit"]
  state.round = { id: "round-1", status: "open" }
  state.calls = []
})

test("a missing or broken since returns 400", async () => {
  assert.equal((await get("")).status, 400)
  assert.equal((await get("?since=yesterday")).status, 400)
})

test("people without audit edit rights get 403", async () => {
  state.permissions = ["audit:view"]
  assert.equal((await get("?since=2026-10-07T03:00:00.000Z")).status, 403)
})

test("an unknown round returns 404", async () => {
  state.round = null
  assert.equal((await get("?since=2026-10-07T03:00:00.000Z")).status, 404)
})

test("only items changed after since are returned, as scan rows, with the server time and round status", async () => {
  const before = Date.now()
  const response = await get("?since=2026-10-07T03:00:00.000Z")
  const payload = await response.json() as { serverTime: string; roundStatus: string; items: Array<Record<string, unknown>> }

  assert.equal(response.status, 200)
  assert.equal(payload.roundStatus, "open")
  assert.ok(Date.parse(payload.serverTime) >= before - 1000)
  assert.equal(payload.items.length, 1)
  assert.equal(payload.items[0].scannedByName, "วิไล")
  assert.equal(payload.items[0].componentCount, 3)

  const findMany = state.calls.find((entry) => entry.call === "auditItem.findMany")!.args as { where: { auditRoundId: string; updatedAt: { gt: Date } } }
  assert.equal(findMany.where.auditRoundId, "round-1")
  assert.equal(findMany.where.updatedAt.gt.toISOString(), "2026-10-07T03:00:00.000Z")
})

test("a closed round still reports its status so the screen can stop saving", async () => {
  state.round = { id: "round-1", status: "closed" }
  const payload = await (await get("?since=2026-10-07T03:00:00.000Z")).json() as { roundStatus: string }
  assert.equal(payload.roundStatus, "closed")
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `node --test tests/audit-scan-rows.test.ts tests/audit-scan-status-route.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/lib/audit-scan-rows.ts`**

```ts
import type { AuditScanItemRow } from "./audit-scan-session.ts"

export type AuditScanItemRecord = {
  id: string
  assetId: string
  auditStatus: string
  auditResult: string | null
  expectedLocationId: string
  expectedCustodianId: string | null
  expectedDepartmentId: string | null
  expectedConditionId: string | null
  actualLocationId: string | null
  actualCustodianId: string | null
  actualDepartmentId: string | null
  actualConditionId: string | null
  lastScanAt: Date | null
  scannedBy: string | null
  asset: {
    assetTag: string
    name: string
    serialNumber: string | null
    fixedAssetCode: string | null
    categoryId: string
    ownershipType: string | null
    currentLocationId: string
    custodianId: string | null
    departmentId: string | null
  }
}

export function toAuditScanItemRow(
  record: AuditScanItemRecord,
  lookups: { userNames: ReadonlyMap<string, string>; componentCounts: ReadonlyMap<string, number> },
): AuditScanItemRow {
  return {
    itemId: record.id,
    assetId: record.assetId,
    assetTag: record.asset.assetTag,
    name: record.asset.name,
    serialNumber: record.asset.serialNumber,
    fixedAssetCode: record.asset.fixedAssetCode,
    categoryId: record.asset.categoryId,
    ownershipType: record.asset.ownershipType,
    expectedLocationId: record.expectedLocationId,
    expectedCustodianId: record.expectedCustodianId,
    expectedDepartmentId: record.expectedDepartmentId,
    expectedConditionId: record.expectedConditionId,
    actualLocationId: record.actualLocationId,
    actualCustodianId: record.actualCustodianId,
    actualDepartmentId: record.actualDepartmentId,
    actualConditionId: record.actualConditionId,
    auditStatus: record.auditStatus,
    auditResult: record.auditResult,
    lastScanAt: record.lastScanAt ? record.lastScanAt.toISOString() : null,
    scannedByName: record.scannedBy ? lookups.userNames.get(record.scannedBy) ?? null : null,
    currentLocationId: record.asset.currentLocationId,
    currentCustodianId: record.asset.custodianId,
    currentDepartmentId: record.asset.departmentId,
    componentCount: lookups.componentCounts.get(record.assetId) ?? 0,
  }
}
```

- [ ] **Step 4: Create `src/lib/audit-scan-data.ts`**

```ts
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { toAuditScanItemRow } from "@/lib/audit-scan-rows"

export const auditScanItemSelect = {
  id: true,
  assetId: true,
  auditStatus: true,
  auditResult: true,
  expectedLocationId: true,
  expectedCustodianId: true,
  expectedDepartmentId: true,
  expectedConditionId: true,
  actualLocationId: true,
  actualCustodianId: true,
  actualDepartmentId: true,
  actualConditionId: true,
  lastScanAt: true,
  scannedBy: true,
  asset: {
    select: {
      assetTag: true,
      name: true,
      serialNumber: true,
      fixedAssetCode: true,
      categoryId: true,
      ownershipType: true,
      currentLocationId: true,
      custodianId: true,
      departmentId: true,
    },
  },
} satisfies Prisma.AuditItemSelect

/** Every audit item of a round (or only those changed after `since`) as scan rows. */
export async function loadAuditScanRows(roundId: string, options: { since?: Date } = {}) {
  const records = await prisma.auditItem.findMany({
    where: { auditRoundId: roundId, ...(options.since ? { updatedAt: { gt: options.since } } : {}) },
    select: auditScanItemSelect,
    orderBy: { asset: { assetTag: "asc" } },
  })
  if (records.length === 0) return []

  const userIds = Array.from(new Set(records.map((record) => record.scannedBy).filter((id): id is string => Boolean(id))))
  const [users, componentGroups] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
      : Promise.resolve([] as Array<{ id: string; displayName: string }>),
    prisma.assetComponent.groupBy({
      by: ["parentAssetId"],
      where: {
        status: "installed",
        removedAt: null,
        componentAsset: { isActive: true },
        // A full round can exceed SQL Server's 2,100 parameters, so it filters by relation; deltas are small lists.
        ...(options.since
          ? { parentAssetId: { in: records.map((record) => record.assetId) } }
          : { parentAsset: { auditItems: { some: { auditRoundId: roundId } } } }),
      },
      _count: { _all: true },
    }),
  ])

  const userNames = new Map(users.map((user) => [user.id, user.displayName]))
  const componentCounts = new Map(componentGroups.map((group) => [group.parentAssetId, group._count._all]))
  return records.map((record) => toAuditScanItemRow(record, { userNames, componentCounts }))
}
```

If `tsc` rejects the `groupBy` call's inferred types, add `orderBy: { parentAssetId: "asc" }` (Prisma sometimes requires it for typed `groupBy`) and report it.

- [ ] **Step 5: Create `src/app/api/audit-rounds/[id]/scan-status/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { loadAuditScanRows } from "@/lib/audit-scan-data"

type AuditScanStatusContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: AuditScanStatusContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "edit")

    const { id } = await context.params
    const sinceParam = request.nextUrl.searchParams.get("since")
    const since = sinceParam ? new Date(sinceParam) : null
    if (!since || Number.isNaN(since.getTime())) {
      return NextResponse.json({ error: "Invalid since" }, { status: 400 })
    }

    const round = await prisma.auditRound.findFirst({
      where: { id, isActive: true },
      select: { id: true, status: true },
    })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })

    // Taken before the query: a save that lands while it runs is picked up next time instead of lost.
    const serverTime = new Date()
    const items = await loadAuditScanRows(id, { since })
    return NextResponse.json({ serverTime: serverTime.toISOString(), roundStatus: round.status, items })
  } catch (error) {
    return errorResponse(error)
  }
}
```

- [ ] **Step 6: Register the route and extend employee options**

In `src/lib/rbac-route-matrix.ts`, directly after the `"Audit scan lookup"` entry:

```ts
  {
    filePath: "src/app/api/audit-rounds/[id]/scan-status/route.ts",
    label: "Audit scan status",
    checks: [{ module: "audit", action: "edit" }],
  },
```

In `src/lib/audit-options.ts`: the employee query selects `departmentId: true` too, and the mapping becomes:

```ts
    employees: employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}`, departmentId: employee.departmentId })),
```

- [ ] **Step 7: Run the tests, full checks, commit**

Run: `node --test tests/audit-scan-rows.test.ts tests/audit-scan-status-route.test.ts tests/rbac-route-matrix.test.ts` → PASS. Then `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add src/lib/audit-scan-rows.ts src/lib/audit-scan-data.ts "src/app/api/audit-rounds/[id]/scan-status/route.ts" src/lib/rbac-route-matrix.ts src/lib/audit-options.ts tests/audit-scan-rows.test.ts tests/audit-scan-status-route.test.ts
git commit -m "feat(audit): slim scan rows and a scan-status endpoint for shared progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Server fixes — stale findings, partial lookup, room filter on the pending page

**Files:**
- Modify: `src/app/api/audit-rounds/[id]/scan/route.ts` (findings block ~lines 494-605, response ~line 653), `src/app/api/audit-rounds/[id]/scan-lookup/route.ts` (after the exact lookup), `src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx` (props type + items `where`)
- Test: create `tests/audit-scan-edit-findings.test.ts`, `tests/audit-scan-lookup-partial.test.ts`; modify `tests/operational-return-navigation.test.ts:66`

**Interfaces:**
- Produces:
  - scan POST response gains `scannedByName: string | null`
  - scan-lookup may return `{ status: "candidates", candidates: string[], matches: Array<{ assetId: string; assetTag: string; title: string; inRound: boolean }> }`
  - pending page accepts `?locationId=<id>` (filters `expectedLocationId`)

- [ ] **Step 1: Write the failing tests**

Create `tests/audit-scan-edit-findings.test.ts` — the mock is the one in `tests/audit-scan-correction-approval.test.ts` with three additions (pending findings, user lookup, update calls):

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type Finding = { id: string; findingType: string; actualValue: string | null }
const state: { pendingFindings: Finding[]; calls: Array<{ call: string; args: Record<string, unknown> }> } = { pendingFindings: [], calls: [] }
Object.assign(globalThis, { __editFindingsState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "auditor-1", roles: ["auditor"], permissions: ["audit:edit"], employeeId: "emp-1" } }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent() {
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__editFindingsState
    const item = {
      id: "item-1", auditRoundId: "round-1", assetId: "asset-1",
      expectedLocationId: "loc-1", expectedCustodianId: "emp-5", expectedDepartmentId: "dept-1", expectedConditionId: "condition-good",
      auditStatus: "scanned", auditResult: "wrong_location", scanCount: 1,
      actualLocationId: "loc-2", actualCustodianId: "emp-5", actualDepartmentId: "dept-1", actualConditionId: "condition-good",
      scannedAt: new Date("2026-10-07T01:00:00Z"), scannedBy: "auditor-1", remark: null,
      asset: { id: "asset-1", assetTag: "GRL-COM-26-0036", name: "Laptop", ownershipType: "shared", currentLocationId: "loc-1", custodianId: "emp-5" },
    }
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args: args ?? {} })
            if (name === "auditRound" && method === "findFirst") return { id: "round-1", status: "open" }
            if (name === "auditItem" && method === "findUnique") return item
            if (name === "auditItem" && method === "update") return { ...item, ...(args?.data ?? {}), scanCount: 2, lastScanAt: new Date("2026-10-07T02:00:00Z") }
            if (name === "user" && method === "findUnique") return { displayName: "ผู้ตรวจ 1" }
            if (name === "auditFinding" && method === "findMany") {
              const types = args?.where?.findingType?.in ?? []
              return state().pendingFindings.filter((finding) => types.includes(finding.findingType))
            }
            if (method === "updateMany") return { count: 0 }
            if (method === "count") return 0
            if (method === "findMany") return []
            if (method === "findFirst" || method === "findUnique") return null
            return { id: name + "-new", ...(args?.data ?? {}) }
          }
        },
      })
    }
    const client = new Proxy({}, {
      get(_target, key) {
        if (key === "$transaction") return async (callback) => callback(client)
        return model(String(key))
      },
    })
    export const prisma = client
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const route = await import(pathToFileURL("src/app/api/audit-rounds/[id]/scan/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function rescan(actualLocationId: string) {
  return route.POST(
    new Request("http://localhost/api/audit-rounds/round-1/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: "asset-1", actualLocationId, resultCorrection: true }),
    }),
    { params: Promise.resolve({ id: "round-1" }) },
  )
}

const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)

beforeEach(() => {
  state.pendingFindings = []
  state.calls = []
})

test("correcting a result back to matching closes the pending finding it no longer has", async () => {
  state.pendingFindings = [{ id: "finding-1", findingType: "wrong_location", actualValue: "loc-2" }]

  const response = await rescan("loc-1")
  assert.equal(response.status, 200)

  const closed = callsTo("auditFinding.updateMany").filter((args) => (args.data as Record<string, unknown>)?.reviewRemark === "ยกเลิกเพราะแก้ผลตรวจ")
  assert.equal(closed.length, 1)
  const where = closed[0].where as { auditItemId: string; reviewStatus: string; findingType: { in: string[] } }
  assert.equal(where.auditItemId, "item-1")
  assert.equal(where.reviewStatus, "pending")
  assert.ok(where.findingType.in.includes("wrong_location"))
  assert.ok(!where.findingType.in.includes("not_found"))
  assert.equal((closed[0].data as Record<string, unknown>).reviewStatus, "rejected")
  assert.deepEqual(callsTo("auditFinding.create"), [])
})

test("correcting the found location updates the pending finding's actual value instead of keeping the old one", async () => {
  state.pendingFindings = [{ id: "finding-1", findingType: "wrong_location", actualValue: "loc-2" }]

  await rescan("loc-3")

  const updates = callsTo("auditFinding.update")
  assert.equal(updates.length, 1)
  assert.deepEqual(updates[0].where, { id: "finding-1" })
  assert.equal((updates[0].data as Record<string, unknown>).actualValue, "loc-3")
  assert.deepEqual(callsTo("auditFinding.create"), [])
})

test("an unchanged mismatch leaves the pending finding alone", async () => {
  state.pendingFindings = [{ id: "finding-1", findingType: "wrong_location", actualValue: "loc-2" }]

  await rescan("loc-2")

  assert.deepEqual(callsTo("auditFinding.update"), [])
})

test("the response names who first scanned the item", async () => {
  const payload = await (await rescan("loc-1")).json() as { scannedByName: string | null }
  assert.equal(payload.scannedByName, "ผู้ตรวจ 1")
})
```

Create `tests/audit-scan-lookup-partial.test.ts`:

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

const state: { partial: Array<{ id: string; assetTag: string; name: string }>; inRound: string[]; calls: string[] } = { partial: [], inRound: [], calls: [] }
Object.assign(globalThis, { __lookupPartialState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: ["audit:edit"] } }
    export function requirePermission() {}
  `],
  ["@/lib/db", `
    const state = () => globalThis.__lookupPartialState
    export const prisma = {
      auditRound: { findFirst: async () => ({ id: "round-1", status: "open" }) },
      asset: {
        findFirst: async () => { state().calls.push("asset.findFirst"); return null },
        findMany: async () => { state().calls.push("asset.findMany"); return state().partial },
      },
      auditItem: {
        findUnique: async () => null,
        findMany: async () => state().inRound.map((assetId) => ({ assetId })),
      },
    }
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const route = await import(pathToFileURL("src/app/api/audit-rounds/[id]/scan-lookup/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function lookup(rawValue: string) {
  return route.POST(
    new Request("http://localhost/api/audit-rounds/round-1/scan-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawValue }),
    }),
    { params: Promise.resolve({ id: "round-1" }) },
  )
}

beforeEach(() => {
  state.partial = []
  state.inRound = []
  state.calls = []
})

test("when no code matches exactly, three or more characters return up to five partial matches marked in or out of the round", async () => {
  state.partial = [
    { id: "asset-1", assetTag: "GRL-COM-26-0036", name: "RAM" },
    { id: "asset-2", assetTag: "GRL-COM-26-0037", name: "RAM" },
  ]
  state.inRound = ["asset-2"]

  const payload = await (await lookup("26-003")).json() as { status: string; matches: Array<{ assetId: string; inRound: boolean }> }

  assert.equal(payload.status, "candidates")
  assert.deepEqual(payload.matches.map((match) => [match.assetId, match.inRound]), [["asset-1", false], ["asset-2", true]])
})

test("fewer than three characters never runs the partial search", async () => {
  const payload = await (await lookup("26")).json() as { status: string }

  assert.equal(payload.status, "unknown_asset")
  assert.ok(!state.calls.includes("asset.findMany"))
})

test("no partial match is still an unknown asset", async () => {
  const payload = await (await lookup("ZZZ-404")).json() as { status: string }
  assert.equal(payload.status, "unknown_asset")
})
```

In `tests/operational-return-navigation.test.ts`, change the pending-page assertion (line ~66) to:

```ts
  assert.match(pendingSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; search\?: string \| string\[\]; locationId\?: string \| string\[\] \}>/)
```

and append a test:

```ts
test("the pending list can be narrowed to one room from the scan screen", () => {
  const pendingSource = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx", "utf8")
  assert.match(pendingSource, /\.\.\.\(locationFilter \? \{ expectedLocationId: locationFilter \} : \{\}\)/)
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `node --test tests/audit-scan-edit-findings.test.ts tests/audit-scan-lookup-partial.test.ts tests/operational-return-navigation.test.ts`
Expected: FAIL (no stale-finding update, `status: "unknown_asset"` instead of `candidates`, pending type mismatch).

- [ ] **Step 3: Fix stale and changed findings in `src/app/api/audit-rounds/[id]/scan/route.ts`**

1. Near the other constants at the top (after `immediateCorrectionTypes`):

```ts
const auditCorrectableFindingTypes = ["wrong_location", "wrong_custodian", "wrong_department", "wrong_condition"] as const
const staleFindingReviewRemark = "ยกเลิกเพราะแก้ผลตรวจ"
```

2. In the normal in-round branch's `existingFindings` query (inside `if (mismatches.length > 0)`), select the actual value too: `select: { id: true, findingType: true, actualValue: true }`.

3. In the loop's `if (!shouldApplyCorrection) { … }` block, replace it with:

```ts
          if (!shouldApplyCorrection) {
            if (!existingFinding) {
              await tx.auditFinding.create({
                data: {
                  auditRoundId: id,
                  auditItemId: item.id,
                  assetId: item.assetId,
                  findingType: mismatch.type,
                  expectedValue: mismatch.expectedValue,
                  actualValue: mismatch.actualValue,
                  remark: input.remark,
                  reportedBy: user.id,
                  reviewStatus: "pending",
                },
              })
            } else if ((existingFinding.actualValue ?? null) !== (mismatch.actualValue ?? null)) {
              await tx.auditFinding.update({
                where: { id: existingFinding.id },
                data: { actualValue: mismatch.actualValue, remark: input.remark },
              })
            }
            continue
          }
```

(Keep the existing `create` data exactly as it is in the file; only the `else if` branch is new.)

4. Still inside the same `$transaction` callback, directly before its final `return updatedItem`, add:

```ts
      const staleFindingTypes = auditCorrectableFindingTypes.filter((type) => !mismatches.some((mismatch) => mismatch.type === type))
      if (staleFindingTypes.length > 0) {
        await tx.auditFinding.updateMany({
          where: {
            auditItemId: item.id,
            reviewStatus: "pending",
            findingType: { in: [...staleFindingTypes] },
            OR: [{ actionTaken: null }, { actionTaken: { not: "component_confirmed_with_parent_mismatch" } }],
          },
          data: {
            reviewStatus: "rejected",
            reviewRemark: staleFindingReviewRemark,
            reviewedBy: user.id,
            reviewedAt: scannedAt,
          },
        })
      }
```

5. Before the final `return NextResponse.json({ item: result, … })` of the in-round branch, look up the first scanner's name and add it to the response:

```ts
    const scannedByUser = result.scannedBy
      ? await prisma.user.findUnique({ where: { id: result.scannedBy }, select: { displayName: true } })
      : null

    return NextResponse.json({
      item: result,
      auditResult,
      mismatches,
      appliedCorrections: correctionMismatches,
      correctionsDeferred: input.applyCorrections && !correctionsAllowed,
      resolvedNotFoundFinding,
      scannedByName: scannedByUser?.displayName ?? null,
    })
```

Run `node --test tests/audit-scan-edit-findings.test.ts tests/audit-scan-correction-approval.test.ts tests/audit-component-scan-api.test.ts` → PASS.

- [ ] **Step 4: Partial matches in `src/app/api/audit-rounds/[id]/scan-lookup/route.ts`**

Replace

```ts
    if (!asset) {
      return NextResponse.json({ status: "unknown_asset", candidates })
    }
```

with

```ts
    if (!asset) {
      const term = input.rawValue.trim()
      if (Array.from(term).length >= 3) {
        const partialMatches = await prisma.asset.findMany({
          where: {
            isActive: true,
            OR: [
              { assetTag: { contains: term } },
              { serialNumber: { contains: term } },
              { fixedAssetCode: { contains: term } },
            ],
          },
          select: { id: true, assetTag: true, name: true },
          orderBy: { assetTag: "asc" },
          take: 5,
        })
        if (partialMatches.length > 0) {
          const inRoundItems = await prisma.auditItem.findMany({
            where: { auditRoundId: id, assetId: { in: partialMatches.map((match) => match.id) } },
            select: { assetId: true },
          })
          const inRoundAssetIds = new Set(inRoundItems.map((roundItem) => roundItem.assetId))
          return NextResponse.json({
            status: "candidates",
            candidates,
            matches: partialMatches.map((match) => ({
              assetId: match.id,
              assetTag: match.assetTag,
              title: match.name,
              inRound: inRoundAssetIds.has(match.id),
            })),
          })
        }
      }
      return NextResponse.json({ status: "unknown_asset", candidates })
    }
```

Run `node --test tests/audit-scan-lookup-partial.test.ts tests/audit-scan-lookup.test.ts` → PASS.

- [ ] **Step 5: Room filter on the pending page**

In `src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx`:
- props type: `searchParams: Promise<{ returnTo?: string | string[]; search?: string | string[]; locationId?: string | string[] }>`
- after `const searchText = …`: `const locationFilter = resolveFirstSearchParam(rawSearchParams.locationId ?? "").trim()`
- in `items.where`, after `auditStatus: "pending",`: `...(locationFilter ? { expectedLocationId: locationFilter } : {}),`

- [ ] **Step 6: Run the tests, full checks, commit**

Run: `node --test tests/audit-scan-edit-findings.test.ts tests/audit-scan-lookup-partial.test.ts tests/operational-return-navigation.test.ts tests/audit-scan-correction-approval.test.ts tests/audit-component-scan-api.test.ts tests/audit-scan-lookup.test.ts` → PASS. Then `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add "src/app/api/audit-rounds/[id]/scan/route.ts" "src/app/api/audit-rounds/[id]/scan-lookup/route.ts" "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx" tests/audit-scan-edit-findings.test.ts tests/audit-scan-lookup-partial.test.ts tests/operational-return-navigation.test.ts
git commit -m "fix(audit): close or update pending findings when a scan is corrected, partial register lookup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Header, room picker and room list

**Files:**
- Create: `src/components/audit/use-audit-scan-room.ts`, `src/components/audit/audit-scan-header.tsx`, `src/components/audit/audit-scan-room-picker.tsx`, `src/components/audit/audit-scan-room-list.tsx`
- Modify: `messages/th.json`, `messages/en.json` (`auditScan`, insert after `"auditPhotoUploadFailed"`)
- Test: `tests/audit-scan-room-ui.test.ts`

**Interfaces:**
- Consumes: Task 1 (`AuditScanItemRow`, `AuditScanRoom`, `AuditRoomOption`, `AuditScanListTab`, `getAuditItemBadge`); `buildAuditScanContextStorageKey`, `normalizeAuditScanContext`, `emptyAuditScanContext` (`src/lib/audit-scan-context.ts`); `Sheet*`; `useMediaQuery`; `StatusBadge`.
- Produces:
  - `useAuditScanRoom(roundId: string): readonly [AuditScanRoom, (room: AuditScanRoom) => void]` — persisted per round in localStorage (in-memory fallback)
  - `AuditScanHeader({ roundName, backHref, progress: { total; checked; mismatched } })`
  - `AuditScanRoomPicker({ room, rooms: AuditRoomOption[], onRoomChange })`
  - `AuditScanRoomList({ rows, total, counts, tab, onTabChange, onShowMore, onOpen, queuedAssetIds: ReadonlySet<string>, custodianLabels, locationLabels, showLocation: boolean, pendingHref: string | null })`
  - i18n keys below

- [ ] **Step 1: Write the failing test** — `tests/audit-scan-room-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("the room is remembered per round and survives private browsing", () => {
  const source = read("src/components/audit/use-audit-scan-room.ts")
  assert.match(source, /useSyncExternalStore\(/)
  assert.match(source, /buildAuditScanContextStorageKey\(roundId\)/)
  assert.match(source, /memoryStore/)
  assert.match(source, /\(\) => emptyAuditScanContext/)
})

test("the header is compact: one-line round name and a progress bar with counts", () => {
  const source = read("src/components/audit/audit-scan-header.tsx")
  assert.match(source, /truncate/)
  assert.match(source, /role="progressbar"/)
  assert.match(source, /t\("progressChecked", \{/)
  assert.doesNotMatch(source, /sticky/)
})

test("the room picker is a sheet with search, pending counts, department and a clear option", () => {
  const source = read("src/components/audit/audit-scan-room-picker.tsx")
  assert.match(source, /<SheetTrigger asChild>/)
  assert.match(source, /side=\{isDesktop \? "right" : "bottom"\}/)
  assert.match(source, /t\("roomPendingOfTotal", \{ pending: option\.pending, total: option\.total \}\)/)
  assert.match(source, /t\("roomAllDepartments"\)/)
  assert.match(source, /choose\(\{ locationId: "", departmentId: "" \}\)/)
  assert.match(source, /min-h-11/)
})

test("the room list has three counted tabs, 44px rows, show-more and a link to the pending page", () => {
  const source = read("src/components/audit/audit-scan-room-list.tsx")
  assert.match(source, /\(\["pending", "checked", "all"\] as const\)/)
  assert.match(source, /aria-pressed=\{tab === key\}/)
  assert.match(source, /data-audit-scan-row/)
  assert.match(source, /min-h-14/)
  assert.match(source, /queuedAssetIds\.has\(item\.assetId\)/)
  assert.match(source, /t\("showMore"\)/)
  assert.match(source, /href=\{pendingHref\}/)
})

test("room and list copy exists in Thai and English", () => {
  const keys = ["progressChecked", "progressMismatch", "roomPick", "roomChange", "roomSheetTitle", "roomSheetHelp", "roomSheetSearch", "roomPendingOfTotal", "roomDepartment", "roomAllDepartments", "roomClear", "roomListLabel", "tabPending", "tabChecked", "tabAll", "showMore", "checkedBy", "badgeFound", "badgeMismatch", "badgeNotFound", "badgeOutOfScope", "badgeQueued", "emptyPending", "emptyChecked", "emptyAll", "pendingLink"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
  assert.equal(messages("th").roomPick, "เลือกห้องที่กำลังตรวจ")
})
```

- [ ] **Step 2: Run it and confirm it fails** — `node --test tests/audit-scan-room-ui.test.ts` → FAIL (ENOENT).

- [ ] **Step 3: Add the messages** (inside `"auditScan"`, after `"auditPhotoUploadFailed"`)

th:
```json
    "progressChecked": "ตรวจแล้ว {checked} / {total}",
    "progressMismatch": "ไม่ตรง {count}",
    "roomPick": "เลือกห้องที่กำลังตรวจ",
    "roomChange": "เปลี่ยน",
    "roomSheetTitle": "ห้องที่กำลังตรวจ",
    "roomSheetHelp": "เลือกครั้งเดียว ระบบจำไว้ทั้งรอบ และใช้เป็นที่ตั้งจริงของชิ้นที่ตรวจ",
    "roomSheetSearch": "ค้นหาห้อง",
    "roomPendingOfTotal": "ยังไม่ตรวจ {pending} / {total}",
    "roomDepartment": "แผนก",
    "roomAllDepartments": "ทุกแผนก",
    "roomClear": "ไม่เลือกห้อง",
    "roomListLabel": "รายการในห้อง",
    "tabPending": "ยังไม่ตรวจ",
    "tabChecked": "ตรวจแล้ว",
    "tabAll": "ทั้งหมด",
    "showMore": "แสดงเพิ่ม",
    "checkedBy": "ตรวจโดย {name} · {time}",
    "badgeFound": "ตรวจแล้ว",
    "badgeMismatch": "ไม่ตรง",
    "badgeNotFound": "หาไม่พบ",
    "badgeOutOfScope": "นอกขอบเขต",
    "badgeQueued": "รอส่ง",
    "emptyPending": "ตรวจครบทุกชิ้นแล้ว",
    "emptyChecked": "ยังไม่มีชิ้นที่ตรวจ",
    "emptyAll": "ไม่มีรายการในห้องนี้",
    "pendingLink": "ของที่หาไม่เจอ → รายการค้าง",
```

en:
```json
    "progressChecked": "Checked {checked} / {total}",
    "progressMismatch": "{count} mismatched",
    "roomPick": "Choose the room you are checking",
    "roomChange": "Change",
    "roomSheetTitle": "Room being checked",
    "roomSheetHelp": "Pick it once; it is remembered for this round and used as the found location.",
    "roomSheetSearch": "Search rooms",
    "roomPendingOfTotal": "{pending} of {total} left",
    "roomDepartment": "Department",
    "roomAllDepartments": "All departments",
    "roomClear": "No room",
    "roomListLabel": "Items in this room",
    "tabPending": "To check",
    "tabChecked": "Checked",
    "tabAll": "All",
    "showMore": "Show more",
    "checkedBy": "Checked by {name} · {time}",
    "badgeFound": "Checked",
    "badgeMismatch": "Mismatch",
    "badgeNotFound": "Not found",
    "badgeOutOfScope": "Out of scope",
    "badgeQueued": "Waiting to send",
    "emptyPending": "Everything here is checked",
    "emptyChecked": "Nothing checked yet",
    "emptyAll": "No items in this room",
    "pendingLink": "Can't find something → pending list",
```

- [ ] **Step 4: Create `src/components/audit/use-audit-scan-room.ts`**

```ts
"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
  buildAuditScanContextStorageKey,
  emptyAuditScanContext,
  normalizeAuditScanContext,
  type AuditScanContext,
} from "@/lib/audit-scan-context"

// Private browsing can block localStorage; the room still works for this tab.
const memoryStore = new Map<string, string>()
const snapshotCache = new Map<string, { raw: string | null; value: AuditScanContext }>()

function readRaw(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey)
  } catch {
    return memoryStore.get(storageKey) ?? null
  }
}

function readRoom(storageKey: string): AuditScanContext {
  const raw = readRaw(storageKey)
  const cached = snapshotCache.get(storageKey)
  if (cached && cached.raw === raw) return cached.value
  let value = emptyAuditScanContext
  if (raw) {
    try {
      value = normalizeAuditScanContext(JSON.parse(raw) as Partial<AuditScanContext>)
    } catch {
      value = emptyAuditScanContext
    }
  }
  snapshotCache.set(storageKey, { raw, value })
  return value
}

export function useAuditScanRoom(roundId: string) {
  const storageKey = buildAuditScanContextStorageKey(roundId)
  const room = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(storageKey, onChange)
      window.addEventListener("storage", onChange)
      return () => {
        window.removeEventListener(storageKey, onChange)
        window.removeEventListener("storage", onChange)
      }
    },
    () => readRoom(storageKey),
    () => emptyAuditScanContext,
  )

  const setRoom = useCallback((next: AuditScanContext) => {
    const raw = JSON.stringify(normalizeAuditScanContext(next))
    try {
      window.localStorage.setItem(storageKey, raw)
    } catch {
      memoryStore.set(storageKey, raw)
    }
    window.dispatchEvent(new Event(storageKey))
  }, [storageKey])

  return [room, setRoom] as const
}
```

- [ ] **Step 5: Create `src/components/audit/audit-scan-header.tsx`**

```tsx
"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

export function AuditScanHeader({
  roundName,
  backHref,
  progress,
}: {
  roundName: string
  backHref: string
  progress: { total: number; checked: number; mismatched: number }
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const numberLocale = useLocale() === "th" ? "th-TH" : "en-US"
  const percent = progress.total === 0 ? 0 : Math.round((progress.checked / progress.total) * 100)

  return (
    <header data-audit-scan-header className="mb-2">
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href={backHref}
          aria-label={tCommon("back")}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground md:text-xl" title={roundName}>
          {roundName}
        </h1>
      </div>
      <div className="mt-1 px-1">
        <div
          role="progressbar"
          aria-label={t("progress")}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.checked}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-1 flex justify-between gap-2 text-xs tabular-nums text-muted-foreground">
          <span>{t("progressChecked", { checked: progress.checked.toLocaleString(numberLocale), total: progress.total.toLocaleString(numberLocale) })}</span>
          {progress.mismatched > 0 ? (
            <span className="font-medium text-warning">{t("progressMismatch", { count: progress.mismatched.toLocaleString(numberLocale) })}</span>
          ) : null}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 6: Create `src/components/audit/audit-scan-room-picker.tsx`**

```tsx
"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
import type { AuditRoomOption, AuditScanRoom } from "@/lib/audit-scan-session"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function AuditScanRoomPicker({
  room,
  rooms,
  onRoomChange,
}: {
  room: AuditScanRoom
  rooms: AuditRoomOption[]
  onRoomChange: (room: AuditScanRoom) => void
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const isDesktop = useMediaQuery("(min-width: 48rem)")
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selected = rooms.find((option) => option.locationId === room.locationId)
  const selectedDepartment = selected?.departments.find((department) => department.departmentId === room.departmentId)
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return needle ? rooms.filter((option) => option.label.toLocaleLowerCase().includes(needle)) : rooms
  }, [query, rooms])

  function choose(next: AuditScanRoom) {
    onRoomChange(next)
    setOpen(false)
    setQuery("")
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery("") }}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-audit-scan-room
          className={cn(
            "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selected ? "border-info-border bg-primary-soft text-primary" : "border-dashed border-border bg-surface text-muted-foreground hover:bg-accent",
          )}
        >
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {selected ? [selected.label, selectedDepartment?.label].filter(Boolean).join(" · ") : t("roomPick")}
          </span>
          {selected ? <span className="shrink-0 text-xs">{t("roomChange")}</span> : null}
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        closeLabel={tCommon("close")}
        className={isDesktop ? "w-full gap-0 sm:max-w-md" : "max-h-[85dvh] gap-0 rounded-t-xl"}
      >
        <SheetHeader className="border-b border-border pr-14">
          <SheetTitle>{t("roomSheetTitle")}</SheetTitle>
          <SheetDescription>{t("roomSheetHelp")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 border-b border-border p-4">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("roomSheetSearch")}
            aria-label={t("roomSheetSearch")}
            className={getFieldControlClasses()}
          />
          {selected && selected.departments.length > 0 ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("roomDepartment")}</span>
              <select
                value={room.departmentId}
                onChange={(event) => choose({ locationId: room.locationId, departmentId: event.target.value })}
                className={getFieldControlClasses()}
              >
                <option value="">{t("roomAllDepartments")}</option>
                {selected.departments.map((department) => (
                  <option key={department.departmentId} value={department.departmentId}>
                    {department.label} ({department.total})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.map((option) => {
            const active = option.locationId === room.locationId
            return (
              <li key={option.locationId}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose({ locationId: option.locationId, departmentId: "" })}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active && "bg-primary-soft text-primary",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {t("roomPendingOfTotal", { pending: option.pending, total: option.total })}
                  </span>
                  {active ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => choose({ locationId: "", departmentId: "" })}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("roomClear")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 7: Create `src/components/audit/audit-scan-room-list.tsx`**

```tsx
"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { getAuditItemBadge, type AuditItemBadge, type AuditScanItemRow, type AuditScanListTab } from "@/lib/audit-scan-session"
import { cn } from "@/lib/utils"

const badgeTone: Record<AuditItemBadge | "queued", StatusTone> = {
  found: "success",
  mismatch: "warning",
  not_found: "danger",
  out_of_scope: "info",
  queued: "muted",
}
const badgeLabelKey = {
  found: "badgeFound",
  mismatch: "badgeMismatch",
  not_found: "badgeNotFound",
  out_of_scope: "badgeOutOfScope",
  queued: "badgeQueued",
} as const
const tabLabelKey = { pending: "tabPending", checked: "tabChecked", all: "tabAll" } as const
const emptyLabelKey = { pending: "emptyPending", checked: "emptyChecked", all: "emptyAll" } as const

export function AuditScanRoomList({
  rows,
  total,
  counts,
  tab,
  onTabChange,
  onShowMore,
  onOpen,
  queuedAssetIds,
  custodianLabels,
  locationLabels,
  showLocation,
  pendingHref,
}: {
  rows: AuditScanItemRow[]
  total: number
  counts: Record<AuditScanListTab, number>
  tab: AuditScanListTab
  onTabChange: (tab: AuditScanListTab) => void
  onShowMore: () => void
  onOpen: (item: AuditScanItemRow) => void
  queuedAssetIds: ReadonlySet<string>
  custodianLabels: ReadonlyMap<string, string>
  locationLabels: ReadonlyMap<string, string>
  showLocation: boolean
  pendingHref: string | null
}) {
  const t = useTranslations("auditScan")
  const locale = useLocale()
  const timeFormat = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit" })

  function secondLine(item: AuditScanItemRow) {
    if (item.scannedByName && item.lastScanAt) {
      return t("checkedBy", { name: item.scannedByName, time: timeFormat.format(new Date(item.lastScanAt)) })
    }
    const place = showLocation ? locationLabels.get(item.expectedLocationId) : null
    const custodian = item.expectedCustodianId ? custodianLabels.get(item.expectedCustodianId) : null
    return [item.name, place ?? custodian].filter(Boolean).join(" · ")
  }

  return (
    <section data-audit-scan-room-list aria-label={t("roomListLabel")}>
      <div role="group" aria-label={t("roomListLabel")} className="flex gap-1 rounded-md bg-muted p-1">
        {(["pending", "checked", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => onTabChange(key)}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9",
              tab === key ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tabLabelKey[key])}
            <span className="tabular-nums">{counts[key]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t(emptyLabelKey[tab])}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
          {rows.map((item) => {
            const badge = queuedAssetIds.has(item.assetId) ? "queued" : getAuditItemBadge(item)
            return (
              <li key={item.itemId}>
                <button
                  type="button"
                  data-audit-scan-row
                  onClick={() => onOpen(item)}
                  className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{item.assetTag}</span>
                    <span className="block truncate text-xs text-muted-foreground">{secondLine(item)}</span>
                  </span>
                  {badge ? (
                    <StatusBadge size="xs" label={t(badgeLabelKey[badge])} tone={badgeTone[badge]} className="shrink-0" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {total > rows.length ? (
        <button
          type="button"
          onClick={onShowMore}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("showMore")}
        </button>
      ) : null}

      {tab === "pending" && pendingHref ? (
        <Link
          href={pendingHref}
          className="mt-3 inline-flex min-h-11 items-center px-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("pendingLink")}
        </Link>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 8: Run the test, full checks, commit**

Run: `node --test tests/audit-scan-room-ui.test.ts` → PASS; then `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add src/components/audit/use-audit-scan-room.ts src/components/audit/audit-scan-header.tsx src/components/audit/audit-scan-room-picker.tsx src/components/audit/audit-scan-room-list.tsx messages/th.json messages/en.json tests/audit-scan-room-ui.test.ts
git commit -m "feat(audit): scan header, room picker and room list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Search field, results, register lookup card and camera

**Files:**
- Create: `src/components/audit/audit-scan-search.tsx`, `src/components/audit/audit-scan-lookup-card.tsx`, `src/components/audit/audit-scan-camera.tsx`
- Modify: `src/components/audit/audit-scan-types.ts` (lookup response gains `candidates`), `messages/th.json`, `messages/en.json` (after `"pendingLink"`)
- Test: `tests/audit-scan-search-ui.test.ts`

**Interfaces:**
- Consumes: Task 1 (`AuditSearchMatch`, `AuditScanRoom`, `isAuditItemChecked`, `getAuditItemBadge`, `splitSearchHighlight`); `AuditLookupAsset` (`audit-scan-types.ts`); `startNativeAssetQrScanner`, `NativeAssetQrScannerRuntime` (`@/lib/asset-qr-scanner`); `resolvePreferredCameraSelection`, `getFallbackCameraAfterEnvironmentFailure`, `PreferredCameraSelection` (`@/lib/camera-selection`); `AuditQrScannerOverlay` (`./audit-scan-panels`).
- Produces:
  - `AuditScanSearchField({ value, cameraOpen, inputRef, onValueChange, onTermChange, onSubmit, onToggleCamera, onClear })`
  - `AuditScanSearchResults({ term, matches, room, locationLabels, queuedAssetIds, onOpen, lookup: ReactNode })`
  - `type AuditLookupState = { status: "idle" } | { status: "loading" } | { status: "out_of_scope"; asset: AuditLookupAsset } | { status: "candidates"; matches: AuditLookupMatch[] } | { status: "unknown" } | { status: "offline" } | { status: "error"; message: string }`
  - `type AuditLookupMatch = { assetId: string; assetTag: string; title: string; inRound: boolean }`
  - `AuditScanLookupCard({ state, onSearchRegister, onRecordOutOfScope, onPickMatch })`
  - `AuditScanCamera({ onDecoded: (text: string) => void, onClose: () => void })` — mounts → starts, unmounts → stops
  - `AuditScanLookupResponse` union gains `| { status: "candidates"; candidates?: string[]; matches: AuditLookupMatch[] }`

- [ ] **Step 1: Write the failing test** — `tests/audit-scan-search-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("the search field sticks to the top on phones, avoids iOS zoom and holds the camera button", () => {
  const source = read("src/components/audit/audit-scan-search.tsx")
  assert.match(source, /<form[\s\S]*?role="search"/)
  assert.match(source, /sticky top-0[^"]*md:static/)
  assert.match(source, /text-base/)
  assert.match(source, /inputMode="search"/)
  assert.match(source, /enterKeyHint="search"/)
  assert.match(source, /aria-label=\{cameraOpen \? t\("stopCamera"\) : t\("openCamera"\)\}/)
  assert.match(source, /size-11/)
})

test("typing never searches mid-composition and Enter submits", () => {
  const source = read("src/components/audit/audit-scan-search.tsx")
  assert.match(source, /onCompositionEnd=\{\(event\) => \{[\s\S]*?onTermChange\(event\.currentTarget\.value\)/)
  assert.match(source, /composingRef\.current \|\| \(event\.nativeEvent as InputEvent\)\.isComposing/)
  assert.match(source, /onSubmit=\{\(event\) => \{\s*event\.preventDefault\(\)\s*onSubmit\(\)/)
})

test("results highlight the match, warn about another room, and fall back to the register card", () => {
  const source = read("src/components/audit/audit-scan-search.tsx")
  assert.match(source, /splitSearchHighlight\(/)
  assert.match(source, /<mark/)
  assert.match(source, /room\.locationId && match\.item\.expectedLocationId !== room\.locationId/)
  assert.match(source, /matches\.length === 0 \? lookup/)
})

test("the lookup card never says not-found for offline or server errors", () => {
  const source = read("src/components/audit/audit-scan-lookup-card.tsx")
  for (const status of ["idle", "loading", "out_of_scope", "candidates", "unknown", "offline", "error"]) {
    assert.match(source, new RegExp(`state\\.status === "${status}"`), status)
  }
  assert.match(source, /t\("lookupOffline"\)/)
  assert.match(source, /state\.message/)
})

test("the camera starts after mount, stops on unmount, reads one code and explains a blocked permission", () => {
  const source = read("src/components/audit/audit-scan-camera.tsx")
  assert.match(source, /window\.setTimeout\(\(\) => \{[\s\S]*?void start\(\)/)
  assert.match(source, /return \(\) => \{[\s\S]*?scanner\.stop\(\)/)
  assert.match(source, /stopAfterSuccess: true/)
  assert.match(source, /id="audit-qr-reader"/)
  assert.match(source, /NotAllowedError/)
  assert.match(source, /t\("cameraPermissionDenied"\)/)
  assert.match(source, /error\.name === "NotAllowedError"/)
  assert.match(source, /scrollIntoView/)
  assert.match(source, /\}, \[\]\)/)
})

test("search and lookup copy exists in Thai and English", () => {
  const keys = ["searchItemsLabel", "searchItemsPlaceholder", "searchClear", "openCamera", "searchResultCount", "searchNoResult", "searchRegister", "searchRegisterLoading", "lookupOutOfScope", "lookupCandidates", "lookupInRound", "lookupNotInRound", "lookupUnknown", "lookupOffline", "matchedSerial", "matchedFixedAsset", "matchedCustodian", "inLocation", "badgePending", "cameraPermissionDenied"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
})
```

- [ ] **Step 2: Run it and confirm it fails** — `node --test tests/audit-scan-search-ui.test.ts` → FAIL (ENOENT).

- [ ] **Step 3: Add the messages** (inside `"auditScan"`, after `"pendingLink"`)

th:
```json
    "searchItemsLabel": "ค้นหาทรัพย์สินในรอบนี้",
    "searchItemsPlaceholder": "พิมพ์รหัส ชื่อ หรือ Serial",
    "searchClear": "ล้างคำค้นหา",
    "openCamera": "เปิดกล้องอ่าน QR",
    "searchResultCount": "พบ {count} รายการในรอบนี้ · Enter = เปิดรายการแรก",
    "searchNoResult": "ไม่พบในรอบนี้",
    "searchRegister": "ค้นในทะเบียนทั้งหมด",
    "searchRegisterLoading": "กำลังค้นในทะเบียน…",
    "lookupOutOfScope": "{assetTag} ไม่อยู่ในขอบเขตรอบนี้",
    "lookupCandidates": "พบในทะเบียน {count} รายการ",
    "lookupInRound": "ในรอบนี้",
    "lookupNotInRound": "นอกรอบ",
    "lookupUnknown": "ไม่พบรหัสนี้ในทะเบียน · ตรวจตัวสะกดหรือพิมพ์ Serial",
    "lookupOffline": "ค้นนอกรอบต้องใช้อินเทอร์เน็ต",
    "matchedSerial": "Serial {value}",
    "matchedFixedAsset": "รหัสบัญชี {value}",
    "matchedCustodian": "ผู้ถือ {value}",
    "inLocation": "อยู่ {location}",
    "badgePending": "ยังไม่ตรวจ",
    "cameraPermissionDenied": "ไม่ได้รับอนุญาตใช้กล้อง · เปิดสิทธิ์กล้องในการตั้งค่าเบราว์เซอร์ หรือพิมพ์ค้นหาแทน",
```

en:
```json
    "searchItemsLabel": "Search assets in this round",
    "searchItemsPlaceholder": "Type a tag, name or serial",
    "searchClear": "Clear search",
    "openCamera": "Open the camera to read a QR code",
    "searchResultCount": "{count} in this round · Enter opens the first",
    "searchNoResult": "Not in this round",
    "searchRegister": "Search the whole register",
    "searchRegisterLoading": "Searching the register…",
    "lookupOutOfScope": "{assetTag} is outside this round",
    "lookupCandidates": "{count} found in the register",
    "lookupInRound": "In this round",
    "lookupNotInRound": "Outside the round",
    "lookupUnknown": "No asset has this code · check the spelling or type the serial",
    "lookupOffline": "Searching outside the round needs internet",
    "matchedSerial": "Serial {value}",
    "matchedFixedAsset": "Fixed asset {value}",
    "matchedCustodian": "Custodian {value}",
    "inLocation": "In {location}",
    "badgePending": "To check",
    "cameraPermissionDenied": "Camera permission is blocked · allow the camera in your browser settings, or type to search",
```

- [ ] **Step 4: Extend the lookup response type** in `src/components/audit/audit-scan-types.ts`:

```ts
export type AuditLookupMatch = { assetId: string; assetTag: string; title: string; inRound: boolean }
export type AuditScanLookupResponse =
  | { status: "in_round"; asset: AuditLookupAsset; item?: { assetId: string } }
  | { status: "out_of_scope"; asset: AuditLookupAsset }
  | { status: "candidates"; candidates?: string[]; matches: AuditLookupMatch[] }
  | { status: "unknown_asset"; candidates?: string[] }
```

- [ ] **Step 5: Create `src/components/audit/audit-scan-search.tsx`**

```tsx
"use client"

import { useRef, type ReactNode, type RefObject } from "react"
import { Camera, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  getAuditItemBadge,
  splitSearchHighlight,
  type AuditScanItemRow,
  type AuditScanRoom,
  type AuditSearchMatch,
} from "@/lib/audit-scan-session"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function AuditScanSearchField({
  value,
  cameraOpen,
  inputRef,
  onValueChange,
  onTermChange,
  onSubmit,
  onToggleCamera,
  onClear,
}: {
  value: string
  cameraOpen: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onValueChange: (value: string) => void
  onTermChange: (term: string) => void
  onSubmit: () => void
  onToggleCamera: () => void
  onClear: () => void
}) {
  const t = useTranslations("auditScan")
  const composingRef = useRef(false)

  return (
    <form
      role="search"
      data-audit-scan-search
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="sticky top-0 z-20 -mx-4 bg-background px-4 py-2 sm:-mx-6 sm:px-6 md:static md:mx-0 md:px-0"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          aria-label={t("searchItemsLabel")}
          placeholder={t("searchItemsPlaceholder")}
          value={value}
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={(event) => {
            composingRef.current = false
            onTermChange(event.currentTarget.value)
          }}
          onChange={(event) => {
            onValueChange(event.target.value)
            if (composingRef.current || (event.nativeEvent as InputEvent).isComposing) return
            onTermChange(event.target.value)
          }}
          className={cn(getFieldControlClasses(), "h-12 pl-9 pr-24 text-base sm:h-12")}
        />
        <div className="absolute inset-y-0 right-0.5 flex items-center gap-0.5">
          {value ? (
            <button
              type="button"
              aria-label={t("searchClear")}
              onClick={onClear}
              className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label={cameraOpen ? t("stopCamera") : t("openCamera")}
            aria-pressed={cameraOpen}
            onClick={onToggleCamera}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              cameraOpen ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "text-foreground hover:bg-accent",
            )}
          >
            <Camera className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  )
}

export function AuditScanSearchResults({
  term,
  matches,
  room,
  locationLabels,
  queuedAssetIds,
  onOpen,
  lookup,
}: {
  term: string
  matches: AuditSearchMatch[]
  room: AuditScanRoom
  locationLabels: ReadonlyMap<string, string>
  queuedAssetIds: ReadonlySet<string>
  onOpen: (item: AuditScanItemRow) => void
  lookup: ReactNode
}) {
  const t = useTranslations("auditScan")

  function detail(match: AuditSearchMatch) {
    if (match.field === "serialNumber") return { prefix: t("matchedSerial", { value: "" }), value: match.value }
    if (match.field === "fixedAssetCode") return { prefix: t("matchedFixedAsset", { value: "" }), value: match.value }
    if (match.field === "custodian") return { prefix: t("matchedCustodian", { value: "" }), value: match.value }
    return { prefix: "", value: match.item.name }
  }

  function highlight(value: string) {
    const parts = splitSearchHighlight(value, term)
    if (!parts) return value
    return (
      <>
        {parts[0]}
        <mark className="rounded-sm bg-warning-soft px-0.5 text-foreground">{parts[1]}</mark>
        {parts[2]}
      </>
    )
  }

  return (
    <section data-audit-scan-results aria-live="polite">
      {matches.length === 0 ? lookup : (
        <>
          <p className="px-1 pb-1 text-xs text-muted-foreground">{t("searchResultCount", { count: matches.length })}</p>
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
            {matches.map((match) => {
              const line = detail(match)
              const badge = queuedAssetIds.has(match.item.assetId) ? "queued" : getAuditItemBadge(match.item)
              const elsewhere = room.locationId && match.item.expectedLocationId !== room.locationId
              return (
                <li key={match.item.itemId}>
                  <button
                    type="button"
                    onClick={() => onOpen(match.item)}
                    className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {match.field === "assetTag" ? highlight(match.item.assetTag) : match.item.assetTag}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {line.prefix}
                        {match.field === "assetTag" ? line.value : highlight(line.value)}
                      </span>
                    </span>
                    {badge === "queued" ? (
                      <StatusBadge size="xs" label={t("badgeQueued")} tone="muted" className="shrink-0" />
                    ) : badge ? (
                      <StatusBadge size="xs" label={t(badge === "found" ? "badgeFound" : badge === "mismatch" ? "badgeMismatch" : badge === "not_found" ? "badgeNotFound" : "badgeOutOfScope")} tone={badge === "found" ? "success" : badge === "mismatch" ? "warning" : badge === "not_found" ? "danger" : "info"} className="shrink-0" />
                    ) : elsewhere ? (
                      <StatusBadge size="xs" label={t("inLocation", { location: locationLabels.get(match.item.expectedLocationId) ?? match.item.expectedLocationId })} tone="warning" className="max-w-40 shrink-0" />
                    ) : (
                      <StatusBadge size="xs" label={t("badgePending")} tone="muted" className="shrink-0" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
```

(`matchedSerial` etc. are rendered with an empty `{value}` as the prefix, followed by the highlighted value.)

- [ ] **Step 6: Create `src/components/audit/audit-scan-lookup-card.tsx`**

```tsx
"use client"

import { Loader2, SearchCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AuditLookupAsset, AuditLookupMatch } from "@/components/audit/audit-scan-types"

export type { AuditLookupMatch } from "@/components/audit/audit-scan-types"

export type AuditLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "out_of_scope"; asset: AuditLookupAsset }
  | { status: "candidates"; matches: AuditLookupMatch[] }
  | { status: "unknown" }
  | { status: "offline" }
  | { status: "error"; message: string }

export function AuditScanLookupCard({
  state,
  onSearchRegister,
  onRecordOutOfScope,
  onPickMatch,
}: {
  state: AuditLookupState
  onSearchRegister: () => void
  onRecordOutOfScope: (asset: AuditLookupAsset) => void
  onPickMatch: (match: AuditLookupMatch) => void
}) {
  const t = useTranslations("auditScan")

  return (
    <div data-audit-scan-lookup className="rounded-md border border-border bg-surface p-3">
      <p className="text-sm font-medium text-foreground">{t("searchNoResult")}</p>
      {state.status === "idle" ? (
        <Button type="button" variant="outline" className="mt-2 w-full" onClick={onSearchRegister}>
          <SearchCheck aria-hidden="true" />
          {t("searchRegister")}
        </Button>
      ) : null}
      {state.status === "loading" ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t("searchRegisterLoading")}
        </p>
      ) : null}
      {state.status === "out_of_scope" ? (
        <div className="mt-2 rounded-md border border-warning-border bg-warning-soft p-3">
          <p className="text-sm font-semibold text-warning">{t("lookupOutOfScope", { assetTag: state.asset.assetTag })}</p>
          <p className="mt-0.5 text-xs text-foreground">{state.asset.subtitle}</p>
          <Button type="button" variant="outline" className="mt-2" onClick={() => onRecordOutOfScope(state.asset)}>
            {t("recordOutOfScope")}
          </Button>
        </div>
      ) : null}
      {state.status === "candidates" ? (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">{t("lookupCandidates", { count: state.matches.length })}</p>
          <ul className="mt-1 divide-y divide-border rounded-md border border-border">
            {state.matches.map((match) => (
              <li key={match.assetId}>
                <button
                  type="button"
                  onClick={() => onPickMatch(match)}
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{match.assetTag}</span>
                    <span className="block truncate text-xs text-muted-foreground">{match.title}</span>
                  </span>
                  <StatusBadge size="xs" label={match.inRound ? t("lookupInRound") : t("lookupNotInRound")} tone={match.inRound ? "info" : "muted"} className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.status === "unknown" ? <p className="mt-2 text-sm text-muted-foreground">{t("lookupUnknown")}</p> : null}
      {state.status === "offline" ? <p className="mt-2 text-sm text-warning">{t("lookupOffline")}</p> : null}
      {state.status === "error" ? <p className="mt-2 text-sm text-danger" role="alert">{state.message}</p> : null}
    </div>
  )
}
```

- [ ] **Step 7: Create `src/components/audit/audit-scan-camera.tsx`**

Move the camera logic out of `audit-scan-form.tsx` (its `startScanner`/`stopScanner` at lines 699-776, torch/zoom helpers at 564-640, and the camera panel markup at 1386-1440) into this self-contained component. The form keeps working until Task 9 deletes it; do not edit the form.

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Flashlight, FlashlightOff, Loader2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { AuditQrScannerOverlay } from "@/components/audit/audit-scan-panels"
import type { CameraDevice } from "@/components/audit/audit-scan-types"
import { startNativeAssetQrScanner, type NativeAssetQrScannerRuntime } from "@/lib/asset-qr-scanner"
import {
  getFallbackCameraAfterEnvironmentFailure,
  resolvePreferredCameraSelection,
  type PreferredCameraSelection,
} from "@/lib/camera-selection"
import { cn } from "@/lib/utils"

function isCameraAccessSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
}

export function AuditScanCamera({ onDecoded, onClose }: { onDecoded: (text: string) => void; onClose: () => void }) {
  const t = useTranslations("auditScan")
  const panelRef = useRef<HTMLDivElement | null>(null)
  const scannerRef = useRef<NativeAssetQrScannerRuntime | null>(null)
  const onDecodedRef = useRef(onDecoded)
  // Messages read through a ref so a new translator object never restarts the camera.
  const textRef = useRef({ unsupported: "", notFound: "", denied: "", failed: "" })
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState("")
  const [torch, setTorch] = useState({ available: false, enabled: false, updating: false })
  const [zoom, setZoom] = useState({ levels: [] as number[], level: 0, updating: false })

  useEffect(() => {
    onDecodedRef.current = onDecoded
    textRef.current = {
      unsupported: t("cameraUnsupported"),
      notFound: t("cameraNotFound"),
      denied: t("cameraPermissionDenied"),
      failed: t("cameraError"),
    }
  })

  useEffect(() => {
    let cancelled = false

    async function start() {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      if (!isCameraAccessSupported()) {
        setLoading(false)
        setErrorText(textRef.current.unsupported)
        return
      }
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        const cameras = (await Html5Qrcode.getCameras()) as CameraDevice[]
        if (cancelled) return
        if (cameras.length === 0) {
          setErrorText(textRef.current.notFound)
          return
        }
        const startWith = async (selection: PreferredCameraSelection) => {
          const scanner = await startNativeAssetQrScanner({
            readerId: "audit-qr-reader",
            cameraSelection: selection,
            stopAfterSuccess: true,
            onScanSuccess: (decodedText) => onDecodedRef.current(decodedText.trim()),
          })
          if (cancelled) {
            scanner.stop()
            return
          }
          scannerRef.current = scanner
          setTorch({ available: Boolean(scanner.torch?.isAvailable()), enabled: Boolean(scanner.torch?.isEnabled()), updating: false })
          const levels = scanner.zoom?.isAvailable() ? scanner.zoom.getSupportedLevels() : []
          setZoom({ levels, level: levels.length > 0 && scanner.zoom ? scanner.zoom.getZoom() : 0, updating: false })
          setRunning(true)
        }
        const selection = resolvePreferredCameraSelection(cameras, undefined)
        try {
          await startWith(selection)
        } catch (startError) {
          const fallback = getFallbackCameraAfterEnvironmentFailure(selection, cameras)
          if (!fallback) throw startError
          await startWith(resolvePreferredCameraSelection([fallback], fallback.id))
        }
      } catch (error) {
        if (cancelled) return
        const denied = error instanceof Error && (error.name === "NotAllowedError" || error.name === "SecurityError")
        setErrorText(denied ? textRef.current.denied : error instanceof Error ? error.message : textRef.current.failed)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timer = window.setTimeout(() => {
      void start()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) {
        try {
          scanner.stop()
        } catch {
          // The browser may already have stopped the track.
        }
      }
    }
  }, [])

  async function toggleTorch() {
    const control = scannerRef.current?.torch
    if (!control?.isAvailable()) {
      toast.warning(t("torchUnsupported"))
      return
    }
    setTorch((current) => ({ ...current, updating: true }))
    const next = !torch.enabled
    const applied = await control.setEnabled(next)
    setTorch({ available: applied, enabled: applied ? next : false, updating: false })
    if (!applied) toast.warning(t("torchUnsupported"))
  }

  async function changeZoom(level: number) {
    const control = scannerRef.current?.zoom
    if (!control?.isAvailable()) {
      toast.warning(t("zoomUnsupported"))
      return
    }
    setZoom((current) => ({ ...current, updating: true }))
    const applied = await control.setZoom(level)
    setZoom({ levels: applied ? control.getSupportedLevels() : [], level: applied ? control.getZoom() : 0, updating: false })
    if (!applied) toast.warning(t("zoomUnsupported"))
  }

  return (
    <div ref={panelRef} data-audit-scan-camera className="relative isolate mb-2 overflow-hidden rounded-md border border-border bg-surface">
      <div className="relative aspect-square w-full sm:aspect-[4/3]">
        <div id="audit-qr-reader" className="w-full [&_video]:!h-auto [&_video]:!w-full" />
        {running ? <AuditQrScannerOverlay /> : null}
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          </div>
        ) : null}
        {running && zoom.levels.length > 0 ? (
          <div className="absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-md border border-white/50 bg-slate-950/70 p-1">
            {zoom.levels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => void changeZoom(level)}
                disabled={zoom.updating}
                aria-pressed={Math.abs(zoom.level - level) < 0.05}
                aria-label={t("zoomCamera", { level })}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-sm font-semibold",
                  Math.abs(zoom.level - level) < 0.05 ? "bg-white text-slate-950" : "text-white hover:bg-white/15",
                )}
              >
                {level}x
              </button>
            ))}
          </div>
        ) : null}
        <div className="absolute right-2 top-2 z-20 flex gap-1">
          {running && torch.available ? (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              disabled={torch.updating}
              aria-pressed={torch.enabled}
              aria-label={t(torch.enabled ? "torchOff" : "torchOn")}
              className="inline-flex size-11 items-center justify-center rounded-md border border-white/50 bg-slate-950/70 text-white"
            >
              {torch.enabled ? <FlashlightOff className="size-4" aria-hidden="true" /> : <Flashlight className="size-4" aria-hidden="true" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("stopCamera")}
            className="inline-flex size-11 items-center justify-center rounded-md border border-white/50 bg-slate-950/70 text-white"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {errorText ? (
        <p role="alert" className="border-t border-border bg-warning-soft p-3 text-sm text-warning">
          {errorText}
        </p>
      ) : null}
    </div>
  )
}
```

Notes for the implementer:
- `bg-slate-950/70` and `bg-white/15` are the existing camera-overlay classes from the form (dark scrim over live video, not status tints); keep them. Check `tests/ui-overlay-guards.test.ts` still passes.
- If `resolvePreferredCameraSelection`'s second parameter is not optional in `src/lib/camera-selection.ts`, pass `undefined` explicitly as written.
- The overlay `div.absolute.inset-0` is fine for the guard (it bans `fixed inset-0`, not `absolute inset-0`).

- [ ] **Step 8: Run the test, full checks, commit**

Run: `node --test tests/audit-scan-search-ui.test.ts tests/ui-overlay-guards.test.ts` → PASS; then `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add src/components/audit/audit-scan-search.tsx src/components/audit/audit-scan-lookup-card.tsx src/components/audit/audit-scan-camera.tsx src/components/audit/audit-scan-types.ts messages/th.json messages/en.json tests/audit-scan-search-ui.test.ts
git commit -m "feat(audit): scan search with highlights, register lookup card and camera panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The check sheet

**Files:**
- Create: `src/components/audit/audit-scan-check-field.tsx`, `src/components/audit/audit-scan-check-form.tsx`, `src/components/audit/audit-scan-check-panel.tsx`, `src/components/audit/audit-scan-component-missing-dialog.tsx`
- Modify: `messages/th.json`, `messages/en.json` (after `"cameraPermissionDenied"`)
- Test: `tests/audit-scan-check-ui.test.ts`

**Interfaces:**
- Consumes: Task 2 (`buildCheckDefaults`, `diffCheckValues`, `expectedCheckValues`, `masterCheckValues`, `getLatestValueNotes`, `requiresCheckPhoto`, `suggestDepartmentForCustodian`, types); `AuditComponentPanel`, `AuditScanTranslator` (`./audit-scan-panels`); `AuditInstalledInParent`, `AuditLookupAsset`, `AuditScanComponent`, `QueuedAuditPhoto` (`./audit-scan-types`); `SearchableSelect`; `FileDropzone`; `AccessibleDialog`; `Sheet*`; `Button`.
- Produces:
  - `type AuditCheckTarget = { kind: "item"; item: AuditScanItemRow; openedMode: "scan" | "edit" } | { kind: "out_of_scope"; asset: AuditLookupAsset }`
  - `type AuditCheckSubmission = { values: AuditCheckValues; remark: string; photos: QueuedAuditPhoto[]; applyCorrections: boolean; diff: AuditCheckField[]; mode: AuditCheckMode }`
  - `type AuditCheckComponentsState = { status: "idle" | "loading" | "ready"; components: AuditScanComponent[]; installedIn: AuditInstalledInParent[] }`
  - `AuditScanCheckForm({ target, liveItem, room, options, photoChecklist, canApplyCorrections, saving, disabled, components, onSubmit, onDismiss, onConfirmComponent(component, context: { values; remark }), onMarkComponentMissing(component), onScanComponent(component) })`
  - `AuditScanCheckPanel({ isWide, open, title, description, onOpenChange, returnFocusRef, children })` — bottom Sheet below 1024px, inline sticky `<aside>` at ≥1024px
  - `AuditScanComponentMissingDialog({ component, parentAssetTag, saving, onCancel, onSubmit(remark: string, evidence: File | null) })`

- [ ] **Step 1: Write the failing test** — `tests/audit-scan-check-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const form = () => read("src/components/audit/audit-scan-check-form.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("the sheet starts from the shared defaults and counts mismatches with the server rules", () => {
  const source = form()
  assert.match(source, /buildCheckDefaults\(\{ mode: target\.openedMode, item: target\.item, room \}\)/)
  assert.match(source, /buildCheckDefaults\(\{ mode: "out_of_scope", master: lookupMasterValues\(target\.asset\), room \}\)/)
  assert.match(source, /const diff = diffCheckValues\(values, expected, ownershipType\)/)
  assert.match(source, /requiresCheckPhoto\(mode, diff\)/)
})

test("one save button names the result, and a missing photo blocks it with a reason", () => {
  const source = form()
  for (const key of ["saveAllMatch", "saveMismatch", "saveEditAllMatch", "saveEditMismatch", "saveOutOfScope"]) {
    assert.match(source, new RegExp(`t\\("${key}"`), key)
  }
  assert.match(source, /disabled=\{saving \|\| disabled \|\| missingPhoto\}/)
  assert.match(source, /variant=\{diff\.length === 0 \? "default" : "warning"\}/)
  assert.doesNotMatch(source, /dataMatches|dataMismatch|quickMatched/)
})

test("an item someone else checked while the sheet was open says so before saving", () => {
  const source = form()
  assert.match(source, /target\.openedMode === "scan" && liveItem && isAuditItemChecked\(liveItem\)/)
  assert.match(source, /t\("sheetStatusJustChecked", \{ name: liveItem\.scannedByName \?\? "-" \}\)/)
})

test("choosing a custodian fills that person's department unless the department was changed by hand", () => {
  const source = form()
  assert.match(source, /departmentTouched \? null : suggestDepartmentForCustodian\(options\.employees, next\)/)
  assert.match(source, /setDepartmentTouched\(true\)/)
})

test("the immediate-correction box only appears for approvers with a location or custodian mismatch, under the save button", () => {
  const source = form()
  assert.match(source, /canApplyCorrections && mode !== "out_of_scope" && diff\.some\(\(field\) => field === "location" \|\| field === "custodian"\)/)
  assert.ok(source.indexOf("{saveLabel}") < source.indexOf('t("applyAuditCorrections")'), "checkbox sits under the save button (spec 3.5)")
})

test("a field shows the system value when it differs and the latest register value when it moved", () => {
  const source = read("src/components/audit/audit-scan-check-field.tsx")
  assert.match(source, /<SearchableSelect/)
  assert.match(source, /t\("inSystem", \{ value: labelFor\(expectedValue\) \}\)/)
  assert.match(source, /t\("latestValue", \{ value: labelFor\(latestValue\) \}\)/)
  assert.match(source, /border-warning-border bg-warning-soft/)
})

test("the panel is a bottom sheet on phones that returns focus, and an inline aside on wide screens", () => {
  const source = read("src/components/audit/audit-scan-check-panel.tsx")
  assert.match(source, /<SheetContent\s+side="bottom"/)
  assert.match(source, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?returnFocusRef\.current/)
  assert.match(source, /<aside/)
  assert.match(source, /if \(isWide\)/)
})

test("components keep their three actions and the missing dialog keeps its shared dialog and dropzone", () => {
  assert.match(form(), /<AuditComponentPanel/)
  const dialog = read("src/components/audit/audit-scan-component-missing-dialog.tsx")
  assert.match(dialog, /<AccessibleDialog/)
  assert.match(dialog, /<FileDropzone/)
  assert.doesNotMatch(dialog, /window\.prompt|fixed inset-0/)
})

test("check sheet copy exists in Thai and English", () => {
  const keys = ["sheetStatusPending", "sheetStatusEdit", "sheetStatusNotFound", "sheetStatusOutOfScope", "sheetStatusJustChecked", "inSystem", "latestValue", "noOptionMatch", "clearValue", "addNotePhoto", "photoType", "photoRequiredCondition", "componentsSection", "saveAllMatch", "saveMismatch", "saveEditAllMatch", "saveEditMismatch", "saveOutOfScope", "notThisOne", "checkPanelEmpty"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
  assert.equal(messages("th").saveMismatch, "บันทึก · ไม่ตรง {count} ข้อ ({fields})")
})
```

- [ ] **Step 2: Run it and confirm it fails** — `node --test tests/audit-scan-check-ui.test.ts` → FAIL (ENOENT).

- [ ] **Step 3: Add the messages** (inside `"auditScan"`, after `"cameraPermissionDenied"`)

th:
```json
    "sheetStatusPending": "ยังไม่ตรวจ",
    "sheetStatusEdit": "ตรวจแล้ว {time} โดย {name} · กำลังแก้ผล",
    "sheetStatusNotFound": "เคยบันทึกว่าหาไม่พบ · บันทึกตอนนี้ถือว่าพบภายหลัง",
    "sheetStatusOutOfScope": "นอกขอบเขตรอบนี้",
    "sheetStatusJustChecked": "เพิ่งถูกตรวจโดย {name} · บันทึกตอนนี้จะเป็นการแก้ผล",
    "inSystem": "ในระบบ: {value}",
    "latestValue": "ข้อมูลล่าสุด: {value}",
    "noOptionMatch": "ไม่พบตัวเลือก",
    "clearValue": "ล้างค่า",
    "addNotePhoto": "หมายเหตุ / รูป",
    "photoType": "ประเภทรูป",
    "photoRequiredCondition": "สภาพไม่ตรง ต้องแนบรูปก่อนบันทึก",
    "componentsSection": "ชิ้นส่วนย่อย ({count})",
    "saveAllMatch": "บันทึก · ตรงทุกข้อ",
    "saveMismatch": "บันทึก · ไม่ตรง {count} ข้อ ({fields})",
    "saveEditAllMatch": "บันทึกการแก้ไข · ตรงทุกข้อ",
    "saveEditMismatch": "บันทึกการแก้ไข · ไม่ตรง {count} ข้อ ({fields})",
    "saveOutOfScope": "บันทึกนอกขอบเขต",
    "notThisOne": "ไม่ใช่ชิ้นนี้",
    "checkPanelEmpty": "เลือกรายการทางซ้ายเพื่อตรวจ",
```

en:
```json
    "sheetStatusPending": "Not checked yet",
    "sheetStatusEdit": "Checked {time} by {name} · editing the result",
    "sheetStatusNotFound": "Marked not found earlier · saving now records it as found later",
    "sheetStatusOutOfScope": "Outside this round",
    "sheetStatusJustChecked": "Just checked by {name} · saving now edits that result",
    "inSystem": "In the system: {value}",
    "latestValue": "Latest register value: {value}",
    "noOptionMatch": "No matching option",
    "clearValue": "Clear",
    "addNotePhoto": "Note / photo",
    "photoType": "Photo type",
    "photoRequiredCondition": "The condition changed, so add a photo before saving",
    "componentsSection": "Components ({count})",
    "saveAllMatch": "Save · everything matches",
    "saveMismatch": "Save · {count} mismatched ({fields})",
    "saveEditAllMatch": "Save changes · everything matches",
    "saveEditMismatch": "Save changes · {count} mismatched ({fields})",
    "saveOutOfScope": "Save as out of scope",
    "notThisOne": "Not this one",
    "checkPanelEmpty": "Pick an item on the left to check it",
```

- [ ] **Step 4: Create `src/components/audit/audit-scan-check-field.tsx`**

```tsx
"use client"

import { useTranslations } from "next-intl"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
import { cn } from "@/lib/utils"

export function AuditScanCheckField({
  label,
  value,
  options,
  required,
  expectedValue,
  latestValue,
  mismatch,
  disabled,
  labelFor,
  onChange,
}: {
  label: string
  value: string
  options: SearchableSelectOption[]
  required?: boolean
  expectedValue: string
  latestValue?: string
  mismatch: boolean
  disabled?: boolean
  labelFor: (id: string) => string
  onChange: (value: string) => void
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")

  return (
    <div
      data-audit-check-field
      data-mismatch={mismatch ? "true" : undefined}
      className={cn("rounded-md border p-2.5", mismatch ? "border-warning-border bg-warning-soft" : "border-border bg-surface")}
    >
      <SearchableSelect
        label={label}
        value={value}
        options={options}
        required={required}
        disabled={disabled}
        placeholder={t("none")}
        searchPlaceholder={tCommon("search")}
        emptyLabel={t("noOptionMatch")}
        clearLabel={t("clearValue")}
        onChange={onChange}
      />
      {mismatch ? <p className="mt-1 text-xs font-medium text-warning">{t("inSystem", { value: labelFor(expectedValue) })}</p> : null}
      {latestValue !== undefined ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{t("latestValue", { value: labelFor(latestValue) })}</p>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/audit/audit-scan-component-missing-dialog.tsx`**

Move the dialog markup from `audit-scan-form.tsx` lines 1926-1983 into this component; keep every class and message key. The form keeps working until Task 9.

```tsx
"use client"

import { useState, type FormEvent } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { FileDropzone } from "@/components/ui/file-dropzone"
import type { AuditScanComponent } from "@/components/audit/audit-scan-types"

export function AuditScanComponentMissingDialog({
  component,
  parentAssetTag,
  saving,
  onCancel,
  onSubmit,
}: {
  component: AuditScanComponent
  parentAssetTag: string
  saving: boolean
  onCancel: () => void
  onSubmit: (remark: string, evidence: File | null) => void
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const [remark, setRemark] = useState("")
  const [evidence, setEvidence] = useState<File | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(remark.trim() || t("componentMissingDefaultRemark", { assetTag: parentAssetTag }), evidence)
  }

  return (
    <AccessibleDialog
      open
      title={t("componentMissingDialogTitle")}
      description={t("componentMissingDialogDescription", { asset: `${component.assetTag} - ${component.name}` })}
      busy={saving}
      size="sm"
      onClose={() => {
        if (!saving) onCancel()
      }}
    >
      <form onSubmit={submit} className="p-4">
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-foreground">{t("componentMissingRemarkOptional")}</span>
            <textarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              disabled={saving}
              rows={3}
              placeholder={t("componentMissingRemarkPlaceholder")}
              className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </label>
          <FileDropzone
            file={evidence}
            onFileChange={setEvidence}
            disabled={saving}
            accept="image/*"
            capture="environment"
            title={t("componentMissingEvidenceTitle")}
            hint={t("componentMissingEvidenceSelected")}
            browseLabel={t("componentMissingEvidenceBrowse")}
          />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-warning px-4 text-sm font-semibold text-white transition-colors hover:bg-warning-hover disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <AlertTriangle className="size-4" aria-hidden="true" />}
            {t("componentMissingConfirm")}
          </button>
        </div>
      </form>
    </AccessibleDialog>
  )
}
```

The only intended changes from the old markup: `focus:ring-ring` (the shared focus token) instead of `focus:ring-primary/20`, and `size-4` icons with `aria-hidden`.

- [ ] **Step 6: Create `src/components/audit/audit-scan-check-panel.tsx`**

```tsx
"use client"

import type { ReactNode, RefObject } from "react"
import { useTranslations } from "next-intl"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function AuditScanCheckPanel({
  isWide,
  open,
  title,
  description,
  onOpenChange,
  returnFocusRef,
  children,
}: {
  isWide: boolean
  open: boolean
  title: string
  description: string
  onOpenChange: (open: boolean) => void
  returnFocusRef: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")

  if (isWide) {
    return open ? (
      <aside data-audit-check-panel aria-label={title} className="sticky top-4 self-start rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mb-3 truncate text-sm text-muted-foreground">{description}</p>
        {children}
      </aside>
    ) : (
      <aside className="sticky top-4 self-start rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t("checkPanelEmpty")}
      </aside>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        closeLabel={tCommon("close")}
        className="max-h-[92dvh] gap-0 rounded-t-xl"
        onCloseAutoFocus={(event) => {
          // Opened from a row or the search box, not a Radix trigger: send focus back there ourselves.
          event.preventDefault()
          const target = returnFocusRef.current
          if (target?.isConnected) target.focus()
        }}
      >
        <SheetHeader className="border-b border-border pr-14">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="truncate">{description}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 7: Create `src/components/audit/audit-scan-check-form.tsx`**

```tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ImagePlus, Loader2, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { AuditComponentPanel } from "@/components/audit/audit-scan-panels"
import { AuditScanCheckField } from "@/components/audit/audit-scan-check-field"
import type { AuditInstalledInParent, AuditLookupAsset, AuditScanComponent, QueuedAuditPhoto } from "@/components/audit/audit-scan-types"
import {
  buildCheckDefaults,
  diffCheckValues,
  expectedCheckValues,
  getLatestValueNotes,
  isAuditItemChecked,
  masterCheckValues,
  requiresCheckPhoto,
  suggestDepartmentForCustodian,
  type AuditCheckField,
  type AuditCheckMode,
  type AuditCheckValues,
  type AuditMasterValues,
  type AuditScanItemRow,
  type AuditScanOptions,
  type AuditScanRoom,
} from "@/lib/audit-scan-session"

export type AuditCheckTarget =
  | { kind: "item"; item: AuditScanItemRow; openedMode: "scan" | "edit" }
  | { kind: "out_of_scope"; asset: AuditLookupAsset }

export type AuditCheckSubmission = {
  values: AuditCheckValues
  remark: string
  photos: QueuedAuditPhoto[]
  applyCorrections: boolean
  diff: AuditCheckField[]
  mode: AuditCheckMode
}

export type AuditCheckComponentsState = {
  status: "idle" | "loading" | "ready"
  components: AuditScanComponent[]
  installedIn: AuditInstalledInParent[]
}

const fieldLabelKey = {
  location: "expectedLocation",
  custodian: "expectedCustodian",
  department: "expectedDepartment",
  condition: "expectedCondition",
} as const
const mismatchShortKey = {
  location: "wrongLocation",
  custodian: "wrongCustodian",
  department: "wrongDepartment",
  condition: "wrongCondition",
} as const

function lookupMasterValues(asset: AuditLookupAsset): AuditMasterValues {
  return {
    locationId: asset.currentLocationId,
    custodianId: asset.custodianId,
    departmentId: asset.departmentId,
    conditionId: asset.conditionId,
  }
}

export function AuditScanCheckForm({
  target,
  liveItem,
  room,
  options,
  photoChecklist,
  canApplyCorrections,
  saving,
  disabled,
  components,
  onSubmit,
  onDismiss,
  onConfirmComponent,
  onMarkComponentMissing,
  onScanComponent,
}: {
  target: AuditCheckTarget
  liveItem: AuditScanItemRow | null
  room: AuditScanRoom
  options: AuditScanOptions
  photoChecklist: string[]
  canApplyCorrections: boolean
  saving: boolean
  disabled: boolean
  components: AuditCheckComponentsState
  onSubmit: (submission: AuditCheckSubmission) => void
  onDismiss: () => void
  onConfirmComponent: (component: AuditScanComponent, context: { values: AuditCheckValues; remark: string }) => void
  onMarkComponentMissing: (component: AuditScanComponent) => void
  onScanComponent: (component: AuditScanComponent) => void
}) {
  const t = useTranslations("auditScan")
  const locale = useLocale()
  const mode: AuditCheckMode = target.kind === "out_of_scope" ? "out_of_scope" : target.openedMode
  const expected = target.kind === "item" ? expectedCheckValues(target.item) : masterCheckValues(lookupMasterValues(target.asset))
  const ownershipType = target.kind === "item" ? target.item.ownershipType : target.asset.ownershipType ?? null
  const [values, setValues] = useState<AuditCheckValues>(() =>
    target.kind === "item"
      ? buildCheckDefaults({ mode: target.openedMode, item: target.item, room })
      : buildCheckDefaults({ mode: "out_of_scope", master: lookupMasterValues(target.asset), room }),
  )
  const [departmentTouched, setDepartmentTouched] = useState(false)
  const [remark, setRemark] = useState("")
  const [photos, setPhotos] = useState<QueuedAuditPhoto[]>([])
  const [photoLabel, setPhotoLabel] = useState("")
  const [applyCorrections, setApplyCorrections] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(target.kind === "out_of_scope")
  const [componentsOpen, setComponentsOpen] = useState(false)
  const photosRef = useRef(photos)
  const diff = diffCheckValues(values, expected, ownershipType)
  const photoRequired = requiresCheckPhoto(mode, diff)
  const missingPhoto = photoRequired && photos.length === 0
  const notes = target.kind === "item" ? getLatestValueNotes(target.item) : {}

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl)
      })
    }
  }, [])

  const labels = useMemo(() => ({
    location: new Map(options.locations.map((option) => [option.id, option.label])),
    custodian: new Map(options.employees.map((option) => [option.id, option.label])),
    department: new Map(options.departments.map((option) => [option.id, option.label])),
    condition: new Map(options.conditions.map((option) => [option.id, option.label])),
  }), [options])

  function labelFor(field: AuditCheckField) {
    return (id: string) => (id ? labels[field].get(id) ?? id : t("none"))
  }

  function changeCustodian(next: string) {
    setValues((current) => {
      const suggested = departmentTouched ? null : suggestDepartmentForCustodian(options.employees, next)
      return { ...current, custodian: next, department: suggested ?? current.department }
    })
  }

  function changeDepartment(next: string) {
    setDepartmentTouched(true)
    setValues((current) => ({ ...current, department: next }))
  }

  function addPhotos(files: File[]) {
    if (files.length === 0) return
    const label = photoLabel || t("generalAuditPhotoLabel")
    setPhotos((current) => [
      ...current,
      ...files.map((file, index) => ({
        id: `${Date.now()}-${current.length + index}`,
        label,
        file,
        previewUrl: typeof URL !== "undefined" ? URL.createObjectURL(file) : null,
      })),
    ])
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return current.filter((photo) => photo.id !== id)
    })
  }

  const statusLine = (() => {
    if (target.kind === "out_of_scope") return t("sheetStatusOutOfScope")
    if (target.openedMode === "scan" && liveItem && isAuditItemChecked(liveItem) && liveItem.auditResult !== "not_found") {
      return t("sheetStatusJustChecked", { name: liveItem.scannedByName ?? "-" })
    }
    if (target.openedMode === "scan") {
      return target.item.auditResult === "not_found" ? t("sheetStatusNotFound") : t("sheetStatusPending")
    }
    const time = target.item.lastScanAt
      ? new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(target.item.lastScanAt))
      : "-"
    return t("sheetStatusEdit", { time, name: target.item.scannedByName ?? "-" })
  })()

  const fields = diff.map((field) => t(mismatchShortKey[field])).join(", ")
  const saveLabel = mode === "out_of_scope"
    ? t("saveOutOfScope")
    : mode === "edit"
      ? diff.length === 0 ? t("saveEditAllMatch") : t("saveEditMismatch", { count: diff.length, fields })
      : diff.length === 0 ? t("saveAllMatch") : t("saveMismatch", { count: diff.length, fields })

  const fieldConfig: Array<{ field: AuditCheckField; required?: boolean; options: Array<{ id: string; label: string }>; onChange: (value: string) => void }> = [
    { field: "location", required: true, options: options.locations, onChange: (value) => setValues((current) => ({ ...current, location: value })) },
    { field: "custodian", options: options.employees, onChange: changeCustodian },
    { field: "department", options: options.departments, onChange: changeDepartment },
    { field: "condition", options: options.conditions, onChange: (value) => setValues((current) => ({ ...current, condition: value })) },
  ]

  return (
    <div data-audit-check-form className="space-y-3">
      <p className="text-sm text-muted-foreground">{statusLine}</p>

      <div className="space-y-2">
        {fieldConfig.map((config) => (
          <AuditScanCheckField
            key={config.field}
            label={t(fieldLabelKey[config.field])}
            value={values[config.field]}
            options={config.options}
            required={config.required}
            expectedValue={expected[config.field]}
            latestValue={config.field === "condition" ? undefined : notes[config.field]}
            mismatch={diff.includes(config.field)}
            disabled={saving || disabled}
            labelFor={labelFor(config.field)}
            onChange={config.onChange}
          />
        ))}
      </div>

      {target.kind === "item" && components.installedIn.length > 0 ? (
        <div className="rounded-md border border-info-border bg-info-soft p-2.5 text-xs text-info">
          {components.installedIn.map((parent) => (
            <p key={parent.parentAssetId}>{t("installedInParentNotice", { assetTag: parent.assetTag, role: parent.componentRole })}</p>
          ))}
        </div>
      ) : null}

      {target.kind === "item" && (components.components.length > 0 || components.status === "loading") ? (
        <div className="rounded-md border border-border">
          <button
            type="button"
            aria-expanded={componentsOpen}
            onClick={() => setComponentsOpen((current) => !current)}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-sm font-medium"
          >
            {t("componentsSection", { count: components.components.length })}
            {components.status === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
          </button>
          {componentsOpen && components.components.length > 0 ? (
            <div className="border-t border-border px-2 pb-2">
              <AuditComponentPanel
                components={components.components}
                saving={saving}
                componentActionsDisabled={disabled}
                onScanComponent={onScanComponent}
                onConfirmWithParent={(component) => onConfirmComponent(component, { values, remark })}
                onMarkMissing={onMarkComponentMissing}
                t={t}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-md border border-border">
        <button
          type="button"
          aria-expanded={extrasOpen}
          onClick={() => setExtrasOpen((current) => !current)}
          className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-sm font-medium text-primary"
        >
          {t("addNotePhoto")}
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>
        {extrasOpen ? (
          <div className="space-y-3 border-t border-border p-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("remark")}</span>
              <textarea
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                rows={2}
                disabled={saving || disabled}
                className="min-h-16 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            {photoChecklist.length > 0 ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("photoType")}</span>
                <select
                  value={photoLabel}
                  onChange={(event) => setPhotoLabel(event.target.value)}
                  className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm sm:h-10 sm:min-h-0"
                >
                  <option value="">{t("generalAuditPhotoLabel")}</option>
                  {photoChecklist.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <FileDropzone
              file={null}
              onFileChange={(file) => addPhotos(file ? [file] : [])}
              onFilesChange={addPhotos}
              disabled={saving || disabled}
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
              capture="environment"
              multiple
              title={t("dropAuditPhotoTitle")}
              hint={t("dropAuditPhotoSelected")}
              browseLabel={t("dropAuditPhotoHint")}
            />
            {photos.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2" aria-label={t("queuedPhotos", { count: photos.length })}>
                {photos.map((photo) => (
                  <li key={photo.id} className="relative overflow-hidden rounded-md border border-border">
                    {photo.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                      <img src={photo.previewUrl} alt={t("queuedPhotoPreviewAlt", { name: photo.file.name })} className="aspect-square w-full object-cover" />
                    ) : (
                      <span className="flex aspect-square items-center justify-center"><ImagePlus className="size-5" aria-hidden="true" /></span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label={t("removeQueuedPhoto")}
                      className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-md bg-surface text-foreground shadow-sm"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {missingPhoto ? (
        <p className="text-sm font-medium text-warning">
          {mode === "out_of_scope" ? t("auditPhotoRequiredForMismatch") : t("photoRequiredCondition")}
        </p>
      ) : null}

      <div className="grid gap-2 pt-1">
        <Button
          type="button"
          variant={diff.length === 0 ? "default" : "warning"}
          className="min-h-12 w-full text-base"
          disabled={saving || disabled || missingPhoto}
          onClick={() => onSubmit({ values, remark, photos, applyCorrections, diff, mode })}
        >
          {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {saveLabel}
        </Button>
        {canApplyCorrections && mode !== "out_of_scope" && diff.some((field) => field === "location" || field === "custodian") ? (
          <label className="flex min-h-11 items-start gap-2 rounded-md border border-border p-2.5 text-sm">
            <input type="checkbox" checked={applyCorrections} onChange={(event) => setApplyCorrections(event.target.checked)} className="mt-0.5 size-5" />
            <span>
              <span className="block font-medium">{t("applyAuditCorrections")}</span>
              <span className="block text-xs text-muted-foreground">{t("applyAuditCorrectionsHelp")}</span>
            </span>
          </label>
        ) : null}
        <Button type="button" variant="ghost" className="w-full" onClick={onDismiss} disabled={saving}>
          {t("notThisOne")}
        </Button>
      </div>
    </div>
  )
}
```

Implementer checks:
- `AuditComponentPanel`'s `t` prop type is `AuditScanTranslator`; pass `t` directly as the old form did. If `tsc` complains, wrap: `t={(key: string, values?: Record<string, string | number | Date>) => (values ? t(key, values) : t(key))}`.
- `Button` already has `variant="warning"` (part A); `min-h-12 text-base` keeps the primary action large on phones.

- [ ] **Step 8: Run the test, full checks, commit**

Run: `node --test tests/audit-scan-check-ui.test.ts tests/ui-overlay-guards.test.ts` → PASS; then `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add src/components/audit/audit-scan-check-field.tsx src/components/audit/audit-scan-check-form.tsx src/components/audit/audit-scan-check-panel.tsx src/components/audit/audit-scan-component-missing-dialog.tsx messages/th.json messages/en.json tests/audit-scan-check-ui.test.ts
git commit -m "feat(audit): check sheet with room-aware defaults and one save button

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Scan workspace — saving, sharing progress, offline

**Files:**
- Create: `src/components/audit/audit-scan-workspace.tsx`, `src/components/audit/audit-scan-saved-banner.tsx`, `src/components/audit/audit-scan-offline-bar.tsx`
- Modify: `messages/th.json`, `messages/en.json` (after `"checkPanelEmpty"`)
- Test: `tests/audit-scan-workspace-ui.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1, 2, 5, 6, 7; `createAuditOfflineIndexedDbStorage`, `loadQueuedAuditScansAsync`, `upsertQueuedAuditScanAsync`, `removeQueuedAuditScanAsync`, `markQueuedAuditScanSyncFailed`, `AuditOfflineScanPayload`, `QueuedAuditScan`, `AuditOfflineQueueStorage` (`@/lib/audit-offline-queue`); `toAuditOfflinePhoto`, `normalizeAuditLookupComponents`, `normalizeAuditLookupInstalledIn` (`./audit-scan-helpers`); `extractAssetLookupCandidatesFromScanValue` (`@/lib/asset-qr`); `useMediaQuery`.
- Produces: `AuditScanWorkspace(props: { roundId; roundName; backHref; pendingHref; initialItems: AuditScanItemRow[]; initialServerTime: string; options: AuditScanOptions; photoChecklistByCategory: Record<string, string[]>; canApplyCorrections: boolean; initialAssetId?: string })` — used by the page in Task 9.

- [ ] **Step 1: Write the failing test** — `tests/audit-scan-workspace-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const workspace = () => read("src/components/audit/audit-scan-workspace.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditScan

test("saving updates the rows in place, never reloads the round, vibrates and returns to the search box", () => {
  const source = workspace()
  assert.doesNotMatch(source, /router\.refresh\(/)
  assert.match(source, /setItems\(\(current\) => applyScanResult\(current, \{ item: result\.item, scannedByName: result\.scannedByName \}\)\)/)
  assert.match(source, /navigator\.vibrate\?\.\(30\)/)
  assert.match(source, /inputRef\.current\?\.focus\(\)/)
})

test("a save made after someone else checked the item is sent as a correction", () => {
  assert.match(workspace(), /const resultCorrection = getCheckMode\(row\) === "edit"/)
})

test("in-round photos upload after the result is saved; out-of-scope photos upload first as evidence", () => {
  const source = workspace()
  const inRound = source.slice(source.indexOf("async function submitCheck"), source.indexOf("async function submitOutOfScope"))
  assert.ok(inRound.indexOf("applyScanResult") > -1 && inRound.indexOf("applyScanResult") < inRound.indexOf("uploadPhotos("))
  const outOfScope = source.slice(source.indexOf("async function submitOutOfScope"))
  assert.ok(outOfScope.indexOf("evidenceAttachmentIds.push") < outOfScope.indexOf("/scan`"))
})

test("other auditors' changes are pulled every 30 seconds while visible, on return, and after saving", () => {
  const source = workspace()
  assert.match(source, /window\.setInterval\(tick, auditScanPollIntervalMs\)/)
  assert.match(source, /document\.visibilityState === "visible"/)
  assert.match(source, /scan-status\?since=\$\{encodeURIComponent\(serverTimeRef\.current\)\}/)
  assert.match(source, /mergeStatusUpdates\(current, payload\.items\)/)
})

test("offline saves queue one entry per asset and send themselves when the connection returns", () => {
  const source = workspace()
  assert.match(source, /upsertQueuedAuditScanAsync\(/)
  assert.match(source, /window\.addEventListener\("online", handleOnline\)/)
  assert.match(source, /void sendQueue\(\)/)
})

test("a closed round stops saving with a clear message instead of queueing", () => {
  const source = workspace()
  assert.match(source, /function isRoundClosedError\(/)
  assert.match(source, /setRoundClosed\(true\)/)
  assert.match(source, /t\("roundClosedError"\)/)
  assert.match(source, /t\("backToRound"\)/)
})

test("lookups use the scan-lookup endpoint and report offline separately from not found", () => {
  const source = workspace()
  assert.match(source, /\/scan-lookup`/)
  assert.doesNotMatch(source, /\/api\/search/)
  assert.match(source, /setLookup\(\{ status: "offline" \}\)/)
})

test("workspace copy exists in Thai and English", () => {
  const keys = ["savedAllMatch", "savedMismatch", "savedOutOfScope", "savedQueued", "editAgain", "photoRetryMessage", "retryPhotos", "offlineBarOffline", "offlineBarPending", "sendNow", "removeFromQueue", "queueFailed", "roundClosedError", "backToRound"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
})
```

- [ ] **Step 2: Run it and confirm it fails** — `node --test tests/audit-scan-workspace-ui.test.ts` → FAIL (ENOENT).

- [ ] **Step 3: Add the messages** (inside `"auditScan"`, after `"checkPanelEmpty"`)

th:
```json
    "savedAllMatch": "✓ {assetTag} บันทึกแล้ว · ตรงทุกข้อ",
    "savedMismatch": "✓ {assetTag} บันทึกแล้ว · ไม่ตรง: {fields}",
    "savedOutOfScope": "✓ {assetTag} บันทึกเป็นนอกขอบเขตแล้ว",
    "savedQueued": "{assetTag} เก็บไว้ในเครื่อง · จะส่งเมื่อมีสัญญาณ",
    "editAgain": "แก้",
    "photoRetryMessage": "บันทึกผลแล้ว แต่ส่งรูปไม่สำเร็จ",
    "retryPhotos": "ส่งรูปอีกครั้ง",
    "offlineBarOffline": "ออฟไลน์ · รอส่ง {count} รายการ",
    "offlineBarPending": "รอส่ง {count} รายการ",
    "sendNow": "ส่งตอนนี้",
    "removeFromQueue": "ลบออกจากคิว",
    "queueFailed": "{assetTag} ส่งไม่สำเร็จ: {error}",
    "roundClosedError": "รอบนี้ถูกปิดแล้ว บันทึกไม่ได้",
    "backToRound": "กลับหน้ารอบ",
```

en:
```json
    "savedAllMatch": "✓ {assetTag} saved · everything matches",
    "savedMismatch": "✓ {assetTag} saved · mismatched: {fields}",
    "savedOutOfScope": "✓ {assetTag} saved as out of scope",
    "savedQueued": "{assetTag} kept on this device · it will send when online",
    "editAgain": "Edit",
    "photoRetryMessage": "The result was saved, but the photos did not upload",
    "retryPhotos": "Upload photos again",
    "offlineBarOffline": "Offline · {count} waiting to send",
    "offlineBarPending": "{count} waiting to send",
    "sendNow": "Send now",
    "removeFromQueue": "Remove from queue",
    "queueFailed": "{assetTag} could not be sent: {error}",
    "roundClosedError": "This round is closed; results can no longer be saved",
    "backToRound": "Back to the round",
```

- [ ] **Step 4: Create `src/components/audit/audit-scan-saved-banner.tsx`**

```tsx
"use client"

import { useTranslations } from "next-intl"
import type { AuditCheckField, AuditCheckMode } from "@/lib/audit-scan-session"
import { cn } from "@/lib/utils"

export type AuditSavedNotice = {
  assetId: string
  assetTag: string
  diff: AuditCheckField[]
  mode: AuditCheckMode
  queued: boolean
}

const mismatchShortKey = {
  location: "wrongLocation",
  custodian: "wrongCustodian",
  department: "wrongDepartment",
  condition: "wrongCondition",
} as const

export function AuditScanSavedBanner({
  notice,
  photoRetryCount,
  onEdit,
  onRetryPhotos,
}: {
  notice: AuditSavedNotice
  photoRetryCount: number
  onEdit: () => void
  onRetryPhotos: () => void
}) {
  const t = useTranslations("auditScan")
  const message = notice.queued
    ? t("savedQueued", { assetTag: notice.assetTag })
    : notice.mode === "out_of_scope"
      ? t("savedOutOfScope", { assetTag: notice.assetTag })
      : notice.diff.length === 0
        ? t("savedAllMatch", { assetTag: notice.assetTag })
        : t("savedMismatch", { assetTag: notice.assetTag, fields: notice.diff.map((field) => t(mismatchShortKey[field])).join(", ") })

  return (
    <div
      role="status"
      data-audit-scan-saved
      className={cn(
        "mb-2 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium",
        notice.queued ? "border-border bg-muted text-foreground" : notice.diff.length > 0 ? "border-warning-border bg-warning-soft text-warning" : "border-success-border bg-success-soft text-success",
      )}
    >
      <span className="min-w-0 flex-1">{message}</span>
      {notice.mode !== "out_of_scope" ? (
        <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline md:min-h-8">
          {t("editAgain")}
        </button>
      ) : null}
      {photoRetryCount > 0 ? (
        <span className="flex w-full flex-wrap items-center gap-2 text-danger">
          {t("photoRetryMessage")}
          <button type="button" onClick={onRetryPhotos} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline md:min-h-8">
            {t("retryPhotos")}
          </button>
        </span>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/audit/audit-scan-offline-bar.tsx`**

```tsx
"use client"

import { useTranslations } from "next-intl"
import type { QueuedAuditScan } from "@/lib/audit-offline-queue"

export function AuditScanOfflineBar({
  online,
  queue,
  assetTagFor,
  sending,
  onSendNow,
  onRemove,
}: {
  online: boolean
  queue: QueuedAuditScan[]
  assetTagFor: (assetId: string) => string
  sending: boolean
  onSendNow: () => void
  onRemove: (queuedId: string) => void
}) {
  const t = useTranslations("auditScan")
  if (online && queue.length === 0) return null
  const failed = queue.filter((entry) => entry.syncStatus === "failed")

  return (
    <div role="status" data-audit-scan-offline className="mb-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 font-medium">
          {online ? t("offlineBarPending", { count: queue.length }) : t("offlineBarOffline", { count: queue.length })}
        </span>
        {online && queue.length > 0 ? (
          <button type="button" onClick={onSendNow} disabled={sending} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60 md:min-h-8">
            {t("sendNow")}
          </button>
        ) : null}
      </div>
      {failed.length > 0 ? (
        <ul className="mt-1 space-y-1">
          {failed.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="min-w-0 flex-1">{t("queueFailed", { assetTag: assetTagFor(entry.assetId), error: entry.lastSyncError ?? "-" })}</span>
              <button type="button" onClick={() => onRemove(entry.id)} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline md:min-h-8">
                {t("removeFromQueue")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 6: Create `src/components/audit/audit-scan-workspace.tsx`**

```tsx
"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { AuditScanCamera } from "@/components/audit/audit-scan-camera"
import { AuditScanCheckForm, type AuditCheckComponentsState, type AuditCheckSubmission, type AuditCheckTarget } from "@/components/audit/audit-scan-check-form"
import { AuditScanCheckPanel } from "@/components/audit/audit-scan-check-panel"
import { AuditScanComponentMissingDialog } from "@/components/audit/audit-scan-component-missing-dialog"
import { AuditScanHeader } from "@/components/audit/audit-scan-header"
import { normalizeAuditLookupComponents, normalizeAuditLookupInstalledIn, toAuditOfflinePhoto } from "@/components/audit/audit-scan-helpers"
import { AuditScanLookupCard, type AuditLookupMatch, type AuditLookupState } from "@/components/audit/audit-scan-lookup-card"
import { AuditScanOfflineBar } from "@/components/audit/audit-scan-offline-bar"
import { AuditScanRoomList } from "@/components/audit/audit-scan-room-list"
import { AuditScanRoomPicker } from "@/components/audit/audit-scan-room-picker"
import { AuditScanSavedBanner, type AuditSavedNotice } from "@/components/audit/audit-scan-saved-banner"
import { AuditScanSearchField, AuditScanSearchResults } from "@/components/audit/audit-scan-search"
import type { AuditLookupAsset, AuditScanComponent, AuditScanLookupResponse, QueuedAuditPhoto } from "@/components/audit/audit-scan-types"
import { useAuditScanRoom } from "@/components/audit/use-audit-scan-room"
import { useMediaQuery } from "@/components/ui/use-media-query"
import { extractAssetLookupCandidatesFromScanValue } from "@/lib/asset-qr"
import {
  createAuditOfflineIndexedDbStorage,
  loadQueuedAuditScansAsync,
  markQueuedAuditScanSyncFailed,
  removeQueuedAuditScanAsync,
  upsertQueuedAuditScanAsync,
  type AuditOfflineQueueStorage,
  type AuditOfflineScanPayload,
  type QueuedAuditScan,
} from "@/lib/audit-offline-queue"
import {
  applyScanResult,
  auditScanListPageSize,
  auditScanPollIntervalMs,
  buildRoomList,
  buildRoomOptions,
  getCheckMode,
  isAuditSearchReady,
  mergeStatusUpdates,
  searchAuditItems,
  summarizeProgress,
  toScanPayloadValues,
  type AuditCheckValues,
  type AuditScanItemRow,
  type AuditScanListTab,
  type AuditScanOptions,
  type AuditScanRoom,
} from "@/lib/audit-scan-session"

const emptyComponents: AuditCheckComponentsState = { status: "ready", components: [], installedIn: [] }

function isRoundClosedError(message: unknown) {
  return message === "Audit round is closed" || message === "Audit round is cancelled"
}

export function AuditScanWorkspace({
  roundId,
  roundName,
  backHref,
  pendingHref,
  initialItems,
  initialServerTime,
  options,
  photoChecklistByCategory,
  canApplyCorrections,
  initialAssetId,
}: {
  roundId: string
  roundName: string
  backHref: string
  pendingHref: string
  initialItems: AuditScanItemRow[]
  initialServerTime: string
  options: AuditScanOptions
  photoChecklistByCategory: Record<string, string[]>
  canApplyCorrections: boolean
  initialAssetId?: string
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const isWide = useMediaQuery("(min-width: 64rem)")
  const [room, setRoom] = useAuditScanRoom(roundId)
  const [items, setItems] = useState(initialItems)
  const [draft, setDraft] = useState("")
  const [term, setTerm] = useState("")
  const [tab, setTab] = useState<AuditScanListTab>("pending")
  const [limit, setLimit] = useState(auditScanListPageSize)
  const initialTarget = useMemo<AuditCheckTarget | null>(() => {
    const item = initialAssetId ? initialItems.find((row) => row.assetId === initialAssetId) : undefined
    return item ? { kind: "item", item, openedMode: getCheckMode(item) } : null
  }, [initialAssetId, initialItems])
  const [target, setTarget] = useState<AuditCheckTarget | null>(initialTarget)
  const [targetKey, setTargetKey] = useState(0)
  const [openedFromSearch, setOpenedFromSearch] = useState(false)
  const [components, setComponents] = useState<AuditCheckComponentsState>(emptyComponents)
  const [missingComponent, setMissingComponent] = useState<AuditScanComponent | null>(null)
  const [lookup, setLookup] = useState<AuditLookupState>({ status: "idle" })
  const [cameraOpen, setCameraOpen] = useState(false)
  const [scanSource, setScanSource] = useState<"manual" | "qr">("manual")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<AuditSavedNotice | null>(null)
  const [photoRetry, setPhotoRetry] = useState<{ assetId: string; photos: QueuedAuditPhoto[] } | null>(null)
  const [roundClosed, setRoundClosed] = useState(false)
  const [queue, setQueue] = useState<QueuedAuditScan[]>([])
  const [online, setOnline] = useState(true)
  const [sendingQueue, setSendingQueue] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const serverTimeRef = useRef(initialServerTime)
  const storageRef = useRef<AuditOfflineQueueStorage | null>(null)
  const syncingRef = useRef(false)
  const sendingRef = useRef(false)
  const componentsRequestRef = useRef(0)

  const locationLabels = useMemo(() => new Map(options.locations.map((option) => [option.id, option.label])), [options.locations])
  const custodianLabels = useMemo(() => new Map(options.employees.map((option) => [option.id, option.label])), [options.employees])
  const roomOptions = useMemo(() => buildRoomOptions(items, options.locations, options.departments), [items, options.locations, options.departments])
  const progress = useMemo(() => summarizeProgress(items), [items])
  const list = useMemo(() => buildRoomList({ items, room, tab, limit, locationLabels }), [items, room, tab, limit, locationLabels])
  const matches = useMemo(() => searchAuditItems(items, term, custodianLabels), [items, term, custodianLabels])
  const queuedAssetIds = useMemo(() => new Set(queue.map((entry) => entry.assetId)), [queue])
  const liveItem = target?.kind === "item" ? items.find((row) => row.itemId === target.item.itemId) ?? null : null
  const roomPendingHref = useMemo(() => {
    if (!room.locationId) return pendingHref
    const url = new URL(pendingHref, "http://local")
    url.searchParams.set("locationId", room.locationId)
    return `${url.pathname}${url.search}`
  }, [pendingHref, room.locationId])

  const getStorage = useCallback(() => {
    if (!storageRef.current) storageRef.current = createAuditOfflineIndexedDbStorage(window.localStorage)
    return storageRef.current
  }, [])

  const refreshQueue = useCallback(async () => {
    setQueue(await loadQueuedAuditScansAsync(getStorage(), roundId))
  }, [getStorage, roundId])

  const loadComponents = useCallback(async (assetId: string) => {
    const requestId = ++componentsRequestRef.current
    if (!navigator.onLine) {
      setComponents(emptyComponents)
      return
    }
    setComponents({ status: "loading", components: [], installedIn: [] })
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawValue: assetId, scanSource: "manual" }),
      })
      const payload = (await response.json().catch(() => null)) as AuditScanLookupResponse | null
      if (requestId !== componentsRequestRef.current) return
      if (!response.ok || !payload || (payload.status !== "in_round" && payload.status !== "out_of_scope")) {
        setComponents(emptyComponents)
        return
      }
      setComponents({
        status: "ready",
        components: normalizeAuditLookupComponents(payload.asset.components),
        installedIn: normalizeAuditLookupInstalledIn(payload.asset.installedIn),
      })
    } catch {
      if (requestId === componentsRequestRef.current) setComponents(emptyComponents)
    }
  }, [roundId])

  /** Pulls rows changed since the last pull and returns them, so a caller can use one before React re-renders. */
  const syncNow = useCallback(async (): Promise<AuditScanItemRow[]> => {
    if (syncingRef.current || !navigator.onLine) return []
    syncingRef.current = true
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan-status?since=${encodeURIComponent(serverTimeRef.current)}`, { cache: "no-store" })
      if (!response.ok) return []
      const payload = (await response.json()) as { serverTime: string; roundStatus: string; items: AuditScanItemRow[] }
      serverTimeRef.current = payload.serverTime
      if (payload.roundStatus === "closed" || payload.roundStatus === "cancelled") setRoundClosed(true)
      if (payload.items.length > 0) setItems((current) => mergeStatusUpdates(current, payload.items))
      return payload.items
    } catch {
      // The next poll retries.
      return []
    } finally {
      syncingRef.current = false
    }
  }, [roundId])

  const uploadPhotoFile = useCallback(async (assetId: string, file: File, label: string) => {
    const body = new FormData()
    body.append("file", file)
    if (label) body.append("photoLabel", label)
    const response = await fetch(`/api/assets/${assetId}/attachments`, { method: "POST", body })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.error ?? t("auditPhotoUploadFailed"))
    }
    return (await response.json()) as { id: string }
  }, [t])

  const sendQueue = useCallback(async (includeFailed = false) => {
    if (sendingRef.current || !navigator.onLine) return
    const pending = await loadQueuedAuditScansAsync(getStorage(), roundId)
    if (pending.length === 0) return
    sendingRef.current = true
    setSendingQueue(true)
    try {
      for (const queued of pending) {
        if (queued.syncStatus === "failed" && !includeFailed) continue
        let response: Response
        try {
          response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assetId: queued.assetId,
              actualLocationId: queued.actualLocationId,
              actualCustodianId: queued.actualCustodianId,
              actualDepartmentId: queued.actualDepartmentId,
              actualConditionId: queued.actualConditionId,
              scanSource: queued.scanSource,
              applyCorrections: queued.applyCorrections,
              resultCorrection: queued.resultCorrection,
              remark: queued.remark,
            }),
          })
        } catch {
          break
        }
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          await markQueuedAuditScanSyncFailed(getStorage(), roundId, queued.id, result?.error ?? tCommon("error"))
          if (isRoundClosedError(result?.error)) setRoundClosed(true)
          break
        }
        setItems((current) => applyScanResult(current, { item: result.item, scannedByName: result.scannedByName }))
        for (const photo of queued.photos ?? []) {
          try {
            await uploadPhotoFile(queued.assetId, new File([photo.blob], photo.fileName, { type: photo.fileType }), photo.label)
          } catch {
            toast.error(t("auditPhotoUploadFailed"))
          }
        }
        await removeQueuedAuditScanAsync(getStorage(), roundId, queued.id)
      }
    } finally {
      sendingRef.current = false
      setSendingQueue(false)
      await refreshQueue()
    }
  }, [getStorage, refreshQueue, roundId, t, tCommon, uploadPhotoFile])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOnline(navigator.onLine)
      void refreshQueue()
      if (initialTarget?.kind === "item") void loadComponents(initialTarget.item.assetId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [initialTarget, loadComponents, refreshQueue])

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return
      void syncNow().then(() => sendQueue())
    }
    const handleVisibility = () => {
      if (document.visibilityState === "visible") tick()
    }
    const interval = window.setInterval(tick, auditScanPollIntervalMs)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [sendQueue, syncNow])

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
      void sendQueue()
    }
    function handleOffline() {
      setOnline(false)
    }
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [sendQueue])

  function openItem(item: AuditScanItemRow, fromSearch: boolean) {
    returnFocusRef.current = fromSearch ? inputRef.current : (document.activeElement as HTMLElement | null)
    setTarget({ kind: "item", item, openedMode: getCheckMode(item) })
    setTargetKey((key) => key + 1)
    setOpenedFromSearch(fromSearch)
    setSaved(null)
    void loadComponents(item.assetId)
  }

  function openOutOfScope(asset: AuditLookupAsset) {
    returnFocusRef.current = inputRef.current
    setTarget({ kind: "out_of_scope", asset })
    setTargetKey((key) => key + 1)
    setOpenedFromSearch(true)
    setSaved(null)
    setComponents({ status: "ready", components: normalizeAuditLookupComponents(asset.components), installedIn: normalizeAuditLookupInstalledIn(asset.installedIn) })
  }

  function changeRoom(next: AuditScanRoom) {
    setRoom(next)
    setTab("pending")
    setLimit(auditScanListPageSize)
    void syncNow()
  }

  function changeTerm(next: string) {
    setTerm(next)
    setLookup({ status: "idle" })
  }

  function clearSearch() {
    setDraft("")
    changeTerm("")
    inputRef.current?.focus()
  }

  async function searchRegister(rawValue = term.trim()) {
    if (!rawValue) return
    if (!navigator.onLine) {
      setLookup({ status: "offline" })
      return
    }
    setLookup({ status: "loading" })
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawValue, scanSource }),
      })
      const payload = (await response.json().catch(() => null)) as (AuditScanLookupResponse & { error?: string }) | null
      if (!response.ok || !payload) {
        setLookup({ status: "error", message: payload?.error ?? tCommon("error") })
        return
      }
      if (payload.status === "in_round") {
        // An out-of-scope record saved by someone else becomes a round item after this page loaded.
        const item = items.find((row) => row.assetId === payload.asset.id)
          ?? (await syncNow()).find((row) => row.assetId === payload.asset.id)
        if (item) {
          setLookup({ status: "idle" })
          openItem(item, true)
        } else {
          setLookup({ status: "error", message: tCommon("error") })
        }
        return
      }
      if (payload.status === "out_of_scope") setLookup({ status: "out_of_scope", asset: payload.asset })
      else if (payload.status === "candidates") setLookup({ status: "candidates", matches: payload.matches })
      else setLookup({ status: "unknown" })
    } catch {
      if (navigator.onLine) setLookup({ status: "error", message: tCommon("error") })
      else setLookup({ status: "offline" })
    }
  }

  function submitSearch() {
    if (matches.length > 0) {
      openItem(matches[0].item, true)
      return
    }
    void searchRegister()
  }

  function pickRegisterMatch(match: AuditLookupMatch) {
    const item = match.inRound ? items.find((row) => row.assetId === match.assetId) : undefined
    if (item) openItem(item, true)
    else void searchRegister(match.assetId)
  }

  function handleDecoded(text: string) {
    setCameraOpen(false)
    setScanSource("qr")
    const candidates = new Set(extractAssetLookupCandidatesFromScanValue(text).map((value) => value.toLocaleLowerCase()))
    const item = items.find((row) =>
      candidates.has(row.assetId.toLocaleLowerCase())
      || candidates.has(row.assetTag.toLocaleLowerCase())
      || (row.serialNumber ? candidates.has(row.serialNumber.toLocaleLowerCase()) : false))
    if (item) {
      openItem(item, false)
      return
    }
    setDraft(text)
    changeTerm(text)
    void searchRegister(text)
  }

  function finishSave(notice: AuditSavedNotice, succeeded: boolean) {
    setSaved(notice)
    setTarget(null)
    setScanSource("manual")
    if (succeeded) navigator.vibrate?.(30)
    if (openedFromSearch) {
      setDraft("")
      changeTerm("")
      returnFocusRef.current = inputRef.current
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  async function uploadPhotos(assetId: string, photos: QueuedAuditPhoto[]) {
    try {
      for (const photo of photos) await uploadPhotoFile(assetId, photo.file, photo.label)
      setPhotoRetry(null)
    } catch (error) {
      setPhotoRetry({ assetId, photos })
      toast.error(error instanceof Error ? error.message : t("auditPhotoUploadFailed"))
    }
  }

  async function queueOffline(payload: AuditOfflineScanPayload, photos: QueuedAuditPhoto[]) {
    await upsertQueuedAuditScanAsync(getStorage(), roundId, payload, { photos: photos.map(toAuditOfflinePhoto) })
    await refreshQueue()
    toast.warning(photos.length > 0 ? t("offlineQueuedWithPhotos") : t("offlineQueued"))
  }

  async function submitCheck(submission: AuditCheckSubmission) {
    if (!target) return
    if (target.kind === "out_of_scope") {
      await submitOutOfScope(target.asset, submission)
      return
    }
    const row = items.find((candidate) => candidate.itemId === target.item.itemId) ?? target.item
    const resultCorrection = getCheckMode(row) === "edit"
    const payload: AuditOfflineScanPayload = {
      assetId: row.assetId,
      ...toScanPayloadValues(submission.values),
      scanSource,
      applyCorrections: canApplyCorrections && submission.applyCorrections && submission.diff.some((field) => field === "location" || field === "custodian"),
      resultCorrection,
      remark: submission.remark.trim() || null,
    }
    const notice: AuditSavedNotice = { assetId: row.assetId, assetTag: row.assetTag, diff: submission.diff, mode: resultCorrection ? "edit" : "scan", queued: false }
    setSaving(true)
    let response: Response
    try {
      response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } catch {
      await queueOffline(payload, submission.photos)
      finishSave({ ...notice, queued: true }, false)
      setSaving(false)
      return
    }
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      if (isRoundClosedError(result?.error)) setRoundClosed(true)
      toast.error(result?.error ?? tCommon("error"))
      setSaving(false)
      return
    }
    setItems((current) => applyScanResult(current, { item: result.item, scannedByName: result.scannedByName }))
    finishSave(notice, true)
    if (submission.photos.length > 0) await uploadPhotos(row.assetId, submission.photos)
    setSaving(false)
    void syncNow()
  }

  async function submitOutOfScope(asset: AuditLookupAsset, submission: AuditCheckSubmission) {
    setSaving(true)
    try {
      const evidenceAttachmentIds: string[] = []
      for (const photo of submission.photos) {
        evidenceAttachmentIds.push((await uploadPhotoFile(asset.id, photo.file, photo.label)).id)
      }
      const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          ...toScanPayloadValues(submission.values),
          evidenceAttachmentIds,
          scanSource,
          remark: submission.remark.trim() || null,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok && response.status !== 202) {
        if (isRoundClosedError(result?.error)) setRoundClosed(true)
        throw new Error(result?.error ?? tCommon("error"))
      }
      setLookup({ status: "idle" })
      finishSave({ assetId: asset.id, assetTag: asset.assetTag, diff: submission.diff, mode: "out_of_scope", queued: false }, true)
      void syncNow()
    } catch (error) {
      toast.error(!navigator.onLine ? t("lookupOffline") : error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function confirmComponent(component: AuditScanComponent, context: { values: AuditCheckValues; remark: string }) {
    if (target?.kind !== "item") return
    if (!component.auditItemId) {
      toast.error(t("componentOutOfRound"))
      return
    }
    const parent = target.item
    setSaving(true)
    try {
      const response = await fetch(`/api/audit-rounds/${roundId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: component.assetId,
          ...toScanPayloadValues(context.values),
          scanSource: "manual",
          confirmedWithParentAssetId: parent.assetId,
          componentConfirmationReason: context.remark.trim() || t("componentConfirmedWithParentReason", { assetTag: parent.assetTag }),
          remark: context.remark.trim() || null,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error ?? tCommon("error"))
      setItems((current) => applyScanResult(current, { item: result.item }))
      toast.success(t("componentConfirmedWithParentSuccess"))
      void loadComponents(parent.assetId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function submitComponentMissing(remark: string, evidence: File | null) {
    if (target?.kind !== "item" || !missingComponent?.auditItemId) return
    const parent = target.item
    const body = new FormData()
    body.append("remark", remark)
    if (evidence) body.append("evidence", evidence)
    setSaving(true)
    try {
      const response = await fetch(`/api/audit-items/${missingComponent.auditItemId}/mark-not-found`, { method: "POST", body })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error ?? tCommon("error"))
      toast.success(t("componentMissingSaved"))
      setMissingComponent(null)
      void syncNow()
      void loadComponents(parent.assetId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  function scanComponent(component: AuditScanComponent) {
    const item = items.find((row) => row.assetId === component.assetId)
    if (item) openItem(item, false)
    else toast.error(t("componentOutOfRound"))
  }

  async function removeQueued(queuedId: string) {
    await removeQueuedAuditScanAsync(getStorage(), roundId, queuedId)
    await refreshQueue()
  }

  const searching = isAuditSearchReady(term)
  const targetTitle = target?.kind === "item" ? target.item.assetTag : target?.asset.assetTag ?? ""
  const targetDescription = target?.kind === "item"
    ? [target.item.name, target.item.serialNumber ? `Serial ${target.item.serialNumber}` : null].filter(Boolean).join(" · ")
    : target?.asset.subtitle ?? ""

  return (
    <div data-audit-scan-workspace className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-6">
      <div className="min-w-0 space-y-2">
        <AuditScanHeader roundName={roundName} backHref={backHref} progress={progress} />
        {roundClosed ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            <span className="min-w-0 flex-1">{t("roundClosedError")}</span>
            <Link href={backHref} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline">
              {t("backToRound")}
            </Link>
          </div>
        ) : null}
        <AuditScanRoomPicker room={room} rooms={roomOptions} onRoomChange={changeRoom} />
        <AuditScanSearchField
          value={draft}
          cameraOpen={cameraOpen}
          inputRef={inputRef}
          onValueChange={setDraft}
          onTermChange={changeTerm}
          onSubmit={submitSearch}
          onToggleCamera={() => setCameraOpen((current) => !current)}
          onClear={clearSearch}
        />
        {cameraOpen ? <AuditScanCamera onDecoded={handleDecoded} onClose={() => setCameraOpen(false)} /> : null}
        <AuditScanOfflineBar
          online={online}
          queue={queue}
          assetTagFor={(assetId) => items.find((row) => row.assetId === assetId)?.assetTag ?? assetId}
          sending={sendingQueue}
          onSendNow={() => void sendQueue(true)}
          onRemove={(queuedId) => void removeQueued(queuedId)}
        />
        {saved ? (
          <AuditScanSavedBanner
            notice={saved}
            photoRetryCount={photoRetry?.photos.length ?? 0}
            onEdit={() => {
              const item = items.find((row) => row.assetId === saved.assetId)
              if (item) openItem(item, false)
            }}
            onRetryPhotos={() => {
              if (photoRetry) void uploadPhotos(photoRetry.assetId, photoRetry.photos)
            }}
          />
        ) : null}
        {searching ? (
          <AuditScanSearchResults
            term={term}
            matches={matches}
            room={room}
            locationLabels={locationLabels}
            queuedAssetIds={queuedAssetIds}
            onOpen={(item) => openItem(item, true)}
            lookup={
              <AuditScanLookupCard
                state={lookup}
                onSearchRegister={() => void searchRegister()}
                onRecordOutOfScope={openOutOfScope}
                onPickMatch={pickRegisterMatch}
              />
            }
          />
        ) : (
          <AuditScanRoomList
            rows={list.rows}
            total={list.total}
            counts={list.counts}
            tab={tab}
            onTabChange={(next) => {
              setTab(next)
              setLimit(auditScanListPageSize)
            }}
            onShowMore={() => setLimit((current) => current + auditScanListPageSize)}
            onOpen={(item) => openItem(item, false)}
            queuedAssetIds={queuedAssetIds}
            custodianLabels={custodianLabels}
            locationLabels={locationLabels}
            showLocation={!room.locationId}
            pendingHref={roomPendingHref}
          />
        )}
      </div>

      <AuditScanCheckPanel
        isWide={isWide}
        open={target !== null}
        title={targetTitle}
        description={targetDescription}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        returnFocusRef={returnFocusRef}
      >
        {target ? (
          <AuditScanCheckForm
            key={targetKey}
            target={target}
            liveItem={liveItem}
            room={room}
            options={options}
            photoChecklist={target.kind === "item" ? photoChecklistByCategory[target.item.categoryId] ?? [] : []}
            canApplyCorrections={canApplyCorrections}
            saving={saving}
            disabled={roundClosed}
            components={components}
            onSubmit={(submission) => void submitCheck(submission)}
            onDismiss={() => setTarget(null)}
            onConfirmComponent={(component, context) => void confirmComponent(component, context)}
            onMarkComponentMissing={(component) => {
              if (!component.auditItemId) toast.error(t("componentOutOfRound"))
              else setMissingComponent(component)
            }}
            onScanComponent={scanComponent}
          />
        ) : null}
      </AuditScanCheckPanel>

      {missingComponent && target?.kind === "item" ? (
        <AuditScanComponentMissingDialog
          component={missingComponent}
          parentAssetTag={target.item.assetTag}
          saving={saving}
          onCancel={() => setMissingComponent(null)}
          onSubmit={(remark, evidence) => void submitComponentMissing(remark, evidence)}
        />
      ) : null}
    </div>
  )
}
```

Implementer checks:
- `extractAssetLookupCandidatesFromScanValue` lives in `src/lib/asset-qr.ts` (the scan-lookup route imports it); confirm the export name before using it.
- If lint flags `react-hooks/set-state-in-effect` for the first effect, keep the `window.setTimeout` wrapper (it is there for that reason) and report the exact message if it still fires.
- `AuditScanLookupResponse & { error?: string }` is only for reading error bodies; do not widen the shared type.

- [ ] **Step 7: Run the test, full checks, commit**

Run: `node --test tests/audit-scan-workspace-ui.test.ts tests/ui-overlay-guards.test.ts` → PASS; then `npm test`, `npx tsc --noEmit`, `npm run lint`.

```bash
git add src/components/audit/audit-scan-workspace.tsx src/components/audit/audit-scan-saved-banner.tsx src/components/audit/audit-scan-offline-bar.tsx messages/th.json messages/en.json tests/audit-scan-workspace-ui.test.ts
git commit -m "feat(audit): scan workspace with in-place saves, shared progress and offline auto-send

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Put the workspace on the page, remove the old form, rewrite the old tests

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx` (whole render), `src/components/audit/audit-scan-panels.tsx`, `src/components/audit/audit-scan-helpers.ts`, `src/components/audit/audit-scan-types.ts` (prune)
- Delete: `src/components/audit/audit-scan-form.tsx`
- Tests: rewrite/delete the old scan UI tests listed in Step 4; create `tests/audit-scan-page.test.ts`

**Interfaces:**
- Consumes: `loadAuditScanRows` (Task 3), `AuditScanWorkspace` (Task 8).
- Produces: the live page. `searchParams` type, `returnTo` handling, the `audit-scan.initial-data` / `audit-scan.checklist-data` timing labels and the `?assetId=&mode=edit` deep link stay as they are.

- [ ] **Step 1: Write the failing test** — `tests/audit-scan-page.test.ts`:

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const page = () => readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx", "utf8").replace(/\r\n/g, "\n")

test("the scan page loads slim rows and renders the workspace", () => {
  const source = page()
  assert.match(source, /loadAuditScanRows\(id\)/)
  assert.match(source, /<AuditScanWorkspace/)
  assert.match(source, /initialServerTime=\{serverTime\.toISOString\(\)\}/)
  assert.match(source, /initialAssetId=\{resolveFirstSearchParam\(rawSearchParams\.assetId\)\}/)
  assert.doesNotMatch(source, /parentComponents|installedInLinks|AuditScanForm|auditScanHistory/)
})

test("the scan page keeps its URL contract and timing labels", () => {
  const source = page()
  assert.match(source, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; assetId\?: string \| string\[\]; mode\?: string \| string\[\] \}>/)
  assert.match(source, /"audit-scan\.initial-data"/)
  assert.match(source, /"audit-scan\.checklist-data"/)
  assert.match(source, /normalizeAuditRoundDetailReturnTo\(locale, round\.id, rawSearchParams\.returnTo\)/)
})

test("the old 2,000-line form is gone and nothing imports it", () => {
  assert.equal(existsSync("src/components/audit/audit-scan-form.tsx"), false)
})
```

- [ ] **Step 2: Run it and confirm it fails** — `node --test tests/audit-scan-page.test.ts` → FAIL.

- [ ] **Step 3: Rewrite the page**

Replace the body of `src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx` (keep its imports that remain used, its `AuditScanPageProps` type, `ChecklistSettingRow`, and `resolveFirstSearchParam`; delete `AuditScanHistoryRow`, `AUDIT_SCAN_HISTORY_LIMIT`, `buildInitialRecentScanRows`, `getInitialRecentScanStatus`, `buildAuditScanComponentRows`, `resolveAuditScanInitialMode`):

```tsx
export default async function AuditScanPage({ params, searchParams }: AuditScanPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "audit", "edit")
  const canApplyCorrections = canApplyAuditScanCorrections({
    canApprove: hasPermission(user, "audit", "approve"),
    segregationRequired: parseWorkflowApprovalPolicy(await prisma.systemSetting.findMany({
      where: { key: { in: [...workflowApprovalSettingKeys] } },
      select: { key: true, value: true },
    })).segregationRequired,
  })

  // Taken before loading so changes saved during the load are pulled by the first poll.
  const serverTime = new Date()
  const [round, options, rows] = await withPerformanceTiming(
    "audit-scan.initial-data",
    () => Promise.all([
      prisma.auditRound.findFirst({
        where: { id, isActive: true },
        select: { id: true, name: true, auditNo: true, status: true },
      }),
      getAuditRoundOptions(),
      loadAuditScanRows(id),
    ]),
    { route: "/audit/rounds/[id]/scan", locale }
  )
  if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()
  const returnToHref = normalizeAuditRoundDetailReturnTo(locale, round.id, rawSearchParams.returnTo)
  const scanHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}/scan`, returnToHref)
  const pendingHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}/pending`, scanHref)

  const categoryIds = Array.from(new Set(rows.map((row) => row.categoryId)))
  const checklistSettings = await withPerformanceTiming<ChecklistSettingRow[]>(
    "audit-scan.checklist-data",
    () => categoryIds.length > 0
      ? prisma.systemSetting.findMany({
          where: { key: { in: categoryIds.map(categoryPhotoChecklistKey) } },
          select: { key: true, value: true },
        })
      : Promise.resolve<ChecklistSettingRow[]>([]),
    { route: "/audit/rounds/[id]/scan", locale, itemCount: rows.length, categoryCount: categoryIds.length }
  )
  const photoChecklistByCategory = Object.fromEntries(
    checklistSettings.map((setting) => [setting.key.replace("asset_category_photo_checklist:", ""), parsePhotoChecklist(setting.value)])
  )

  return (
    <AuditScanWorkspace
      roundId={round.id}
      roundName={`${round.auditNo} - ${round.name}`}
      backHref={returnToHref}
      pendingHref={pendingHref}
      initialItems={rows}
      initialServerTime={serverTime.toISOString()}
      options={{
        locations: options.locations,
        departments: options.departments,
        employees: options.employees,
        conditions: options.conditions,
      }}
      photoChecklistByCategory={photoChecklistByCategory}
      canApplyCorrections={canApplyCorrections}
      initialAssetId={resolveFirstSearchParam(rawSearchParams.assetId)}
    />
  )
}
```

Imports: add `AuditScanWorkspace` (`@/components/audit/audit-scan-workspace`), `loadAuditScanRows` (`@/lib/audit-scan-data`), `appendOperationalReturnTo` (from `@/lib/operational-return-navigation`, next to `normalizeAuditRoundDetailReturnTo`); remove the `AuditScanForm` import. `?mode=edit` needs no special handling: an already-checked item opens in edit mode by itself (`getCheckMode`).

`categoryPhotoChecklistKey` builds keys `asset_category_photo_checklist:<categoryId>` (the old code strips that prefix the same way) — confirm in `src/lib/category-photo-checklist.ts`.

- [ ] **Step 4: Delete the old form and prune the leftovers**

1. `git rm src/components/audit/audit-scan-form.tsx`.
2. In `audit-scan-panels.tsx` keep only `AuditScanTranslator`, `AuditComponentPanel` (and its private helpers) and `AuditQrScannerOverlay`; delete every other export. In `audit-scan-helpers.ts` and `audit-scan-types.ts` keep only what `grep -rn "from \"@/components/audit/audit-scan-\(helpers\|types\|panels\)\"" src` shows is still imported (expected: `normalizeAuditLookupComponents`, `normalizeAuditLookupInstalledIn`, `isAuditComponentChecked`, `toAuditOfflinePhoto`, and the types `AuditScanComponent`, `AuditInstalledInParent`, `AuditLookupAsset`, `AuditLookupComponent`, `AuditLookupInstalledInParent`, `AuditLookupAuditItem`, `AuditLookupMatch`, `AuditScanLookupResponse`, `QueuedAuditPhoto`, `CameraDevice`). Run `npx tsc --noEmit` after pruning.
3. Rewrite or delete the old source-text tests. Each pinned the old form's markup; carry every assertion that still describes real behaviour into the new structure, and list each deleted assertion with its reason in your report:

| Test file | Action |
|---|---|
| `tests/audit-scan-field-mode-ux.test.ts` | Delete. Before deleting, move these still-true assertions into `tests/audit-scan-search-ui.test.ts`: exactly one `id="audit-qr-reader"` across `src/components/audit/`; the camera uses `startNativeAssetQrScanner` with `stopAfterSuccess: true`; no `selectedCameraId`; the torch/zoom/camera message keys still exist in th/en. |
| `tests/audit-scan-refactor-boundaries.test.ts` | Rewrite: `audit-scan-panels.tsx` contains no `fetch(`, `localStorage` or `startNativeAssetQrScanner`; `audit-scan-workspace.tsx` imports its rules from `@/lib/audit-scan-session`; `audit-scan-session.ts` imports nothing from `@/` or `src/components`. Drop the assertions on the deleted helpers (`getReadableAuditScanValue`, `getEditableAuditValues`, `emptyToNull`, `buildManualScanSuggestions`) — Tasks 1–2 test their replacements. |
| `tests/audit-scan-feedback-transition.test.ts` | Rewrite: the saved banner and the offline bar have `role="status"`; opening a target clears the previous saved notice (`setSaved(null)` inside `openItem`). |
| `tests/audit-scan-readable-result.test.ts` | Rewrite: the camera passes decoded text to `onDecoded` (no `new Html5Qrcode("audit-qr-reader")` anywhere); `readerId: "audit-qr-reader"` is set in `audit-scan-camera.tsx`. |
| `tests/audit-scan-result-semantics.test.ts` | Keep the "scan screen has no not-found marking; the pending page owns it" assertions, pointed at `audit-scan-workspace.tsx` + `audit-scan-check-form.tsx`; replace the old primary-button label checks with the new `saveAllMatch`/`saveMismatch` keys. |
| `tests/audit-scan-offline-ux.test.ts` | Point at `audit-scan-workspace.tsx`: online/offline listeners, `upsertQueuedAuditScanAsync`, failed entries shown with `lastSyncError` in `audit-scan-offline-bar.tsx`, send disabled while sending. |
| `tests/audit-component-scan-ui.test.ts` | Point at `audit-scan-check-form.tsx`: `<AuditComponentPanel`, confirm/missing/scan handlers wired; the page no longer preloads components (lazy via scan-lookup in the workspace). |
| `tests/audit-mobile-flow-completion.test.ts` | Point at `audit-scan-component-missing-dialog.tsx` (`AccessibleDialog`, `FileDropzone`, no `window.prompt`). |
| `tests/audit-out-of-scope-actual-field.test.ts` | Replace the form assertions with: the check form uses `buildCheckDefaults({ mode: "out_of_scope", … })` and `masterCheckValues`; the workspace uploads evidence before posting. Keep the route/lookup assertions unchanged. |
| `tests/audit-scan-lookup.test.ts` | Point the "form calls `/scan-lookup`, never `/api/search`" assertion at `audit-scan-workspace.tsx`. Route assertions unchanged. |
| `tests/audit-component-scan-api.test.ts`, `tests/audit-round-result-drilldown.test.ts`, `tests/operational-return-navigation.test.ts`, `tests/performance-route-instrumentation.test.ts`, `tests/audit-scan-context.test.ts`, `tests/audit-offline-queue.test.ts`, `tests/camera-selection.test.ts` | No change expected; they must still pass. |

- [ ] **Step 5: Run everything**

Run: `node --test tests/audit-scan-page.test.ts` → PASS. Then `npm test` (the whole suite, not just the new files), `npx tsc --noEmit`, `npm run lint`. Every test that read `audit-scan-form.tsx` must now be rewritten or deleted per the table — none may be skipped.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/audit "src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx" tests
git commit -m "feat(audit): scan page runs on the new workspace; remove the old scan form

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git add -A` is limited to these paths; check `git status` first so no unrelated file is staged.)

---

### Task 10: Verify on the dev app, docs, staff guide, wiki (main session)

Run by the main session (needs the browser pane, the user's login and the vault).

**Files:** `docs/18_AUDIT_SCAN_GUIDE_TH.md` (new), `DESIGN.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, wiki `AssetSystem/ams-status.md`, `ams-log.md`, `ams-open-questions.md`, memory.

- [ ] **Step 1: Full verification** — `npm run verify`; then stop the dev server, `npx -y npm@10.9.4 ci --ignore-scripts`, `npm run prisma:generate`, restart the dev server against `asset_management_dev` (check `.env` first).

- [ ] **Step 2: Make a test round on the DEV DB only** — through `/th/audit/rounds/new` with a small scope (one branch or one location, ≤ 50 assets), status "open". Never touch `asset_management`.

- [ ] **Step 3: Check on the dev app** (user signed in; use JS focus/click + real keystrokes in the browser pane; viewport emulation makes coordinate clicks unreliable):
  1. 375×812: bottom of the search field ≤ 300px; room button above it.
  2. Choose a room → the "ยังไม่ตรวจ" list shows only that room; tab counts add up.
  3. A matching item: row tap → sheet → "บันทึก · ตรงทุกข้อ" → saved banner, list moves it to "ตรวจแล้ว", progress +1, no full page reload (Network shows no RSC refetch of the page), Android-only vibration not testable → note.
  4. Typed search: Serial fragment → result with highlight → Enter opens it → save → search empty and focused (`document.activeElement` is the input).
  5. An item whose expected location is another room → sheet shows "ที่ตั้ง" mismatched with "ในระบบ: …", button "ไม่ตรง 1 ข้อ (ที่ตั้ง)".
  6. Change custodian → department follows that employee.
  7. Condition change without photo → button disabled with the reason; add a photo → enabled.
  8. Edit a checked item from another room → location stays the saved value; after saving "ตรง", the earlier wrong-location finding is `rejected` with remark "ยกเลิกเพราะแก้ผลตรวจ" (check via `/th/audit/findings` or a read-only SELECT on the dev DB).
  9. Register search: partial tag of an asset outside the round → candidates → pick → "บันทึกนอกขอบเขต" (photo required when values differ).
  10. Two sessions (second browser/profile, other user): a save in one appears in the other within 30 s; opening it there shows "เพิ่งถูกตรวจโดย …" / edit mode.
  11. Offline (DevTools offline or Wi-Fi off): save → "รอส่ง", second save of the same asset → still one queue entry; back online → sends by itself.
  12. Deep link `?assetId=<id>&mode=edit` from the round detail page opens the sheet in edit mode.
  13. Esc / focus return for the room sheet and the check sheet; axe (color-contrast, button-name, label, nested-interactive, list) at 375 and 1440 → 0.
  14. Large round (spec §10): open the scan page of the largest round on the dev DB (or create one covering a whole company/branch). Record the HTML document transfer size and the RSC payload size from the Network panel, and the delay from typing the 2nd character to results appearing (Performance panel or `performance.now()` around a typed key). Report the numbers; flag anything over 1.5 MB transfer or 100 ms typing delay.
  15. Manual items to ask the user about (record as "ยังไม่ได้ตรวจ" if not done): Thai IME typing in the search; real Android/iOS camera; vibration.

- [ ] **Step 4: Docs and guide**
  - `docs/18_AUDIT_SCAN_GUIDE_TH.md` — short staff guide (Thai): choose the room · walk the list or type · read the sheet (yellow = mismatch, "ในระบบ") · save · edit a result · out of scope · offline · several people at once · where to mark "หาไม่พบ".
  - `DESIGN.md` — field-work page pattern (room → list/search → check sheet → one save button; sticky search; sheet on phones, inline panel ≥1024px).
  - `DEVELOPER_HANDOFF.md` — workspace/state, `scan-status` polling, stale-finding rule, partial lookup, photo rule, removed form.
  - `docs/99_CHANGELOG.md` — B2 entry with the verified numbers.

- [ ] **Step 5: Wiki and memory** — follow `AssetSystem/_schema/ams-wiki-schema.md`; `ams-status` row "UI ส่วน B2 … built · ยังไม่ merge/deploy"; `ams-open-questions` (deploy notes: no migration, no new dependency; manual checks pending; test round left on dev); `ams-log`; run the wiki lint in `D:\Obsidian\Eltross`; vault commit `ingest:`; update memory `review-2026-10-priorities.md` and `audit-scan-typed-search.md`.

- [ ] **Step 6: Report and finish** — report to the user in Thai (verified numbers, deviations, open items), then superpowers:finishing-a-development-branch.
