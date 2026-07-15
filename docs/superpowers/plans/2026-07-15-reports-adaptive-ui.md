# Reports Adaptive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single long Reports page with four URL-backed, filter-aware, adaptive reporting views while fixing filter-scope defects and preserving exports, permissions, accounting formulas, and browser-local presets.

**Architecture:** Keep `reports/page.tsx` as the authenticated Server Component and database orchestrator. Parse the URL once, build one shared `assetWhere`, load only shared data plus the active view's data, and pass plain display data into focused server-rendered report components; keep `localStorage` only inside the existing preset Client Component. Reuse the shared asset query contract so Reports, Asset Register, and both asset exports agree on filters.

**Tech Stack:** Next.js 16.2.4 App Router, React 19 Server/Client Components, TypeScript 5, Tailwind CSS 4, next-intl, Prisma 7 with SQL Server, Lucide React, Node test runner.

## Global Constraints

- Preserve the same `/{locale}/reports` route, existing API endpoints, database schema, RBAC, validation, accounting formulas, audit behavior, and export permissions.
- Use URL parameter `view=overview|accounting|operations|catalog`; missing or invalid values fall back to `overview`.
- Preserve supported asset filters when changing views; exports receive only parameters supported by their existing endpoints.
- Desktop and mobile share data and behavior. Desktop is a dense review workspace; mobile is an adaptive card/list workspace below `md`.
- Reuse `MetricCard`, `ContentPanel`, `FilterPanel`, action/field helpers, semantic tokens, and Lucide icons. Add no dependency, raw palette, gradient, glass, or decorative chart.
- Keep the dashboard `<main>` as the only vertical scroll owner and prevent body-level horizontal overflow at 375px.
- Mobile controls must be at least 44px, have visible focus, and never depend on hover or color alone.
- Keep Thai and English message keys equivalent; do not hardcode new user-facing copy.
- Browser-local report presets remain device-local and must not change permissions.
- Do not silently cap any result presented as a complete summary.
- Every behavior change starts with a focused failing test and ends with a focused passing test plus a small commit.
- Before changing App Router code, follow `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`, `04-linking-and-navigating.md`, `05-server-and-client-components.md`, and `03-api-reference/03-file-conventions/loading.md`: await `searchParams`, keep database work in Server Components, isolate browser APIs in the preset Client Component, and keep `loading.tsx` lightweight.

---

### Task 1: Add safe report view state and active-filter descriptors

**Files:**
- Create: `src/lib/report-view.ts`
- Create: `src/lib/report-active-filters.ts`
- Create: `src/components/reports/report-view-tabs.tsx`
- Create: `src/components/reports/report-active-filters.tsx`
- Test: `tests/report-view.test.ts`
- Test: `tests/report-active-filters.test.ts`

**Interfaces:**
- Produces: `ReportView`, `reportViews`, `parseReportView(value)`, `buildReportQueryString(view, filters, overrides)`, and `buildReportHref(locale, view, filters, overrides)`.
- Produces: `ReportActiveFilterKey`, `ReportActiveFilterDescriptor`, and `buildReportActiveFilters(input)`.
- Produces: `<ReportViewTabs locale activeView filters labels navigationLabel>` and `<ReportActiveFilters filters clearAllHref clearLabel removeLabel>` as Server Components using ordinary `next/link` navigation.

- [ ] **Step 1: Write failing view-state tests**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { buildReportHref, parseReportView } from "../src/lib/report-view.ts"
import { parseAssetListParams } from "../src/lib/asset-list-query.ts"

test("parses only supported report views", () => {
  assert.equal(parseReportView("accounting"), "accounting")
  assert.equal(parseReportView(["operations", "catalog"]), "operations")
  assert.equal(parseReportView("unknown"), "overview")
  assert.equal(parseReportView(undefined), "overview")
})

test("changes report view without losing asset filters", () => {
  const filters = parseAssetListParams({ companyId: "co-1", branchId: "br-1", statusId: "ready" })
  assert.equal(
    buildReportHref("th", "operations", filters),
    "/th/reports?companyId=co-1&branchId=br-1&statusId=ready&sort=createdAt&direction=desc&page=1&pageSize=25&view=operations",
  )
})
```

- [ ] **Step 2: Run the view-state test and verify RED**

Run: `node --test tests/report-view.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/report-view.ts`.

- [ ] **Step 3: Implement the pure view helper**

```ts
import { buildAssetQueryString, parseAssetListParams } from "./asset-list-query.ts"

export const reportViews = ["overview", "accounting", "operations", "catalog"] as const
export type ReportView = (typeof reportViews)[number]
type ParsedAssetFilters = ReturnType<typeof parseAssetListParams>

export function parseReportView(value: unknown): ReportView {
  const candidate = Array.isArray(value) ? value[0] : value
  return reportViews.includes(candidate as ReportView) ? candidate as ReportView : "overview"
}

export function buildReportQueryString(
  view: ReportView,
  filters: ParsedAssetFilters,
  overrides: Partial<ParsedAssetFilters> = {},
) {
  const params = new URLSearchParams(buildAssetQueryString(filters, { ...overrides, page: 1 }))
  params.set("view", view)
  return params.toString()
}

export function buildReportHref(
  locale: string,
  view: ReportView,
  filters: ParsedAssetFilters,
  overrides: Partial<ParsedAssetFilters> = {},
) {
  return `/${locale}/reports?${buildReportQueryString(view, filters, overrides)}`
}
```

- [ ] **Step 4: Write failing active-filter tests**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { buildReportActiveFilters } from "../src/lib/report-active-filters.ts"
import { parseAssetListParams } from "../src/lib/asset-list-query.ts"

test("builds readable report filter chips and keeps the active view", () => {
  const filters = parseAssetListParams({ search: "UPS", companyId: "co-1", branchId: "br-1" })
  const chips = buildReportActiveFilters({
    locale: "th",
    view: "operations",
    filters,
    names: { search: "ค้นหา", companyId: "บริษัท", branchId: "สาขา" },
    values: { companyId: "GRL - บริษัท", branchId: "GRL / BKK - กรุงเทพ" },
  })

  assert.deepEqual(chips.map((chip) => chip.label), ["ค้นหา: UPS", "บริษัท: GRL - บริษัท", "สาขา: GRL / BKK - กรุงเทพ"])
  assert.match(chips[0].href, /view=operations/)
})

test("removing company also removes its dependent branch", () => {
  const filters = parseAssetListParams({ companyId: "co-1", branchId: "br-1" })
  const [company] = buildReportActiveFilters({
    locale: "en",
    view: "overview",
    filters,
    names: { companyId: "Company", branchId: "Branch" },
    values: { companyId: "Company 1", branchId: "Branch 1" },
  })
  assert.doesNotMatch(company.href, /companyId|branchId/)
})
```

- [ ] **Step 5: Implement descriptors and the two server-rendered controls**

Define `ReportActiveFilterKey` as the supported asset filter keys (`search`, company/branch/category/brand/model/status/condition/ownership/custodian/supplier/data-quality/cross-scope/activity). `buildReportActiveFilters` must iterate only non-empty values, use `values[key] ?? String(filters[key])`, call `buildReportHref`, and pass `{ companyId: "", branchId: "" }` when clearing company. `<ReportViewTabs>` renders a named `<nav data-report-tabs>` with four 44px `Link` targets and `aria-current="page"`; `<ReportActiveFilters>` renders `<section data-report-active-filters>`, removable chip links with full accessible names, and a clear-all link that keeps `view`.

- [ ] **Step 6: Run focused tests and commit**

Run: `node --test tests/report-view.test.ts tests/report-active-filters.test.ts`

Expected: PASS.

```powershell
git add src/lib/report-view.ts src/lib/report-active-filters.ts src/components/reports/report-view-tabs.tsx src/components/reports/report-active-filters.tsx tests/report-view.test.ts tests/report-active-filters.test.ts
git commit -m "feat(reports): add URL-backed report views"
```

---

### Task 2: Add one authoritative 180-day idle-asset filter

**Files:**
- Create: `src/lib/asset-activity-filter.ts`
- Modify: `src/lib/asset-list-query.ts`
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Create: `tests/asset-activity-filter.test.ts`
- Modify: `tests/asset-list-query.test.ts`

**Interfaces:**
- Produces: `AssetActivityFilter = "" | "idle_180d"`, `normalizeAssetActivityFilter(value)`, `getAssetActivityWhere(activity, now?)`, and `getIdleAssetCutoff(now?)`.
- Extends: `AssetListParams.activity` and every `parseAssetListParams` / `buildAssetWhere` / `buildAssetQueryString` consumer, including Asset Register, asset export, and Asset Overview export.

- [ ] **Step 1: Write the failing deterministic activity-filter tests**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { getAssetActivityWhere, getIdleAssetCutoff, normalizeAssetActivityFilter } from "../src/lib/asset-activity-filter.ts"

test("normalizes only the supported idle activity filter", () => {
  assert.equal(normalizeAssetActivityFilter("idle_180d"), "idle_180d")
  assert.equal(normalizeAssetActivityFilter("anything"), "")
})

test("builds the exact 180-day no-movement predicate", () => {
  const now = new Date("2026-07-15T00:00:00.000Z")
  assert.equal(getIdleAssetCutoff(now).toISOString(), "2026-01-16T00:00:00.000Z")
  assert.deepEqual(getAssetActivityWhere("idle_180d", now), {
    movements: { none: { performedAt: { gte: new Date("2026-01-16T00:00:00.000Z") } } },
  })
})
```

- [ ] **Step 2: Run the activity test and verify RED**

Run: `node --test tests/asset-activity-filter.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the activity helper and query integration**

```ts
import type { Prisma } from "@prisma/client"

export type AssetActivityFilter = "" | "idle_180d"

export function normalizeAssetActivityFilter(value: unknown): AssetActivityFilter {
  return value === "idle_180d" ? "idle_180d" : ""
}

export function getIdleAssetCutoff(now = new Date()) {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 180)
  return cutoff
}

export function getAssetActivityWhere(activity: AssetActivityFilter, now = new Date()): Prisma.AssetWhereInput | null {
  return activity === "idle_180d"
    ? { movements: { none: { performedAt: { gte: getIdleAssetCutoff(now) } } } }
    : null
}
```

In `asset-list-query.ts`, add `activity?: string`, normalize it during parsing, append the activity predicate to `where.AND`, and serialize `activity` beside `dataQuality` and `crossScope`. Extend `tests/asset-list-query.test.ts` to assert an unknown value becomes empty, `idle_180d` is preserved in the URL, and `buildAssetWhere` contains the movement predicate.

- [ ] **Step 4: Expose the activity scope in Asset Register**

Add `activity` to clear-all overrides and add this chip after cross-scope:

```tsx
filters.activity
  ? {
      key: "activity",
      label: labels.activityIdle180d,
      href: `/${locale}/assets?${buildAssetQueryString(filters, { activity: "", page: 1 })}`,
    }
  : null
```

Add `activityIdle180d` to `AssetFilterLabels`, pass `t("activityIdle180d")`, and add equivalent messages: Thai `ไม่มีความเคลื่อนไหวใน 180 วันล่าสุด`; English `No movement in the latest 180 days`.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test tests/asset-activity-filter.test.ts tests/asset-list-query.test.ts`

Expected: PASS, including query-string preservation.

```powershell
git add src/lib/asset-activity-filter.ts src/lib/asset-list-query.ts "src/app/[locale]/(dashboard)/assets/page.tsx" messages/th.json messages/en.json tests/asset-activity-filter.test.ts tests/asset-list-query.test.ts
git commit -m "fix(reports): add accurate idle asset drilldown"
```

---

### Task 3: Build the adaptive Reports shell and extract four view components

**Files:**
- Create: `src/components/reports/report-header.tsx`
- Create: `src/components/reports/report-filter-panel.tsx`
- Create: `src/components/reports/reports-overview-view.tsx`
- Create: `src/components/reports/reports-accounting-view.tsx`
- Create: `src/components/reports/reports-operations-view.tsx`
- Create: `src/components/reports/reports-catalog-view.tsx`
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx`
- Create: `tests/reports-adaptive-ui.test.ts`
- Modify: `tests/report-table-key.test.ts`

**Interfaces:**
- `<ReportHeader>` consumes the title, subtitle, and already permission-filtered export actions; it contains no auth logic.
- `<ReportFilterPanel locale activeView filters options labels>` consumes parsed filters, lookup options, localized labels, and `activeView`; its GET form includes `<input type="hidden" name="view" value={activeView}>`.
- Each view component receives already loaded data and contains no Prisma import.
- `reports/page.tsx` selects exactly one of `<ReportsOverviewView>`, `<ReportsAccountingView>`, `<ReportsOperationsView>`, or `<ReportsCatalogView>`.
- `ReportsPageProps.searchParams` becomes `Promise<AssetListParams & { view?: string | string[] }>`; the page awaits it once, passes `rawSearchParams.view` to `parseReportView`, and passes the remaining object to `parseAssetListParams`.
- View props include `hasActiveFilters` and localized empty copy so zero rows distinguish “no assets match these filters” from “this dataset has no activity.”

- [ ] **Step 1: Write the failing shell/source contract test**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")
const filterPanel = readFileSync("src/components/reports/report-filter-panel.tsx", "utf8")

test("reports renders the adaptive shell before one active view", () => {
  const order = ["data-report-tabs", "data-report-filters", "data-report-active-filters", "data-report-shared-metrics", "data-report-view-content"]
  const indexes = order.map((token) => page.indexOf(token))
  assert.ok(indexes.every((index) => index >= 0))
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b))
  assert.match(page, /parseReportView/)
  assert.match(page, /switch \(activeView\)/)
})

test("filter form keeps view state and uses adaptive columns", () => {
  assert.match(filterPanel, /name="view" value=\{activeView\}/)
  assert.match(filterPanel, /grid-cols-1/)
  assert.match(filterPanel, /md:grid-cols-2/)
  assert.match(filterPanel, /xl:grid-cols-3/)
})
```

- [ ] **Step 2: Run the adaptive shell test and verify RED**

Run: `node --test tests/reports-adaptive-ui.test.ts`

Expected: FAIL because `report-filter-panel.tsx` and the ordered adaptive shell do not exist.

- [ ] **Step 3: Extract the filter and presentation components**

Move the current filter controls into `ReportFilterPanel`, preserving the same seven visible controls and GET semantics. Move, without changing calculations or permission decisions:

- preview plus status/category/company/branch/department/ownership breakdowns into `ReportsOverviewView`;
- cost and depreciation metrics/tables into `ReportsAccountingView`;
- data quality, cross-scope, custodian/location/repair/idle content into `ReportsOperationsView`;
- local presets, recurring exports, report catalog, catalog count, and permission summary into `ReportsCatalogView`.

Use exported prop types with display-ready rows, for example:

```ts
export type ReportCountRow = { key: string; label: string; count: number }
export type ReportAssetPreviewRow = {
  id: string
  assetTag: string
  name: string
  category: string
  branch: string
  department: string
  custodian: string
  ownership: string
  status: string
}
```

The view files may import formatting helpers and shared UI, but must not import `@/lib/db` or `@/lib/auth-utils`.

- [ ] **Step 4: Recompose the page in the approved order**

Define the header action input before rendering:

```ts
const headerActions = [
  ...(canReportExport ? [{ href: `/api/reports/assets-overview/export?${exportQuery}`, label: t("exportAssetOverview"), variant: "primary" as const }] : []),
  ...(canAssetExport ? [{ href: `/api/assets/export?${exportQuery}`, label: t("exportAssetRegister"), variant: "secondary" as const }] : []),
]
```

`report-header.tsx` exports `ReportHeaderAction = { href: string; label: string; variant: "primary" | "secondary" }` and renders only the supplied actions. Use this route-level shape after auth, URL parsing, filter lookup labels, and current data preparation:

```tsx
return (
  <div className="space-y-5" data-report-page>
    <ReportHeader title={t("title")} subtitle={t("subtitle")} actions={headerActions} />
    <div data-report-tabs>
      <ReportViewTabs locale={locale} activeView={activeView} filters={filters} labels={viewLabels} navigationLabel={t("viewNavigation")} />
    </div>
    <div data-report-filters>
      <ReportFilterPanel locale={locale} activeView={activeView} filters={filters} options={filterOptions} labels={filterLabels} />
    </div>
    {activeFilters.length > 0 ? (
      <div data-report-active-filters>
        <ReportActiveFilters filters={activeFilters} clearAllHref={buildReportHref(locale, activeView, parseAssetListParams({}))} clearLabel={t("clearFilters")} removeLabel={t("clearActiveFilter")} />
      </div>
    ) : null}
    <div data-report-shared-metrics className="grid grid-cols-2 gap-3">
      <MetricCard label={t("totalAssets")} value={totalAssets.toLocaleString("th-TH")} />
      <MetricCard label={t("totalValue")} value={formatCurrency(totalPurchaseValue)} />
    </div>
    <div data-report-view-content>{viewContent}</div>
  </div>
)
```

Select `viewContent` with an exhaustive `switch (activeView)`. Header export links stay permission-aware and become full-width below `sm`. Tab links and filter apply/clear controls remain 44px on mobile.

- [ ] **Step 5: Update existing source tests to follow extracted components**

Change `tests/report-table-key.test.ts` to read `reports-overview-view.tsx` for breakdown keys and `reports-operations-view.tsx` for cross-scope content. Retain the assertions that duplicate display labels do not become React keys and branch labels contain company code.

- [ ] **Step 6: Run focused tests and commit**

Run: `node --test tests/report-view.test.ts tests/report-active-filters.test.ts tests/reports-adaptive-ui.test.ts tests/report-table-key.test.ts tests/report-presets.test.ts`

Expected: PASS with all four views reachable through URL state.

```powershell
git add "src/app/[locale]/(dashboard)/reports/page.tsx" src/components/reports tests/report-view.test.ts tests/report-active-filters.test.ts tests/reports-adaptive-ui.test.ts tests/report-table-key.test.ts
git commit -m "refactor(reports): add adaptive reporting workspace"
```

---

### Task 4: Query only shared data and the active report view

**Files:**
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx`
- Modify: `tests/performance-route-instrumentation.test.ts`
- Create: `tests/report-query-scope.test.ts`

**Interfaces:**
- Replaces timing labels `reports.initial-data`, `reports.lookup-data`, and `reports.dimension-labels` with `reports.shared-data`, `reports.overview-data`, `reports.accounting-data`, `reports.operations-data`, and `reports.catalog-data`.
- Shared data is limited to filter options, total asset count, and total purchase value.
- Only `accounting` loads the unbounded filtered accounting asset set.
- Local closures in `reports/page.tsx` have these signatures: `loadReportFilterOptions(): Promise<ReportFilterOptions>`, `loadOverviewView(): Promise<React.ReactNode>`, `loadAccountingView(): Promise<React.ReactNode>`, `loadOperationsView(): Promise<React.ReactNode>`, and `loadCatalogView(): Promise<React.ReactNode>`. `ReportFilterOptions` contains `companies`, `branches`, `categories`, `statuses`, and `conditions` using the current Prisma select shapes plus selected-only labels for active `brandId`, `modelId`, `custodianId`, and `supplierId` filters.

- [ ] **Step 1: Write failing query-scope source tests**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")

test("reports instruments shared data and each exclusive view", () => {
  for (const label of ["reports.shared-data", "reports.overview-data", "reports.accounting-data", "reports.operations-data", "reports.catalog-data"]) {
    assert.ok(source.includes(label), `missing ${label}`)
  }
  assert.doesNotMatch(source, /reports\.(initial-data|lookup-data|dimension-labels)/)
})

test("the unbounded accounting asset query is inside the accounting branch", () => {
  const start = source.indexOf('case "accounting"')
  const end = source.indexOf('case "operations"')
  const accounting = source.slice(start, end)
  assert.match(accounting, /prisma\.asset\.findMany/)
  assert.match(accounting, /depreciationPolicySettingKey/)
  assert.doesNotMatch(source.slice(0, start), /const costAssets/)
})

test("frequent repair grouping respects the filtered asset relation", () => {
  const start = source.indexOf('case "operations"')
  const end = source.indexOf('case "catalog"')
  assert.match(source.slice(start, end), /maintenanceTicket\.groupBy[\s\S]*asset: assetWhere/)
})

test("idle count uses the shared activity predicate", () => {
  assert.match(source, /getAssetActivityWhere\("idle_180d"/)
  assert.doesNotMatch(source, /function daysAgo/)
})
```

- [ ] **Step 2: Run query-scope tests and verify RED**

Run: `node --test tests/report-query-scope.test.ts tests/performance-route-instrumentation.test.ts`

Expected: FAIL because the legacy labels and one all-view `Promise.all` remain.

- [ ] **Step 3: Split shared and view-specific data loading**

Implement this control flow in the Reports Server Component:

```ts
const shared = await withPerformanceTiming("reports.shared-data", () => Promise.all([
  prisma.asset.count({ where: assetWhere }),
  prisma.asset.aggregate({ where: assetWhere, _sum: { purchasePrice: true } }),
  loadReportFilterOptions(),
]), timingContext)

switch (activeView) {
  case "overview":
    viewContent = await withPerformanceTiming("reports.overview-data", loadOverviewView, timingContext)
    break
  case "accounting":
    viewContent = await withPerformanceTiming("reports.accounting-data", loadAccountingView, timingContext)
    break
  case "operations":
    viewContent = await withPerformanceTiming("reports.operations-data", loadOperationsView, timingContext)
    break
  case "catalog":
    viewContent = await withPerformanceTiming("reports.catalog-data", loadCatalogView, timingContext)
    break
}
```

The local loader closures stay in `page.tsx`, capture `assetWhere`, and return React view elements after their own `Promise.all`. `loadReportFilterOptions` retains the current five active option lists and performs bounded `findUnique` label lookups only when `brandId`, `modelId`, `custodianId`, or `supplierId` is active, so every hidden URL filter is visible in the chip summary without loading whole master tables. The overview loader fetches groupings/preview/labels; accounting fetches `costAssets`, filtered repair groups, and depreciation policy; operations fetches quality/cross-scope/custody/location/repair/idle data; catalog constructs permission-aware rows without asset queries.

- [ ] **Step 4: Correct frequent repairs during the operations split**

Use this exact relation constraint:

```ts
prisma.maintenanceTicket.groupBy({
  by: ["assetId"],
  where: { isActive: true, asset: assetWhere },
  _count: { _all: true },
  _sum: { repairCost: true },
  orderBy: { _count: { assetId: "desc" } },
  take: 5,
})
```

Build the idle predicate once in the operations branch and use it for the count:

```ts
const idleAssetWhere = getAssetActivityWhere("idle_180d")
const idleAssetsCount = await prisma.asset.count({
  where: { AND: [assetWhere, ...(idleAssetWhere ? [idleAssetWhere] : [])] },
})
```

Delete the page-local `daysAgo` helper so the report count and Asset Register/export drilldown share one 180-day definition.

- [ ] **Step 5: Update performance instrumentation expectations and commit**

Replace the Reports label array in `tests/performance-route-instrumentation.test.ts` with the five new labels. Run:

`node --test tests/report-query-scope.test.ts tests/performance-route-instrumentation.test.ts tests/performance-timing.test.ts`

Expected: PASS.

```powershell
git add "src/app/[locale]/(dashboard)/reports/page.tsx" tests/report-query-scope.test.ts tests/performance-route-instrumentation.test.ts
git commit -m "perf(reports): load only the active report view"
```

---

### Task 5: Make report rows adaptive and drilldowns exact

**Files:**
- Create: `src/components/reports/responsive-report-list.tsx`
- Modify: `src/components/reports/reports-overview-view.tsx`
- Modify: `src/components/reports/reports-accounting-view.tsx`
- Modify: `src/components/reports/reports-operations-view.tsx`
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx`
- Modify: `tests/reports-adaptive-ui.test.ts`
- Modify: `tests/report-table-key.test.ts`

**Interfaces:**
- Produces: generic server component `<ResponsiveReportList<Row>>` with `rows`, `rowKey`, `columns`, and `emptyLabel`.
- Desktop representation is a semantic table visible at `md+`; mobile representation is a labelled card/list visible below `md`.
- `ReportsOperationsView` consumes `locale` and the parsed `filters` in addition to display data so data-quality and idle cards can drill into Asset Register with exact compatible query values.

- [ ] **Step 1: Add failing adaptive-list and drilldown assertions**

```ts
test("wide report datasets have mutually exclusive table and mobile list hooks", () => {
  const source = readFileSync("src/components/reports/responsive-report-list.tsx", "utf8")
  assert.match(source, /data-report-desktop-table/)
  assert.match(source, /hidden md:block/)
  assert.match(source, /data-report-mobile-list/)
  assert.match(source, /md:hidden/)
  assert.match(source, /<th/)
})

test("operations exposes exact actionable drilldowns", () => {
  const source = readFileSync("src/components/reports/reports-operations-view.tsx", "utf8")
  for (const filter of ["responsibility", "serial", "photo", "warranty"]) {
    assert.ok(source.includes(`dataQuality: "${filter}"`))
  }
  assert.match(source, /activity: "idle_180d"/)
})
```

- [ ] **Step 2: Run adaptive UI tests and verify RED**

Run: `node --test tests/reports-adaptive-ui.test.ts tests/report-table-key.test.ts`

Expected: FAIL because wide report tables have no mobile-card alternative and quality metrics are passive.

- [ ] **Step 3: Implement the generic adaptive list**

```tsx
type Column<Row> = {
  key: string
  label: string
  render: (row: Row) => React.ReactNode
  className?: string
}

export function ResponsiveReportList<Row>({ rows, rowKey, columns, emptyLabel }: {
  rows: Row[]
  rowKey: (row: Row) => string
  columns: Column<Row>[]
  emptyLabel: string
}) {
  if (rows.length === 0) return <div className="p-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
  return <>
    <div data-report-desktop-table className="hidden overflow-x-auto md:block">
      <table className="min-w-full"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key} className={column.className}>{column.render(row)}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <div data-report-mobile-list className="grid gap-3 p-3 md:hidden">
      {rows.map((row) => <article key={rowKey(row)} className="rounded-md border border-border bg-surface p-4">
        <dl className="grid gap-3">{columns.map((column) => <div key={column.key}><dt className="text-xs font-medium text-muted-foreground">{column.label}</dt><dd className="mt-1 text-sm text-foreground">{column.render(row)}</dd></div>)}</dl>
      </article>)}
    </div>
  </>
}
```

Apply it to asset preview, cost exposure, depreciation, and cross-scope preview. Keep compact two-column count rows as lists, not nested cards. Use stable database IDs for row keys and `${index}:${label}` only for aggregate rows without IDs.

- [ ] **Step 4: Make operations summary cards actionable**

Create the four card definitions with literal filter values and map their links:

```ts
const dataQualityCards = [
  { key: "responsibility", dataQuality: "responsibility" as const, label: labels.missingCustodian, value: missingCustodian },
  { key: "serial", dataQuality: "serial" as const, label: labels.missingSerial, value: missingSerial },
  { key: "photo", dataQuality: "photo" as const, label: labels.missingPhoto, value: missingPhoto },
  { key: "warranty", dataQuality: "warranty" as const, label: labels.warrantyExpiring, value: warrantyExpiring },
].map((card) => ({
  ...card,
  href: `/${locale}/assets?${buildAssetQueryString(filters, { dataQuality: card.dataQuality, activity: "", page: 1 })}`,
}))

const idleAssetsHref = `/${locale}/assets?${buildAssetQueryString(filters, {
  activity: "idle_180d",
  dataQuality: "",
  page: 1,
})}`
```

These overrides preserve company/branch/category/status/condition/ownership/cross-scope filters while preventing incompatible quality/activity scopes from remaining hidden together.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test tests/reports-adaptive-ui.test.ts tests/report-table-key.test.ts tests/asset-activity-filter.test.ts tests/asset-list-query.test.ts`

Expected: PASS.

```powershell
git add src/components/reports/responsive-report-list.tsx src/components/reports/reports-overview-view.tsx src/components/reports/reports-accounting-view.tsx src/components/reports/reports-operations-view.tsx "src/app/[locale]/(dashboard)/reports/page.tsx" tests/reports-adaptive-ui.test.ts tests/report-table-key.test.ts
git commit -m "feat(reports): add adaptive report lists and drilldowns"
```

---

### Task 6: Clarify catalog scope, localize copy, and align loading skeleton

**Files:**
- Modify: `src/components/reports/reports-catalog-view.tsx`
- Modify: `src/components/reports/report-preset-controls.tsx`
- Modify: `src/lib/report-presets.ts`
- Modify: `src/components/ui/page-skeleton.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/report-presets.test.ts`
- Modify: `tests/loading-boundaries.test.ts`
- Create: `tests/reports-localization.test.ts`

**Interfaces:**
- Saved presets store the current asset filter query plus `view`; legacy saved queries without `view` continue to open Overview.
- Catalog separates local asset-filter presets from module-owned recurring exports and explicitly states that Maintenance, Disposal, and Audit exports do not inherit asset filters.
- `ReportsPageSkeleton` order is header, tabs, filter, two shared metrics, and one view-content placeholder.

- [ ] **Step 1: Write failing preset, localization, and skeleton tests**

Add to `tests/report-presets.test.ts`:

```ts
test("saved report links preserve a valid view and keep legacy queries compatible", () => {
  assert.equal(buildReportPresetHref("th", "view=operations&statusId=ready"), "/th/reports?view=operations&statusId=ready")
  assert.equal(buildReportPresetHref("th", "statusId=ready"), "/th/reports?statusId=ready")
})
```

Create `tests/reports-localization.test.ts` to parse both JSON files, assert identical `reportsPage` key sets, require `viewOverview`, `viewAccounting`, `viewOperations`, `viewCatalog`, `activeFilters`, `clearActiveFilter`, `catalogItems`, `assetPresetScopeHelp`, and `moduleExportScopeHelp`, and assert Thai values no longer equal `Cost Insight`, `Reports Ready`, `Finding PDF`, or `System Settings`.

Extend `tests/loading-boundaries.test.ts` by reading `ReportsPageSkeleton` and asserting source order `PageHeaderSkeleton` -> `data-report-tabs-skeleton` -> `FilterPanelSkeleton` -> `MetricGridSkeleton count={2}` -> `data-report-view-skeleton`.

- [ ] **Step 2: Run the three tests and verify RED**

Run: `node --test tests/report-presets.test.ts tests/reports-localization.test.ts tests/loading-boundaries.test.ts`

Expected: FAIL on missing view/copy keys and the old four-metric skeleton.

- [ ] **Step 3: Preserve view in new presets without breaking legacy storage**

Pass `currentQuery={buildReportQueryString(activeView, filters)}` to `ReportPresetControls`. Keep `normalizeReportPresetQuery` and `buildReportPresetHref` permissive for existing safe query strings; parsing on the destination already rejects invalid views and filters. Keep storage failures returning the empty preset list and validation feedback under `role="status"`.

- [ ] **Step 4: Separate Catalog scope and finish localization**

Render two titled subsections:

- `ชุดตัวกรองรายงานทรัพย์สินในอุปกรณ์นี้` / `Asset report filter presets on this device`, with the device-local explanation;
- `รายงานประจำแยกตามโมดูล` / `Recurring module exports`, with text stating Maintenance, Disposal, and Audit use their own module filters while Asset Overview uses the filters above.

Rename `reportsReady` to `catalogItems`, localize Cost/repair insight and mixed Thai terms, use established Thai terms with domain words in parentheses only where clarity improves, and keep English semantically equivalent.

- [ ] **Step 5: Align the route skeleton**

Replace the current Reports skeleton body with:

```tsx
<div aria-busy="true" className="mx-auto flex w-full max-w-7xl flex-col gap-5">
  <PageHeaderSkeleton />
  <div data-report-tabs-skeleton className="flex gap-2 overflow-hidden">{Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} className="h-11 w-32 shrink-0" />)}</div>
  <FilterPanelSkeleton />
  <MetricGridSkeleton count={2} />
  <div data-report-view-skeleton className="rounded-lg border border-border bg-surface p-5 shadow-sm">
    <SkeletonBlock className="h-5 w-44" />
    <SkeletonBlock className="mt-4 h-64 w-full" />
  </div>
</div>
```

- [ ] **Step 6: Run focused tests and commit**

Run: `node --test tests/report-presets.test.ts tests/reports-localization.test.ts tests/loading-boundaries.test.ts tests/page-loading-skeleton.test.ts`

Expected: PASS.

```powershell
git add src/components/reports/reports-catalog-view.tsx src/components/reports/report-preset-controls.tsx src/lib/report-presets.ts src/components/ui/page-skeleton.tsx messages/th.json messages/en.json tests/report-presets.test.ts tests/reports-localization.test.ts tests/loading-boundaries.test.ts
git commit -m "feat(reports): clarify catalog scope and loading states"
```

---

### Task 7: Complete verification, browser QA, and handoff documentation

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/11_FEATURE_LIST.md`
- Modify: `docs/99_CHANGELOG.md`

**Interfaces:**
- Documents the final four-view Reports contract, accurate drilldowns, performance labels, Adaptive UI behavior, and retained realistic-data/limited-role UAT gates.

- [ ] **Step 1: Run all focused Reports and shared-query tests**

Run:

```powershell
node --test tests/report-view.test.ts tests/report-active-filters.test.ts tests/asset-activity-filter.test.ts tests/asset-list-query.test.ts tests/report-presets.test.ts tests/report-table-key.test.ts tests/report-query-scope.test.ts tests/reports-adaptive-ui.test.ts tests/reports-localization.test.ts tests/performance-route-instrumentation.test.ts tests/loading-boundaries.test.ts tests/page-loading-skeleton.test.ts
```

Expected: all tests PASS.

- [ ] **Step 2: Run static verification before browser QA**

Run:

```powershell
npx eslint "src/app/[locale]/(dashboard)/reports/page.tsx" "src/app/[locale]/(dashboard)/assets/page.tsx" src/components/reports src/components/ui/page-skeleton.tsx src/lib/report-view.ts src/lib/report-active-filters.ts src/lib/asset-activity-filter.ts src/lib/asset-list-query.ts tests/report-view.test.ts tests/report-active-filters.test.ts tests/asset-activity-filter.test.ts tests/report-query-scope.test.ts tests/reports-adaptive-ui.test.ts tests/reports-localization.test.ts
npx tsc --noEmit
npm test
npm run build
git diff --check
```

Expected: ESLint exits 0, TypeScript exits 0, the complete test suite passes, the Next.js production build passes, and `git diff --check` prints no errors. Do not treat the known separate dependency-audit findings as part of this UI change.

- [ ] **Step 3: Run authenticated browser QA for every view**

At `/{locale}/reports`, verify `overview`, `accounting`, `operations`, and `catalog` at 375, 390, 414, 768, 1280, and 1440 pixels:

- exactly one dashboard `<main>` vertical scrollbar and no body/list/card horizontal overflow;
- the 375px Overview reaches its long breakdown content within approximately four to six visible viewport heights rather than recreating the prior fourteen-view-height page;
- tabs retain filters and current tab is visible/readable without color alone;
- filters precede metrics, active chips are removable, and clearing company also clears branch;
- mobile wide datasets render cards only, desktop renders semantic tables only, and all actions are at least 44px on mobile;
- export actions remain permission-aware and full-width where needed;
- Operations quality links open exact Asset Register filters, frequent repair values obey the selected asset filter, and idle opens `activity=idle_180d` with the same count semantics;
- local presets reopen the saved view/filter context on the same browser only;
- recurring cross-module exports display their non-inheritance explanation;
- console has no missing-message, hydration, duplicate-key, or runtime errors.

- [ ] **Step 4: Verify timing and role restrictions**

Temporarily enable `PERFORMANCE_TIMING=1` or `PERFORMANCE_LOGGING=1`, request each view once, and confirm each request emits `reports.shared-data` plus only its active view label. Disable the flag afterward. Repeat a smoke test with an `accounting` or permission-limited role and confirm unrelated admin actions and unauthorized exports remain unavailable.

- [ ] **Step 5: Run the Impeccable detector on changed UI files**

Run:

```powershell
node .agents/skills/impeccable/scripts/detect.mjs --json "src/app/[locale]/(dashboard)/reports/page.tsx" src/components/reports src/components/ui/page-skeleton.tsx
```

Expected: valid JSON with no new findings in the changed UI; fix any reported changed-file issue before continuing.

- [ ] **Step 6: Update handoff and release documentation**

Document:

- four URL-backed views and filter persistence in `docs/06_WORKFLOWS.md`;
- desktop/mobile/role/filter/preset/export/timing UAT cases in `docs/07_UAT_CHECKLIST.md`;
- the updated Reports capability in `docs/11_FEATURE_LIST.md`;
- implementation, verification evidence, and retained real-device/realistic-data gates in `DEVELOPER_HANDOFF.md`;
- one dated feature entry in `docs/99_CHANGELOG.md`.

Do not mark Production Readiness's realistic-data Reports/export gate complete unless it was actually executed with production-like data.

- [ ] **Step 7: Review and commit the completed implementation**

Run:

```powershell
git status --short
git diff --stat
git diff --check
git add DEVELOPER_HANDOFF.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md docs/99_CHANGELOG.md
git commit -m "docs(reports): hand off adaptive reporting workspace"
```

Expected: only the intended Reports/asset-filter/tests/docs files are changed and the documentation commit succeeds.
