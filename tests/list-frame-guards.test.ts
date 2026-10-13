import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import test from "node:test"
import {
  budgetOverruns,
  countByFile,
  countMatchesByFile,
  findJsxTags,
  hasJsxAttr,
  jsxAttrValue,
  readSourceFiles,
  type SourceFile,
} from "./helpers/source-files.ts"

// Phase 2B list-frame guards (spec 2B §9.3, rulings I11, I14 and I15). BUDGETS start at the d38a0ee counts
// (spec §10.4 table C) and only go down: the commit that moves a site lowers that file's rows, deleting rows that
// reach 0, and adds the file to MIGRATED_LIST_FILES once 2B is done with it. A file missing from a budget may have
// none; a listed file may have at most its number. Never raise a number. Phase 2B plan 5 sets BUDGETS to KEEP;
// phase 2D widens the guards to all of src and sets every budget to {}. 2C never needs to edit this file.
const sources = readSourceFiles("src")
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
// Screen code: pages and components. src/lib and the API routes are out (R-n keeps "-" there).
const offScreen = (path: string) => !(path.startsWith("src/app/") || path.startsWith(C)) || path.startsWith("src/app/api/")
const skip = (...owners: string[]) => (path: string) => offScreen(path) || owners.includes(path)
const skipUi = (path: string) => offScreen(path) || path.startsWith(`${C}ui/`)
const NAV_PRIMITIVES = ["ui/tab-nav.tsx", "ui/breadcrumbs.tsx", "ui/pagination.tsx", "ui/steps.tsx", "ui/stat-strip.tsx", "layout/sidebar.tsx", "layout/mobile-field-navigation.tsx"].map((path) => C + path)
const tagsWhere = (names: string[], keep: (text: string) => boolean) => (file: SourceFile) => findJsxTags(file.source, names).filter((tag) => keep(tag.text)).length

// Files 2B is done with, in commit order. The commit that finishes a file adds its line and lowers its rows; never remove one.
const MIGRATED_LIST_FILES: string[] = [
  `${D}master-data/branches/page.tsx`,
  `${D}master-data/brands/page.tsx`,
  `${D}master-data/categories/page.tsx`,
  `${D}master-data/companies/page.tsx`,
  `${D}master-data/departments/page.tsx`,
  `${D}master-data/employees/page.tsx`,
  `${D}master-data/locations/page.tsx`,
  `${D}master-data/suppliers/page.tsx`,
  `${C}master-data/supplier-list-view.tsx`,
  `${D}admin/users/page.tsx`,
  `${C}master-data/asset-model-form.tsx`,
  `${C}master-data/branch-form.tsx`,
  `${C}master-data/brand-form.tsx`,
  `${C}master-data/category-form.tsx`,
  `${C}master-data/company-form.tsx`,
  `${C}master-data/department-form.tsx`,
  `${C}master-data/employee-form.tsx`,
  `${C}master-data/location-form.tsx`,
  `${C}master-data/supplier-form.tsx`,
  `${C}admin/admin-user-form.tsx`,
  `${C}assets/asset-form.tsx`,
  `${C}assets/asset-component-manager.tsx`,
  `${D}disposal/new/page.tsx`,
  `${D}disposal/batch/new/page.tsx`,
  `${D}maintenance/new/page.tsx`,
  `${D}maintenance/pm/new/page.tsx`,
  `${D}maintenance/pm/[id]/edit/page.tsx`,
  `${C}asset-operations/checkin-form.tsx`,
  `${C}asset-operations/checkout-form.tsx`,
  `${C}asset-operations/transfer-form.tsx`,
  `${C}asset-operations/bulk-move-form.tsx`,
  `${C}audit/audit-round-form.tsx`,
  `${C}admin/system-settings-form.tsx`,
  `${C}assets/asset-batch-form.tsx`,
  `${C}admin/depreciation-policy-builder.tsx`,
  `${C}disposal/disposal-bulk-approval.tsx`,
  `${C}disposal/disposal-bulk-execution.tsx`,
  `${D}disposal/page.tsx`,
  `${D}disposal/batches/page.tsx`,
  `${D}disposal/batches/[id]/page.tsx`,
  `${C}audit/audit-findings-batch-actions.tsx`,
  `${C}audit/audit-finding-review-actions.tsx`,
  `${D}audit/findings/page.tsx`,
  `${D}audit/rounds/page.tsx`,
  `${D}audit/rounds/[id]/page.tsx`,
  `${D}audit/rounds/[id]/pending/page.tsx`,
  `${D}maintenance/page.tsx`,
  `${D}maintenance/pm/page.tsx`,
  `${D}admin/data-quality/page.tsx`,
  `${C}admin/asset-state-review-workspace.tsx`,
  `${D}admin/integrations/page.tsx`,
  `${C}assets/asset-register-row-actions.tsx`,
  `${C}assets/asset-register-table.tsx`,
  `${C}assets/asset-register-mobile-list.tsx`,
  `${C}assets/asset-register-toolbar.tsx`,
  `${C}assets/asset-register-search-field.tsx`,
  `${C}assets/asset-register-filter-sheet.tsx`,
  `${C}assets/asset-register-status-tabs.tsx`,
  `${C}assets/asset-register-filter-chips.tsx`,
  `${C}assets/asset-register-sort-menu.tsx`,
  `${C}assets/asset-register-column-picker.tsx`,
  `${C}assets/asset-register-export-menu.tsx`,
  `${D}assets/page.tsx`,
]

// A function named …Pagination that does not render <Pagination>: a thin wrapper that only builds hrefs is fine.
function handPaginations(file: SourceFile): number {
  let count = 0
  for (const match of file.source.matchAll(/\bfunction [A-Z]\w*Pagination\b/g)) {
    const rest = file.source.slice(match.index + "function ".length)
    const next = rest.search(/\n(?:export )?(?:async )?function |\nconst [A-Z]/)
    if (!/<Pagination(?=[\s/>])/.test(next === -1 ? rest : rest.slice(0, next))) count++
  }
  return count
}
// A disabled look made of opacity: the line has opacity-N and pointer-events-none or cursor-not-allowed, none behind a variant (disabled:, hover:).
const fadedDisabled = (line: string) => /(?<![\w:-])opacity-\d+\b/.test(line) && /(?<![\w:-])(?:pointer-events-none|cursor-not-allowed)\b/.test(line)

const HEADER_OWNER = `${C}ui/page-header.tsx`
const OLD_HEADER = /\bMasterDataHeader\b|\bReportHeader\b|\bfunction PageHeader\b/g
const BACK_ICON = /<ArrowLeft\b/g
const DOUBLE_BOTTOM_PADDING = /\bpb-(?:24|36)\b/g
const LOCAL_FILTER_SELECT = /\bfunction (?:FilterSelect|ReportSelect|LabeledSelect)\b|\bfunction Filter\(/g
const HEADER_LOOK = /\bbg-(?:muted|accent)(?![\w/-])|\buppercase\b/ // the /NN fills belong to VFG R7
const LOCAL_SORT_HEADER = /\bfunction (?:[A-Z]\w*)?Sort\w*Header\b/g
const BARE_LOCALE_STRING = /\.toLocaleString\(\)/g
const RAW_DASH = /(?:\|\||\?\?|:)\s*"-"/g
const FORMAT_CURRENCY = /(?<!function )\bformatCurrency\(/g
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")

const COUNTERS: Record<string, () => Record<string, number>> = {
  LH1: () => countByFile(sources, tagsWhere(["h1"], () => true), skip(HEADER_OWNER)),
  LH2: () => countMatchesByFile(sources, OLD_HEADER, skip(HEADER_OWNER)),
  LB1: () => countMatchesByFile(sources, BACK_ICON, skip(HEADER_OWNER)),
  LP1: () => countMatchesByFile(sources, DOUBLE_BOTTOM_PADDING, (path) => !path.startsWith(D)),
  LF1: () => countMatchesByFile(sources, LOCAL_FILTER_SELECT, skipUi),
  LT1: () => countByFile(sources, tagsWhere(["thead", "th"], (text) => HEADER_LOOK.test(text)), offScreen),
  LT2: () => countMatchesByFile(sources, LOCAL_SORT_HEADER, skip(`${C}ui/data-table.tsx`)),
  LT3: () => countByFile(sources, (file) => findJsxTags(file.source, ["td"]).filter((tag) => hasJsxAttr(tag.text, "colSpan")).length, skip(`${C}ui/data-table.tsx`)),
  LT4: () => countByFile(sources, handPaginations, skip(`${C}ui/pagination.tsx`)),
  LT5: () => countByFile(sources, (file) => file.source.split("\n").filter(fadedDisabled).length, offScreen),
  LV1: () => countMatchesByFile(sources, BARE_LOCALE_STRING, offScreen),
  LV2: () => countMatchesByFile(sources, RAW_DASH, offScreen),
  LV3: () => countMatchesByFile(sources, FORMAT_CURRENCY, offScreen),
  LS1: () => countMatchesByFile(sources, LOCAL_STAT_TILE, skipUi),
  LS2: () => countMatchesByFile(sources, METRIC_CARD_TAG, offScreen),
  LK1: () => countMatchesByFile(sources, LOCAL_KEY_VALUE, skipUi),
  LN1: () => countByFile(sources, tagsWhere(["[A-Za-z][\\w.]*"], pageCurrent), (path) => offScreen(path) || NAV_PRIMITIVES.includes(path)),
  LN2: () => countMatchesByFile(sources, UI_NAME, skipUi),
  LR1: () => countMatchesByFile(sources, ROW_DELETE_BUTTON, offScreen),
}

const TITLES: Record<string, string> = {
  LH1: "page titles (<h1>) come from PageHeader",
  LH2: "MasterDataHeader, ReportHeader and local PageHeader functions give way to PageHeader",
  LB1: "page back buttons go through PageBackLink, not a hand-placed ArrowLeft",
  LP1: "pages under the shell do not add pb-24 or pb-36 on top of the shell's bottom space",
  LF1: "list filters use the shared FilterSelect, not a local select helper",
  LT1: "table headers have no solid muted or accent fill and no capitals",
  LT2: "sortable column headers come from DataTableHead with aria-sort, not a local helper",
  LT3: "empty table rows are TableEmptyRow, not a hand-written <td colSpan>",
  LT4: "page links come from Pagination, not a local …Pagination that draws its own",
  LT5: "nothing looks disabled through opacity with pointer-events-none or cursor-not-allowed",
  LV1: "numbers on screen go through formatCount or formatMoney, not a bare toLocaleString()",
  LV2: "empty values on screen are Nil or orNil, not a typed \"-\"",
  LV3: "money on screen goes through formatMoney, not formatCurrency",
  LS1: "number tiles come from StatStrip, not a local tile function",
  LS2: "MetricCard gives way to StatStrip",
  LK1: "detail values come from KeyValueList, not a local Info or DetailItem helper",
  LN1: "aria-current=\"page\" is set by TabNav, StatStrip, Pagination and the menus, not by hand",
  LN2: "no local function takes the name of a shared component",
  LR1: "delete buttons in table rows move into the ⋯ menu of RowActions",
}

// ---- Budgets at d38a0ee (spec §10.4 table C, per file as spec §9.4.1–9.4.2). Groups name the first 2B plan that
// edits the file (spec §8.5–8.9, I12); "→ n (KEEP)" = what stays after 2B, and why. The LB1 rows marked 0 → 1 are the
// only two rows above the d38a0ee count (spec §9.4.1 note "LB1 0→1").
const BUDGETS: Record<string, Record<string, number>> = {
  LH1: {
    // 2B-3
    [`${D}asset-management/import-export/page.tsx`]: 1,
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1,
    [`${D}disposal/[id]/page.tsx`]: 1,
    [`${D}maintenance/[id]/page.tsx`]: 1,
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${D}my-assets/[id]/page.tsx`]: 1,
    // 2B-5
    [`${D}admin/approvals/history/page.tsx`]: 1,
    [`${D}admin/approvals/page.tsx`]: 1,
    [`${D}admin/logs/page.tsx`]: 1,
    [`${D}admin/readiness/page.tsx`]: 1,
    [`${D}admin/roles/page.tsx`]: 1,
    [`${D}admin/settings/page.tsx`]: 1,
    [`${D}admin/storage/page.tsx`]: 1,
    [`${D}dashboard/page.tsx`]: 1,
    [`${D}my-assets/page.tsx`]: 1,
    [`${D}notifications/page.tsx`]: 1,
    [`${D}work-center/page.tsx`]: 1,
    [`${C}reports/report-header.tsx`]: 1,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    "src/app/[locale]/(auth)/login/page.tsx": 1, // → 1 (KEEP): no shell (phase 3, with the login frame)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // → 1 (KEEP): 2C plan 4 moves it onto PageHeader (I13)
    [`${C}assets/asset-label-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}assets/asset-scan-search-tool.tsx`]: 1, // → 1 (KEEP): 2C plan 4 moves it onto PageHeader (I13)
    [`${C}audit/audit-scan-header.tsx`]: 1, // → 1 (KEEP): field scan header, its own variant
  },
  LH2: {
    // 2B-1
    [`${C}master-data/master-data-layout.tsx`]: 1, // 2B-5 deletes MasterDataHeader (R-h)
    // 2B-5
    [`${D}my-assets/page.tsx`]: 1, // local PageHeader :163-170 (I14)
    [`${D}reports/page.tsx`]: 2,
    [`${C}reports/report-header.tsx`]: 1,
  },
  LB1: {
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the move-out button :1412, not a page back
    // 2B-2
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :479 for ArrowLeft
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1,
    [`${D}disposal/[id]/page.tsx`]: 1,
    [`${D}maintenance/[id]/page.tsx`]: 1, // 0 → 1: 2B-4 swaps the Wrench icon of the bar's back item :147 for ArrowLeft
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${D}my-assets/[id]/page.tsx`]: 1,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}assets/asset-label-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // → 1 (KEEP): field scan header
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // → 1 (KEEP): back to editing in the review step :93 (2C)
  },
  LP1: {
    // 2B-2
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    [`${D}disposal/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    [`${D}maintenance/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${D}my-assets/[id]/page.tsx`]: 1,
  },
  LF1: {
    // 2B-5
    [`${C}reports/report-filter-panel.tsx`]: 1,
  },
  LT1: {
    // 2B-1
    [`${C}admin/role-permission-form.tsx`]: 2, // → 2 (KEEP): 2C batch 4 (R-e)
    [`${C}master-data/master-data-layout.tsx`]: 2, // 2B-5 deletes ColumnHeader and SortableColumnHeader (R-h)
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 10,
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    // 2B-5
    [`${D}admin/logs/page.tsx`]: 1,
    [`${D}admin/storage/page.tsx`]: 11,
    [`${D}my-assets/page.tsx`]: 1,
    [`${C}reports/responsive-report-list.tsx`]: 1,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-import-preview-panel.tsx`]: 5, // → 5 (KEEP): 2C batch 4 (R-e, O13)
  },
  LT2: {
    // 2B-1
    [`${C}master-data/master-data-layout.tsx`]: 1, // 2B-5 deletes SortableColumnHeader (R-h)
  },
  LT3: {
    // 2B-5
    [`${D}admin/storage/page.tsx`]: 2,
  },
  LT4: {
    // 2B-1
    [`${C}master-data/master-data-layout.tsx`]: 1, // 2B-5 deletes MasterDataPagination (R-h)
  },
  LT5: {
    // 2B-1
    [`${C}master-data/master-data-layout.tsx`]: 2, // 2B-5 deletes MasterDataPagination (R-h)
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1,
  },
  LV1: {
    // 2B-4
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${C}master-data/supplier-purchase-documents.tsx`]: 2,
    // 2B-5
    [`${D}admin/storage/page.tsx`]: 7,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}admin/IntegrationClientManager.tsx`]: 3, // → 3 (KEEP): R-f, 2C plan 4
    [`${C}assets/asset-import-preview-panel.tsx`]: 4, // → 4 (KEEP): R-f, 2C plan 4
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // → 1 (KEEP): R-f, 2C plan 4
  },
  LV2: {
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 8, // → 8 (KEEP): 2C form (2D)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // → 8 (KEEP): 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
    [`${C}assets/asset-form.tsx`]: 1, // → 1 (KEEP): 2C form (2D)
    // 2B-2
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 15, // → 4 (KEEP): translated-sentence arguments :1198, :1200 and the history sentence :2462 (R-n)
    [`${D}disposal/[id]/page.tsx`]: 2,
    [`${D}maintenance/[id]/page.tsx`]: 2,
    [`${D}master-data/employees/[id]/page.tsx`]: 5,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${D}my-assets/[id]/page.tsx`]: 1,
    [`${C}master-data/supplier-purchase-documents.tsx`]: 2,
    // 2B-5
    [`${D}admin/approvals/page.tsx`]: 1,
    [`${D}admin/roles/page.tsx`]: 1,
    [`${D}admin/storage/page.tsx`]: 1,
    [`${D}my-assets/page.tsx`]: 2,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${D}asset-management/labels/page.tsx`]: 4, // → 4 (KEEP): label data (R-n)
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx": 2, // → 2 (KEEP): print page (R-n)
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4, // → 4 (KEEP): print page (R-n)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // → 3 (KEEP): 2D
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // → 2 (KEEP): 2C batch 4 (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // → 6 (KEEP): label data (R-n)
    [`${C}assets/asset-movement-timeline.tsx`]: 2, // → 2 (KEEP): 2D
    [`${C}assets/asset-purchase-documents.tsx`]: 1, // → 1 (KEEP): 2D
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // → 3 (KEEP): translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // → 1 (KEEP): translated sentence (R-n)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
  },
  LV3: {
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 3,
    [`${D}disposal/[id]/page.tsx`]: 5,
    [`${D}maintenance/[id]/page.tsx`]: 5,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 4,
    [`${C}master-data/supplier-purchase-documents.tsx`]: 2,
    // 2B-5
    [`${D}reports/page.tsx`]: 1,
    [`${C}reports/reports-accounting-view.tsx`]: 9,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // → 5 (KEEP): print page, 2D (A/08:305)
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // → 1 (KEEP): print page, 2D (A/08:305)
  },
  LS1: {
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): Metric :2413 (2D)
    // 2B-2
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // → 1 (KEEP): Metric :572 in the dialog (2C plan 3)
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1,
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    // 2B-5
    [`${D}admin/approvals/history/page.tsx`]: 1,
    [`${D}admin/approvals/page.tsx`]: 1,
    [`${D}admin/readiness/page.tsx`]: 1,
    [`${D}admin/roles/page.tsx`]: 1,
    [`${D}admin/storage/page.tsx`]: 1,
    [`${D}my-assets/page.tsx`]: 1,
    [`${D}notifications/page.tsx`]: 1,
    [`${D}work-center/page.tsx`]: 2,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}admin/IntegrationClientManager.tsx`]: 2, // → 2 (KEEP): OperationMetric :763, SummaryCard :782 (2C plan 4)
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // → 1 (KEEP): SummaryPill :461 (2C plan 4)
  },
  LS2: {
    // 2B-4
    [`${D}master-data/suppliers/[id]/page.tsx`]: 5,
    // 2B-5
    [`${D}reports/page.tsx`]: 2,
    [`${D}work-center/page.tsx`]: 1,
    [`${C}reports/reports-accounting-view.tsx`]: 10,
    [`${C}reports/reports-catalog-view.tsx`]: 1,
    [`${C}reports/reports-operations-view.tsx`]: 1,
  },
  LK1: {
    // 2B-3
    [`${D}asset-management/import-export/page.tsx`]: 1,
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1,
    [`${D}disposal/[id]/page.tsx`]: 1,
    [`${D}maintenance/[id]/page.tsx`]: 1,
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${D}my-assets/[id]/page.tsx`]: 1,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-movement-timeline.tsx`]: 1, // → 1 (KEEP): Info :133, not in a 2B plan (2D)
  },
  LN1: {
    // 2B-1
    [`${D}master-data/brands/page.tsx`]: 2, // → 2 (KEEP): the brand picker is a vertical list, where aria-current="page" is right (I11)
    // 2B-4
    [`${C}assets/asset-detail-tabs.tsx`]: 1,
    // 2B-5
    [`${D}work-center/page.tsx`]: 1,
    [`${C}reports/report-view-tabs.tsx`]: 1,
  },
  LN2: {
    // 2B-1
    [`${C}master-data/master-data-layout.tsx`]: 1, // 2B-5 deletes ColumnHeader (R-h)
    // 2B-4
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    // 2B-5
    [`${D}my-assets/page.tsx`]: 1, // local PageHeader :163-170 (I14)
    [`${D}notifications/page.tsx`]: 1,
    [`${D}work-center/page.tsx`]: 1,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}admin/IntegrationClientManager.tsx`]: 1, // → 1 (KEEP): local StatusBadge :797 (2C plan 4)
  },
  LR1: {
  },
}

// What may stay after phase 2B, with the reason (spec §9.4.3, I11, I14). L0 holds every file of MIGRATED_LIST_FILES
// to these numbers. 2C plan 4 or 2D empties the rest; phase 2D sets every budget to {}. Change a row only with a spec ruling.
const KEEP: Record<string, Record<string, number>> = {
  LH1: {
    "src/app/[locale]/(auth)/login/page.tsx": 1, // no shell (phase 3, with the login frame)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page
    [`${C}assets/asset-label-print.tsx`]: 1, // print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header, its own variant
    [`${C}assets/asset-scan-search-tool.tsx`]: 1, // 2C plan 4 moves it onto PageHeader (I13)
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // 2C plan 4 moves it onto PageHeader (I13)
  },
  LB1: {
    [`${C}admin/system-settings-form.tsx`]: 1, // the move-out button :1412, not a page back
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // back to editing in the review step :93 (2C)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page
    [`${C}assets/asset-label-print.tsx`]: 1, // print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the mobile action bar (O11 owns the bar)
    [`${D}maintenance/[id]/page.tsx`]: 1, // back item of the mobile action bar (O11 owns the bar)
  },
  LP1: {
    [`${D}assets/[id]/page.tsx`]: 1, // O11, 2C plan 5
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // O11, 2C plan 5
    [`${D}maintenance/[id]/page.tsx`]: 1, // O11, 2C plan 5
    [`${D}disposal/[id]/page.tsx`]: 1, // O11, 2C plan 5
  },
  LT1: {
    [`${C}admin/role-permission-form.tsx`]: 2, // 2C batch 4 (R-e)
    [`${C}assets/asset-import-preview-panel.tsx`]: 5, // 2C batch 4 (R-e, O13)
  },
  LV1: {
    [`${C}admin/IntegrationClientManager.tsx`]: 3, // R-f, 2C plan 4
    [`${C}assets/asset-import-preview-panel.tsx`]: 4, // R-f, 2C plan 4
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // R-f, 2C plan 4
  },
  LV2: {
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1198, :1200 and the history sentence :2462 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 8, // 2C form (2D)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // 2C form (2D)
    [`${C}assets/asset-form.tsx`]: 1, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // 2C batch 4 (2D)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // 2C form (2D)
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // translated sentence (R-n)
    [`${D}asset-management/labels/page.tsx`]: 4, // label data (R-n)
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx": 2, // print page (R-n)
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4, // print page (R-n)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // 2D
    [`${C}assets/asset-movement-timeline.tsx`]: 2, // 2D
    [`${C}assets/asset-purchase-documents.tsx`]: 1, // 2D
  },
  LV3: {
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // print page, 2D (A/08:305)
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // print page, 2D (A/08:305)
  },
  LS1: {
    [`${C}admin/IntegrationClientManager.tsx`]: 2, // OperationMetric :763, SummaryCard :782 (2C plan 4)
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // SummaryPill :461 (2C plan 4)
    [`${C}admin/system-settings-form.tsx`]: 1, // Metric :2413 (2D)
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :572 in the dialog (2C plan 3)
  },
  LK1: {
    [`${C}assets/asset-movement-timeline.tsx`]: 1, // Info :133, not in a 2B plan (2D)
  },
  LN1: {
    [`${D}master-data/brands/page.tsx`]: 2, // the brand picker is a vertical list, where aria-current="page" is right (I11)
  },
  LN2: {
    [`${C}admin/IntegrationClientManager.tsx`]: 1, // local StatusBadge :797 (2C plan 4)
  },
}

test("the list-frame counters read JSX and lines as intended", () => {
  const file = (source: string): SourceFile => ({ path: "src/components/x.tsx", source })
  assert.equal(tagsWhere(["h1"], () => true)(file('// <h1>old</h1>\n<h1 className="x">a</h1>')), 1)
  assert.equal(handPaginations(file("function APagination() {\n  return <Pagination page={1} />\n}\nfunction BPagination() {\n  return <nav />\n}")), 1)
  assert.equal(fadedDisabled('className="pointer-events-none opacity-50"'), true)
  assert.equal(fadedDisabled('className="disabled:pointer-events-none disabled:opacity-50"'), false)
  const current = tagsWhere(["[A-Za-z][\\w.]*"], pageCurrent)
  assert.equal(current(file('<Link aria-current={active ? "page" : undefined} /><li aria-current={on ? "step" : undefined} />')), 1)
  assert.equal(tagsWhere(["thead", "th"], (text) => HEADER_LOOK.test(text))(file('<thead className="bg-muted/40"><th className="uppercase">')), 1)
  assert.deepEqual(countMatchesByFile([file('{a || "-"} {b ?? "-"} {c ? d : "-"} {"a-b"} "x-y"')], RAW_DASH), { "src/components/x.tsx": 3 })
  assert.deepEqual(countMatchesByFile([file("export function formatCurrency(value) {}\nformatCurrency(1)")], FORMAT_CURRENCY), { "src/components/x.tsx": 1 })
  assert.deepEqual(countMatchesByFile([file('<BranchDeleteButton id={row.id} /><DeleteButtonGroup id="x" />')], ROW_DELETE_BUTTON), { "src/components/x.tsx": 1 })
  assert.equal(offScreen("src/app/api/assets/route.ts"), true)
  assert.equal(offScreen("src/lib/utils.ts"), true)
  assert.equal(offScreen(`${D}assets/page.tsx`), false)
})

for (const [id, title] of Object.entries(TITLES)) {
  test(`${id} ${title}`, () => {
    const counts = COUNTERS[id]()
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    assert.deepEqual(
      budgetOverruns(counts, BUDGETS[id] ?? {}),
      [],
      `${id}: ${total} in ${Object.keys(counts).length} files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.`,
    )
  })
}

test("L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file and a known guard", () => {
  const problems: string[] = []
  const ids = Object.keys(COUNTERS)
  if (Object.keys(TITLES).join() !== ids.join()) problems.push(`TITLES and COUNTERS name different guards: ${Object.keys(TITLES).join()} / ${ids.join()}`)
  for (const [name, table] of [["BUDGETS", BUDGETS], ["KEEP", KEEP]] as const) {
    for (const [id, rows] of Object.entries(table)) {
      if (!ids.includes(id)) problems.push(`${name}.${id}: no such guard`)
      for (const path of Object.keys(rows)) if (!existsSync(path)) problems.push(`${name}.${id}: ${path} is no such file, delete the row`)
    }
  }
  for (const path of MIGRATED_LIST_FILES) {
    if (!existsSync(path)) problems.push(`MIGRATED_LIST_FILES: ${path} is no such file`)
    if (MIGRATED_LIST_FILES.indexOf(path) !== MIGRATED_LIST_FILES.lastIndexOf(path)) problems.push(`MIGRATED_LIST_FILES: ${path} is listed twice`)
  }
  for (const [id, count] of Object.entries(COUNTERS)) {
    const counts = count()
    for (const path of MIGRATED_LIST_FILES) {
      const keep = KEEP[id]?.[path] ?? 0
      if ((counts[path] ?? 0) > keep) problems.push(`${id} ${path}: ${counts[path]} > ${keep}`)
      if ((BUDGETS[id]?.[path] ?? 0) > keep) problems.push(`${id} ${path}: the BUDGETS row ${BUDGETS[id][path]} must come down to KEEP ${keep}`)
    }
  }
  assert.deepEqual(problems, [])
})
