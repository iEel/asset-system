# Asset Register Redesign (Round 3 · Part B1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/[locale]/assets` so staff can find one asset fast (search while typing, status tabs with counts, one filter sheet) and see ≥ 8 rows on a 1440×900 screen and ≥ 5 rows on a phone, with small server-side thumbnails.

**Architecture:** Data stays server-side in `assets/page.tsx`, and filters stay as the existing URL params (`src/lib/asset-list-query.ts`). A client navigation provider (`useTransition` + `useOptimistic` + `router.replace`) applies every filter change instantly. The 1,079-line table and the 974-line page are split into single-purpose components. One `groupBy` query counts assets per status. One new route serves 96px WebP thumbnails through `sharp`.

**Tech Stack:** Next.js 16.2.4 App Router, React 19.2, Tailwind 4, shadcn/ui on `radix-ui` (Sheet, DropdownMenu from part A), next-intl 4 (th/en), Prisma 7.8 (mssql), `sharp` 0.34.5, `node --test` with type stripping.

**Spec:** `docs/superpowers/specs/2026-10-07-asset-register-redesign-design.md` (round 2, commit `d2e0381`). Read it before each task.

## Global Constraints

- Branch `feat/asset-register-redesign`. Never run `git checkout`, `git switch`, `git reset`, `git stash` or `git rebase`. Commit only the files your task names.
- Next.js 16.2.4 differs from older versions. Before using a Next API you have not used in this repo, read `node_modules/next/dist/docs/01-app/...` for it.
- Tests run with `node --test` and type stripping. Tests **cannot import `.tsx`**. UI tests read source text and use regex.
  - Files under `src/lib` that tests import must use relative `./x.ts` imports and no `@/`.
  - Use `import type` for type-only imports.
- Every task ends with these 3 checks, all green. Report any failure by name, even one you did not cause:
  - `npm test`
  - `npx tsc --noEmit`
  - `npm run lint`
- **Do not run** `npm ci`, `npm install` (except Task 3, step 1) or `npm run build`. The dev server is running and locks native modules.
- UI rules from part A (enforced by `tests/ui-overlay-guards.test.ts`):
  - No `dark:` classes.
  - No `window.confirm`; no `fixed inset-0` outside `src/components/ui/` and the shell; no `createPortal`.
  - No `document`/`window.addEventListener("keydown"|"mousedown"|"pointerdown")`.
  - No `bg-<tone>/NN` opacity tints.
- Touch targets are at least 44px below `md` (`min-h-11` / `size-11`). Desktop controls may be 32–40px.
- Status colours come from `StatusBadge` (`src/components/ui/status-badge.tsx`) with `tone={getAssetStateTone(value)}`. Do not hand-roll pills.
- Overlays come only from part A's shadcn files: `@/components/ui/sheet` (Sheet), `@/components/ui/dropdown-menu`, `@/components/ui/button`.
  - A Sheet or DropdownMenu must have a Radix `Trigger`, so focus returns to the opener on close.
- New user-facing copy is Thai-first. Add every new key to **both** `messages/th.json` and `messages/en.json`, in the same namespace and position.
  - The JSON files have no CRLF. Edit them with the Edit tool by inserting after an existing key. Do not re-serialise the whole file.
- `.tsx`/`.ts` files in `src/` use CRLF line endings. Keep them CRLF when you edit. Create new files with LF; git normalises them.
- Client components read text with `useTranslations("asset")` and `useTranslations("common")`. The layout passes all messages to `NextIntlClientProvider`.
- Filter changes always go back to page 1 and keep every other URL param.
- Search debounce is **400ms**. Auto-search needs **≥ 2 characters**, or an empty field to clear. Nothing searches while IME composition is active. Enter searches immediately at any length.
- Thumbnails come from `GET /api/attachments/[id]/thumbnail` with these properties:
  - `sharp(file).rotate().resize(96, 96, { fit: "inside", withoutEnlargement: true }).webp({ quality: 75 })`
  - headers `Cache-Control: private, max-age=604800, immutable` and `ETag: "{id}-96"`
  - status codes 415 (not an image), 404 (row or file missing), 422 (sharp failed), 304 (ETag match, checked after permissions)
- Desktop column widths in px: ☐ 44 · tag 172 · name flexible, min **200** · location 140 · custodian 160 · status 132 · condition 96 · actions 150. When switched on: category 160 · company/branch 120 · ownership 120 · price 120.
  - Deviation: the spec's name minimum was 236. It is cut to 200 so the default columns (1,094px) fit 1440px minus sidebar 256, main padding 48, Windows scrollbar 17 and borders 2 (= 1,117px).
- No database migration. Production DB writes are out of scope.

## Review Focus

These are inputs the spec implies but its happy-path tests skip. Each one has a pinning test inside the task named in brackets:

1. **A slow response arrives while the person keeps typing.**
   - The text in the search box must never jump back.
   - The URL must never be synced into the box while the box has focus. [Task 5]
2. **The user lacks `brand:view`, so model photos return 403.**
   - The row shows the image icon, not a broken frame.
   - The thumbnail route answers 403 before any 304 check. [Tasks 3, 4]
3. **An old bookmark carries a `statusId` that has no tab** (for example "สูญหาย").
   - No tab is active, "ทั้งหมด" is not active either, and a status chip with × appears. [Task 2]
4. **On a phone, rows are tapped in select mode.**
   - A tap toggles the checkbox and never opens the detail page.
   - Leaving select mode clears the selection. [Task 10]
5. **The person leaves the page (or the component unmounts) while a debounced search is pending.**
   - The timer must be cleared, so the user is not pulled back to `/assets`. [Task 5]

---

## File Structure

**New pure modules (importable by tests)**
- `src/lib/asset-register-filters.ts`:
  - `shouldAutoSearch`
  - `mergeAssetRegisterFilters`, `buildAssetRegisterFilterHref`
  - `getCompanyChangeOverrides`
  - `getActiveSheetFilterKeys`, `buildSheetClearOverrides`
  - debounce constants
- `src/lib/asset-register-status-tabs.ts`: tab definitions and `buildStatusTabs`.
- `src/lib/asset-register-chips.ts`: `buildAssetRegisterChips`, `buildAssetRegisterClearAllHref`.
- `src/lib/asset-register-sort.ts`: sort options and `getActiveSortKey`.
- `src/lib/attachment-thumbnail.ts`: type allow-list, ETag, cache headers, `If-None-Match` matching, URL.

**New server module**
- `src/lib/attachment-access.ts`: attachment view/edit permission checks, moved out of the attachment route so the thumbnail route can share them.

**New route**
- `src/app/api/attachments/[id]/thumbnail/route.ts`

**New UI**
- Shared, in `src/components/ui/`:
  - `pagination.tsx`: shared pagination; not a client component.
  - `use-media-query.ts`: `useMediaQuery` via `useSyncExternalStore`.
- Register parts, in `src/components/assets/`:
  - `asset-thumbnail.tsx`: lazy thumbnail; icon fallback; click opens `AttachmentPreviewDialog`.
  - `asset-register-navigation.tsx`: provider plus `useAssetRegisterNavigation()`.
  - `asset-register-search-field.tsx`: search-as-you-type.
  - `asset-register-toolbar.tsx`: search, desktop scope selects, ⚙ trigger.
  - `asset-register-filter-sheet.tsx`: the ⚙ Sheet; applies changes instantly.
  - `asset-register-status-tabs.tsx`: status tab links with counts; not a client component.
  - `asset-register-filter-chips.tsx`: removable chips and "ล้างทั้งหมด"; not a client component.
  - `asset-register-row-actions.tsx`: next-action button plus ⋯ (DropdownMenu on desktop, bottom Sheet on mobile).
  - `asset-register-sort-menu.tsx`, `asset-register-column-picker.tsx`, `asset-register-export-menu.tsx`

**Modified**
- `src/lib/asset-list-query.ts`: `AssetListFilters` type and `buildAssetStatusCountWhere`.
- `src/lib/asset-operation-policy.ts`: `getRowNextAction`.
- `src/lib/asset-register-columns.ts`: `assetRegisterColumnWidths` and `getAssetRegisterTableMinWidth`.
- `src/app/api/attachments/[id]/route.ts`: uses `attachment-access`.
- `src/app/[locale]/(dashboard)/assets/page.tsx`: filter UI replaced; counts, chips, permissions.
- `src/components/assets/asset-register-table.tsx`: becomes the orchestrator for selection, columns, bulk dialog and hrefs.
- `messages/th.json`, `messages/en.json`, `package.json`, `package-lock.json`.

**Deleted**
- `src/components/assets/asset-register-action-menus.tsx` (Task 10).

**Tests**
- New:
  - `tests/asset-register-filters.test.ts`, `tests/asset-register-view-model.test.ts`
  - `tests/attachment-thumbnail.test.ts`, `tests/attachment-thumbnail-route.test.ts`
  - `tests/asset-register-building-blocks-ui.test.ts`, `tests/asset-register-search-ui.test.ts`
  - `tests/asset-register-filter-ui.test.ts`, `tests/asset-register-table-ui.test.ts`
- Rewritten in place:
  - `tests/asset-register-ux.test.ts`, `tests/asset-status-help-ui.test.ts`, `tests/dropdown-menus-ui.test.ts`
  - `tests/modern-enterprise-theme.test.ts`, `tests/my-assets-attachment-permission.test.ts`

---

### Task 1: Filter helpers

**Files:**
- Modify: `src/lib/asset-list-query.ts` (add after `buildAssetWhere`, around line 112)
- Create: `src/lib/asset-register-filters.ts`
- Test: `tests/asset-register-filters.test.ts`

**Interfaces:**
- Consumes: `parseAssetListParams`, `buildAssetWhere`, `buildAssetQueryString` (existing, `src/lib/asset-list-query.ts`).
- Produces:
  - `type AssetListFilters = ReturnType<typeof parseAssetListParams>`, exported from `asset-list-query.ts`.
  - `buildAssetStatusCountWhere(filters: AssetListFilters): Prisma.AssetWhereInput`
  - `assetRegisterSearchDebounceMs = 400`, `assetRegisterMinAutoSearchLength = 2`, `assetRegisterDefaultPageSize = 25`
  - `shouldAutoSearch(draft: string, applied: string): boolean`
  - `mergeAssetRegisterFilters(base: AssetListFilters, overrides: Partial<AssetListFilters>): AssetListFilters` (always sets `page: 1`)
  - `buildAssetRegisterFilterHref(basePath: string, base: AssetListFilters, overrides: Partial<AssetListFilters>): string`
  - `getCompanyChangeOverrides(companyId: string, currentBranchId: string, branches: readonly { id: string; companyId: string }[]): { companyId: string; branchId: string }`
  - `type AssetRegisterSheetScope = { includeScope: boolean; tabStatusIds: readonly string[] }`
  - `type AssetRegisterSheetFilterKey = "companyId" | "branchId" | "categoryId" | "statusId" | "conditionId" | "ownershipType" | "dataQuality" | "crossScope" | "pageSize"`
  - `getActiveSheetFilterKeys(filters: AssetListFilters, scope: AssetRegisterSheetScope): AssetRegisterSheetFilterKey[]`
  - `buildSheetClearOverrides(filters: AssetListFilters, scope: AssetRegisterSheetScope): Partial<AssetListFilters>`

- [ ] **Step 1: Write the failing test**

Create `tests/asset-register-filters.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { buildAssetStatusCountWhere, buildAssetWhere, parseAssetListParams } from "../src/lib/asset-list-query.ts"
import {
  assetRegisterSearchDebounceMs,
  buildAssetRegisterFilterHref,
  buildSheetClearOverrides,
  getActiveSheetFilterKeys,
  getCompanyChangeOverrides,
  mergeAssetRegisterFilters,
  shouldAutoSearch,
} from "../src/lib/asset-register-filters.ts"

const filters = (query = "") => parseAssetListParams(new URLSearchParams(query))

test("auto search waits for two characters and skips the term already applied", () => {
  assert.equal(assetRegisterSearchDebounceMs, 400)
  assert.equal(shouldAutoSearch("", "dell"), true)
  assert.equal(shouldAutoSearch("", ""), false)
  assert.equal(shouldAutoSearch("   ", ""), false)
  assert.equal(shouldAutoSearch("d", ""), false)
  assert.equal(shouldAutoSearch("de", ""), true)
  assert.equal(shouldAutoSearch("  dell ", "dell"), false)
  assert.equal(shouldAutoSearch("โน", ""), true)
  assert.equal(shouldAutoSearch("0271", "027"), true)
})

test("status counts use every filter except the status itself", () => {
  const current = filters("statusId=s-ready&branchId=b-1&dataQuality=serial&search=dell")
  const countWhere = buildAssetStatusCountWhere(current)

  assert.equal("statusId" in countWhere, false)
  assert.deepEqual(countWhere, buildAssetWhere({ ...current, statusId: "" }))
  assert.equal(countWhere.branchId, "b-1")
  assert.ok(countWhere.OR, "search must still narrow the counts")
  assert.ok(Array.isArray(countWhere.AND) && countWhere.AND.length === 1, "data quality must still narrow the counts")
})

test("merging filters always returns to page 1 and keeps every other parameter", () => {
  const current = filters("page=4&pageSize=50&brandId=br-1&custodianId=e-1&supplierId=s-1&activity=idle_180d&sort=name&direction=asc&search=dell")
  const merged = mergeAssetRegisterFilters(current, { conditionId: "cond-2" })

  assert.equal(merged.page, 1)
  assert.equal(merged.conditionId, "cond-2")
  assert.equal(current.page, 4, "the base object must not be mutated")

  const href = buildAssetRegisterFilterHref("/th/assets", current, { conditionId: "cond-2" })
  assert.ok(href.startsWith("/th/assets?"))
  const params = new URLSearchParams(href.slice(href.indexOf("?") + 1))
  assert.equal(params.get("page"), "1")
  assert.equal(params.get("conditionId"), "cond-2")
  for (const [key, value] of [
    ["pageSize", "50"],
    ["brandId", "br-1"],
    ["custodianId", "e-1"],
    ["supplierId", "s-1"],
    ["activity", "idle_180d"],
    ["sort", "name"],
    ["direction", "asc"],
    ["search", "dell"],
  ] as const) {
    assert.equal(params.get(key), value, key)
  }
})

test("changing company keeps the branch only when it belongs to the new company", () => {
  const branches = [
    { id: "b-1", companyId: "c-1" },
    { id: "b-2", companyId: "c-2" },
  ]

  assert.deepEqual(getCompanyChangeOverrides("c-1", "b-1", branches), { companyId: "c-1", branchId: "b-1" })
  assert.deepEqual(getCompanyChangeOverrides("c-2", "b-1", branches), { companyId: "c-2", branchId: "" })
  assert.deepEqual(getCompanyChangeOverrides("", "b-1", branches), { companyId: "", branchId: "b-1" })
  assert.deepEqual(getCompanyChangeOverrides("c-1", "", branches), { companyId: "c-1", branchId: "" })
  assert.deepEqual(getCompanyChangeOverrides("c-1", "b-gone", branches), { companyId: "c-1", branchId: "" })
})

test("sheet filter counts include only what lives in the sheet", () => {
  const desktop = { includeScope: false, tabStatusIds: ["s-ready"] }
  const mobile = { includeScope: true, tabStatusIds: ["s-ready"] }
  const current = filters("companyId=c-1&statusId=s-ready&conditionId=cond-2&pageSize=50&search=dell")

  assert.deepEqual(getActiveSheetFilterKeys(current, desktop), ["conditionId", "pageSize"])
  assert.deepEqual(getActiveSheetFilterKeys(current, mobile), ["companyId", "conditionId", "pageSize"])
  assert.deepEqual(getActiveSheetFilterKeys(filters("statusId=s-lost"), desktop), ["statusId"])
  assert.deepEqual(getActiveSheetFilterKeys(filters("dataQuality=department&crossScope=all"), desktop), ["dataQuality", "crossScope"])
  assert.deepEqual(getActiveSheetFilterKeys(filters(""), mobile), [])
})

test("clearing the sheet removes only sheet filters", () => {
  const current = filters("companyId=c-1&branchId=b-1&statusId=s-ready&conditionId=cond-2&dataQuality=serial&crossScope=all&pageSize=50&search=dell")

  assert.deepEqual(buildSheetClearOverrides(current, { includeScope: false, tabStatusIds: ["s-ready"] }), {
    conditionId: "",
    dataQuality: "",
    crossScope: "",
    pageSize: 25,
  })
  assert.deepEqual(buildSheetClearOverrides(current, { includeScope: true, tabStatusIds: ["s-ready"] }), {
    companyId: "",
    branchId: "",
    conditionId: "",
    dataQuality: "",
    crossScope: "",
    pageSize: 25,
  })
  assert.deepEqual(buildSheetClearOverrides(filters("statusId=s-lost"), { includeScope: false, tabStatusIds: ["s-ready"] }), {
    statusId: "",
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/asset-register-filters.test.ts`
Expected: FAIL. The import of `../src/lib/asset-register-filters.ts` fails with "Cannot find module", and `buildAssetStatusCountWhere` is not exported.

- [ ] **Step 3: Add the count helper to `asset-list-query.ts`**

Insert directly after the closing `}` of `buildAssetWhere`:

```ts
export type AssetListFilters = ReturnType<typeof parseAssetListParams>

/** The register's status tabs count with every filter except the status itself. */
export function buildAssetStatusCountWhere(filters: AssetListFilters): Prisma.AssetWhereInput {
  return buildAssetWhere({ ...filters, statusId: "" })
}
```

- [ ] **Step 4: Create `src/lib/asset-register-filters.ts`**

```ts
import { buildAssetQueryString, type AssetListFilters } from "./asset-list-query.ts"

export const assetRegisterSearchDebounceMs = 400
export const assetRegisterMinAutoSearchLength = 2
export const assetRegisterDefaultPageSize = 25

/** Decide whether a pause in typing should run a search. Enter bypasses this. */
export function shouldAutoSearch(draft: string, applied: string): boolean {
  const next = draft.trim()
  if (next === applied.trim()) return false
  if (next.length === 0) return true
  return Array.from(next).length >= assetRegisterMinAutoSearchLength
}

export function mergeAssetRegisterFilters(
  base: AssetListFilters,
  overrides: Partial<AssetListFilters>,
): AssetListFilters {
  return { ...base, ...overrides, page: 1 }
}

export function buildAssetRegisterFilterHref(
  basePath: string,
  base: AssetListFilters,
  overrides: Partial<AssetListFilters>,
) {
  return `${basePath}?${buildAssetQueryString(mergeAssetRegisterFilters(base, overrides))}`
}

/** A branch from another company would empty the list, so it is dropped with the company change. */
export function getCompanyChangeOverrides(
  companyId: string,
  currentBranchId: string,
  branches: readonly { id: string; companyId: string }[],
) {
  if (!companyId || !currentBranchId) return { companyId, branchId: currentBranchId }
  const branch = branches.find((item) => item.id === currentBranchId)
  return { companyId, branchId: branch?.companyId === companyId ? currentBranchId : "" }
}

export type AssetRegisterSheetScope = {
  /** Mobile moves company, branch and category into the sheet. */
  includeScope: boolean
  /** Statuses that have their own tab are not sheet filters. */
  tabStatusIds: readonly string[]
}

export type AssetRegisterSheetFilterKey =
  | "companyId"
  | "branchId"
  | "categoryId"
  | "statusId"
  | "conditionId"
  | "ownershipType"
  | "dataQuality"
  | "crossScope"
  | "pageSize"

const scopeKeys = ["companyId", "branchId", "categoryId"] as const

export function getActiveSheetFilterKeys(
  filters: AssetListFilters,
  scope: AssetRegisterSheetScope,
): AssetRegisterSheetFilterKey[] {
  const keys: AssetRegisterSheetFilterKey[] = []
  if (scope.includeScope) {
    for (const key of scopeKeys) if (filters[key]) keys.push(key)
  }
  if (filters.statusId && !scope.tabStatusIds.includes(filters.statusId)) keys.push("statusId")
  if (filters.conditionId) keys.push("conditionId")
  if (filters.ownershipType) keys.push("ownershipType")
  if (filters.dataQuality) keys.push("dataQuality")
  if (filters.crossScope) keys.push("crossScope")
  if (filters.pageSize !== assetRegisterDefaultPageSize) keys.push("pageSize")
  return keys
}

export function buildSheetClearOverrides(
  filters: AssetListFilters,
  scope: AssetRegisterSheetScope,
): Partial<AssetListFilters> {
  const overrides: Partial<AssetListFilters> = {}
  for (const key of getActiveSheetFilterKeys(filters, scope)) {
    if (key === "pageSize") overrides.pageSize = assetRegisterDefaultPageSize
    else Object.assign(overrides, { [key]: "" })
  }
  return overrides
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `node --test tests/asset-register-filters.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Run the full checks**

Run: `npm test`, then `npx tsc --noEmit`, then `npm run lint`.
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/asset-list-query.ts src/lib/asset-register-filters.ts tests/asset-register-filters.test.ts
git commit -m "feat(assets): register filter helpers for instant filtering

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Status tabs, chips, sort options, next action and column widths

**Files:**
- Create:
  - `src/lib/asset-register-status-tabs.ts`
  - `src/lib/asset-register-chips.ts`
  - `src/lib/asset-register-sort.ts`
- Modify:
  - `src/lib/asset-operation-policy.ts` (append `getRowNextAction`)
  - `src/lib/asset-register-columns.ts` (append widths)
- Test: `tests/asset-register-view-model.test.ts`

**Interfaces:**
- Consumes:
  - `AssetListFilters`, `buildAssetQueryString` (Task 1 / existing)
  - `AssetRegisterTransaction` (`asset-operation-policy.ts`)
  - `AssetRegisterColumnKey` (`asset-register-columns.ts`)
- Produces:
  - `assetRegisterStatusTabs`: readonly `{ key, statusName }[]` with keys `ready | inUse | checkedOut | pendingRepair | underMaintenance`
  - `type AssetRegisterStatusTabKey`
  - `type AssetRegisterStatusTab = { key: AssetRegisterStatusTabKey | "all"; statusId: string; count: number; active: boolean }`
  - `buildStatusTabs({ statuses, counts, statusId }): { tabs: AssetRegisterStatusTab[]; tabStatusIds: string[]; otherStatusActive: boolean }`
  - `type AssetRegisterChip = { key: string; label: string; href: string; mobileOnly: boolean }`
  - `buildAssetRegisterChips(input: AssetRegisterChipInput): AssetRegisterChip[]`
  - `buildAssetRegisterClearAllHref(basePath: string, filters: AssetListFilters): string`
  - `assetRegisterSortOptions`: readonly `{ key, sort, direction }[]`
  - `type AssetRegisterSortKey`
  - `getActiveSortKey(sort: string, direction: string): AssetRegisterSortKey | null`
  - `getRowNextAction(transactions: ReadonlyArray<Pick<AssetRegisterTransaction, "action" | "enabled">>): "checkout" | "checkin" | null`
  - `assetRegisterColumnWidths`: `Record<AssetRegisterColumnKey | "select" | "actions", number>`. `name` holds the **minimum** width.
  - `getAssetRegisterTableMinWidth(columns: Iterable<AssetRegisterColumnKey>): number`

- [ ] **Step 1: Write the failing test**

Create `tests/asset-register-view-model.test.ts`:

```ts
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
  dataQuality: { serial: "ไม่มี Serial", department: "แผนกไม่ครบ" },
  crossScope: { all: "ต่างบริษัท/ต่างสาขา" },
  activity: { idle_180d: "ไม่มีความเคลื่อนไหวใน 180 วันล่าสุด" },
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

test("chips show hidden filters, hide tab statuses and search, and mark scope chips mobile-only", () => {
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
  assert.deepEqual(chips.filter((chip) => chip.mobileOnly).map((chip) => chip.key), ["company"])
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
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.operations), 1094)
  assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.operations) <= 1117)
  assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.all) > 1117, "the all preset scrolls")
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/asset-register-view-model.test.ts`
Expected: FAIL with "Cannot find module" for `asset-register-status-tabs.ts`.

- [ ] **Step 3: Create `src/lib/asset-register-status-tabs.ts`**

```ts
export const assetRegisterStatusTabs = [
  { key: "ready", statusName: "Ready" },
  { key: "inUse", statusName: "In Use" },
  { key: "checkedOut", statusName: "Checked Out" },
  { key: "pendingRepair", statusName: "Pending Repair" },
  { key: "underMaintenance", statusName: "Under Maintenance" },
] as const

export type AssetRegisterStatusTabKey = (typeof assetRegisterStatusTabs)[number]["key"]

export type AssetRegisterStatusTab = {
  key: AssetRegisterStatusTabKey | "all"
  statusId: string
  count: number
  active: boolean
}

export function buildStatusTabs({
  statuses,
  counts,
  statusId,
}: {
  statuses: ReadonlyArray<{ id: string; name: string }>
  counts: ReadonlyArray<{ statusId: string; count: number }>
  statusId: string
}) {
  const countByStatusId = new Map(counts.map((item) => [item.statusId, item.count]))
  const total = counts.reduce((sum, item) => sum + item.count, 0)
  const statusTabs: AssetRegisterStatusTab[] = assetRegisterStatusTabs.flatMap((definition) => {
    const status = statuses.find((item) => item.name === definition.statusName)
    if (!status) return []
    return [{
      key: definition.key,
      statusId: status.id,
      count: countByStatusId.get(status.id) ?? 0,
      active: statusId === status.id,
    }]
  })
  const tabStatusIds = statusTabs.map((tab) => tab.statusId)

  return {
    tabs: [{ key: "all", statusId: "", count: total, active: !statusId }, ...statusTabs] as AssetRegisterStatusTab[],
    tabStatusIds,
    otherStatusActive: Boolean(statusId) && !tabStatusIds.includes(statusId),
  }
}
```

- [ ] **Step 4: Create `src/lib/asset-register-chips.ts`**

```ts
import { buildAssetQueryString, type AssetListFilters } from "./asset-list-query.ts"
import { assetRegisterDefaultPageSize } from "./asset-register-filters.ts"

export type AssetRegisterChip = { key: string; label: string; href: string; mobileOnly: boolean }

export type AssetRegisterChipInput = {
  basePath: string
  filters: AssetListFilters
  tabStatusIds: readonly string[]
  names: Partial<Record<
    "company" | "branch" | "category" | "status" | "condition" | "brand" | "model" | "custodian" | "supplier",
    string
  >>
  labels: {
    company: string
    branch: string
    category: string
    status: string
    condition: string
    ownershipType: string
    brand: string
    model: string
    custodian: string
    supplier: string
    rowsPerPage: string
    ownershipTypes: Record<string, string>
    dataQuality: Record<string, string>
    crossScope: Record<string, string>
    activity: Record<string, string>
  }
}

export function buildAssetRegisterChips({ basePath, filters, tabStatusIds, names, labels }: AssetRegisterChipInput) {
  const chips: AssetRegisterChip[] = []
  const add = (key: string, label: string, overrides: Partial<AssetListFilters>, mobileOnly = false) => {
    chips.push({ key, label, href: `${basePath}?${buildAssetQueryString(filters, { ...overrides, page: 1 })}`, mobileOnly })
  }
  const named = (prefix: string, name: string | undefined, raw: string) => `${prefix}: ${name ?? raw}`

  if (filters.companyId) add("company", named(labels.company, names.company, filters.companyId), { companyId: "", branchId: "" }, true)
  if (filters.branchId) add("branch", named(labels.branch, names.branch, filters.branchId), { branchId: "" }, true)
  if (filters.categoryId) add("category", named(labels.category, names.category, filters.categoryId), { categoryId: "" }, true)
  if (filters.statusId && !tabStatusIds.includes(filters.statusId)) {
    add("status", named(labels.status, names.status, filters.statusId), { statusId: "" })
  }
  if (filters.conditionId) add("condition", named(labels.condition, names.condition, filters.conditionId), { conditionId: "" })
  if (filters.ownershipType) {
    add("ownershipType", `${labels.ownershipType}: ${labels.ownershipTypes[filters.ownershipType] ?? filters.ownershipType}`, { ownershipType: "" })
  }
  if (filters.dataQuality) add("dataQuality", labels.dataQuality[filters.dataQuality] ?? filters.dataQuality, { dataQuality: "" })
  if (filters.crossScope) add("crossScope", labels.crossScope[filters.crossScope] ?? filters.crossScope, { crossScope: "" })
  if (filters.pageSize !== assetRegisterDefaultPageSize) {
    add("pageSize", `${labels.rowsPerPage}: ${filters.pageSize}`, { pageSize: assetRegisterDefaultPageSize })
  }
  if (filters.brandId) add("brand", named(labels.brand, names.brand, filters.brandId), { brandId: "" })
  if (filters.modelId) add("model", named(labels.model, names.model, filters.modelId), { modelId: "" })
  if (filters.custodianId) add("custodian", named(labels.custodian, names.custodian, filters.custodianId), { custodianId: "" })
  if (filters.supplierId) add("supplier", named(labels.supplier, names.supplier, filters.supplierId), { supplierId: "" })
  if (filters.activity) add("activity", labels.activity[filters.activity] ?? filters.activity, { activity: "" })

  return chips
}

export function buildAssetRegisterClearAllHref(basePath: string, filters: AssetListFilters) {
  return `${basePath}?${buildAssetQueryString(filters, {
    search: "",
    companyId: "",
    branchId: "",
    categoryId: "",
    brandId: "",
    modelId: "",
    statusId: "",
    conditionId: "",
    ownershipType: "",
    custodianId: "",
    supplierId: "",
    dataQuality: "",
    crossScope: "",
    activity: "",
    page: 1,
    pageSize: assetRegisterDefaultPageSize,
  })}`
}
```

- [ ] **Step 5: Create `src/lib/asset-register-sort.ts`**

```ts
export const assetRegisterSortOptions = [
  { key: "newest", sort: "createdAt", direction: "desc" },
  { key: "oldest", sort: "createdAt", direction: "asc" },
  { key: "tagAsc", sort: "assetTag", direction: "asc" },
  { key: "tagDesc", sort: "assetTag", direction: "desc" },
  { key: "nameAsc", sort: "name", direction: "asc" },
  { key: "purchaseDateDesc", sort: "purchaseDate", direction: "desc" },
  { key: "priceDesc", sort: "purchasePrice", direction: "desc" },
] as const

export type AssetRegisterSortKey = (typeof assetRegisterSortOptions)[number]["key"]

export function getActiveSortKey(sort: string, direction: string): AssetRegisterSortKey | null {
  return assetRegisterSortOptions.find((option) => option.sort === sort && option.direction === direction)?.key ?? null
}
```

- [ ] **Step 6: Append `getRowNextAction` to `src/lib/asset-operation-policy.ts`**

```ts
/** The single row button: hand over when possible, otherwise return, otherwise none. */
export function getRowNextAction(
  transactions: ReadonlyArray<Pick<AssetRegisterTransaction, "action" | "enabled">>,
): "checkout" | "checkin" | null {
  if (transactions.some((transaction) => transaction.action === "checkout" && transaction.enabled)) return "checkout"
  if (transactions.some((transaction) => transaction.action === "checkin" && transaction.enabled)) return "checkin"
  return null
}
```

- [ ] **Step 7: Append the widths to `src/lib/asset-register-columns.ts`**

```ts
/** Desktop widths in px. `name` is the minimum; the name column takes the remaining space. */
export const assetRegisterColumnWidths = {
  select: 44,
  assetTag: 172,
  name: 200,
  category: 160,
  companyBranch: 120,
  currentLocation: 140,
  custodian: 160,
  ownershipType: 120,
  status: 132,
  condition: 96,
  purchasePrice: 120,
  actions: 150,
} satisfies Record<AssetRegisterColumnKey | "select" | "actions", number>

export function getAssetRegisterTableMinWidth(columns: Iterable<AssetRegisterColumnKey>) {
  let width = assetRegisterColumnWidths.select + assetRegisterColumnWidths.actions
  for (const column of columns) width += assetRegisterColumnWidths[column]
  return width
}
```

- [ ] **Step 8: Run the test and confirm it passes**

Run: `node --test tests/asset-register-view-model.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 9: Run the full checks, then commit**

Run: `npm test`, then `npx tsc --noEmit`, then `npm run lint`. All must be green.

```bash
git add src/lib/asset-register-status-tabs.ts src/lib/asset-register-chips.ts src/lib/asset-register-sort.ts src/lib/asset-operation-policy.ts src/lib/asset-register-columns.ts tests/asset-register-view-model.test.ts
git commit -m "feat(assets): register view model for tabs, chips, sort and next action

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Thumbnail API

**Files:**
- Modify:
  - `package.json`, `package-lock.json` (add `sharp`)
  - `src/app/api/attachments/[id]/route.ts` (use the shared access module)
- Create:
  - `src/lib/attachment-access.ts`
  - `src/lib/attachment-thumbnail.ts`
  - `src/app/api/attachments/[id]/thumbnail/route.ts`
- Test:
  - `tests/attachment-thumbnail.test.ts`
  - `tests/attachment-thumbnail-route.test.ts`
  - modify `tests/my-assets-attachment-permission.test.ts`

**Interfaces:**
- Consumes: `requireAuth`, `hasPermission` (`@/lib/auth-utils`); `prisma` (`@/lib/db`); `assertSafeUploadPath` (`@/lib/uploads`); `errorResponse` (`@/lib/api-response`).
- Produces:
  - `attachmentThumbnailSize = 96`
  - `isThumbnailable(fileType: string | null | undefined): boolean`
  - `buildThumbnailETag(attachmentId: string): string`
  - `thumbnailCacheHeaders(etag: string): Record<string, string>`
  - `thumbnailNotModifiedHeaders(etag: string): Record<string, string>`
  - `matchesIfNoneMatch(header: string | null, etag: string): boolean`
  - `thumbnailUrl(attachmentId: string): string`, which returns `/api/attachments/{id}/thumbnail`
  - `assertCanViewAttachment(user, attachment): Promise<void>`
  - `requireAttachmentPermission(user, module, action): void`
  - `GET /api/attachments/[id]/thumbnail`

- [ ] **Step 1: Add `sharp` to the dependencies without touching `node_modules`**

`sharp@0.34.5` is already installed as Next's optional dependency. Record it as a direct dependency:

Run: `npx -y npm@10.9.4 install sharp@^0.34.5 --save --package-lock-only --ignore-scripts`

Then verify:
- `node -e "console.log(require('sharp/package.json').version)"` prints `0.34.5`.
- `package.json` `dependencies` now contains `"sharp": "^0.34.5"`, in alphabetical order.
- `grep -n '"node_modules/@img/sharp-linux-x64"' package-lock.json` still finds the Linux binary, which Prod needs.

If the command fails with EPERM, stop and report BLOCKED. Do not kill processes.

- [ ] **Step 2: Write the failing pure test**

Create `tests/attachment-thumbnail.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  attachmentThumbnailSize,
  buildThumbnailETag,
  isThumbnailable,
  matchesIfNoneMatch,
  thumbnailCacheHeaders,
  thumbnailNotModifiedHeaders,
  thumbnailUrl,
} from "../src/lib/attachment-thumbnail.ts"

test("only raster images a browser can show are thumbnailed", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "IMAGE/PNG"]) {
    assert.equal(isThumbnailable(type), true, type)
  }
  for (const type of ["application/pdf", "image/svg+xml", "image/heic", "", null, undefined]) {
    assert.equal(isThumbnailable(type), false, String(type))
  }
})

test("thumbnail ETag and cache headers are stable per attachment", () => {
  assert.equal(attachmentThumbnailSize, 96)
  assert.equal(buildThumbnailETag("att-1"), '"att-1-96"')
  assert.deepEqual(thumbnailCacheHeaders('"att-1-96"'), {
    "Content-Type": "image/webp",
    "Cache-Control": "private, max-age=604800, immutable",
    ETag: '"att-1-96"',
    "X-Content-Type-Options": "nosniff",
  })
  assert.deepEqual(thumbnailNotModifiedHeaders('"att-1-96"'), {
    "Cache-Control": "private, max-age=604800, immutable",
    ETag: '"att-1-96"',
  })
})

test("If-None-Match accepts weak tags, lists and a star", () => {
  const etag = '"att-1-96"'
  assert.equal(matchesIfNoneMatch(null, etag), false)
  assert.equal(matchesIfNoneMatch("", etag), false)
  assert.equal(matchesIfNoneMatch('"att-1-96"', etag), true)
  assert.equal(matchesIfNoneMatch('W/"att-1-96"', etag), true)
  assert.equal(matchesIfNoneMatch('"other", "att-1-96"', etag), true)
  assert.equal(matchesIfNoneMatch("*", etag), true)
  assert.equal(matchesIfNoneMatch('"att-2-96"', etag), false)
  assert.equal(matchesIfNoneMatch("att-1-96", etag), false)
})

test("thumbnail URLs encode the attachment id", () => {
  assert.equal(thumbnailUrl("att-1"), "/api/attachments/att-1/thumbnail")
  assert.equal(thumbnailUrl("a b"), "/api/attachments/a%20b/thumbnail")
})
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `node --test tests/attachment-thumbnail.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 4: Create `src/lib/attachment-thumbnail.ts`**

```ts
export const attachmentThumbnailSize = 96

const thumbnailableImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])
const thumbnailCacheControl = "private, max-age=604800, immutable"

export function isThumbnailable(fileType: string | null | undefined) {
  return thumbnailableImageTypes.has((fileType ?? "").toLowerCase())
}

/** Attachments are never edited in place (a new upload gets a new id), so the tag only depends on id and size. */
export function buildThumbnailETag(attachmentId: string) {
  return `"${attachmentId}-${attachmentThumbnailSize}"`
}

export function thumbnailCacheHeaders(etag: string): Record<string, string> {
  return {
    "Content-Type": "image/webp",
    "Cache-Control": thumbnailCacheControl,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  }
}

export function thumbnailNotModifiedHeaders(etag: string): Record<string, string> {
  return { "Cache-Control": thumbnailCacheControl, ETag: etag }
}

export function matchesIfNoneMatch(header: string | null, etag: string) {
  if (!header) return false
  const target = etag.replace(/^W\//, "")
  return header
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === "*" || value.replace(/^W\//, "") === target)
}

export function thumbnailUrl(attachmentId: string) {
  return `/api/attachments/${encodeURIComponent(attachmentId)}/thumbnail`
}
```

Run: `node --test tests/attachment-thumbnail.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Move the attachment permission rules into `src/lib/attachment-access.ts`**

Create the file. It holds the same logic as `src/app/api/attachments/[id]/route.ts:86-134`, plus a single entry point for "may view":

```ts
import { prisma } from "@/lib/db"
import { hasPermission, type requireAuth } from "@/lib/auth-utils"

type AttachmentUser = Awaited<ReturnType<typeof requireAuth>>

export type AttachmentAccessRecord = {
  module: string
  assetId: string | null
  referenceId: string
}

export function getAttachmentPermissionModule(module: string) {
  return (
    module === "maintenance"
      ? "maintenance"
      : module === "audit_finding"
        ? "audit"
        : module === "disposal" || module === "disposal_batch"
          ? "disposal"
        : module === "asset_model"
          ? "brand"
          : "asset"
  )
}

export function hasAttachmentPermission(user: AttachmentUser, module: string, action: "view" | "edit") {
  return hasPermission(user, getAttachmentPermissionModule(module), action)
}

export function requireAttachmentPermission(user: AttachmentUser, module: string, action: "view" | "edit") {
  if (!hasAttachmentPermission(user, module, action)) {
    throw new Error("Forbidden: insufficient permissions")
  }
}

export async function canViewOwnAssetAttachment(user: AttachmentUser, attachment: AttachmentAccessRecord) {
  if (attachment.module !== "asset" || !user.employeeId) return false

  const assetId = attachment.assetId ?? attachment.referenceId
  if (!assetId) return false

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, isActive: true, custodianId: user.employeeId },
    select: { id: true },
  })

  return Boolean(asset)
}

/** File and thumbnail routes share one rule: module permission, or the employee who holds the asset. */
export async function assertCanViewAttachment(user: AttachmentUser, attachment: AttachmentAccessRecord) {
  if (hasAttachmentPermission(user, attachment.module, "view")) return
  if (await canViewOwnAssetAttachment(user, attachment)) return
  requireAttachmentPermission(user, attachment.module, "view")
}
```

Edit `src/app/api/attachments/[id]/route.ts`:
- Change the auth import to `import { requireAuth } from "@/lib/auth-utils"`.
- Add `import { assertCanViewAttachment, requireAttachmentPermission } from "@/lib/attachment-access"`.
- In `GET`, replace the `if (!hasAttachmentPermission(...) && !(await canViewOwnAssetAttachment(...))) { requireAttachmentPermission(...) }` block with:

```ts
    await assertCanViewAttachment(user, attachment)
```

- Delete the local `requireAttachmentPermission`, `hasAttachmentPermission`, `getAttachmentPermissionModule` and `canViewOwnAssetAttachment` functions at the bottom of the file.
- `DELETE` keeps `requireAttachmentPermission(user, existing.module, "edit")`, now imported. Headers and status codes stay byte-for-byte the same.

- [ ] **Step 6: Write the failing route test**

Create `tests/attachment-thumbnail-route.test.ts`:

```ts
import assert from "node:assert/strict"
import { existsSync, mkdtempSync, writeFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import sharp from "sharp"

type ThumbnailAttachment = {
  id: string
  module: string
  assetId: string | null
  referenceId: string
  filePath: string
  fileType: string
}

const state: { allowed: boolean; ownAsset: boolean; attachment: ThumbnailAttachment | null } = {
  allowed: true,
  ownAsset: false,
  attachment: null,
}
Object.assign(globalThis, { __thumbnailRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: [], employeeId: "emp-1" } }
    export function hasPermission() { return globalThis.__thumbnailRouteState.allowed }
  `],
  ["@/lib/uploads", `export function assertSafeUploadPath(filePath) { return filePath }`],
  ["@/lib/db", `
    const state = () => globalThis.__thumbnailRouteState
    export const prisma = {
      attachment: { findFirst: async () => state().attachment },
      asset: { findFirst: async () => (state().ownAsset ? { id: "asset-1" } : null) },
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

type ThumbnailRoute = { GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
const route = await import(pathToFileURL("src/app/api/attachments/[id]/thumbnail/route.ts").href) as ThumbnailRoute

const dir = mkdtempSync(join(tmpdir(), "asset-thumbnail-"))
const pngPath = join(dir, "photo.png")
writeFileSync(pngPath, await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#2563EB" } }).png().toBuffer())
const brokenPath = join(dir, "broken.png")
writeFileSync(brokenPath, "this is not an image")

function attachment(overrides: Partial<ThumbnailAttachment> = {}): ThumbnailAttachment {
  return { id: "att-1", module: "asset_model", assetId: null, referenceId: "model-1", filePath: pngPath, fileType: "image/png", ...overrides }
}

function get(headers: Record<string, string> = {}) {
  return route.GET(
    new Request("http://localhost/api/attachments/att-1/thumbnail", { headers }),
    { params: Promise.resolve({ id: "att-1" }) },
  )
}

beforeEach(() => {
  state.allowed = true
  state.ownAsset = false
  state.attachment = attachment()
})

test("an unknown attachment returns 404", async () => {
  state.attachment = null
  assert.equal((await get()).status, 404)
})

test("a user without permission gets 403 even when the ETag matches", async () => {
  state.allowed = false
  const response = await get({ "If-None-Match": '"att-1-96"' })
  assert.equal(response.status, 403)
})

test("the employee holding an asset may see its photo thumbnail", async () => {
  state.allowed = false
  state.ownAsset = true
  state.attachment = attachment({ module: "asset", assetId: "asset-1", referenceId: "asset-1" })
  assert.equal((await get()).status, 200)
})

test("a PDF returns 415", async () => {
  state.attachment = attachment({ fileType: "application/pdf" })
  assert.equal((await get()).status, 415)
})

test("a file missing on disk returns 404", async () => {
  state.attachment = attachment({ filePath: join(dir, "gone.png") })
  assert.equal((await get()).status, 404)
})

test("an unreadable image returns 422", async () => {
  state.attachment = attachment({ filePath: brokenPath })
  assert.equal((await get()).status, 422)
})

test("a large PNG becomes a small cached WebP that fits 96px", async () => {
  const response = await get()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "image/webp")
  assert.equal(response.headers.get("cache-control"), "private, max-age=604800, immutable")
  assert.equal(response.headers.get("etag"), '"att-1-96"')
  assert.equal(response.headers.get("x-content-type-options"), "nosniff")
  const body = Buffer.from(await response.arrayBuffer())
  assert.ok(body.length < 10 * 1024, `thumbnail is ${body.length} bytes`)
  const metadata = await sharp(body).metadata()
  assert.equal(metadata.format, "webp")
  assert.equal(metadata.width, 96)
  assert.equal(metadata.height, 72)
})

test("a matching ETag returns 304 without reading the file", async () => {
  state.attachment = attachment({ filePath: join(dir, "gone.png") })
  const response = await get({ "If-None-Match": 'W/"att-1-96"' })

  assert.equal(response.status, 304)
  assert.equal(response.headers.get("etag"), '"att-1-96"')
})
```

Update `tests/my-assets-attachment-permission.test.ts`. Replace both tests with:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8")

test("attachment views allow the module permission or the signed-in employee custodian only", () => {
  const access = read("src/lib/attachment-access.ts")

  assert.match(access, /export async function canViewOwnAssetAttachment/)
  assert.match(access, /attachment\.module !== "asset"/)
  assert.match(access, /attachment\.assetId \?\? attachment\.referenceId/)
  assert.match(access, /custodianId: user\.employeeId/)
  assert.match(access, /isActive: true/)
  assert.match(access, /export async function assertCanViewAttachment[\s\S]*?requireAttachmentPermission\(user, attachment\.module, "view"\)/)

  for (const path of ["src/app/api/attachments/[id]/route.ts", "src/app/api/attachments/[id]/thumbnail/route.ts"]) {
    assert.match(read(path), /await assertCanViewAttachment\(user, attachment\)/, path)
  }
})

test("asset attachment delete still requires broad edit permission only", () => {
  const route = read("src/app/api/attachments/[id]/route.ts")
  const deleteBlock = route.slice(route.indexOf("export async function DELETE"))

  assert.ok(deleteBlock.startsWith("export async function DELETE"))
  assert.match(deleteBlock, /requireAttachmentPermission\(user, existing\.module, "edit"\)/)
  assert.doesNotMatch(deleteBlock, /canViewOwnAssetAttachment|assertCanViewAttachment/)
})
```

- [ ] **Step 7: Run the tests and confirm they fail**

Run: `node --test tests/attachment-thumbnail-route.test.ts tests/my-assets-attachment-permission.test.ts`
Expected: FAIL. The route module is missing, and the thumbnail route file does not exist yet.

- [ ] **Step 8: Create `src/app/api/attachments/[id]/thumbnail/route.ts`**

```ts
import { readFile } from "fs/promises"
import sharp from "sharp"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { assertSafeUploadPath } from "@/lib/uploads"
import { assertCanViewAttachment } from "@/lib/attachment-access"
import {
  attachmentThumbnailSize,
  buildThumbnailETag,
  isThumbnailable,
  matchesIfNoneMatch,
  thumbnailCacheHeaders,
  thumbnailNotModifiedHeaders,
} from "@/lib/attachment-thumbnail"

export const runtime = "nodejs"

type ThumbnailRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: ThumbnailRouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    const attachment = await prisma.attachment.findFirst({
      where: { id, isActive: true },
      select: { id: true, module: true, assetId: true, referenceId: true, filePath: true, fileType: true },
    })

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }
    await assertCanViewAttachment(user, attachment)

    if (!isThumbnailable(attachment.fileType)) {
      return NextResponse.json({ error: "Attachment is not an image" }, { status: 415 })
    }

    const etag = buildThumbnailETag(attachment.id)
    if (matchesIfNoneMatch(request.headers.get("if-none-match"), etag)) {
      return new NextResponse(null, { status: 304, headers: thumbnailNotModifiedHeaders(etag) })
    }

    let file: Buffer
    try {
      file = await readFile(assertSafeUploadPath(attachment.filePath))
    } catch (error) {
      if (isMissingFileError(error)) {
        return NextResponse.json({ error: "Attachment file not found" }, { status: 404 })
      }
      throw error
    }

    let thumbnail: Buffer
    try {
      thumbnail = await sharp(file)
        .rotate()
        .resize(attachmentThumbnailSize, attachmentThumbnailSize, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer()
    } catch {
      return NextResponse.json({ error: "Image could not be processed" }, { status: 422 })
    }

    return new NextResponse(new Uint8Array(thumbnail), {
      headers: { ...thumbnailCacheHeaders(etag), "Content-Length": String(thumbnail.length) },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}
```

`sharp(file)` reads only the first frame of a GIF or AVIF by default. That is intended.

- [ ] **Step 9: Run the tests and confirm they pass**

Run: `node --test tests/attachment-thumbnail.test.ts tests/attachment-thumbnail-route.test.ts tests/my-assets-attachment-permission.test.ts tests/security-headers.test.ts`
Expected: PASS. If `x-content-type-options` or `cache-control` assertions in `security-headers.test.ts` fail, the attachment route's headers changed by mistake. Restore them.

- [ ] **Step 10: Run the full checks, then commit**

Run: `npm test`, then `npx tsc --noEmit`, then `npm run lint`. All must be green.

```bash
git add package.json package-lock.json src/lib/attachment-access.ts src/lib/attachment-thumbnail.ts "src/app/api/attachments/[id]/route.ts" "src/app/api/attachments/[id]/thumbnail/route.ts" tests/attachment-thumbnail.test.ts tests/attachment-thumbnail-route.test.ts tests/my-assets-attachment-permission.test.ts
git commit -m "feat(attachments): cached 96px WebP thumbnails with shared view permission

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Shared pagination, media-query hook and asset thumbnail

**Files:**
- Create:
  - `src/components/ui/pagination.tsx`
  - `src/components/ui/use-media-query.ts`
  - `src/components/assets/asset-thumbnail.tsx`
- Modify: `messages/th.json`, `messages/en.json`
- Test: `tests/asset-register-building-blocks-ui.test.ts`

**Interfaces:**
- Consumes:
  - `thumbnailUrl`, `isThumbnailable` (Task 3)
  - `AttachmentPreviewDialog` (`@/components/ui/attachment-preview-dialog`, props `open, onOpenChange, title, kind, src, alt?, downloadHref?`)
- Produces:
  - `Pagination({ page, totalPages, previousHref, nextHref, labels: { navigation, previous, next, pageOf }, className? })`
    - Not a client component.
    - `labels.pageOf` is pre-formatted, for example "หน้า 2 จาก 9".
  - `useMediaQuery(query: string): boolean`. Returns `false` on the server.
  - `AssetThumbnail({ photo, assetTag, assetName, size, preview?, className? })`
    - `photo: { id: string; alt: string; fileType: string } | null`
    - `size: 40 | 44`
    - `preview` defaults to `true`. With `preview={false}`, it renders a plain image with no button, for rows inside a `<label>`.
  - i18n:
    - `common.pagination`: "การแบ่งหน้า" / "Pagination"
    - `common.pageOf`: "หน้า {page} จาก {total}" / "Page {page} of {total}"
    - `asset.viewPhoto`: "ดูรูป {assetTag}" / "View photo of {assetTag}"

- [ ] **Step 1: Write the failing test**

Create `tests/asset-register-building-blocks-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("pagination is a server-safe nav with 44px phone targets and real disabled states", () => {
  const source = read("src/components/ui/pagination.tsx")

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<nav aria-label=\{labels\.navigation\}/)
  assert.match(source, /aria-disabled="true"/)
  assert.match(source, /min-h-11/)
  assert.match(source, /<Link/)
  assert.doesNotMatch(source, /opacity-/)
})

test("media query hook is hydration safe and cleans up its listener", () => {
  const source = read("src/components/ui/use-media-query.ts")

  assert.match(source, /useSyncExternalStore\(/)
  assert.match(source, /\(\) => false/)
  assert.match(source, /addEventListener\("change", onChange\)/)
  assert.match(source, /removeEventListener\("change", onChange\)/)
})

test("asset thumbnails load the small server image lazily and fall back to an icon", () => {
  const source = read("src/components/assets/asset-thumbnail.tsx")

  assert.match(source, /src=\{thumbnailUrl\(photo\.id\)\}/)
  assert.match(source, /loading="lazy"/)
  assert.match(source, /decoding="async"/)
  assert.match(source, /onError=\{\(\) => setFailed\(true\)\}/)
  assert.match(source, /!photo \|\| !isThumbnailable\(photo\.fileType\) \|\| failed/)
  assert.match(source, /data-no-row-click/)
  assert.match(source, /<AttachmentPreviewDialog/)
  assert.match(source, /src=\{`\/api\/attachments\/\$\{photo\.id\}\?inline=1`\}/)
  assert.doesNotMatch(source, /unoptimized|next\/image/)
})

test("pagination and photo copy exists in Thai and English", () => {
  assert.equal(messages("th").common.pageOf, "หน้า {page} จาก {total}")
  assert.equal(messages("en").common.pageOf, "Page {page} of {total}")
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof messages(locale).common.pagination, "string", locale)
    assert.equal(typeof messages(locale).asset.viewPhoto, "string", locale)
  }
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test tests/asset-register-building-blocks-ui.test.ts`
Expected: FAIL with ENOENT for `src/components/ui/pagination.tsx`.

- [ ] **Step 3: Create `src/components/ui/pagination.tsx`**

```tsx
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type PaginationLabels = {
  navigation: string
  previous: string
  next: string
  /** Already formatted, e.g. "หน้า 2 จาก 9". */
  pageOf: string
}

const controlClasses =
  "inline-flex min-h-11 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium sm:h-9 sm:min-h-0"

export function Pagination({
  page,
  totalPages,
  previousHref,
  nextHref,
  labels,
  className,
}: {
  page: number
  totalPages: number
  previousHref: string
  nextHref: string
  labels: PaginationLabels
  className?: string
}) {
  return (
    <nav aria-label={labels.navigation} className={cn("flex items-center gap-2", className)}>
      <PaginationControl href={previousHref} enabled={page > 1} direction="previous" label={labels.previous} />
      <span className="px-1 text-sm text-muted-foreground">{labels.pageOf}</span>
      <PaginationControl href={nextHref} enabled={page < totalPages} direction="next" label={labels.next} />
    </nav>
  )
}

function PaginationControl({
  href,
  enabled,
  direction,
  label,
}: {
  href: string
  enabled: boolean
  direction: "previous" | "next"
  label: string
}) {
  const content = direction === "previous"
    ? <><ChevronLeft className="size-4" aria-hidden="true" />{label}</>
    : <>{label}<ChevronRight className="size-4" aria-hidden="true" /></>

  if (!enabled) {
    return (
      <span aria-disabled="true" className={cn(controlClasses, "cursor-not-allowed bg-muted text-muted-foreground")}>
        {content}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={cn(controlClasses, "bg-surface text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
    >
      {content}
    </Link>
  )
}
```

- [ ] **Step 4: Create `src/components/ui/use-media-query.ts`**

```ts
"use client"

import { useSyncExternalStore } from "react"

/** False during server render and hydration, then the live match. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
```

- [ ] **Step 5: Create `src/components/assets/asset-thumbnail.tsx`**

```tsx
"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { AttachmentPreviewDialog } from "@/components/ui/attachment-preview-dialog"
import { isThumbnailable, thumbnailUrl } from "@/lib/attachment-thumbnail"
import { cn } from "@/lib/utils"

export type AssetThumbnailPhoto = { id: string; alt: string; fileType: string }

export function AssetThumbnail({
  photo,
  assetTag,
  assetName,
  size,
  preview = true,
  className,
}: {
  photo: AssetThumbnailPhoto | null
  assetTag: string
  assetName: string
  size: 40 | 44
  preview?: boolean
  className?: string
}) {
  const t = useTranslations("asset")
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const frame = cn(
    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground",
    size === 40 ? "size-10" : "size-11",
    className,
  )

  if (!photo || !isThumbnailable(photo.fileType) || failed) {
    return (
      <span className={frame}>
        <ImageIcon className="size-4" aria-hidden="true" />
      </span>
    )
  }

  // Decorative: the row already names the asset; the button carries the label.
  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- already resized by the thumbnail route
    <img
      src={thumbnailUrl(photo.id)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-full object-contain p-0.5"
    />
  )

  if (!preview) return <span className={frame}>{image}</span>

  return (
    <>
      <button
        type="button"
        data-no-row-click
        onClick={() => setOpen(true)}
        aria-label={t("viewPhoto", { assetTag })}
        className={cn(frame, "transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
      >
        {image}
      </button>
      <AttachmentPreviewDialog
        open={open}
        onOpenChange={setOpen}
        title={assetTag}
        subtitle={assetName}
        kind="image"
        src={`/api/attachments/${photo.id}?inline=1`}
        alt={photo.alt}
        downloadHref={`/api/attachments/${photo.id}`}
      />
    </>
  )
}
```

- [ ] **Step 6: Add the messages**

In `messages/th.json`, inside `"common"`, insert after `"of": "จาก",`:

```json
    "pagination": "การแบ่งหน้า",
    "pageOf": "หน้า {page} จาก {total}",
```

In `messages/en.json`, inside `"common"`, insert after `"of": "of",`:

```json
    "pagination": "Pagination",
    "pageOf": "Page {page} of {total}",
```

In both files, inside `"asset"`, insert after the `"tableScrollHint"` line:
- th: `"viewPhoto": "ดูรูป {assetTag}",`
- en: `"viewPhoto": "View photo of {assetTag}",`

First confirm the anchors with `grep -n '"of":' messages/th.json`. If they differ, insert next to the nearest key in the same object.

- [ ] **Step 7: Run the test and confirm it passes**

Run: `node --test tests/asset-register-building-blocks-ui.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Run the full checks, then commit**

Run: `npm test`, then `npx tsc --noEmit`, then `npm run lint`. All must be green.

```bash
git add src/components/ui/pagination.tsx src/components/ui/use-media-query.ts src/components/assets/asset-thumbnail.tsx messages/th.json messages/en.json tests/asset-register-building-blocks-ui.test.ts
git commit -m "feat(ui): shared pagination, media query hook and asset thumbnail

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Filter navigation provider and search-as-you-type field

**Files:**
- Create:
  - `src/components/assets/asset-register-navigation.tsx`
  - `src/components/assets/asset-register-search-field.tsx`
- Modify: `messages/th.json`, `messages/en.json`
- Test: `tests/asset-register-search-ui.test.ts`

**Interfaces:**
- Consumes:
  - `AssetListFilters`, `buildAssetQueryString` (`@/lib/asset-list-query`)
  - `mergeAssetRegisterFilters`, `shouldAutoSearch`, `assetRegisterSearchDebounceMs` (Task 1)
- Produces:
  - `AssetRegisterNavigationProvider({ filters: AssetListFilters; children })`, a client component.
  - `useAssetRegisterNavigation(): { filters: AssetListFilters; isPending: boolean; navigate(overrides: Partial<AssetListFilters>): void }`
    - `filters` is the **optimistic** state.
    - `navigate` is stable. It always merges onto the latest requested filters and goes to page 1.
  - `AssetRegisterSearchField({ locale: string; className?: string })`
  - i18n:
    - `asset.searchPlaceholder`: "ค้นหา รหัส · ชื่อ · Serial · ผู้ถือครอง · ที่ตั้ง" / "Search tag, name, serial, custodian or location"
    - `asset.searchClear`: "ล้างคำค้นหา" / "Clear search"

Why these choices (Next 16 + React 19.2):
- `router.replace(url, { scroll: false })` inside `startTransition` keeps `isPending` true until the new server payload commits.
- `useOptimistic` shows the requested filters at once, so selects and chips do not bounce back.
- A ref holds the latest requested filters. Two quick changes (type, then pick a company within 400ms) then merge instead of dropping one.

- [ ] **Step 1: Write the failing test**

Create `tests/asset-register-search-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const field = () => read("src/components/assets/asset-register-search-field.tsx")
const provider = () => read("src/components/assets/asset-register-navigation.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

test("search waits for a pause and never fires during IME composition", () => {
  const source = field()

  assert.match(source, /window\.setTimeout\([\s\S]*?assetRegisterSearchDebounceMs\)/)
  assert.match(source, /if \(!shouldAutoSearch\(value, filters\.search\)\) return/)
  assert.match(source, /onCompositionStart=\{\(\) => \{[\s\S]*?cancelPendingSearch\(\)/)
  assert.match(source, /onCompositionEnd=\{\(event\) => \{[\s\S]*?scheduleSearch\(event\.currentTarget\.value\)/)
  assert.match(source, /composingRef\.current \|\| \(event\.nativeEvent as InputEvent\)\.isComposing/)
})

test("Enter searches at once and the clear button refocuses the field", () => {
  const source = field()

  assert.match(source, /<form[\s\S]*?role="search"[\s\S]*?action=\{`\/\$\{locale\}\/assets`\}/)
  assert.match(source, /onSubmit=\{\(event\) => \{\s*event\.preventDefault\(\)\s*search\(draft\)/)
  assert.match(source, /aria-label=\{t\("searchClear"\)\}/)
  assert.match(source, /inputRef\.current\?\.focus\(\)/)
  assert.match(source, /isPending \? <Loader2/)
})

test("a late response never overwrites what the person is typing", () => {
  const source = field()

  assert.match(source, /if \(syncedSearch !== filters\.search\) \{[\s\S]*?if \(!focused\) setDraft\(filters\.search\)/)
  assert.match(source, /onFocus=\{\(\) => setFocused\(true\)\}/)
  assert.match(source, /onBlur=\{\(\) => setFocused\(false\)\}/)
})

test("a pending search is cancelled when the field unmounts", () => {
  assert.match(field(), /useEffect\(\(\) => \{[\s\S]*?return \(\) => \{[\s\S]*?window\.clearTimeout/)
})

test("filter navigation is optimistic, replaces history and keeps the scroll position", () => {
  const source = provider()

  assert.match(source, /"use client"/)
  assert.match(source, /useOptimistic\(/)
  assert.match(source, /mergeAssetRegisterFilters\(latestFiltersRef\.current, overrides\)/)
  assert.match(source, /startTransition\(\(\) => \{[\s\S]*?setOptimisticFilters\(next\)[\s\S]*?router\.replace\(`\$\{pathname\}\?\$\{buildAssetQueryString\(next\)\}`, \{ scroll: false \}\)/)
  assert.doesNotMatch(source + field(), /router\.push\(/)
})

test("search copy exists in Thai and English", () => {
  assert.equal(messages("th").searchPlaceholder, "ค้นหา รหัส · ชื่อ · Serial · ผู้ถือครอง · ที่ตั้ง")
  assert.equal(messages("th").searchClear, "ล้างคำค้นหา")
  assert.equal(typeof messages("en").searchPlaceholder, "string")
  assert.equal(typeof messages("en").searchClear, "string")
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test tests/asset-register-search-ui.test.ts`
Expected: FAIL with ENOENT.

- [ ] **Step 3: Create `src/components/assets/asset-register-navigation.tsx`**

```tsx
"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useOptimistic, useRef, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { buildAssetQueryString, type AssetListFilters } from "@/lib/asset-list-query"
import { mergeAssetRegisterFilters } from "@/lib/asset-register-filters"

type AssetRegisterNavigation = {
  filters: AssetListFilters
  isPending: boolean
  navigate: (overrides: Partial<AssetListFilters>) => void
}

const AssetRegisterNavigationContext = createContext<AssetRegisterNavigation | null>(null)

export function AssetRegisterNavigationProvider({
  filters,
  children,
}: {
  filters: AssetListFilters
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [optimisticFilters, setOptimisticFilters] = useOptimistic(
    filters,
    (_current: AssetListFilters, next: AssetListFilters) => next,
  )
  // Two changes inside one debounce window must merge, not overwrite each other.
  const latestFiltersRef = useRef(optimisticFilters)

  useEffect(() => {
    latestFiltersRef.current = optimisticFilters
  }, [optimisticFilters])

  const navigate = useCallback((overrides: Partial<AssetListFilters>) => {
    const next = mergeAssetRegisterFilters(latestFiltersRef.current, overrides)
    latestFiltersRef.current = next
    startTransition(() => {
      setOptimisticFilters(next)
      router.replace(`${pathname}?${buildAssetQueryString(next)}`, { scroll: false })
    })
  }, [pathname, router, setOptimisticFilters])

  const value = useMemo(
    () => ({ filters: optimisticFilters, isPending, navigate }),
    [optimisticFilters, isPending, navigate],
  )

  return <AssetRegisterNavigationContext.Provider value={value}>{children}</AssetRegisterNavigationContext.Provider>
}

export function useAssetRegisterNavigation() {
  const value = useContext(AssetRegisterNavigationContext)
  if (!value) throw new Error("useAssetRegisterNavigation must be used inside AssetRegisterNavigationProvider")
  return value
}
```

- [ ] **Step 4: Create `src/components/assets/asset-register-search-field.tsx`**

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import { assetRegisterSearchDebounceMs, shouldAutoSearch } from "@/lib/asset-register-filters"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function AssetRegisterSearchField({ locale, className }: { locale: string; className?: string }) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const { filters, isPending, navigate } = useAssetRegisterNavigation()
  const [draft, setDraft] = useState(filters.search)
  const [focused, setFocused] = useState(false)
  const [syncedSearch, setSyncedSearch] = useState(filters.search)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const composingRef = useRef(false)

  // The URL wins only while nobody is typing, so a late response never overwrites the field.
  if (syncedSearch !== filters.search) {
    setSyncedSearch(filters.search)
    if (!focused) setDraft(filters.search)
  }

  useEffect(() => {
    const timer = timerRef
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  function cancelPendingSearch() {
    if (timerRef.current === null) return
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function search(value: string) {
    cancelPendingSearch()
    const term = value.trim()
    if (term === filters.search) return
    navigate({ search: term })
  }

  function scheduleSearch(value: string) {
    cancelPendingSearch()
    if (!shouldAutoSearch(value, filters.search)) return
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      navigate({ search: value.trim() })
    }, assetRegisterSearchDebounceMs)
  }

  // Without JavaScript the form still submits as a GET that keeps every other filter.
  const preservedParams = Array.from(new URLSearchParams(buildAssetQueryString(filters, { search: "", page: 1 })))

  return (
    <form
      role="search"
      action={`/${locale}/assets`}
      onSubmit={(event) => {
        event.preventDefault()
        search(draft)
      }}
      className={cn("relative min-w-0", className)}
    >
      {preservedParams.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground" aria-hidden="true">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
      </span>
      <input
        ref={inputRef}
        name="search"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        aria-label={tCommon("search")}
        placeholder={t("searchPlaceholder")}
        value={draft}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onCompositionStart={() => {
          composingRef.current = true
          cancelPendingSearch()
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false
          scheduleSearch(event.currentTarget.value)
        }}
        onChange={(event) => {
          const value = event.target.value
          setDraft(value)
          if (composingRef.current || (event.nativeEvent as InputEvent).isComposing) return
          scheduleSearch(value)
        }}
        className={cn(getFieldControlClasses(), "pl-9", draft ? "pr-11" : "")}
      />
      {draft ? (
        <button
          type="button"
          aria-label={t("searchClear")}
          onClick={() => {
            setDraft("")
            search("")
            inputRef.current?.focus()
          }}
          className="absolute inset-y-0 right-0 inline-flex min-w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </form>
  )
}
```

- [ ] **Step 5: Add the messages**

Inside `"asset"`, after the `"viewPhoto"` line from Task 4:
- th:
  ```json
      "searchPlaceholder": "ค้นหา รหัส · ชื่อ · Serial · ผู้ถือครอง · ที่ตั้ง",
      "searchClear": "ล้างคำค้นหา",
  ```
- en:
  ```json
      "searchPlaceholder": "Search tag, name, serial, custodian or location",
      "searchClear": "Clear search",
  ```

- [ ] **Step 6: Run the test, then the full checks**

Run: `node --test tests/asset-register-search-ui.test.ts`
Expected: PASS (6 tests).

Run: `npm test`, then `npx tsc --noEmit`, then `npm run lint`. All must be green.
- Lint may flag `react-hooks/set-state-in-render` for the sync block. That block follows React's documented "adjust state when a prop changes" pattern and is conditional. If the rule still fires, stop and report the exact message. Do not move the setState into an effect.

- [ ] **Step 7: Commit**

```bash
git add src/components/assets/asset-register-navigation.tsx src/components/assets/asset-register-search-field.tsx messages/th.json messages/en.json tests/asset-register-search-ui.test.ts
git commit -m "feat(assets): optimistic register navigation and search while typing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Toolbar, filter sheet, status tabs and chips on the page

**Files:**
- Create:
  - `src/components/assets/asset-register-toolbar.tsx`
  - `src/components/assets/asset-register-filter-sheet.tsx`
  - `src/components/assets/asset-register-status-tabs.tsx`
  - `src/components/assets/asset-register-filter-chips.tsx`
- Modify:
  - `src/app/[locale]/(dashboard)/assets/page.tsx`. Data fetching is at lines 101-318. Replace render lines 320-397. Delete lines 539-974: `AssetFilters`, `QuickFilterLink` and `FilterSelect`, plus the `AssetFilterLabels` type at 36-92.
  - `messages/th.json`, `messages/en.json`
- Test:
  - create `tests/asset-register-filter-ui.test.ts`
  - modify `tests/asset-register-ux.test.ts` and `tests/asset-status-help-ui.test.ts`

**Interfaces:**
- Consumes:
  - Task 1: `buildAssetStatusCountWhere`, `getActiveSheetFilterKeys`, `buildSheetClearOverrides`, `getCompanyChangeOverrides`
  - Task 2: `buildStatusTabs`, `buildAssetRegisterChips`, `buildAssetRegisterClearAllHref`, `AssetRegisterChip`
  - Task 4: `useMediaQuery`
  - Task 5: `AssetRegisterNavigationProvider`, `useAssetRegisterNavigation`, `AssetRegisterSearchField`
- Produces:
  - `type AssetRegisterFilterOptions = { companies; branches; categories; statuses; conditions }`, with the shapes the page already queries.
  - `AssetRegisterToolbar({ locale, options, tabStatusIds, total })`
  - `AssetRegisterFilterSheet({ trigger, options, tabStatusIds, total })`
  - `AssetRegisterStatusTabs({ label, items: { key; label; count: string; href; active }[] })`
  - `AssetRegisterFilterChips({ chips, clearAllHref, labels: { activeFilters; remove; clearAll } })`
  - The page wraps toolbar, tabs, chips and `AssetRegisterTable` in `<AssetRegisterNavigationProvider filters={filters}>`.
  - The page computes `canCreateAssets` and `canDeleteAssets`. Task 7 uses them.
  - i18n keys in `asset`:
    - `filterSheetTitle`, `filterSheetClear`, `filterSheetShowResults`, `filterSheetNoResults`, `filterSheetLoading`
    - `filterSheetScope`, `filterSheetState`, `filterSheetDisplay`
    - `dataQualityDepartment`, `statusTabsLabel`, `pageSizeLabel`

- [ ] **Step 1: Write the failing test**

Create `tests/asset-register-filter-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = () => read("src/app/[locale]/(dashboard)/assets/page.tsx")
const toolbar = () => read("src/components/assets/asset-register-toolbar.tsx")
const sheet = () => read("src/components/assets/asset-register-filter-sheet.tsx")
const tabs = () => read("src/components/assets/asset-register-status-tabs.tsx")
const chips = () => read("src/components/assets/asset-register-filter-chips.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

test("the page counts statuses with the list's own filters and renders the new filter parts", () => {
  const source = page()

  assert.match(source, /applyAssetCrossScopeFilter\(buildAssetStatusCountWhere\(filters\), filters\.crossScope\)/)
  assert.match(source, /filters\.statusId \? \{ AND: \[statusCountWhere, \{ statusId: filters\.statusId \}\] \} : statusCountWhere/)
  assert.match(source, /prisma\.asset\.groupBy\(\{\s*by: \["statusId"\],\s*where: statusCountWhere,\s*_count: \{ _all: true \},?\s*\}\)/)
  assert.match(source, /<AssetRegisterNavigationProvider filters=\{filters\}>/)
  for (const component of ["AssetRegisterToolbar", "AssetRegisterStatusTabs", "AssetRegisterFilterChips", "AssetRegisterTable"]) {
    assert.match(source, new RegExp(`<${component}\\b`), component)
  }
  assert.doesNotMatch(source, /function AssetFilters|QuickFilterLink|data-asset-quick-filters|<details/)
})

test("every hidden filter gets a readable chip, including activity, department and supplier", () => {
  const source = page()

  assert.match(source, /buildAssetRegisterChips\(\{/)
  assert.match(source, /department: t\("dataQualityDepartment"\)/)
  assert.match(source, /activity: \{ idle_180d: t\("activityIdle180d"\) \}/)
  assert.match(source, /prisma\.supplier\.findUnique\(/)
  assert.match(source, /buildAssetRegisterClearAllHref\(`\/\$\{locale\}\/assets`, filters\)/)
})

test("the toolbar applies scope selects at once and has no submit button", () => {
  const source = toolbar()

  assert.match(source, /getCompanyChangeOverrides\(event\.target\.value, filters\.branchId, options\.branches\)/)
  assert.match(source, /navigate\(\{ branchId: event\.target\.value \}\)/)
  assert.match(source, /navigate\(\{ categoryId: event\.target\.value \}\)/)
  assert.match(source, /key=\{`company-\$\{filters\.companyId\}`\}/)
  assert.match(source, /hidden md:contents/)
  assert.match(source, /sticky top-0[^"]*md:static/)
  assert.doesNotMatch(source, /type="submit"/)
})

test("the filter sheet applies changes at once, keeps its trigger and shows the real result count", () => {
  const source = sheet()

  assert.match(source, /<SheetTrigger asChild>\{trigger\}<\/SheetTrigger>/)
  assert.match(source, /side=\{isDesktop \? "right" : "bottom"\}/)
  assert.match(source, /buildSheetClearOverrides\(filters, scope\)/)
  assert.match(source, /disabled=\{activeCount === 0\}/)
  assert.match(source, /t\("filterSheetShowResults", \{ count:/)
  assert.match(source, /t\("filterSheetNoResults"\)/)
  assert.match(source, /onClick=\{\(\) => setOpen\(false\)\}/)
  assert.match(source, /help=\{statusHelp\}/)
  assert.match(source, /help=\{conditionHelp\}/)
  assert.match(source, /aria-pressed=\{active\}/)
  assert.match(source, /min-h-11/)
  assert.doesNotMatch(source, /type="submit"/)
})

test("status tabs are server-rendered links that mark the current tab and scroll sideways on phones", () => {
  const source = tabs()

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<nav aria-label=\{label\}/)
  assert.match(source, /aria-current=\{item\.active \? "page" : undefined\}/)
  assert.match(source, /overflow-x-auto/)
  assert.match(source, /min-h-11/)
})

test("filter chips keep 44px phone targets and hide scope chips on desktop", () => {
  const source = chips()

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /min-h-11[^"]*md:min-h-8/)
  assert.match(source, /chip\.mobileOnly && "md:hidden"/)
  assert.match(source, /href=\{clearAllHref\}/)
  assert.match(source, /aria-label=\{`\$\{labels\.remove\}: \$\{chip\.label\}`\}/)
})

test("filter copy exists in Thai and English", () => {
  const keys = [
    "filterSheetTitle",
    "filterSheetClear",
    "filterSheetShowResults",
    "filterSheetNoResults",
    "filterSheetLoading",
    "filterSheetScope",
    "filterSheetState",
    "filterSheetDisplay",
    "dataQualityDepartment",
    "statusTabsLabel",
    "pageSizeLabel",
  ]
  for (const locale of ["th", "en"] as const) {
    const missing = keys.filter((key) => typeof messages(locale)[key] !== "string")
    assert.deepEqual(missing, [], locale)
  }
  assert.equal(messages("th").filterSheetShowResults, "แสดง {count} รายการ")
  assert.equal(messages("th").dataQualityDepartment, "แผนกไม่ครบ")
})
```

In `tests/asset-register-ux.test.ts`, **delete** these 7 tests. They pinned the removed form, and the new tests above and in Task 2 cover the same behaviour:
- "asset register page exposes operational quick filters"
- "asset register groups quick filters and collapses advanced filters"
- "asset register prioritizes search before quick filters on mobile"
- "asset register surfaces scoped brand and model drilldown filters"
- "asset register summarizes active filters and provides a clear all action"
- "asset register exposes a removable idle activity filter"
- "asset active-filter actions stay at least 44px tall below md"

In `tests/asset-status-help-ui.test.ts`, replace the test "asset register keeps status and condition filters grouped" with:

```ts
test("asset register keeps status and condition filters together with their help", () => {
  const source = readFileSync("src/components/assets/asset-register-filter-sheet.tsx", "utf8")
  const statusIndex = source.indexOf('label={t("status")}')
  const conditionIndex = source.indexOf('label={t("condition")}')

  assert.ok(statusIndex > -1, "status select is missing")
  assert.ok(conditionIndex > statusIndex, "condition must follow status")
  assert.match(source, /help=\{statusHelp\}/)
  assert.match(source, /help=\{conditionHelp\}/)
  assert.match(source, /<AssetStateHelpPopover \{\.\.\.help\} size="compact" \/>/)
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/asset-register-filter-ui.test.ts tests/asset-status-help-ui.test.ts`
Expected: FAIL with ENOENT for the new component files.

- [ ] **Step 3: Add the messages**

Inside `"asset"`, after the `"searchClear"` line from Task 5:

th:
```json
    "filterSheetTitle": "ตัวกรอง",
    "filterSheetClear": "ล้าง",
    "filterSheetShowResults": "แสดง {count} รายการ",
    "filterSheetNoResults": "ไม่พบรายการ",
    "filterSheetLoading": "กำลังโหลด…",
    "filterSheetScope": "บริษัท / สาขา / หมวดหมู่",
    "filterSheetState": "สถานะ · สภาพ · ประเภทการถือครอง",
    "filterSheetDisplay": "การแสดงผล",
    "dataQualityDepartment": "แผนกไม่ครบ",
    "statusTabsLabel": "กรองตามสถานะ",
    "pageSizeLabel": "จำนวนต่อหน้า",
```

en:
```json
    "filterSheetTitle": "Filters",
    "filterSheetClear": "Clear",
    "filterSheetShowResults": "Show {count} results",
    "filterSheetNoResults": "No results",
    "filterSheetLoading": "Loading…",
    "filterSheetScope": "Company / branch / category",
    "filterSheetState": "Status, condition and ownership",
    "filterSheetDisplay": "Display",
    "dataQualityDepartment": "Missing department",
    "statusTabsLabel": "Filter by status",
    "pageSizeLabel": "Rows per page",
```

- [ ] **Step 4: Create `src/components/assets/asset-register-status-tabs.tsx`**

```tsx
import Link from "next/link"
import { cn } from "@/lib/utils"

export type AssetRegisterStatusTabItem = {
  key: string
  label: string
  /** Already formatted for the locale. */
  count: string
  href: string
  active: boolean
}

export function AssetRegisterStatusTabs({ label, items }: { label: string; items: AssetRegisterStatusTabItem[] }) {
  return (
    <nav aria-label={label} data-asset-status-tabs className="-mx-4 mb-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:border-b md:border-border md:px-0">
      <ul className="flex w-max gap-2 md:w-auto md:gap-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:-mb-px md:min-h-10 md:rounded-none md:border-0 md:border-b-2",
                item.active
                  ? "border-info-border bg-primary-soft text-primary md:border-primary md:bg-transparent"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground md:border-transparent md:bg-transparent",
              )}
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  item.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {item.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 5: Create `src/components/assets/asset-register-filter-chips.tsx`**

```tsx
import Link from "next/link"
import { X } from "lucide-react"
import type { AssetRegisterChip } from "@/lib/asset-register-chips"
import { cn } from "@/lib/utils"

export function AssetRegisterFilterChips({
  chips,
  clearAllHref,
  labels,
}: {
  chips: AssetRegisterChip[]
  clearAllHref: string
  labels: { activeFilters: string; remove: string; clearAll: string }
}) {
  if (chips.length === 0) return null
  const onlyMobileChips = chips.every((chip) => chip.mobileOnly)

  return (
    <div
      role="group"
      aria-label={labels.activeFilters}
      data-asset-active-filters
      className={cn("mb-3 flex flex-wrap items-center gap-2", onlyMobileChips && "md:hidden")}
    >
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          aria-label={`${labels.remove}: ${chip.label}`}
          className={cn(
            "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-info-border bg-primary-soft px-3 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-8",
            chip.mobileOnly && "md:hidden",
          )}
        >
          <span className="truncate">{chip.label}</span>
          <X className="size-3.5 shrink-0" aria-hidden="true" />
        </Link>
      ))}
      <Link
        href={clearAllHref}
        className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-8"
      >
        {labels.clearAll}
      </Link>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/components/assets/asset-register-filter-sheet.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
import type { AssetCrossScopeFilter } from "@/lib/asset-cross-scope-filter"
import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"
import { assetOwnershipTypes } from "@/lib/asset-ownership"
import { buildSheetClearOverrides, getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export type AssetRegisterFilterOptions = {
  companies: { id: string; code: string; nameTh: string }[]
  branches: { id: string; code: string; name: string; companyId: string; company: { code: string } }[]
  categories: { id: string; code: string; name: string }[]
  statuses: { id: string; name: string; nameTh: string }[]
  conditions: { id: string; nameTh: string }[]
}

const dataQualityOptions = [
  ["serial", "dataQualitySerial"],
  ["photo", "dataQualityPhoto"],
  ["purchase", "dataQualityPurchase"],
  ["warranty", "dataQualityWarranty"],
  ["responsibility", "dataQualityResponsibility"],
  ["department", "dataQualityDepartment"],
] as const satisfies ReadonlyArray<readonly [AssetDataQualityFilter, string]>

const crossScopeOptions = [
  ["all", "quickFilterCrossScopeAll"],
  ["custodian_company", "quickFilterCustodianCrossCompany"],
  ["custodian_branch", "quickFilterCustodianCrossBranch"],
  ["location_branch", "quickFilterLocationCrossBranch"],
] as const satisfies ReadonlyArray<readonly [AssetCrossScopeFilter, string]>

export function AssetRegisterFilterSheet({
  trigger,
  options,
  tabStatusIds,
  total,
}: {
  trigger: React.ReactNode
  options: AssetRegisterFilterOptions
  tabStatusIds: string[]
  total: number
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const { filters, isPending, navigate } = useAssetRegisterNavigation()
  const isDesktop = useMediaQuery("(min-width: 48rem)")
  const [open, setOpen] = useState(false)
  const scope = { includeScope: !isDesktop, tabStatusIds }
  const activeCount = getActiveSheetFilterKeys(filters, scope).length
  const branches = filters.companyId
    ? options.branches.filter((branch) => branch.companyId === filters.companyId)
    : options.branches
  const statusHelp = {
    title: t("statusHelpTitle"),
    description: t("statusHelpDescription"),
    items: [
      t("statusHelpReady"),
      t("statusHelpPendingRepair"),
      t("statusHelpUnderMaintenance"),
      t("statusHelpPendingDisposal"),
      t("statusHelpLostMissing"),
      t("statusHelpUnderInspection"),
    ],
  }
  const conditionHelp = {
    title: t("conditionHelpTitle"),
    description: t("conditionHelpDescription"),
    items: [t("conditionHelpGood"), t("conditionHelpDamaged"), t("conditionHelpNeedsReview"), t("conditionHelpMissing")],
  }
  const resultLabel = isPending
    ? t("filterSheetLoading")
    : total === 0
      ? t("filterSheetNoResults")
      : t("filterSheetShowResults", { count: total.toLocaleString(locale === "th" ? "th-TH" : "en-US") })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        closeLabel={tCommon("close")}
        data-asset-filter-sheet
        className={isDesktop ? "w-full gap-0 sm:max-w-md" : "max-h-[85dvh] gap-0 rounded-t-xl"}
      >
        <SheetHeader className="border-b border-border pr-14">
          <SheetTitle>{t("filterSheetTitle")}</SheetTitle>
          <SheetDescription>{t("advancedFiltersHelp")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {isDesktop ? null : (
            <FilterSection title={t("filterSheetScope")}>
              <LabeledSelect
                label={t("company")}
                value={filters.companyId}
                onChange={(value) => navigate(getCompanyChangeOverrides(value, filters.branchId, options.branches))}
              >
                <option value="">{tCommon("all")}</option>
                {options.companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.code} - {company.nameTh}</option>
                ))}
              </LabeledSelect>
              <LabeledSelect label={t("branch")} value={filters.branchId} onChange={(value) => navigate({ branchId: value })}>
                <option value="">{tCommon("all")}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.company.code} / {branch.code} - {branch.name}</option>
                ))}
              </LabeledSelect>
              <LabeledSelect label={t("category")} value={filters.categoryId} onChange={(value) => navigate({ categoryId: value })}>
                <option value="">{tCommon("all")}</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.code} - {category.name}</option>
                ))}
              </LabeledSelect>
            </FilterSection>
          )}
          <FilterSection title={t("filterSheetState")}>
            <LabeledSelect label={t("status")} help={statusHelp} value={filters.statusId} onChange={(value) => navigate({ statusId: value })}>
              <option value="">{tCommon("all")}</option>
              {options.statuses.map((status) => (
                <option key={status.id} value={status.id}>{status.nameTh}</option>
              ))}
            </LabeledSelect>
            <LabeledSelect label={t("condition")} help={conditionHelp} value={filters.conditionId} onChange={(value) => navigate({ conditionId: value })}>
              <option value="">{tCommon("all")}</option>
              {options.conditions.map((condition) => (
                <option key={condition.id} value={condition.id}>{condition.nameTh}</option>
              ))}
            </LabeledSelect>
            <LabeledSelect label={t("ownershipType")} value={filters.ownershipType} onChange={(value) => navigate({ ownershipType: value })}>
              <option value="">{tCommon("all")}</option>
              {assetOwnershipTypes.map((type) => (
                <option key={type} value={type}>{t(`ownershipType_${type}`)}</option>
              ))}
            </LabeledSelect>
          </FilterSection>
          <FilterSection title={t("quickFilterGroupDataQuality")}>
            <ChipGroup
              label={t("quickFilterGroupDataQuality")}
              options={dataQualityOptions.map(([value, key]) => ({ value, label: t(key) }))}
              value={filters.dataQuality}
              onChange={(value) => navigate({ dataQuality: value })}
            />
          </FilterSection>
          <FilterSection title={t("quickFilterGroupCrossScope")}>
            <ChipGroup
              label={t("quickFilterGroupCrossScope")}
              options={crossScopeOptions.map(([value, key]) => ({ value, label: t(key) }))}
              value={filters.crossScope}
              onChange={(value) => navigate({ crossScope: value })}
            />
          </FilterSection>
          <FilterSection title={t("filterSheetDisplay")}>
            <LabeledSelect label={t("pageSizeLabel")} value={String(filters.pageSize)} onChange={(value) => navigate({ pageSize: Number(value) })}>
              {[10, 25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>{pageSize}</option>
              ))}
            </LabeledSelect>
          </FilterSection>
        </div>
        <SheetFooter className="grid grid-cols-2 gap-2 border-t border-border">
          <Button variant="outline" disabled={activeCount === 0} onClick={() => navigate(buildSheetClearOverrides(filters, scope))}>
            {t("filterSheetClear")}
          </Button>
          <Button onClick={() => setOpen(false)} aria-live="polite">
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {resultLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function LabeledSelect({
  label,
  value,
  onChange,
  help,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  help?: { title: string; description: string; items: string[] }
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {help ? <AssetStateHelpPopover {...help} size="compact" /> : null}
      </div>
      {/* Uncontrolled + key: remounts on the optimistic value, so it never bounces back. */}
      <select
        key={value}
        aria-label={label}
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
        className={getFieldControlClasses()}
      >
        {children}
      </select>
    </div>
  )
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T | ""
  onChange: (value: T | "") => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : option.value)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9",
              active
                ? "border-info-border bg-primary-soft text-primary"
                : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 7: Create `src/components/assets/asset-register-toolbar.tsx`**

```tsx
"use client"

import { SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { AssetRegisterFilterSheet, type AssetRegisterFilterOptions } from "@/components/assets/asset-register-filter-sheet"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { AssetRegisterSearchField } from "@/components/assets/asset-register-search-field"
import { getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function AssetRegisterToolbar({
  locale,
  options,
  tabStatusIds,
  total,
}: {
  locale: string
  options: AssetRegisterFilterOptions
  tabStatusIds: string[]
  total: number
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const { filters, navigate } = useAssetRegisterNavigation()
  const desktopCount = getActiveSheetFilterKeys(filters, { includeScope: false, tabStatusIds }).length
  const mobileCount = getActiveSheetFilterKeys(filters, { includeScope: true, tabStatusIds }).length
  const branches = filters.companyId
    ? options.branches.filter((branch) => branch.companyId === filters.companyId)
    : options.branches
  const selectClassName = cn(getFieldControlClasses(), "w-44 shrink-0 truncate lg:w-48")

  return (
    <div
      data-asset-register-toolbar
      className="sticky top-0 z-20 -mx-4 mb-3 bg-background px-4 py-2 sm:-mx-6 sm:px-6 md:static md:mx-0 md:rounded-lg md:border md:border-border md:bg-surface md:p-3 md:shadow-sm"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <AssetRegisterSearchField locale={locale} className="min-w-0 flex-1 basis-56" />
        <div className="hidden md:contents">
          <select
            key={`company-${filters.companyId}`}
            aria-label={t("company")}
            defaultValue={filters.companyId}
            onChange={(event) => navigate(getCompanyChangeOverrides(event.target.value, filters.branchId, options.branches))}
            className={selectClassName}
          >
            <option value="">{t("company")}: {tCommon("all")}</option>
            {options.companies.map((company) => (
              <option key={company.id} value={company.id}>{company.code} - {company.nameTh}</option>
            ))}
          </select>
          <select
            key={`branch-${filters.companyId}-${filters.branchId}`}
            aria-label={t("branch")}
            defaultValue={filters.branchId}
            onChange={(event) => navigate({ branchId: event.target.value })}
            className={selectClassName}
          >
            <option value="">{t("branch")}: {tCommon("all")}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.company.code} / {branch.code} - {branch.name}</option>
            ))}
          </select>
          <select
            key={`category-${filters.categoryId}`}
            aria-label={t("category")}
            defaultValue={filters.categoryId}
            onChange={(event) => navigate({ categoryId: event.target.value })}
            className={selectClassName}
          >
            <option value="">{t("category")}: {tCommon("all")}</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.code} - {category.name}</option>
            ))}
          </select>
        </div>
        <AssetRegisterFilterSheet
          options={options}
          tabStatusIds={tabStatusIds}
          total={total}
          trigger={
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:min-h-0"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{t("advancedFilters")}</span>
              <FilterCount count={mobileCount} className="md:hidden" />
              <FilterCount count={desktopCount} className="hidden md:inline-flex" />
            </button>
          }
        />
      </div>
    </div>
  )
}

function FilterCount({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null
  return (
    <span className={cn("inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground", className)}>
      {count}
    </span>
  )
}
```

- [ ] **Step 8: Rewire `src/app/[locale]/(dashboard)/assets/page.tsx`**

**8a. Imports.** Remove these imports:
- `Link`, `FilterPanel`, `ActionButton`, `getFieldControlClasses`, `AssetStateHelpPopover`
- the `AssetCrossScopeFilter` type
- `parseAssetListParams`. Keep it only if it is still used; it is, for `filters`.

Add:

```ts
import type { Prisma } from "@prisma/client"
import { buildAssetStatusCountWhere } from "@/lib/asset-list-query"
import { buildStatusTabs } from "@/lib/asset-register-status-tabs"
import { buildAssetRegisterChips, buildAssetRegisterClearAllHref } from "@/lib/asset-register-chips"
import { AssetRegisterNavigationProvider } from "@/components/assets/asset-register-navigation"
import { AssetRegisterToolbar } from "@/components/assets/asset-register-toolbar"
import { AssetRegisterStatusTabs } from "@/components/assets/asset-register-status-tabs"
import { AssetRegisterFilterChips } from "@/components/assets/asset-register-filter-chips"
```

(Merge `buildAssetStatusCountWhere` into the existing `@/lib/asset-list-query` import.)

**8b. Permissions.** After `const canEditAssets = …`:

```ts
  const canCreateAssets = hasPermission(user, "asset", "create")
  const canDeleteAssets = hasPermission(user, "asset", "delete")
```

**8c. Where clauses.** Replace `const where = await applyAssetCrossScopeFilter(buildAssetWhere(filters), filters.crossScope)` with the following. It runs the cross-scope candidate query once and serves both the counts and the list:

```ts
  const statusCountWhere = await applyAssetCrossScopeFilter(buildAssetStatusCountWhere(filters), filters.crossScope)
  const where: Prisma.AssetWhereInput = filters.statusId ? { AND: [statusCountWhere, { statusId: filters.statusId }] } : statusCountWhere
```

Remove `buildAssetWhere` from the import if it becomes unused.

**8d. Queries.** Inside the `Promise.all` of `"assets.initial-data"`, append two entries after the `selectedModel` query. Extend the destructuring to `…, selectedBrand, selectedModel, statusCounts, selectedSupplier]`:

```ts
      prisma.asset.groupBy({
        by: ["statusId"],
        where: statusCountWhere,
        _count: { _all: true },
      }),
      filters.supplierId
        ? prisma.supplier.findUnique({
            where: { id: filters.supplierId },
            select: { code: true, name: true },
          })
        : Promise.resolve(null),
```

**8e. View model.**
- Delete the `activeDrilldownFilters` constant.
- After `const toRow = …`, add:

```ts
  const numberLocale = locale === "th" ? "th-TH" : "en-US"
  const basePath = `/${locale}/assets`
  const statusTabs = buildStatusTabs({
    statuses,
    counts: statusCounts.map((row) => ({ statusId: row.statusId, count: row._count._all })),
    statusId: filters.statusId,
  })
  const statusTabLabelKeys = {
    all: "quickFilterAll",
    ready: "quickFilterReady",
    inUse: "quickFilterInUse",
    checkedOut: "quickFilterCheckedOut",
    pendingRepair: "quickFilterPendingRepair",
    underMaintenance: "quickFilterUnderMaintenance",
  } as const
  const selectedCompany = companies.find((company) => company.id === filters.companyId)
  const selectedBranch = branches.find((branch) => branch.id === filters.branchId)
  const selectedCategory = categories.find((category) => category.id === filters.categoryId)
  const selectedCustodian = employees.find((employee) => employee.id === filters.custodianId)
  const filterChips = buildAssetRegisterChips({
    basePath,
    filters,
    tabStatusIds: statusTabs.tabStatusIds,
    names: {
      company: selectedCompany ? `${selectedCompany.code} - ${selectedCompany.nameTh}` : undefined,
      branch: selectedBranch ? `${selectedBranch.company.code} / ${selectedBranch.code} - ${selectedBranch.name}` : undefined,
      category: selectedCategory ? `${selectedCategory.code} - ${selectedCategory.name}` : undefined,
      status: statuses.find((status) => status.id === filters.statusId)?.nameTh,
      condition: conditions.find((condition) => condition.id === filters.conditionId)?.nameTh,
      brand: selectedBrand?.name,
      model: selectedModel ? `${selectedModel.brand.name} / ${selectedModel.name}` : undefined,
      custodian: selectedCustodian ? `${selectedCustodian.code} - ${selectedCustodian.fullNameTh}` : undefined,
      supplier: selectedSupplier ? `${selectedSupplier.code} - ${selectedSupplier.name}` : undefined,
    },
    labels: {
      company: t("company"),
      branch: t("branch"),
      category: t("category"),
      status: t("status"),
      condition: t("condition"),
      ownershipType: t("ownershipType"),
      brand: t("brand"),
      model: t("model"),
      custodian: t("custodian"),
      supplier: t("supplier"),
      rowsPerPage: t("pageSizeLabel"),
      ownershipTypes: Object.fromEntries(assetOwnershipTypes.map((type) => [type, t(`ownershipType_${type}`)])) as Record<string, string>,
      dataQuality: {
        serial: t("dataQualitySerial"),
        photo: t("dataQualityPhoto"),
        purchase: t("dataQualityPurchase"),
        warranty: t("dataQualityWarranty"),
        responsibility: t("dataQualityResponsibility"),
        department: t("dataQualityDepartment"),
      },
      crossScope: {
        all: t("quickFilterCrossScopeAll"),
        custodian_company: t("quickFilterCustodianCrossCompany"),
        custodian_branch: t("quickFilterCustodianCrossBranch"),
        location_branch: t("quickFilterLocationCrossBranch"),
      },
      activity: { idle_180d: t("activityIdle180d") },
    },
  })
```

**8f. Render.** Replace the `<AssetFilters … />` element and the opening of `<AssetRegisterTable` with the block below. `AssetRegisterTable`'s props stay exactly as they are; only its position moves inside the provider:

```tsx
      <AssetRegisterNavigationProvider filters={filters}>
        <AssetRegisterToolbar
          locale={locale}
          options={{ companies, branches, categories, statuses, conditions }}
          tabStatusIds={statusTabs.tabStatusIds}
          total={total}
        />
        <AssetRegisterStatusTabs
          label={t("statusTabsLabel")}
          items={statusTabs.tabs.map((tab) => ({
            key: tab.key,
            label: t(statusTabLabelKeys[tab.key]),
            count: tab.count.toLocaleString(numberLocale),
            href: `${basePath}?${buildAssetQueryString(filters, { statusId: tab.statusId, page: 1 })}`,
            active: tab.active,
          }))}
        />
        <AssetRegisterFilterChips
          chips={filterChips}
          clearAllHref={buildAssetRegisterClearAllHref(`/${locale}/assets`, filters)}
          labels={{ activeFilters: t("activeFilters"), remove: t("clearDrilldownFilter"), clearAll: t("clearAllFilters") }}
        />
        <AssetRegisterTable … />{/* the existing element with all of its current props, moved here unchanged */}
      </AssetRegisterNavigationProvider>
```

`AssetImportPreviewPanel` stays after the provider.

**8g. Cleanup.** Delete:
- the `AssetFilterLabels` type
- the `AssetFilters`, `QuickFilterLink` and `FilterSelect` functions
- every import that is now unused (`tsc` and `lint` will name them)

- [ ] **Step 9: Run the tests and confirm they pass**

Run: `node --test tests/asset-register-filter-ui.test.ts tests/asset-register-ux.test.ts tests/asset-status-help-ui.test.ts tests/performance-route-instrumentation.test.ts tests/open-repair-filter.test.ts tests/asset-transaction-cancellation-routes.test.ts`
Expected: PASS.

- [ ] **Step 10: Run the full checks, then commit**

Run: `npm test`, then `npx tsc --noEmit`, then `npm run lint`. All must be green.

```bash
git add "src/app/[locale]/(dashboard)/assets/page.tsx" src/components/assets/asset-register-toolbar.tsx src/components/assets/asset-register-filter-sheet.tsx src/components/assets/asset-register-status-tabs.tsx src/components/assets/asset-register-filter-chips.tsx messages/th.json messages/en.json tests/asset-register-filter-ui.test.ts tests/asset-register-ux.test.ts tests/asset-status-help-ui.test.ts
git commit -m "feat(assets): register toolbar, status tabs with counts, instant filter sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Row actions (next-step button + ⋯), wired into the desktop table

**Files:**
- Create: `src/components/assets/asset-register-row-actions.tsx`
- Modify:
  - `src/components/assets/asset-register-table.tsx`: the actions cell at lines 802-828 and the props type
  - `src/app/[locale]/(dashboard)/assets/page.tsx`: pass `permissions`
  - `messages/th.json`, `messages/en.json`
- Test: create `tests/asset-register-table-ui.test.ts`

**Interfaces:**
- Consumes:
  - `getRowNextAction`, `AssetRegisterTransaction`, `AssetRegisterTransactionAction` (Task 2 / existing)
  - `useDeleteAction(endpoint, { returnFocusRef })` (part A)
  - `Sheet*`, `DropdownMenu*`
  - `canEditAssets`, `canCreateAssets`, `canDeleteAssets` (Task 6, page)
- Produces:
  - `type AssetRegisterRowTransaction = AssetRegisterTransaction & { href: string }`
  - `type AssetRegisterRowPermissions = { canEdit: boolean; canCreate: boolean; canDelete: boolean }`
  - `AssetRegisterRowActions({ variant: "desktop" | "mobile", assetId, assetTag, assetName, transactions, editHref, cloneHref, permissions, onNavigate?, className? })`
  - `AssetRegisterTable` gains the prop `permissions: AssetRegisterRowPermissions`
  - i18n in `asset`:
    - `rowActionCheckout`: "ส่งมอบ" / "Hand over"
    - `rowActionCheckin`: "รับคืน" / "Return"
    - `rowActionTransfer`: "โอนย้าย" / "Transfer"
    - `rowActionsMenu`: "การดำเนินการของ {assetTag}" / "Actions for {assetTag}"

Behaviour (spec §4.2):
- **Next-step button.** It shows the `checkout` action when enabled, otherwise `checkin` when enabled, otherwise nothing. It links to that action's existing `href`.
- **⋯ menu.** The same content in both variants:
  - "ทำธุรกรรม" group: the next action first, then the others. Disabled items show their reason.
  - edit (if `canEdit`), clone (if `canCreate`), delete (if `canDelete`, destructive).
  - Delete returns focus to ⋯.
- Every link calls `onNavigate`. The table passes `rememberDetailReturnScroll`, so coming back restores the scroll position.

- [ ] **Step 1: Write the failing test**

Create `tests/asset-register-table-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const rowActions = () => read("src/components/assets/asset-register-row-actions.tsx")
const table = () => read("src/components/assets/asset-register-table.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

test("row actions show one next-step button and keep every action in the ⋯ menu", () => {
  const source = rowActions()

  assert.match(source, /const nextAction = getRowNextAction\(transactions\)/)
  assert.match(source, /next \? \[next, \.\.\.transactions\.filter\(\(transaction\) => transaction !== next\)\] : transactions/)
  assert.match(source, /<DropdownMenuTrigger asChild>/)
  assert.match(source, /<DropdownMenuContent data-no-row-click/)
  assert.match(source, /<SheetTrigger asChild>/)
  assert.match(source, /<SheetContent\s+side="bottom"/)
  assert.match(source, /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`, \{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /variant="destructive"/)
  assert.match(source, /permissions\.canEdit \?/)
  assert.match(source, /permissions\.canCreate \?/)
  assert.match(source, /permissions\.canDelete \?/)
  assert.match(source, /reasonLabelKeys\[transaction\.reason\]/)
  assert.match(source, /size-11/)
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener/)
})

test("the desktop table uses the row actions instead of four icon buttons", () => {
  const source = table()

  assert.match(source, /<AssetRegisterRowActions\s+variant="desktop"/)
  assert.match(source, /permissions=\{permissions\}/)
  assert.doesNotMatch(source, /<AssetRegisterTransactionMenu actions=\{asset\.transactions\} labels=\{transactionLabels\} \/>/)
  assert.doesNotMatch(source, /title=\{labels\.detail\}/)
})

test("row action copy exists in Thai and English", () => {
  assert.equal(messages("th").rowActionCheckout, "ส่งมอบ")
  assert.equal(messages("th").rowActionCheckin, "รับคืน")
  assert.equal(messages("th").rowActionTransfer, "โอนย้าย")
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof messages(locale).rowActionsMenu, "string", locale)
  }
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test tests/asset-register-table-ui.test.ts`
Expected: FAIL with ENOENT.

- [ ] **Step 3: Add the messages**

Inside `"asset"`, after `"pageSizeLabel"` (Task 6):
- th:
  ```json
      "rowActionCheckout": "ส่งมอบ",
      "rowActionCheckin": "รับคืน",
      "rowActionTransfer": "โอนย้าย",
      "rowActionsMenu": "การดำเนินการของ {assetTag}",
  ```
- en:
  ```json
      "rowActionCheckout": "Hand over",
      "rowActionCheckin": "Return",
      "rowActionTransfer": "Transfer",
      "rowActionsMenu": "Actions for {assetTag}",
  ```

- [ ] **Step 4: Create `src/components/assets/asset-register-row-actions.tsx`**

```tsx
"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRightLeft, Copy, MoreHorizontal, PackageCheck, Pencil, Trash2, Undo2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useDeleteAction } from "@/components/master-data/use-delete-action"
import {
  getRowNextAction,
  type AssetRegisterTransaction,
  type AssetRegisterTransactionAction,
} from "@/lib/asset-operation-policy"
import { cn } from "@/lib/utils"

export type AssetRegisterRowTransaction = AssetRegisterTransaction & { href: string }
export type AssetRegisterRowPermissions = { canEdit: boolean; canCreate: boolean; canDelete: boolean }

const transactionIcons: Record<AssetRegisterTransactionAction, typeof PackageCheck> = {
  checkout: PackageCheck,
  checkin: Undo2,
  transfer: ArrowRightLeft,
}
const transactionLabelKeys = {
  checkout: "rowActionCheckout",
  checkin: "rowActionCheckin",
  transfer: "rowActionTransfer",
} as const
const reasonLabelKeys = {
  permission_required: "transactionReasonPermission",
  status_not_ready: "transactionReasonStatusNotReady",
  no_return_record: "transactionReasonNoReturnRecord",
  active_maintenance: "transactionReasonActiveMaintenance",
  status_not_returnable: "transactionReasonStatusNotReturnable",
  status_not_transferable: "transactionReasonStatusNotTransferable",
} as const
const sheetItemClasses =
  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function AssetRegisterRowActions({
  variant,
  assetId,
  assetTag,
  assetName,
  transactions,
  editHref,
  cloneHref,
  permissions,
  onNavigate,
  className,
}: {
  variant: "desktop" | "mobile"
  assetId: string
  assetTag: string
  assetName: string
  transactions: AssetRegisterRowTransaction[]
  editHref: string
  cloneHref: string
  permissions: AssetRegisterRowPermissions
  onNavigate?: () => void
  className?: string
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const [sheetOpen, setSheetOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const { deleting, runDelete } = useDeleteAction(`/api/assets/${assetId}`, { returnFocusRef: triggerRef })
  const nextAction = getRowNextAction(transactions)
  const next = nextAction ? transactions.find((transaction) => transaction.action === nextAction) : undefined
  const ordered = next ? [next, ...transactions.filter((transaction) => transaction !== next)] : transactions
  const menuLabel = t("rowActionsMenu", { assetTag })
  const reasonOf = (transaction: AssetRegisterRowTransaction) =>
    transaction.reason ? t(reasonLabelKeys[transaction.reason]) : ""

  if (variant === "desktop") {
    return (
      <div className={cn("flex items-center justify-end gap-1", className)}>
        {next ? (
          <NextActionLink transaction={next} label={t(transactionLabelKeys[next.action])} assetTag={assetTag} onNavigate={onNavigate} />
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              aria-label={menuLabel}
              title={menuLabel}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-no-row-click align="end" className="w-64">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{t("transactionMenu")}</DropdownMenuLabel>
            {ordered.map((transaction) => {
              const Icon = transactionIcons[transaction.action]
              const title = t(transactionLabelKeys[transaction.action])
              if (!transaction.enabled) {
                return (
                  <DropdownMenuItem key={transaction.action} disabled className="items-start">
                    <Icon className="mt-0.5" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{reasonOf(transaction)}</span>
                    </span>
                  </DropdownMenuItem>
                )
              }
              return (
                <DropdownMenuItem key={transaction.action} asChild>
                  <Link href={transaction.href} onClick={onNavigate}>
                    <Icon className="text-primary" aria-hidden="true" />
                    {title}
                  </Link>
                </DropdownMenuItem>
              )
            })}
            {permissions.canEdit || permissions.canCreate ? <DropdownMenuSeparator /> : null}
            {permissions.canEdit ? (
              <DropdownMenuItem asChild>
                <Link href={editHref} onClick={onNavigate}>
                  <Pencil aria-hidden="true" />
                  {tCommon("edit")}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {permissions.canCreate ? (
              <DropdownMenuItem asChild>
                <Link href={cloneHref} onClick={onNavigate}>
                  <Copy aria-hidden="true" />
                  {t("cloneAsset")}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {permissions.canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={deleting} onSelect={() => void runDelete()}>
                  <Trash2 aria-hidden="true" />
                  {tCommon("delete")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={menuLabel}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        closeLabel={tCommon("close")}
        data-no-row-click
        className="max-h-[85dvh] gap-0 rounded-t-xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="pr-14">
          <SheetTitle>{assetTag}</SheetTitle>
          <SheetDescription className="truncate">{assetName}</SheetDescription>
        </SheetHeader>
        <ul className="space-y-0.5 overflow-y-auto px-2 pb-3">
          {ordered.map((transaction) => {
            const Icon = transactionIcons[transaction.action]
            const title = t(transactionLabelKeys[transaction.action])
            return (
              <li key={transaction.action}>
                {transaction.enabled ? (
                  <Link href={transaction.href} onClick={onNavigate} className={cn(sheetItemClasses, "text-foreground")}>
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {title}
                  </Link>
                ) : (
                  <div aria-disabled="true" className={cn(sheetItemClasses, "cursor-not-allowed py-2 text-muted-foreground hover:bg-transparent")}>
                    <Icon className="size-4" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block">{title}</span>
                      <span className="block text-xs font-normal">{reasonOf(transaction)}</span>
                    </span>
                  </div>
                )}
              </li>
            )
          })}
          {permissions.canEdit ? (
            <li className="border-t border-border pt-0.5">
              <Link href={editHref} onClick={onNavigate} className={cn(sheetItemClasses, "text-foreground")}>
                <Pencil className="size-4" aria-hidden="true" />
                {tCommon("edit")}
              </Link>
            </li>
          ) : null}
          {permissions.canCreate ? (
            <li>
              <Link href={cloneHref} onClick={onNavigate} className={cn(sheetItemClasses, "text-foreground")}>
                <Copy className="size-4" aria-hidden="true" />
                {t("cloneAsset")}
              </Link>
            </li>
          ) : null}
          {permissions.canDelete ? (
            <li className="border-t border-border pt-0.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setSheetOpen(false)
                  void runDelete()
                }}
                className={cn(sheetItemClasses, "text-danger disabled:cursor-not-allowed")}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {tCommon("delete")}
              </button>
            </li>
          ) : null}
        </ul>
      </SheetContent>
    </Sheet>
  )
}

function NextActionLink({
  transaction,
  label,
  assetTag,
  onNavigate,
}: {
  transaction: AssetRegisterRowTransaction
  label: string
  assetTag: string
  onNavigate?: () => void
}) {
  const Icon = transactionIcons[transaction.action]
  return (
    <Link
      href={transaction.href}
      onClick={onNavigate}
      aria-label={`${label}: ${assetTag}`}
      className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-info-border bg-primary-soft px-2.5 text-xs font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </Link>
  )
}
```

Check before using: `grep -n '"edit"\|"delete"' messages/th.json` must show `common.edit` and `common.delete`. The page already uses `tCommon("edit")`, so they exist.

- [ ] **Step 5: Wire the desktop variant into the table**

In `src/components/assets/asset-register-table.tsx`:
- Add `import { AssetRegisterRowActions, type AssetRegisterRowPermissions } from "@/components/assets/asset-register-row-actions"`.
- Add `permissions: AssetRegisterRowPermissions` to `AssetRegisterTableProps`, and destructure it.
- Replace the `<div className="inline-flex items-center gap-1">…</div>` inside the sticky actions `<td>` (the Eye link, Edit link, `AssetRegisterTransactionMenu` and `AssetRegisterMoreMenu`) with:

```tsx
                    <AssetRegisterRowActions
                      variant="desktop"
                      assetId={asset.id}
                      assetTag={asset.assetTag}
                      assetName={asset.name}
                      transactions={asset.transactions}
                      editHref={buildAssetEditHref(asset.id)}
                      cloneHref={buildAssetCloneHref(asset.id)}
                      permissions={permissions}
                      onNavigate={rememberDetailReturnScroll}
                    />
```

The mobile card keeps `AssetRegisterTransactionMenu` and its `<details>` until Task 10. Remove only the imports that become unused.

In `page.tsx`, add this prop to `<AssetRegisterTable`:

```tsx
          permissions={{ canEdit: canEditAssets, canCreate: canCreateAssets, canDelete: canDeleteAssets }}
```

- [ ] **Step 6: Run the tests, then the full checks**

Run: `node --test tests/asset-register-table-ui.test.ts tests/dropdown-menus-ui.test.ts tests/asset-clone-ui.test.ts tests/asset-return-navigation.test.ts`
Expected: PASS.

Run: `npm test`, then `npx tsc --noEmit`, then `npm run lint`. All must be green.

- [ ] **Step 7: Commit**

```bash
git add src/components/assets/asset-register-row-actions.tsx src/components/assets/asset-register-table.tsx "src/app/[locale]/(dashboard)/assets/page.tsx" messages/th.json messages/en.json tests/asset-register-table-ui.test.ts
git commit -m "feat(assets): next-step button and action menu per register row

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Summary bar (sort, columns, export) and shared pagination

**Files:**
- Create:
  - `src/components/assets/asset-register-sort-menu.tsx`
  - `src/components/assets/asset-register-column-picker.tsx`
  - `src/components/assets/asset-register-export-menu.tsx`
- Modify:
  - `src/components/assets/asset-register-table.tsx`: the header bar at lines 440-503, the footer at 836-851, `PaginationLink` at 965-987 and `downloadFile`
  - `messages/th.json`, `messages/en.json`
- Test: extend `tests/asset-register-table-ui.test.ts`; modify `tests/asset-register-ux.test.ts`

**Interfaces:**
- Consumes:
  - `assetRegisterSortOptions`, `getActiveSortKey` (Task 2)
  - `useAssetRegisterNavigation` (Task 5)
  - `Pagination` (Task 4)
  - `assetRegisterColumnPresets`, `assetRegisterColumnsMatchPreset`, `assetRegisterColumnOrder` (existing)
- Produces:
  - `AssetRegisterSortMenu()`. It reads and writes through `useAssetRegisterNavigation`.
  - `AssetRegisterColumnPicker({ visibleColumns: ReadonlySet<AssetRegisterColumnKey>, onToggleColumn(column), onApplyPreset(preset) })`
  - `AssetRegisterExportMenu({ exportHref, templateHref })`
  - The table root gets `aria-busy={isPending}` and `data-asset-register-summary`.
  - i18n in `asset`:
    - `registerRange`: "{from}–{to} จาก {total} รายการ" / "{from}–{to} of {total}"
    - `sortMenu`: "เรียง" / "Sort"
    - `sortNewest` "เพิ่มล่าสุด"/"Newest first", `sortOldest` "เพิ่มเก่าสุด"/"Oldest first"
    - `sortTagAsc` "รหัส A→Z"/"Tag A→Z", `sortTagDesc` "รหัส Z→A"/"Tag Z→A"
    - `sortNameAsc` "ชื่อ ก→ฮ"/"Name A→Z"
    - `sortPurchaseDateDesc` "ซื้อล่าสุด"/"Latest purchase", `sortPriceDesc` "ราคาสูง→ต่ำ"/"Price high to low"
    - `exportMenu`: "ส่งออก" / "Export"

- [ ] **Step 1: Write the failing tests**

Append to `tests/asset-register-table-ui.test.ts`:

```ts
const sortMenu = () => read("src/components/assets/asset-register-sort-menu.tsx")
const columnPicker = () => read("src/components/assets/asset-register-column-picker.tsx")
const exportMenu = () => read("src/components/assets/asset-register-export-menu.tsx")

test("sorting is a radio menu that applies through the shared navigation", () => {
  const source = sortMenu()

  assert.match(source, /<DropdownMenuRadioGroup value=\{activeKey \?\? ""\}/)
  assert.match(source, /navigate\(\{ sort: option\.sort, direction: option\.direction \}\)/)
  assert.match(source, /min-h-11/)
})

test("the column picker keeps presets and at least one column, and stays open while toggling", () => {
  const source = columnPicker()

  assert.match(source, /<DropdownMenuRadioGroup value=\{activePreset\}/)
  assert.match(source, /<DropdownMenuCheckboxItem/)
  assert.match(source, /disabled=\{checked && visibleColumns\.size === 1\}/)
  assert.match(source, /onSelect=\{\(event\) => event\.preventDefault\(\)\}/)
  for (const key of ["columnPresetAll", "columnPresetOperations", "columnPresetAccounting", "columnPresetAudit"]) {
    assert.match(source, new RegExp(key))
  }
})

test("export choices are plain download links in a menu", () => {
  const source = exportMenu()

  assert.match(source, /<a href=\{exportHref\}/)
  assert.match(source, /<a href=\{templateHref\}/)
})

test("the table summary uses the new menus, the shared pagination and announces loading", () => {
  const source = table()

  assert.match(source, /data-asset-register-summary/)
  assert.match(source, /<AssetRegisterSortMenu \/>/)
  assert.match(source, /<div className="hidden items-center gap-2 md:flex">[\s\S]*?<AssetRegisterColumnPicker[\s\S]*?<AssetRegisterExportMenu/)
  assert.match(source, /<Pagination\b/)
  assert.match(source, /aria-busy=\{isPending\}/)
  assert.doesNotMatch(source, /function PaginationLink|downloadFile/)
})

test("summary and sort copy exists in Thai and English", () => {
  const keys = ["registerRange", "sortMenu", "sortNewest", "sortOldest", "sortTagAsc", "sortTagDesc", "sortNameAsc", "sortPurchaseDateDesc", "sortPriceDesc", "exportMenu"]
  for (const locale of ["th", "en"] as const) {
    assert.deepEqual(keys.filter((key) => typeof messages(locale)[key] !== "string"), [], locale)
  }
  assert.equal(messages("th").registerRange, "{from}–{to} จาก {total} รายการ")
})
```

In `tests/asset-register-ux.test.ts`, replace these two tests.

The test "asset register exposes persisted column presets" becomes:

```ts
test("asset register table exposes persisted column presets", () => {
  const source = registerTableSource()
  const picker = readFileSync("src/components/assets/asset-register-column-picker.tsx", "utf8")

  assert.match(source, /assetRegisterColumnStorageKey/)
  assert.match(source, /window\.localStorage\.getItem\(assetRegisterColumnStorageKey\)/)
  assert.match(source, /window\.localStorage\.setItem\([\s\S]*assetRegisterColumnStorageKey/)
  assert.match(source, /onApplyPreset=\{applyColumnPreset\}/)
  assert.match(picker, /columnPresetOperations/)
  assert.match(picker, /columnPresetAccounting/)
  assert.match(picker, /columnPresetAudit/)
})
```

The test "asset register keeps table utility controls out of the mobile-first path" becomes:

```ts
test("asset register keeps table utility controls out of the mobile-first path", () => {
  assert.match(registerTableSource(), /<div className="hidden items-center gap-2 md:flex">\s*<AssetRegisterColumnPicker/)
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts`
Expected: FAIL with ENOENT for the menu files.

- [ ] **Step 3: Add the messages**

Inside `"asset"`, after `"rowActionsMenu"` (Task 7):
- th:
  ```json
      "registerRange": "{from}–{to} จาก {total} รายการ",
      "sortMenu": "เรียง",
      "sortNewest": "เพิ่มล่าสุด",
      "sortOldest": "เพิ่มเก่าสุด",
      "sortTagAsc": "รหัส A→Z",
      "sortTagDesc": "รหัส Z→A",
      "sortNameAsc": "ชื่อ ก→ฮ",
      "sortPurchaseDateDesc": "ซื้อล่าสุด",
      "sortPriceDesc": "ราคาสูง→ต่ำ",
      "exportMenu": "ส่งออก",
  ```
- en:
  ```json
      "registerRange": "{from}–{to} of {total}",
      "sortMenu": "Sort",
      "sortNewest": "Newest first",
      "sortOldest": "Oldest first",
      "sortTagAsc": "Tag A→Z",
      "sortTagDesc": "Tag Z→A",
      "sortNameAsc": "Name A→Z",
      "sortPurchaseDateDesc": "Latest purchase",
      "sortPriceDesc": "Price high to low",
      "exportMenu": "Export",
  ```

- [ ] **Step 4: Create `src/components/assets/asset-register-sort-menu.tsx`**

```tsx
"use client"

import { ArrowUpDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { assetRegisterSortOptions, getActiveSortKey } from "@/lib/asset-register-sort"

const sortLabelKeys = {
  newest: "sortNewest",
  oldest: "sortOldest",
  tagAsc: "sortTagAsc",
  tagDesc: "sortTagDesc",
  nameAsc: "sortNameAsc",
  purchaseDateDesc: "sortPurchaseDateDesc",
  priceDesc: "sortPriceDesc",
} as const

export function AssetRegisterSortMenu() {
  const t = useTranslations("asset")
  const { filters, navigate } = useAssetRegisterNavigation()
  const activeKey = getActiveSortKey(filters.sort, filters.direction)
  const activeLabel = activeKey ? t(sortLabelKeys[activeKey]) : t("sortMenu")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t("sortMenu")}: ${activeLabel}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:min-h-0 md:border md:border-border md:bg-surface md:px-3"
        >
          <ArrowUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="hidden text-muted-foreground md:inline">{t("sortMenu")}:</span>
          <span>{activeLabel}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{t("sortMenu")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={activeKey ?? ""} onValueChange={(key) => {
          const option = assetRegisterSortOptions.find((item) => item.key === key)
          if (option) navigate({ sort: option.sort, direction: option.direction })
        }}>
          {assetRegisterSortOptions.map((option) => (
            <DropdownMenuRadioItem key={option.key} value={option.key}>
              {t(sortLabelKeys[option.key])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 5: Create `src/components/assets/asset-register-column-picker.tsx`**

```tsx
"use client"

import { Columns3 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  assetRegisterColumnOrder,
  assetRegisterColumnPresets,
  assetRegisterColumnsMatchPreset,
  type AssetRegisterColumnKey,
  type AssetRegisterColumnPresetKey,
} from "@/lib/asset-register-columns"

const presetKeys = ["all", "operations", "accounting", "audit"] as const
const presetLabelKeys = {
  all: "columnPresetAll",
  operations: "columnPresetOperations",
  accounting: "columnPresetAccounting",
  audit: "columnPresetAudit",
} as const satisfies Record<AssetRegisterColumnPresetKey, string>
const columnLabelKeys = {
  assetTag: "assetTag",
  name: "assetName",
  category: "category",
  companyBranch: "company",
  currentLocation: "currentLocation",
  custodian: "custodian",
  ownershipType: "ownershipType",
  status: "status",
  condition: "condition",
  purchasePrice: "purchasePrice",
} as const satisfies Record<AssetRegisterColumnKey, string>

export function AssetRegisterColumnPicker({
  visibleColumns,
  onToggleColumn,
  onApplyPreset,
}: {
  visibleColumns: ReadonlySet<AssetRegisterColumnKey>
  onToggleColumn: (column: AssetRegisterColumnKey) => void
  onApplyPreset: (preset: AssetRegisterColumnPresetKey) => void
}) {
  const t = useTranslations("asset")
  const activePreset = presetKeys.find((preset) => assetRegisterColumnsMatchPreset(visibleColumns, assetRegisterColumnPresets[preset])) ?? ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Columns3 className="size-4" aria-hidden="true" />
          {t("columns")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{t("columnPresets")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={activePreset} onValueChange={(value) => onApplyPreset(value as AssetRegisterColumnPresetKey)}>
          {presetKeys.map((preset) => (
            <DropdownMenuRadioItem key={preset} value={preset} onSelect={(event) => event.preventDefault()}>
              {t(presetLabelKeys[preset])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{t("columns")}</DropdownMenuLabel>
        {assetRegisterColumnOrder.map((column) => {
          const checked = visibleColumns.has(column)
          return (
            <DropdownMenuCheckboxItem
              key={column}
              checked={checked}
              disabled={checked && visibleColumns.size === 1}
              onCheckedChange={() => onToggleColumn(column)}
              onSelect={(event) => event.preventDefault()}
            >
              {t(columnLabelKeys[column])}
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 6: Create `src/components/assets/asset-register-export-menu.tsx`**

```tsx
"use client"

import { Download, FileDown, FileSpreadsheet } from "lucide-react"
import { useTranslations } from "next-intl"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function AssetRegisterExportMenu({ exportHref, templateHref }: { exportHref: string; templateHref: string }) {
  const t = useTranslations("asset")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download className="size-4" aria-hidden="true" />
          {t("exportMenu")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <a href={exportHref}>
            <FileDown aria-hidden="true" />
            {t("exportFiltered")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={templateHref}>
            <FileSpreadsheet aria-hidden="true" />
            {t("downloadTemplate")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 7: Rebuild the table's header bar and footer**

In `src/components/assets/asset-register-table.tsx`:

1. Imports:
   - Add `useLocale, useTranslations` from `next-intl`.
   - Add `useAssetRegisterNavigation`, `AssetRegisterSortMenu`, `AssetRegisterColumnPicker`, `AssetRegisterExportMenu`, and `Pagination` from `@/components/ui/pagination`.
   - Remove `Columns3`, `FileDown`, `FileSpreadsheet` if unused.
2. At the top of the component, add:

```tsx
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const numberLocale = useLocale() === "th" ? "th-TH" : "en-US"
  const { isPending } = useAssetRegisterNavigation()
  const rangeLabel = t("registerRange", {
    from: fromRow.toLocaleString(numberLocale),
    to: toRow.toLocaleString(numberLocale),
    total: total.toLocaleString(numberLocale),
  })
```

3. Root element: change it to `<div aria-busy={isPending} className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface shadow-sm">`.
4. Replace the whole header bar `<div className="flex flex-col gap-3 border-b …">…</div>` (the count, the `<details>` column picker, and the two export buttons) with:

```tsx
      <div data-asset-register-summary className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 md:px-4 md:py-2">
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        <div className="flex items-center gap-2">
          <AssetRegisterSortMenu />
          <div className="hidden items-center gap-2 md:flex">
            <AssetRegisterColumnPicker visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onApplyPreset={applyColumnPreset} />
            <AssetRegisterExportMenu exportHref={`/api/assets/export?${buildAssetQueryString(filters)}`} templateHref="/api/assets/import-template" />
          </div>
        </div>
      </div>
```

5. Replace the footer `<div className="flex flex-col gap-3 border-t …">…</div>` with:

```tsx
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        <Pagination
          page={filters.page}
          totalPages={totalPages}
          previousHref={buildHref({ page: Math.max(1, filters.page - 1) })}
          nextHref={buildHref({ page: Math.min(totalPages, filters.page + 1) })}
          labels={{
            navigation: tCommon("pagination"),
            previous: labels.previous,
            next: labels.next,
            pageOf: tCommon("pageOf", { page: filters.page, total: totalPages }),
          }}
        />
      </div>
```

6. Delete the `PaginationLink` and `downloadFile` functions, and the `columnPresetLabel` helper if it is now unused. Keep `toggleColumn`, `applyColumnPreset` and the two localStorage effects exactly as they are. Keep `columnLabel`; Task 10 decides whether it is still used.

- [ ] **Step 8: Run the tests, then the full checks**

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts`
Expected: PASS.

Run: `npm test`, then `npx tsc --noEmit`, then `npm run lint`. All must be green.

- [ ] **Step 9: Commit**

```bash
git add src/components/assets/asset-register-sort-menu.tsx src/components/assets/asset-register-column-picker.tsx src/components/assets/asset-register-export-menu.tsx src/components/assets/asset-register-table.tsx messages/th.json messages/en.json tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts
git commit -m "feat(assets): register summary bar with sort, column and export menus

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Desktop table layout: fixed columns, thumbnails, status badges

**Files:**
- Modify:
  - `src/components/assets/asset-register-table.tsx`: desktop table, sticky constants at lines 164-172, `StatusPill`, `OwnershipTypePill`
  - `messages/th.json`, `messages/en.json`: `tableScrollHint` text
- Test:
  - extend `tests/asset-register-table-ui.test.ts`
  - modify `tests/asset-register-ux.test.ts` and `tests/modern-enterprise-theme.test.ts`

**Interfaces:**
- Consumes:
  - `assetRegisterColumnWidths`, `getAssetRegisterTableMinWidth` (Task 2)
  - `AssetThumbnail` (Task 4)
  - `StatusBadge` (part A)
  - `getAssetStateTone` (`@/lib/design-system`)
  - `hasRemainingHorizontalContent` (`@/lib/horizontal-scroll`)
- Produces: the desktop table described in spec §4.1.
  - `table-fixed` with a `<colgroup>`, and `minWidth = getAssetRegisterTableMinWidth(visible)`.
  - Tag pinned `sticky left-0`, actions pinned `sticky right-0`. The actions column shows a left shadow while more content sits under it.
  - The name column is no longer pinned.
  - Every text cell is one line with `truncate` and a `title`.
  - The scroll hint shows only when the table overflows.
  - `StatusPill` is gone. Ownership uses `StatusBadge` through `ownershipTypeTone(value): StatusTone`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/asset-register-table-ui.test.ts`:

```ts
test("the desktop table has fixed column widths that fit the default columns", () => {
  const source = table()

  assert.match(source, /className="w-full table-fixed/)
  assert.match(source, /style=\{\{ minWidth: getAssetRegisterTableMinWidth\(visibleColumnList\) \}\}/)
  assert.match(source, /<colgroup>/)
  assert.match(source, /assetRegisterColumnWidths\.select/)
  assert.match(source, /assetRegisterColumnWidths\.actions/)
  assert.match(source, /column === "name" \? undefined : \{ width: assetRegisterColumnWidths\[column\] \}/)
})

test("desktop rows use small thumbnails, one-line cells and shared status badges", () => {
  const source = table()

  assert.match(source, /<AssetThumbnail photo=\{asset\.photo\} assetTag=\{asset\.assetTag\} assetName=\{asset\.name\} size=\{40\}/)
  assert.match(source, /<div className="truncate font-medium" title=\{asset\.name\}>/)
  assert.match(source, /title=\{asset\.currentLocation\}/)
  assert.match(source, /title=\{asset\.custodian \?\? undefined\}/)
  assert.match(source, /<StatusBadge size="xs" label=\{asset\.status\.label\} tone=\{getAssetStateTone\(asset\.status\.value\)\}/)
  assert.match(source, /<StatusBadge size="xs" label=\{asset\.condition\.label\} tone=\{getAssetStateTone\(asset\.condition\.value\)\}/)
  assert.doesNotMatch(source, /function StatusPill|next\/image|\?inline=1|line-clamp-2/)
})

test("the scroll hint and the actions shadow follow real overflow", () => {
  const source = table()

  assert.match(source, /new ResizeObserver\(/)
  assert.match(source, /\{isOverflowing \? \(/)
  assert.match(source, /hasRemainingHorizontalContent\(/)
  assert.match(source, /hasMoreRight && /)
})
```

In `tests/asset-register-ux.test.ts`, make these replacements:
- "asset register desktop table keeps key columns frozen during horizontal scroll" becomes:

```ts
test("asset register desktop table pins the tag and actions columns only", () => {
  const source = registerTableSource()

  assert.match(source, /assetRegisterStickyFirstColumnClasses/)
  assert.match(source, /assetRegisterStickyActionsColumnClasses/)
  assert.doesNotMatch(source, /assetRegisterStickyNameColumnClasses|\[left:11rem\]/)
  assert.match(source, /right-0/)
  assert.match(source, /group-hover:bg-accent\/50/)
})
```

- "asset register desktop table exposes horizontal scroll affordance" becomes:

```ts
test("asset register desktop table explains horizontal scroll only when it overflows", () => {
  const source = registerTableSource()

  assert.match(source, /data-asset-table-scroll-hint/)
  assert.match(source, /tableScrollHint/)
  assert.match(source, /overscroll-x-contain/)
  assert.match(source, /\{isOverflowing \? \(/)
})
```

- "asset register table improves frozen name readability and row focus" becomes:

```ts
test("asset register table keeps names on one line with the full name on hover and visible row focus", () => {
  const tableSource = registerTableSource()
  const rowSource = readFileSync("src/components/ui/clickable-table-row.tsx", "utf8")

  assert.match(tableSource, /title=\{asset\.name\}/)
  assert.match(tableSource, /truncate font-medium/)
  assert.match(rowSource, /focus-visible:ring-2/)
  assert.match(rowSource, /focus-visible:ring-inset/)
})
```

In `tests/modern-enterprise-theme.test.ts`, the test "semantic soft tokens are exposed to Tailwind and used by the register" becomes:

```ts
test("semantic soft tokens are exposed to Tailwind and used by status badges", () => {
  const source = css()
  const badges = readFileSync("src/components/ui/badge-variants.ts", "utf8")

  for (const tone of ["success", "warning", "danger", "info"] as const) {
    assert.match(source, new RegExp(`--color-${tone}-soft:\\s*var\\(--${tone}-soft\\);`))
    assert.match(badges, new RegExp(`bg-${tone}-soft text-${tone}`))
  }
  assert.match(badges, /bg-muted text-muted-foreground/)
  assert.match(assetRegister(), /<StatusBadge\b/)
})
```

If `readFileSync` is not yet imported in that file, check its import line; it already reads files via helpers.

- [ ] **Step 2: Run them and confirm they fail**

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/modern-enterprise-theme.test.ts`
Expected: FAIL (no `table-fixed`, `StatusPill` still present).

- [ ] **Step 3: Update `tableScrollHint`**

The name column is no longer pinned:
- th: `"tableScrollHint": "เลื่อนตารางซ้าย/ขวาเพื่อดูคอลัมน์เพิ่มเติม คอลัมน์รหัสและการดำเนินการจะค้างตำแหน่งไว้",`
- en: `"tableScrollHint": "Scroll left/right to see more columns. Asset tag and actions stay pinned.",`

- [ ] **Step 4: Rebuild the desktop table**

In `src/components/assets/asset-register-table.tsx`:

1. Imports:
   - Add `useRef` to the React import.
   - Add `StatusBadge, type StatusTone` from `@/components/ui/status-badge`, `AssetThumbnail` from `@/components/assets/asset-thumbnail`, and `hasRemainingHorizontalContent` from `@/lib/horizontal-scroll`.
   - Add `assetRegisterColumnWidths, getAssetRegisterTableMinWidth` to the `@/lib/asset-register-columns` import.
   - Remove `Image` from `next/image` and `ImageIcon` if unused.
2. Replace the sticky constants block (lines 164-172) with:

```tsx
const assetRegisterStickyFirstColumnClasses = "sticky left-0"
const assetRegisterStickyActionsColumnClasses = "sticky right-0"
const assetRegisterStickyHeaderColumnClasses = "z-30 bg-muted"
const assetRegisterStickyBodyColumnClasses = "z-20 bg-surface group-hover:bg-accent/50 group-focus:bg-accent/50"
const assetRegisterActionsShadowClasses = "shadow-[-8px_0_8px_-8px_rgb(15_23_42/0.25)]"
const cellClasses = "px-3 py-2"
const headerClasses = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground"
```

   - Delete `previewableAssetPhotoTypes`, `assetRegisterStickyNameColumnClasses`, `assetRegisterNameColumnClasses`, `assetRegisterAssetTagColumnClasses` and `assetRegisterActionsColumnClasses`.
   - Delete `stickyNameColumnClass` inside the component.
3. Inside the component, after `visibleColumnCount`, add:

```tsx
  const visibleColumnList = assetRegisterColumnOrder.filter((column) => visibleColumns.has(column))
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [hasMoreRight, setHasMoreRight] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const measure = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth + 1)
      setHasMoreRight(hasRemainingHorizontalContent(element))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => observer.disconnect()
  }, [])
```

4. Scroll hint and wrapper: replace the always-visible scroll hint `<div data-asset-table-scroll-hint …>` and the opening `<div data-asset-desktop-table …>` and `<table …>` with:

```tsx
      {isOverflowing ? (
        <div
          data-asset-table-scroll-hint
          className={`${getDesktopTableOnlyClasses()} border-b border-border bg-muted px-4 py-1.5 text-xs text-muted-foreground`}
        >
          {labels.tableScrollHint}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        data-asset-desktop-table
        onScroll={(event) => setHasMoreRight(hasRemainingHorizontalContent(event.currentTarget))}
        className={`${getDesktopTableOnlyClasses()} relative overflow-x-auto overscroll-x-contain`}
      >
        <table className="w-full table-fixed divide-y divide-border text-sm" style={{ minWidth: getAssetRegisterTableMinWidth(visibleColumnList) }}>
          <colgroup>
            <col style={{ width: assetRegisterColumnWidths.select }} />
            {visibleColumnList.map((column) => (
              <col key={column} style={column === "name" ? undefined : { width: assetRegisterColumnWidths[column] }} />
            ))}
            <col style={{ width: assetRegisterColumnWidths.actions }} />
          </colgroup>
```

5. Header row. Use `headerClasses` for plain headers, replacing `<ColumnHeader>`. Keep `SortableHeader` for tag, name and price; pass `className` without the old width classes:
   - tag: `` className={`${assetRegisterStickyHeaderColumnClasses} ${assetRegisterStickyFirstColumnClasses} border-r border-border`} ``
   - name: `className=""`
   - In `SortableHeader`, change `px-4 py-3` to `px-3 py-2.5`.
   - The actions `<th>`: `` className={cn(headerClasses, "text-right", assetRegisterStickyHeaderColumnClasses, assetRegisterStickyActionsColumnClasses, "border-l border-border", hasMoreRight && assetRegisterActionsShadowClasses)} ``. Import `cn` from `@/lib/utils`.
6. Body cells. Keep the conditional order exactly as today: tag, name, category, companyBranch, currentLocation, custodian, ownershipType, status, condition, purchasePrice. That order matches `assetRegisterColumnOrder`, which is the order of the `<col>` elements.

```tsx
                  <td className={cellClasses}>
                    {/* existing select checkbox, unchanged */}
                  </td>
                  {visibleColumns.has("assetTag") && (
                    <td className={`${assetRegisterStickyBodyColumnClasses} ${assetRegisterStickyFirstColumnClasses} ${cellClasses} truncate border-r border-border font-medium text-foreground`} title={asset.assetTag}>
                      {asset.assetTag}
                    </td>
                  )}
                  {visibleColumns.has("name") && (
                    <td className={`${cellClasses} text-foreground`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <AssetThumbnail photo={asset.photo} assetTag={asset.assetTag} assetName={asset.name} size={40} />
                        <div className="min-w-0">
                          <div className="truncate font-medium" title={asset.name}>{asset.name}</div>
                          {asset.serialNumber ? (
                            <div className="truncate text-xs text-muted-foreground" title={asset.serialNumber}>{asset.serialNumber}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.has("category") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.category}>{asset.category}</td>}
                  {visibleColumns.has("companyBranch") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.companyBranch}>{asset.companyBranch}</td>}
                  {visibleColumns.has("currentLocation") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.currentLocation}>{asset.currentLocation}</td>}
                  {visibleColumns.has("custodian") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.custodian ?? undefined}>{asset.custodian || "-"}</td>}
                  {visibleColumns.has("ownershipType") && (
                    <td className={cellClasses}>
                      <StatusBadge size="xs" label={asset.ownershipType.label} tone={ownershipTypeTone(asset.ownershipType.value)} />
                    </td>
                  )}
                  {visibleColumns.has("status") && (
                    <td className={cellClasses}>
                      <StatusBadge size="xs" label={asset.status.label} tone={getAssetStateTone(asset.status.value)} />
                    </td>
                  )}
                  {visibleColumns.has("condition") && (
                    <td className={cellClasses}>
                      <StatusBadge size="xs" label={asset.condition.label} tone={getAssetStateTone(asset.condition.value)} />
                    </td>
                  )}
                  {visibleColumns.has("purchasePrice") && <td className={`${cellClasses} truncate text-muted-foreground`}>{formatCurrency(asset.purchasePrice)}</td>}
                  <td className={cn(assetRegisterStickyBodyColumnClasses, assetRegisterStickyActionsColumnClasses, cellClasses, "border-l border-border", hasMoreRight && assetRegisterActionsShadowClasses)}>
                    {/* AssetRegisterRowActions from Task 7, unchanged */}
                  </td>
```

7. Replace `StatusPill` and `OwnershipTypePill`/`ownershipTypeTone` at the bottom of the file with the function below. Then change every remaining `StatusPill`/`OwnershipTypePill` use (the mobile card) to `StatusBadge` with the same `tone` expressions:

```tsx
function ownershipTypeTone(value: string): StatusTone {
  if (value === "software_license") return "info"
  if (value === "stock") return "warning"
  if (value === "shared") return "success"
  if (value === "component") return "primary"
  return "muted"
}
```

- [ ] **Step 5: Run the tests, then the full checks**

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/modern-enterprise-theme.test.ts tests/ui-overlay-guards.test.ts`
Expected: PASS.

Run: `npm test`, then `npx tsc --noEmit`, then `npm run lint`. All must be green.

- [ ] **Step 6: Commit**

```bash
git add src/components/assets/asset-register-table.tsx messages/th.json messages/en.json tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/modern-enterprise-theme.test.ts
git commit -m "feat(assets): fixed-width register table with thumbnails and status badges

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Mobile rows, select mode and floating bulk bar

**Files:**
- Create: `src/components/assets/asset-register-mobile-list.tsx`
- Modify:
  - `src/components/assets/asset-register-table.tsx`: the mobile list at lines 549-646, the bulk bar at 504-547, and summary-bar select toggle; remove dead labels
  - `src/app/[locale]/(dashboard)/assets/page.tsx`: drop labels the table no longer uses
  - `messages/th.json`, `messages/en.json`
- Delete: `src/components/assets/asset-register-action-menus.tsx`
- Test:
  - extend `tests/asset-register-table-ui.test.ts`
  - modify `tests/asset-register-ux.test.ts`, `tests/dropdown-menus-ui.test.ts` and `tests/asset-clone-ui.test.ts`

**Interfaces:**
- Consumes:
  - `AssetRegisterRowActions`, `AssetRegisterRowPermissions` (Task 7)
  - `AssetThumbnail` (Task 4)
  - `StatusBadge`, `getAssetStateTone`
- Produces:
  - `AssetRegisterMobileList(props)`. Props:
    - `assets: AssetRegisterRow[]`, `selectMode: boolean`, `selectedIds: ReadonlySet<string>`
    - `onToggleAsset(id: string): void`
    - `permissions: AssetRegisterRowPermissions`
    - `detailHref(id): string`, `editHref(id): string`, `cloneHref(id): string`
    - `onNavigate(): void`
    - `reserveBulkBarSpace: boolean`
  - The table gets `selectMode` state, and the summary bar gets a "เลือก"/"เสร็จ" toggle below `md`.
  - i18n in `asset`: `selectMode`: "เลือก" / "Select" and `selectModeDone`: "เสร็จ" / "Done"

Behaviour (spec §4.3, §4.5):
- **Normal row.** About 80px tall: thumbnail 44 · tag (bold) · name (one line) · location + status badge (+ condition/shared badge when `needsFieldAttention`) · ⋯ 44×44.
  - The whole row links to detail through a stretched link. The thumbnail and ⋯ sit above it.
- **Select mode.** Each row is a `<label>` with a checkbox. A tap toggles the checkbox and never navigates. The thumbnail has no button.
  - Leaving select mode clears the selection.
- **Bulk bar.** Below `md` it floats above the bottom navigation: `fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))]`. At `md` and up it is the existing inline bar.
  - The list reserves bottom space while the bar is visible, so the last rows stay reachable.

- [ ] **Step 1: Write the failing tests**

Append to `tests/asset-register-table-ui.test.ts`:

```ts
const mobileList = () => read("src/components/assets/asset-register-mobile-list.tsx")

function functionBody(source: string, name: string) {
  const start = source.indexOf(`function ${name}`)
  assert.ok(start > -1, `${name} is missing`)
  const next = source.indexOf("\nfunction ", start + 1)
  return source.slice(start, next === -1 ? undefined : next)
}

test("mobile rows are compact links with tag, name, location and status", () => {
  const row = functionBody(mobileList(), "MobileAssetRow")
  const order = ["asset.assetTag", "asset.name", "asset.currentLocation", "asset.status"]

  let previous = -1
  for (const value of order) {
    const index = row.indexOf(value)
    assert.ok(index > previous, `${value} must follow the previous value`)
    previous = index
  }
  assert.match(row, /min-h-20/)
  assert.match(row, /before:absolute before:inset-0/)
  assert.match(row, /<AssetThumbnail[\s\S]*?size=\{44\}[\s\S]*?className="relative z-10"/)
  assert.match(row, /<AssetRegisterRowActions\s+variant="mobile"/)
  assert.doesNotMatch(row, /companyBranch|purchasePrice/)
})

test("select mode rows only toggle the checkbox and never navigate", () => {
  const row = functionBody(mobileList(), "MobileSelectableRow")

  assert.match(row, /<label className="flex min-h-20 cursor-pointer/)
  assert.match(row, /type="checkbox"/)
  assert.match(row, /aria-label=\{asset\.assetTag\}/)
  assert.match(row, /className="size-5 /)
  assert.match(row, /preview=\{false\}/)
  assert.doesNotMatch(row, /<Link|href=|AssetRegisterRowActions/)
})

test("leaving select mode clears the selection and the bulk bar floats above the phone navigation", () => {
  const source = table()

  assert.match(source, /const \[selectMode, setSelectMode\] = useState\(false\)/)
  assert.match(source, /function toggleSelectMode\(\) \{\s*if \(selectMode\) clearSelection\(\)\s*setSelectMode\(!selectMode\)/)
  assert.match(source, /aria-pressed=\{selectMode\}/)
  assert.match(source, /data-asset-bulk-bar/)
  assert.match(source, /fixed inset-x-3 bottom-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\][^"]*md:static/)
  assert.match(source, /reserveBulkBarSpace=\{selectedAssets\.length > 0\}/)
  assert.doesNotMatch(source, /AssetRegisterTransactionMenu|AssetRegisterMoreMenu|AssetDeleteButton|<details/)
})

test("select mode copy exists in Thai and English", () => {
  assert.equal(messages("th").selectMode, "เลือก")
  assert.equal(messages("th").selectModeDone, "เสร็จ")
  assert.equal(typeof messages("en").selectMode, "string")
  assert.equal(typeof messages("en").selectModeDone, "string")
})
```

In `tests/asset-register-ux.test.ts`, replace the mobile tests.

These four tests are deleted. The new tests above cover them:
- "mobile asset cards prioritize field lookup context"
- "mobile asset selection keeps a 44px labeled target around the visible checkbox"
- "mobile asset cards preserve field lookup order and secondary action access"
- "asset register uses mutually exclusive responsive helper boundaries"

"asset register keeps adaptive desktop and mobile responsibilities explicit" becomes:

```ts
test("asset register keeps adaptive desktop and mobile responsibilities explicit", () => {
  const list = readFileSync("src/components/assets/asset-register-mobile-list.tsx", "utf8")
  const source = registerTableSource()

  assert.match(list, /data-asset-mobile-list/)
  assert.match(list, /data-asset-mobile-row/)
  assert.match(list, /md:hidden/)
  assert.match(source, /data-asset-desktop-table/)
  assert.match(source, /getDesktopTableOnlyClasses\(\)/)
})
```

In `tests/dropdown-menus-ui.test.ts`, the test "register row menus are Radix dropdowns and delete through the shared action" becomes:

```ts
test("register row menus are Radix overlays and delete through the shared action", () => {
  const source = read("src/components/assets/asset-register-row-actions.tsx")
  assert.match(source, /<DropdownMenuContent data-no-row-click/)
  assert.match(source, /<SheetContent\s+side="bottom"/)
  assert.match(source, /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`, \{ returnFocusRef: triggerRef \}\)/)
  assert.equal(source.match(/ref=\{triggerRef\}/g)?.length, 2)
  assert.match(source, /variant="destructive"/)
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener|AssetDeleteButton/)
})
```

In `tests/asset-clone-ui.test.ts`, the first test becomes:

```ts
test("asset register exposes clone action that opens create asset with cloneFrom", () => {
  const source = readFileSync(join(process.cwd(), "src", "components", "assets", "asset-register-table.tsx"), "utf8")
  const actions = readFileSync(join(process.cwd(), "src", "components", "assets", "asset-register-row-actions.tsx"), "utf8")

  assert.match(actions, /t\("cloneAsset"\)/)
  assert.match(source, /function buildAssetCloneHref\(assetId: string\)/)
  assert.match(source, /cloneFrom=\$\{encodeURIComponent\(assetId\)\}/)
  assert.match(source, /appendReturnTo\(`\/\$\{locale\}\/assets\/new\?cloneFrom=\$\{encodeURIComponent\(assetId\)\}`, registerReturnHref\)/)
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/dropdown-menus-ui.test.ts tests/asset-clone-ui.test.ts`
Expected: FAIL with ENOENT for `asset-register-mobile-list.tsx`.

- [ ] **Step 3: Add the messages**

Inside `"asset"`, after `"exportMenu"` (Task 8):
- th:
  ```json
      "selectMode": "เลือก",
      "selectModeDone": "เสร็จ",
  ```
- en:
  ```json
      "selectMode": "Select",
      "selectModeDone": "Done",
  ```

- [ ] **Step 4: Create `src/components/assets/asset-register-mobile-list.tsx`**

```tsx
"use client"

import Link from "next/link"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetRegisterRowActions, type AssetRegisterRowPermissions } from "@/components/assets/asset-register-row-actions"
import type { AssetRegisterRow } from "@/components/assets/asset-register-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone, normalizeAssetStateValue } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type MobileListProps = {
  assets: AssetRegisterRow[]
  selectMode: boolean
  selectedIds: ReadonlySet<string>
  onToggleAsset: (id: string) => void
  permissions: AssetRegisterRowPermissions
  detailHref: (id: string) => string
  editHref: (id: string) => string
  cloneHref: (id: string) => string
  onNavigate: () => void
  reserveBulkBarSpace: boolean
}

type RowProps = Pick<MobileListProps, "permissions" | "detailHref" | "editHref" | "cloneHref" | "onNavigate">

export function AssetRegisterMobileList({
  assets,
  selectMode,
  selectedIds,
  onToggleAsset,
  reserveBulkBarSpace,
  ...rowProps
}: MobileListProps) {
  return (
    <ul data-asset-mobile-list className={cn("divide-y divide-border md:hidden", reserveBulkBarSpace && "pb-40")}>
      {assets.map((asset) =>
        selectMode ? (
          <MobileSelectableRow key={asset.id} asset={asset} checked={selectedIds.has(asset.id)} onToggle={() => onToggleAsset(asset.id)} />
        ) : (
          <MobileAssetRow key={asset.id} asset={asset} {...rowProps} />
        ),
      )}
    </ul>
  )
}

function MobileAssetRow({ asset, permissions, detailHref, editHref, cloneHref, onNavigate }: RowProps & { asset: AssetRegisterRow }) {
  return (
    <li data-asset-mobile-row className="relative flex min-h-20 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50">
      <AssetThumbnail photo={asset.photo} assetTag={asset.assetTag} assetName={asset.name} size={44} className="relative z-10" />
      <div className="min-w-0 flex-1">
        <Link
          href={detailHref(asset.id)}
          onClick={onNavigate}
          className="block truncate text-sm font-semibold text-foreground before:absolute before:inset-0 before:content-[''] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-ring"
        >
          {asset.assetTag}
        </Link>
        <p className="truncate text-sm text-foreground">{asset.name}</p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 truncate text-xs text-muted-foreground">{asset.currentLocation}</span>
          <StatusBadge size="xs" label={asset.status.label} tone={getAssetStateTone(asset.status.value)} />
          {needsFieldAttention(asset) ? (
            <>
              <StatusBadge size="xs" label={asset.condition.label} tone={getAssetStateTone(asset.condition.value)} />
              {asset.ownershipType.value === "shared" ? (
                <StatusBadge size="xs" label={asset.ownershipType.label} tone="success" />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <AssetRegisterRowActions
        variant="mobile"
        className="relative z-10"
        assetId={asset.id}
        assetTag={asset.assetTag}
        assetName={asset.name}
        transactions={asset.transactions}
        editHref={editHref(asset.id)}
        cloneHref={cloneHref(asset.id)}
        permissions={permissions}
        onNavigate={onNavigate}
      />
    </li>
  )
}

function MobileSelectableRow({ asset, checked, onToggle }: { asset: AssetRegisterRow; checked: boolean; onToggle: () => void }) {
  return (
    <li data-asset-mobile-row>
      <label className="flex min-h-20 cursor-pointer items-center gap-3 px-3 py-2.5 has-checked:bg-primary-soft">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={asset.assetTag}
          className="size-5 shrink-0 rounded border-border text-primary"
        />
        <AssetThumbnail photo={asset.photo} assetTag={asset.assetTag} assetName={asset.name} size={44} preview={false} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{asset.assetTag}</span>
          <span className="block truncate text-sm text-foreground">{asset.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{asset.currentLocation}</span>
        </span>
      </label>
    </li>
  )
}

function needsFieldAttention(asset: AssetRegisterRow) {
  return ["fair", "poor", "damaged", "non functional", "salvage"].includes(normalizeAssetStateValue(asset.condition.value)) || asset.ownershipType.value === "shared"
}
```

Note the type-only import of `AssetRegisterRow` from the table file. That is a type cycle only, which TypeScript allows. If lint flags `import/no-cycle`, move `AssetRegisterRow` into `src/components/assets/asset-register-row.ts` and import it from there in both files.

- [ ] **Step 5: Wire it into the table**

In `src/components/assets/asset-register-table.tsx`:

1. **State and toggle.** Add `const [selectMode, setSelectMode] = useState(false)` next to the other state, then:

```tsx
  function toggleSelectMode() {
    if (selectMode) clearSelection()
    setSelectMode(!selectMode)
  }
```

2. **Summary toggle.** In the summary bar's right-hand group (Task 8), after `<AssetRegisterSortMenu />`, add:

```tsx
          <button
            type="button"
            onClick={toggleSelectMode}
            aria-pressed={selectMode}
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            {selectMode ? t("selectModeDone") : t("selectMode")}
          </button>
```

3. **Bulk bar.**
   - Change the opening `<div className="flex flex-col gap-3 border-b border-border bg-primary-soft px-4 py-3 lg:flex-row lg:items-center lg:justify-between">` to:

```tsx
        <div
          data-asset-bulk-bar
          className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-lg md:static md:z-auto md:rounded-none md:border-0 md:border-b md:bg-primary-soft md:px-4 md:py-3 md:shadow-none lg:flex-row lg:items-center lg:justify-between"
        >
```

   - Change its button container to `grid grid-cols-2 gap-2 sm:flex sm:flex-wrap`. The four buttons, their handlers and their labels stay the same.
4. **Mobile list.** Replace the whole `<div data-asset-mobile-list …>…</div>` block with:

```tsx
      {assets.length === 0 ? (
        <div className="p-3 md:hidden">
          <ActionEmptyState {...emptyState} />
        </div>
      ) : (
        <AssetRegisterMobileList
          assets={assets}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleAsset={toggleAsset}
          permissions={permissions}
          detailHref={buildAssetDetailHref}
          editHref={buildAssetEditHref}
          cloneHref={buildAssetCloneHref}
          onNavigate={rememberDetailReturnScroll}
          reserveBulkBarSpace={selectedAssets.length > 0}
        />
      )}
```

5. **Cleanup in the table.** Delete these, which are now unused:
   - the `transactionLabels` object and `MobileAssetField`
   - the imports of `AssetRegisterTransactionMenu`, `AssetRegisterMoreMenu`, `AssetDeleteButton`, `Copy`, `Eye`, `getMobileCardListClasses` and `normalizeAssetStateValue`
   - `needsFieldAttention` and `columnLabel` if they are unused here

   Then remove from `AssetRegisterTableProps["labels"]` every key the table no longer reads. `tsc` lists them once you remove them from the page:
   - `edit`, `cloneAsset`, `transaction`, `more`
   - `checkout`, `checkin`, `transfer`, the six `transactionReason*`
   - `exportFiltered`, `downloadTemplate`, `columns`
   - `columnPresets`, `columnPresetAll`, `columnPresetOperations`, `columnPresetAccounting`, `columnPresetAudit`
   - `page`, `of`

   Remove the same keys from the `labels={{…}}` object in `page.tsx`. Keep every key that is still read (for example `detail`, `previous`, `next` and the bulk-update labels).
6. **Delete the old menus.** Delete `src/components/assets/asset-register-action-menus.tsx`. Confirm `grep -rn "asset-register-action-menus" src tests` prints nothing.

- [ ] **Step 6: Run the tests, then the full checks**

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/dropdown-menus-ui.test.ts tests/asset-clone-ui.test.ts tests/asset-return-navigation.test.ts tests/attachment-preview-dialog-ui.test.ts tests/ui-overlay-guards.test.ts`
Expected: PASS.

Run: `npm test`, then `npx tsc --noEmit`, then `npm run lint`. All must be green.

- [ ] **Step 7: Commit**

```bash
git add src/components/assets/asset-register-mobile-list.tsx src/components/assets/asset-register-table.tsx "src/app/[locale]/(dashboard)/assets/page.tsx" messages/th.json messages/en.json tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/dropdown-menus-ui.test.ts tests/asset-clone-ui.test.ts
git rm src/components/assets/asset-register-action-menus.tsx
git commit -m "feat(assets): compact mobile register rows with select mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verification on the dev app, docs and wiki (main session)

The main session runs this task, not a subagent. It needs the browser pane, the user's login, and the vault.

**Files:**
- Modify:
  - `DESIGN.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`
  - `D:\Obsidian\Eltross\AssetSystem\ams-status.md`, `ams-log.md`, `ams-open-questions.md`
  - memory `review-2026-10-priorities.md`

- [ ] **Step 1: Run the full verification**

1. Run `npm run verify` (lint, test and build). If `next build` fails because the dev server holds `.next`, stop the dev server task, rerun, then restart the dev server with the same command.
2. Check `npm ci` under npm 10, which is what Prod uses:
   - Stop the dev server first, because it locks `lightningcss`.
   - Run `npx -y npm@10.9.4 ci --ignore-scripts`, then `npm run prisma:generate`.
   - Restart the dev server against the dev DB.
   - Confirm `.env` still points at `asset_management_dev` with login `asset_dev` before starting it.

- [ ] **Step 2: Check behaviour on the dev app**

The user must be signed in. Ask them to sign in in the browser pane; never type the password.

1. **1440×900, default columns.**
   - Count the `<tr>` in `[data-asset-desktop-table] tbody` whose top edge is inside the viewport. The count must be **≥ 8**.
   - For every visible row, `document.elementFromPoint` at the centre of the status cell and of the condition cell returns that cell or a child of it.
   - `[data-asset-desktop-table]` has `scrollWidth <= clientWidth`, and the scroll hint is absent.
2. **375×812.** `[data-asset-mobile-row]` #1 has its top edge below 812, and at least 5 rows start inside the viewport.
3. **Tab counts.** With no filters, then with a branch, then with "ไม่มี Serial": each tab's count equals `total` after clicking that tab.
4. **Combined filters.**
   - Tab "พร้อมใช้งาน" plus "ไม่มี Serial" combine.
   - Chip × removes one filter, and "ล้างทั้งหมด" clears all.
   - These old links still open: `?dataQuality=photo`, `?crossScope=all`, `?statusId=<Lost id>`. The last one shows a status chip and no active tab.
5. **Search while typing.**
   - Type `0271` and pause: the list changes with no Enter, and the URL has `search=0271&page=1`.
   - Focus stays in the field.
   - One character does nothing; clearing the field shows everything.
   - `history.length` is unchanged after typing.
   - Typing fast is never overwritten.
6. **Filter sheet.**
   - Changing the condition updates the list while the sheet stays open.
   - The button reads "แสดง {total} รายการ" and matches the summary.
   - Pressing the button closes the sheet and focus returns to ⚙.
   - "ล้าง" keeps search and tab.
   - Esc closes the sheet.
7. **⋯ menus.**
   - Desktop: Esc returns focus to ⋯.
   - Mobile: the sheet lists the next action first, and delete-cancel returns focus to ⋯.
8. **Select mode (phone).**
   - Tapping rows toggles them and never navigates.
   - The bulk bar sits above the bottom navigation, and the last row is still reachable.
   - "เสร็จ" clears the selection.
9. **Thumbnails.**
   - Upload one test model photo on the **dev DB** (Brand/Model page).
   - `GET /api/attachments/{id}/thumbnail` returns WebP under 10KB with `Cache-Control` and `ETag`.
   - A reload gets 304 or a cache hit.
   - Rows whose file is missing show the icon, not a broken frame.
10. **Contrast.** Run an axe-core contrast check on `/th/assets` at both sizes. The result must be 0 failures.
11. **Manual items to ask the user about.** Record each one as "ยังไม่ได้ตรวจ" in the wiki if it is not done:
    - Thai IME composition in the search field on a real phone or keyboard
    - a phone screen reader

- [ ] **Step 3: Update the docs and the wiki, then report**

1. **Repo docs.**
   - `DESIGN.md`: the list-page pattern (search bar plus scope selects, status tabs with counts, ⚙ Sheet that applies instantly, chips, next-step button plus ⋯, compact mobile rows, thumbnails from `/thumbnail`).
   - `DEVELOPER_HANDOFF.md`: the provider (`useOptimistic` plus `router.replace`), the thumbnail route, and `attachment-access`.
   - `docs/99_CHANGELOG.md`
2. **Wiki.** Follow `AssetSystem/_schema/ams-wiki-schema.md`.
   - `ams-status` gets the row "UI ส่วน B1 … built · ยังไม่ deploy".
   - `ams-open-questions` gets two entries:
     - deploy notes: the new dependency `sharp`; confirm `@img/sharp-linux-x64` in the Prod `npm ci` log; no migration
     - manual items not yet checked
   - `ams-log` gets a line for this change.
   - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` in `D:\Obsidian\Eltross`, then commit the vault with `ingest:`.
3. **Memory.** Update `review-2026-10-priorities.md` (B1 built, not deployed).
4. **Report and finish.** Report to the user in Thai: what was verified with evidence, deviations (name min-width 200), and open items. Then use superpowers:finishing-a-development-branch.
