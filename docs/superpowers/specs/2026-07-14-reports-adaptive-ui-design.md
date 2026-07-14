# Reports Adaptive UI Design

**Date:** 2026-07-14  
**Status:** Approved direction, pending written-spec review  
**Route:** `/{locale}/reports`

## Goal

Turn Reports from one long all-purpose page into an adaptive, task-focused reporting workspace without changing database schema, existing export endpoints, permissions, or accounting formulas.

The finished experience must:

- keep report filters visible near the top of every asset-report view;
- make the active filter context obvious wherever summary numbers are shown;
- correct report rows and drilldowns that currently ignore or lose the selected filter scope;
- reduce the amount of report data queried and rendered on each request;
- adapt structurally for desktop, tablet, and mobile instead of merely stacking the desktop page;
- preserve shareable URL state, browser-local presets, exports, RBAC, and Thai/English locales.

## Chosen Approach

Use four URL-backed views on the existing Reports route:

1. `overview` — headline asset metrics, preview, and core breakdowns.
2. `accounting` — cost exposure and depreciation/book-value reporting.
3. `operations` — data quality, cross-scope ownership, movement, custody, location, and repair insights.
4. `catalog` — saved asset filter presets, recurring exports, report catalog, and permission visibility.

The query parameter is `view`. Unknown or missing values fall back to `overview`. All supported asset filter parameters remain in the URL when the user changes views.

This approach was selected over accordions because accordions would keep the current query and DOM cost, and over separate routes because the four views share one filter contract, page identity, and export context.

## Information Architecture

The shared page shell is ordered as follows:

1. Page title and permission-aware primary exports.
2. Horizontally scrollable view navigation.
3. Report filter panel.
4. Active-filter summary with removable chips and a clear-all action.
5. Compact shared metrics: total assets and total purchase value.
6. Content for the active view only.

The existing `Reports Ready` metric becomes `Report catalog items` and moves into the Catalog view. It is a catalog inventory count, not a filtered KPI or a guarantee that every export is permitted.

### Overview

- Total assets and total purchase value remain the primary metrics.
- The latest matching assets appear as the export preview.
- Core breakdowns show status, category, company, branch, department, and ownership type.
- Tables and breakdowns use only the current asset filters.

### Accounting

- Cost Insight becomes the localized `Cost and repair insight` title.
- Cost exposure and depreciation summaries remain formula-compatible with current helpers.
- Only this view loads the unbounded filtered accounting dataset required by the existing in-memory calculations.
- Empty states explicitly mention the current filters.

### Operations

- Data-quality summary cards link to Asset Register with the correct `dataQuality` filter while preserving compatible report filters.
- Cross-scope summary cards and preview stay together.
- Actionable data-quality items, custodian/location breakdowns, frequent repairs, and idle assets live in this view.
- Frequent-repair grouping must constrain maintenance tickets through `asset: assetWhere`.
- The idle-assets drilldown must not link to an unfiltered asset list. Add the supported asset activity filter `activity=idle_180d`; Asset Register, report links, and asset export use the same query builder and `movements.none(performedAt >= 180 days ago)` condition.

### Catalog

- Browser-local asset filter presets and recurring module exports become separate subsections.
- Copy states that saved presets reopen the asset-report filters on this device.
- Copy states that Maintenance, Disposal, and Audit recurring exports use their own module scope and do not inherit the asset filters above.
- Asset Overview recurring export continues to use the current asset filter query.
- Catalog rows and permission details retain current RBAC checks and endpoints.

## Adaptive UI

### Desktop (`xl` and above)

- View tabs remain on one row.
- Filters use a three-column grid.
- Shared metrics use two compact columns, leaving more vertical room for the selected report.
- Tables remain semantic HTML tables with horizontal overflow only where needed.
- Operations uses balanced two- and four-column layouts for actionable summaries.

### Tablet (`md` to `xl`)

- View tabs scroll horizontally without wrapping into multiple rows.
- Filters use two columns.
- Summary cards use two columns.
- Wide tables retain explicit horizontal scrolling and readable minimum column widths.

### Mobile (below `md`)

- View navigation is a horizontal snap strip with the active view scrolled into view.
- Header exports remain full-width, permission-aware buttons.
- Filters appear before report metrics and use one column.
- Active-filter chips remain visible and removable without reopening the form.
- Shared metrics use compact two-column cards where values fit; a long currency value may span the full row.
- Repeated label/count breakdowns use compact list rows rather than large nested cards.
- Data tables with more than four meaningful columns render a mobile card list with the same links and values; the desktop semantic table is hidden below `md` and the mobile list is hidden at `md` and above.
- Touch targets remain at least 44px. The page must not depend on hover.
- Bottom navigation and mobile sidebar behavior remain unchanged.

The target is to reduce the initial mobile Overview from roughly fourteen viewport heights to a task-focused view of approximately four to six viewport heights before pagination or long breakdown content.

## Components And Boundaries

### New shared report modules

- `src/lib/report-view.ts`
  - owns the view enum, safe parser, and view-preserving report URLs;
  - has no React or database dependency.
- `src/lib/report-active-filters.ts`
  - converts parsed filters and selected lookup labels into removable chip descriptors;
  - preserves `view` and clears dependent branch state when company is removed.
- `src/components/reports/report-view-tabs.tsx`
  - renders accessible, URL-backed view navigation;
  - uses the existing action/tab visual vocabulary.
- `src/components/reports/report-active-filters.tsx`
  - renders the chip summary by reusing the Asset Register interaction pattern.
- `src/components/reports/responsive-report-list.tsx`
  - owns desktop table/mobile card switching for report datasets that need both presentations.

### Reports page

`reports/page.tsx` remains the server entry point, permission boundary, and data orchestrator. View-specific presentation is extracted into focused server components under `src/components/reports/`. Those components receive precomputed report data and do not query the database.

The refactor must not create a client-side dashboard data layer. URL navigation remains authoritative and server-rendered.

## Data Flow And Query Scope

1. Parse `view` and existing asset filters from `searchParams`.
2. Build `assetWhere` once.
3. Load shared filter options plus two shared metrics through `reports.shared-data`.
4. Load one view-specific query group through `withPerformanceTiming`:
   - `reports.overview-data`
   - `reports.accounting-data`
   - `reports.operations-data`
   - `reports.catalog-data`
5. Render only the active view.
6. Preserve `view` and filters in tab, chip, preset, and export links where the destination supports them.

Replace the old three report timing groups with `reports.shared-data` and the four view-specific labels above, then update the instrumentation tests in the same change. No query may silently cap a summary that is presented as complete.

## Correctness Rules

- Every metric labelled as affected by current filters uses `assetWhere` or an explicitly documented compatible scope.
- Frequent repairs query maintenance tickets with `asset: assetWhere`.
- Idle count and idle drilldown use the same 180-day boundary helper and query semantics.
- Removing the company chip also clears branch to prevent an incompatible hidden branch filter.
- Export links include only filters supported by their endpoint.
- Recurring cross-module exports never imply that asset filters apply.
- Unknown `view`, `activity`, or saved query values fall back safely and do not broaden permissions.
- No schema migration is required.

## Copy And Localization

Thai Reports copy should prefer clear Thai while retaining necessary product terms in parentheses where useful:

- `Cost Insight` → `ข้อมูลเชิงลึกด้านต้นทุนและค่าซ่อม`.
- `Reports Ready` → `รายการในคลังรายงาน`.
- Search placeholder → `ค้นหารหัสทรัพย์สิน หมายเลขเครื่อง ชื่อ หรือผู้ถือครอง...`.
- Replace mixed `Export`, `Finding`, `Audit`, and `System Settings` wording in this page with the established Thai action or a Thai term followed by the domain term when ambiguity would otherwise increase.

English messages remain complete and equivalent.

## Loading, Empty, And Error States

- `ReportsPageSkeleton` must match the stable real order: header, view tabs, filter panel, two compact metrics, then one view-specific content skeleton. The conditional active-filter strip does not reserve skeleton space when no filter context is available to `loading.tsx`.
- Skeleton layouts adapt to the same breakpoints as the real page.
- Empty states explain whether no assets match the filters or the selected dataset has no activity.
- Existing route-level error and access-denied behavior remains unchanged.
- Browser-local preset storage failures continue to degrade to an empty preset list; save validation remains announced with `role=status`.

## Accessibility

- View navigation exposes a named navigation landmark and current-page state.
- Filter labels remain explicitly associated through wrapping labels or IDs.
- Active-filter removal links include the full filter label in their accessible name.
- Desktop tables retain headers and reading order.
- Mobile cards retain the same data labels instead of relying on column position.
- Focus indicators, keyboard navigation, and 44px mobile targets use existing design-system patterns.
- Color is not the only indicator of the active view or removable filter.

## Testing

### Pure behavior tests

- Safe parsing and URL generation for all report views.
- Active-filter descriptor generation, dependent company/branch clearing, and view preservation.
- `activity=idle_180d` parsing, query building, and query-string preservation.

### Source-contract tests

- Filter and active-filter summary render before view content.
- Frequent-repair grouping includes `asset: assetWhere`.
- Idle drilldown includes `activity=idle_180d`.
- Recurring module exports display the non-inheritance explanation.
- Thai and English message keys are complete.
- Skeleton order and metric count match the adaptive shell.

### Verification

- Focused Node tests, full `npm test`, ESLint, TypeScript, and production build.
- Chrome smoke test at desktop and 375px mobile for every view.
- Verify active-filter chips, tab URL preservation, filter application, data-quality drilldowns, accurate idle drilldown, local preset reopening, horizontal overflow, and absence of console errors.
- Run the Impeccable detector on changed UI files.

## Non-Goals

- No new chart library or decorative visualization.
- No database schema or migration.
- No changes to accounting formulas, maintenance lifecycle, audit workflow, disposal workflow, or RBAC definitions.
- No server-synced report presets or scheduled report delivery.
- No redesign of the global app shell, sidebar, or mobile bottom navigation.

## Rollout And Compatibility

- Bare `/reports` remains valid and opens `overview`.
- Existing saved preset URLs remain valid because unknown/missing `view` falls back to Overview.
- Existing export URLs and permissions remain unchanged.
- The new activity filter is additive and ignored safely when absent.
- Rollback is a code revert; no database rollback is needed.
