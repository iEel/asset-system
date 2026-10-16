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

// Phase 2B list-frame guards (spec 2B §9.3, rulings I11, I14 and I15). BUDGETS started at the d38a0ee counts
// (spec §10.4 table C) and only went down: the commit that moved a site lowered that file's rows, deleting rows that
// reached 0, and added the file to MIGRATED_LIST_FILES once 2B was done with it. A file missing from a budget may have
// none; a listed file may have at most its number. Never raise a number. Since phase 2B plan 5, BUDGETS equals KEEP
// (test L9); phase 2D widens the guards to all of src and sets every budget to {}. 2C never needs to edit this file.
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
  `${D}asset-management/import-export/page.tsx`,
  `${D}assets/[id]/page.tsx`,
  `${C}assets/asset-detail-tabs.tsx`,
  `${D}maintenance/[id]/page.tsx`,
  `${D}disposal/[id]/page.tsx`,
  `${D}master-data/employees/[id]/page.tsx`,
  `${D}master-data/suppliers/[id]/page.tsx`,
  `${C}master-data/supplier-purchase-documents.tsx`,
  `${D}my-assets/[id]/page.tsx`,
  `${D}loading.tsx`,
  `${D}assets/loading.tsx`,
  `${D}assets/[id]/loading.tsx`,
  `${D}dashboard/loading.tsx`,
  `${D}reports/loading.tsx`,
  `${D}admin/roles/page.tsx`,
  `${D}admin/logs/page.tsx`,
  `${D}admin/storage/page.tsx`,
  `${D}admin/approvals/page.tsx`,
  `${D}admin/approvals/history/page.tsx`,
  `${D}admin/readiness/page.tsx`,
  `${D}admin/settings/page.tsx`,
  `${D}access-denied/page.tsx`,
  `${D}notifications/page.tsx`,
  `${D}my-assets/page.tsx`,
  `${C}reports/report-filter-panel.tsx`,
  `${C}reports/report-view-tabs.tsx`,
  `${C}reports/responsive-report-list.tsx`,
  `${C}reports/reports-overview-view.tsx`,
  `${C}reports/reports-catalog-view.tsx`,
  `${C}reports/reports-operations-view.tsx`,
  `${C}reports/reports-accounting-view.tsx`,
  `${D}reports/page.tsx`,
  `${D}dashboard/page.tsx`,
  `${D}work-center/page.tsx`,
  `${C}master-data/master-data-layout.tsx`,
  `${C}admin/role-permission-form.tsx`,
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
// Plan 2D-3 (D19) added each name below its own tile's last commit: EvidenceStat (the evidence drawer), SummaryItem
// (the batch form and the import panel).
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat|SummaryItem)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3), ReviewItem (the component manager), MobileField (my assets),
// DocumentFact (a supplier's purchase documents).
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo|ReviewItem|MobileField|DocumentFact)\b/g
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

// ---- Budgets, locked to KEEP since plan 2B-5 (test L9). They started at the d38a0ee counts (spec §10.4 table C, per
// file as spec §9.4.1–9.4.2); groups name the first 2B plan that edited the file (spec §8.5–8.9, I12); "→ n (KEEP)" =
// what stays after 2B, and why. The LB1 row marked 0 → 1 was one of the only two rows above the d38a0ee count (the
// repair page's reached 0 in 2C batch 5 and plan 2D-1 deleted it).
const BUDGETS: Record<string, Record<string, number>> = {
  LH1: {
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    "src/app/[locale]/(auth)/login/page.tsx": 1, // → 1 (KEEP): no shell (phase 3, with the login frame)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}assets/asset-label-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // → 1 (KEEP): field scan header, its own variant
  },
  LH2: {
  },
  LB1: {
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the move-out button :1413, not a page back
    // 2B-2
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :496 for ArrowLeft
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // → 1 (KEEP): field scan header
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // → 1 (KEEP): back to editing in the review step :93 (2C)
  },
  LP1: {
  },
  LF1: {
  },
  LT1: {
  },
  LT2: {
  },
  LT3: {
  },
  LT4: {
  },
  LT5: {
  },
  LV1: {
  },
  LV2: {
    // 2B-1
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    // 2B-2
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 4, // → 4 (KEEP): translated-sentence arguments :1202, :1204 and the history sentence :2390 (R-n)
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${D}asset-management/labels/page.tsx`]: 4, // → 4 (KEEP): label data (R-n)
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx": 2, // → 2 (KEEP): print page (R-n)
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4, // → 4 (KEEP): print page (R-n)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // → 3 (KEEP): 2D
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // → 6 (KEEP): label data (R-n)
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // → 3 (KEEP): translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // → 1 (KEEP): translated sentence (R-n)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
  },
  LV3: {
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // → 5 (KEEP): print page, 2D (A/08:305)
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // → 1 (KEEP): print page, 2D (A/08:305)
  },
  LS1: {
    // 2B-2
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // → 1 (KEEP): Metric :598 in the dialog (2C plan 3)
  },
  LS2: {
  },
  LK1: {
  },
  LN1: {
    // 2B-1
    [`${D}master-data/brands/page.tsx`]: 2, // → 2 (KEEP): the brand picker is a vertical list, where aria-current="page" is right (I11)
  },
  LN2: {
  },
  LR1: {
  },
}

// What may stay after phase 2B, with the reason (spec §9.4.3, I11, I14). L0 holds every file of MIGRATED_LIST_FILES
// to these numbers and L9 holds BUDGETS to them. 2C plan 4 emptied four rows (LH1 of the label batch and scan tools,
// LT1 of the role permission form, LV1 of the integration manager) and plan 2B-5 deleted them; plan 2D-1 deleted the
// five rows 2C batch 5 had brought to 0 (LP1 of the four detail pages, LB1 of the repair page); phase 2D empties the
// rest and sets every budget to {}. Change a row only with a spec ruling.
const KEEP: Record<string, Record<string, number>> = {
  LH1: {
    "src/app/[locale]/(auth)/login/page.tsx": 1, // no shell (phase 3, with the login frame)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page
    [`${C}assets/asset-label-print.tsx`]: 1, // print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header, its own variant
  },
  LB1: {
    [`${C}admin/system-settings-form.tsx`]: 1, // the move-out button :1413, not a page back
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // back to editing in the review step :93 (2C)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the ActionBar :496 (2C batch 5, K23)
  },
  LV2: {
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1202, :1204 and the history sentence :2390 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 1, // the default separator of the tag preview :2136 (R-n)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // 2C form (2D)
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // translated sentence (R-n)
    [`${D}asset-management/labels/page.tsx`]: 4, // label data (R-n)
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx": 2, // print page (R-n)
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4, // print page (R-n)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // 2D
  },
  LV3: {
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // print page, 2D (A/08:305)
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // print page, 2D (A/08:305)
  },
  LS1: {
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :598 in the dialog (2C plan 3)
  },
  LN1: {
    [`${D}master-data/brands/page.tsx`]: 2, // the brand picker is a vertical list, where aria-current="page" is right (I11)
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

// The lock of phase 2B (spec 2B §9.8, I15; plan 2B-5 Task 17): every budget row is a KEEP row with the same number, so
// phase 2D only has to empty KEEP and widen the guards to all of src. A row whose count reaches 0 is deleted from both
// tables, never kept at 0 and never raised. An empty guard object ({}) counts as no rows.
test("L9 every 2B budget equals KEEP, so phase 2D only empties KEEP", () => {
  const rows = (table: Record<string, Record<string, number>>) => Object.fromEntries(Object.entries(table).filter(([, budget]) => Object.keys(budget).length > 0))
  assert.deepEqual(rows(BUDGETS), rows(KEEP))
})

// Plan 2D-1 (spec 2D D13, M16, R8): a KEEP row is the number of sites that stay, so it equals the live count. The commit
// that moves a site lowers its row, or deletes it at 0, in BUDGETS and KEEP together (spec 2D §3, §5.6).
test("L10 every KEEP row equals its live count", () => {
  const problems: string[] = []
  for (const [id, rows] of Object.entries(KEEP)) {
    const counts = COUNTERS[id]()
    for (const [path, keep] of Object.entries(rows)) {
      if ((counts[path] ?? 0) !== keep) problems.push(`${id} ${path}: KEEP ${keep}, live ${counts[path] ?? 0}`)
    }
  }
  assert.deepEqual(problems, [])
})
