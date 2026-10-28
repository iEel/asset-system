import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import test from "node:test"
import { exemptProblems, phase3Rows, type ExemptList } from "./helpers/guard-exempt.ts"
import {
  countByFile,
  countMatchesByFile,
  findJsxTags,
  hasJsxAttr,
  jsxAttrValue,
  readSourceFiles,
  type SourceFile,
} from "./helpers/source-files.ts"

// List-frame guards (spec 2B §9.3, rulings I11, I14 and I15), locked by plan 2D-5 (spec 2D §5, D1, D13; the check is
// tests/helpers/guard-exempt.ts). Every rule counts over all of src, src/lib and the API routes included (spec 2D §1
// point 2). A file may hold a site only as an OWNER of the rule (the shared part that draws it, §5.2) or as a row of
// the rule's EXEMPT list (§5.1): its exact count, why it stays, the ruling that keeps it and its kind, "permanent" or
// "phase 3" (D2; the last test lists those). The commit that moves a site lowers its row, or deletes it at 0. A new
// site uses the shared part; a new row needs a spec ruling.
const sources = readSourceFiles("src")
const D = "src/app/[locale]/(dashboard)/"
const P = "src/app/[locale]/(print)/"
const C = "src/components/"
const tagsWhere = (names: string[], keep: (text: string) => boolean) => (file: SourceFile) => findJsxTags(file.source, names).filter((tag) => keep(tag.text)).length

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
// Plan 2D-4 Task 22 (AP-3): ImpactItem (the round cancel dialog).
// Plan 2D-4 Task 23 (AP-4): PreviewMetric (the round form preview).
// Plan 2D-4 Task 38 (DS-9): SummaryValue (the bulk disposal execution result).
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat|SummaryItem|ImpactItem|PreviewMetric|SummaryValue)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
// Spec 2D D19: label and value look-alikes join this list in the commit that removes them, so the count stays 0:
// MovementInfo (the movement timeline, plan 2D-3), ReviewItem (the component manager), MobileField (my assets),
// DocumentFact (a supplier's purchase documents).
// Plan 2D-4 Task 6 (OP-6): ReadOnly (the check-in form's current custody).
// Plan 2D-4 Task 24 (AP-5): ReviewPreviewField (the finding review dialog).
// Plan 2D-4 Task 26 (AP-7): FindingComparison (the findings phone card).
// Plan 2D-4 Task 27 (AP-8): MobileAuditField (the audit rounds phone card).
// Plan 2D-4 Task 29 (AP-10): PendingInfo (the audit pending phone card).
// Plan 2D-4 Task 38 (DS-9): ReviewValue (the bulk disposal execution review).
// Plan 2D-4 Task 39 (DS-10): MobileDisposalField (the disposal queue's phone card).
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo|ReviewItem|MobileField|DocumentFact|ReadOnly|ReviewPreviewField|FindingComparison|MobileAuditField|PendingInfo|ReviewValue|MobileDisposalField)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|FactStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil|AssetOperationPicker|DesktopSelectionBar)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
// aria-current="page" written as a literal, or "page" inside an expression ({active ? "page" : undefined}). A variable
// named page, "step" and "true" do not count.
const pageCurrent = (text: string) => /\saria-current=(["'])page\1/.test(text) || /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")

const COUNTERS: Record<string, () => Record<string, number>> = {
  LH1: () => countByFile(sources, tagsWhere(["h1"], () => true)),
  LH2: () => countMatchesByFile(sources, OLD_HEADER),
  LB1: () => countMatchesByFile(sources, BACK_ICON),
  LP1: () => countMatchesByFile(sources, DOUBLE_BOTTOM_PADDING),
  LF1: () => countMatchesByFile(sources, LOCAL_FILTER_SELECT),
  LT1: () => countByFile(sources, tagsWhere(["thead", "th"], (text) => HEADER_LOOK.test(text))),
  LT2: () => countMatchesByFile(sources, LOCAL_SORT_HEADER),
  LT3: () => countByFile(sources, (file) => findJsxTags(file.source, ["td"]).filter((tag) => hasJsxAttr(tag.text, "colSpan")).length),
  LT4: () => countByFile(sources, handPaginations),
  LT5: () => countByFile(sources, (file) => file.source.split("\n").filter(fadedDisabled).length),
  LV1: () => countMatchesByFile(sources, BARE_LOCALE_STRING),
  LV2: () => countMatchesByFile(sources, RAW_DASH),
  LV3: () => countMatchesByFile(sources, FORMAT_CURRENCY),
  LS1: () => countMatchesByFile(sources, LOCAL_STAT_TILE),
  LS2: () => countMatchesByFile(sources, METRIC_CARD_TAG),
  LK1: () => countMatchesByFile(sources, LOCAL_KEY_VALUE),
  LN1: () => countByFile(sources, tagsWhere(["[A-Za-z][\\w.]*"], pageCurrent)),
  LN2: () => countMatchesByFile(sources, UI_NAME),
  LR1: () => countMatchesByFile(sources, ROW_DELETE_BUTTON),
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
  LV1: "numbers go through formatCount or formatMoney, not a bare toLocaleString()",
  LV2: "empty values are Nil or orNil, not a typed \"-\"",
  LV3: "money goes through formatMoney, not formatCurrency",
  LS1: "number tiles come from StatStrip, not a local tile function",
  LS2: "MetricCard gives way to StatStrip",
  LK1: "detail values come from KeyValueList, not a local Info or DetailItem helper",
  LN1: "aria-current=\"page\" is set by TabNav, StatStrip, Pagination and the menus, not by hand",
  LN2: "no local function takes the name of a shared component",
  LR1: "delete buttons in table rows move into the ⋯ menu of RowActions",
}

// ---- Owners (spec 2D §5.2): the shared parts that draw what their rule forbids everywhere else. An owner may count
// anything and is never an EXEMPT row. A rule without an entry has no owner.
const HEADER_OWNER = `${C}ui/page-header.tsx`
const NAV_PRIMITIVES = ["ui/tab-nav.tsx", "ui/breadcrumbs.tsx", "ui/pagination.tsx", "ui/steps.tsx", "ui/stat-strip.tsx", "layout/sidebar.tsx", "layout/mobile-field-navigation.tsx", "layout/mobile-more-sheet.tsx"].map((path) => C + path)
const OWNERS: Readonly<Record<string, readonly string[]>> = {
  LH1: [HEADER_OWNER], // PageHeader's title
  LH2: [HEADER_OWNER], // function PageHeader itself
  LB1: [HEADER_OWNER], // PageBackLink's arrow
  LF1: [`${C}ui/filter-select.tsx`], // function FilterSelect itself
  LT2: [`${C}ui/data-table.tsx`], // DataTableHead, the sortable header
  LT3: [`${C}ui/data-table.tsx`], // TableEmptyRow's <td colSpan>
  LT4: [`${C}ui/pagination.tsx`], // the shared pager
  LN1: NAV_PRIMITIVES, // the navigation primitives set aria-current themselves
  // Each shared part defines its own name: DataTable and TableEmptyRow, EmptyNote, KeyValueList, Nil, PageHeader,
  // Pagination, RowActions, StatStrip, FactStrip, StatusBadge, TabNav, DesktopSelectionBar, AssetOperationPicker.
  LN2: ["asset-operation-picker", "data-table", "desktop-selection-bar", "empty-note", "fact-strip", "key-value-list", "nil", "page-header", "pagination", "row-actions", "stat-strip", "status-badge", "tab-nav"].map((name) => `${C}ui/${name}.tsx`),
}

// ---- What stays (spec 2D §5.1, §5.3), one list per rule, in the order of COUNTERS; {} means nothing stays. Rulings:
// "2D D2" is the phase 3 line; "2B R-n" (print pages, label data, translated sentences, src/lib and the API keep "-"),
// "2B I11" and "2B §9.4.3" (the KEEP table of phase 2B) are spec 2B's; "2C K23" is the ActionBar; "2D-4 R17" print.
const EXEMPT: Readonly<Record<string, ExemptList>> = {
  LH1: {
    "src/app/[locale]/(auth)/login/page.tsx": { count: 1, kind: "permanent", why: "the login page has no shell; its card title is the page's one h1", ruling: "group 1 login (spec 2026-10-25 §8)" },
    [`${C}asset-operations/operation-document-print.tsx`]: { count: 1, kind: "permanent", why: "the A4 document's own title, printed on the paper", ruling: "2D-4 R17" },
    [`${C}assets/asset-label-print.tsx`]: { count: 1, kind: "permanent", why: "the label print page has no shell: its own title above the label preview", ruling: "2B §9.4.3" },
    [`${C}audit/audit-scan-header.tsx`]: { count: 1, kind: "permanent", why: "the field scan header, its own two-line variant (group 2 spec §11)", ruling: "2B §9.4.3" },
  },
  LH2: {},
  LB1: {
    [`${C}admin/system-settings-form.tsx`]: { count: 1, kind: "permanent", why: "the arrow of the category transfer list's remove button, not a page back", ruling: "2B §9.4.3" },
    [`${D}audit/rounds/[id]/page.tsx`]: { count: 1, kind: "permanent", why: "the back item of the round's ActionBar", ruling: "2C K23" },
    [`${C}audit/audit-scan-header.tsx`]: { count: 1, kind: "permanent", why: "the field scan header's back link to the round page, its own two-line variant (group 2 spec §11)", ruling: "2B §9.4.3" },
    [`${C}disposal/disposal-batch-form.tsx`]: { count: 1, kind: "permanent", why: "back to editing in the review step, not a page back", ruling: "2B §9.4.3" },
  },
  LP1: {},
  LF1: {},
  LT1: {},
  LT2: {},
  LT3: {},
  LT4: {},
  LT5: {},
  LV1: {},
  LV2: {
    // Pages and components: print pages, label data and translated sentences.
    [`${D}asset-management/labels/page.tsx`]: { count: 4, kind: "permanent", why: "label data: the category, state and location the label prints", ruling: "2B R-n" },
    [`${P}asset-management/checkins/[id]/page.tsx`]: { count: 2, kind: "permanent", why: "print page: the A4 check-in document", ruling: "2B R-n" },
    [`${P}asset-management/checkouts/[id]/page.tsx`]: { count: 4, kind: "permanent", why: "print page: the A4 check-out document", ruling: "2B R-n" },
    [`${C}admin/system-settings-form.tsx`]: { count: 1, kind: "permanent", why: "the default separator of the asset tag preview, not an empty value", ruling: "2B R-n" },
    [`${C}asset-operations/operation-document-print.tsx`]: { count: 1, kind: "permanent", why: "an empty field on the A4 document", ruling: "2D-4 R17" },
    [`${C}asset-operations/void-document-banner.tsx`]: { count: 3, kind: "permanent", why: "the void banner prints on the A4 document", ruling: "2D-4 R17" },
    [`${C}assets/detail/asset-components-tab.tsx`]: { count: 2, kind: "permanent", why: "translated-sentence arguments: the parent's tag in the two relationship summaries", ruling: "2B R-n" },
    [`${C}assets/asset-label-batch-tool.tsx`]: { count: 6, kind: "permanent", why: "label data: the category, state, company, branch and location the label prints", ruling: "2B R-n" },
    [`${C}audit/audit-scan-check-form.tsx`]: { count: 3, kind: "permanent", why: "translated-sentence arguments: the checker's name and the check time", ruling: "2B R-n" },
    [`${C}audit/audit-scan-offline-bar.tsx`]: { count: 1, kind: "permanent", why: "the sync error inside a translated sentence", ruling: "2B R-n" },
    // src/lib and the API, counted since plan 2D-5: server-built text, logs, the PDF and settings defaults.
    "src/app/api/disposal-requests/bulk-decision/route.ts": { count: 1, kind: "permanent", why: "the API's stand-in asset tag for a request it cannot find", ruling: "2B R-n" },
    "src/lib/asset-cross-scope.ts": { count: 5, kind: "permanent", why: "server-built summary rows: the custodian, its company and branch, the home location and its branch", ruling: "2B R-n" },
    "src/lib/asset-import-history.ts": { count: 3, kind: "permanent", why: "server-built import history: the batch id, the file name and the approver", ruling: "2B R-n" },
    "src/lib/asset-operation-search-rules.ts": { count: 2, kind: "permanent", why: "the label of a handover destination that cannot be read, built on the server", ruling: "2B R-n" },
    "src/lib/asset-tag.ts": { count: 1, kind: "permanent", why: "the asset tag separator's default, not an empty value", ruling: "2B R-n" },
    "src/lib/audit-correction-history.ts": { count: 1, kind: "permanent", why: "the correction's user name, an argument of a translated sentence", ruling: "2B R-n" },
    "src/lib/audit-pdf.tsx": { count: 1, kind: "permanent", why: "an empty cell of the audit PDF", ruling: "2B R-n" },
    "src/lib/disposal-approval-service.ts": { count: 2, kind: "permanent", why: "the stand-in asset tag of a request that cannot be found", ruling: "2B R-n" },
    "src/lib/integration-auth.ts": { count: 1, kind: "permanent", why: "a server log line", ruling: "2B R-n" },
    "src/lib/ldap-sync.ts": { count: 3, kind: "permanent", why: "the parts of an English LDAP sync blocker message", ruling: "2B R-n" },
    "src/lib/production-readiness.ts": { count: 6, kind: "permanent", why: "readiness check values, server-built text such as the two auth URLs in one line", ruling: "2B R-n" },
    "src/lib/system-log-presenter.ts": { count: 2, kind: "permanent", why: "the system log's user and record labels; the dashboard reads the \"-\" user as the system user", ruling: "2B R-n" },
    "src/lib/system-setting-defaults.ts": { count: 1, kind: "permanent", why: "the default asset tag separator setting, not an empty value", ruling: "2B R-n" },
  },
  LV3: {},
  LS1: {},
  LS2: {},
  LK1: {},
  LN1: {
    [`${D}master-data/brands/page.tsx`]: { count: 2, kind: "permanent", why: "the brand picker is a vertical list of links, where aria-current=\"page\" is right", ruling: "2B I11" },
  },
  LN2: {},
  LR1: {},
}

test("the list-frame counters read JSX and lines as intended", () => {
  const file = (source: string): SourceFile => ({ path: "src/components/x.tsx", source })
  assert.equal(tagsWhere(["h1"], () => true)(file('// <h1>old</h1>\n<h1 className="x">a</h1>')), 1)
  assert.equal(handPaginations(file("function APagination() {\n  return <Pagination page={1} />\n}\nfunction BPagination() {\n  return <nav />\n}")), 1)
  assert.equal(fadedDisabled('className="pointer-events-none opacity-50"'), true)
  assert.equal(fadedDisabled('className="disabled:pointer-events-none disabled:opacity-50"'), false)
  const current = tagsWhere(["[A-Za-z][\\w.]*"], pageCurrent)
  assert.equal(current(file('<Link aria-current={active ? "page" : undefined} /><li aria-current={on ? "step" : undefined} />')), 1)
  assert.equal(current(file('<span aria-current="page">x</span><a aria-current={page} /><li aria-current="step" />')), 1, "a literal \"page\" counts; a variable named page and \"step\" do not")
  assert.equal(tagsWhere(["thead", "th"], (text) => HEADER_LOOK.test(text))(file('<thead className="bg-muted/40"><th className="uppercase">')), 1)
  assert.deepEqual(countMatchesByFile([file('{a || "-"} {b ?? "-"} {c ? d : "-"} {"a-b"} "x-y"')], RAW_DASH), { "src/components/x.tsx": 3 })
  assert.deepEqual(countMatchesByFile([file("export function formatCurrency(value) {}\nformatCurrency(1)")], FORMAT_CURRENCY), { "src/components/x.tsx": 1 })
  assert.deepEqual(countMatchesByFile([file('<BranchDeleteButton id={row.id} /><DeleteButtonGroup id="x" />')], ROW_DELETE_BUTTON), { "src/components/x.tsx": 1 })
})

for (const [id, title] of Object.entries(TITLES)) {
  test(`${id} ${title}`, () => {
    assert.deepEqual(exemptProblems(id, COUNTERS[id](), EXEMPT[id] ?? {}, OWNERS[id] ?? []), [])
  })
}

test("L0 every rule has a title, a counter and an EXEMPT list, and every OWNERS and EXEMPT path is a real file", () => {
  const problems: string[] = []
  const ids = Object.keys(COUNTERS)
  if (Object.keys(TITLES).join() !== ids.join()) problems.push(`TITLES and COUNTERS name different rules: ${Object.keys(TITLES).join()} / ${ids.join()}`)
  if (Object.keys(EXEMPT).join() !== ids.join()) problems.push(`EXEMPT and COUNTERS name different rules: ${Object.keys(EXEMPT).join()} / ${ids.join()}`)
  for (const [id, owners] of Object.entries(OWNERS)) {
    if (!ids.includes(id)) problems.push(`OWNERS.${id}: no such rule`)
    for (const path of owners) if (!existsSync(path)) problems.push(`OWNERS.${id}: ${path} is no such file`)
  }
  for (const [id, rows] of Object.entries(EXEMPT)) {
    for (const path of Object.keys(rows)) if (!existsSync(path)) problems.push(`EXEMPT.${id}: ${path} is no such file, delete the row`)
  }
  assert.deepEqual(problems, [])
})

// Spec 2D §5.1 (D1): the rows this file leaves to phase 3, and their sum. Phase 3 is D2's line (the register's bulk
// selection bar, the topbar search); this file has no row left there. Each guard file sums its own phase 3 rows: a test
// file that imports another one runs that file's tests a second time.
test("phase 3: every row the list-frame guards leave to phase 3, and their sum (spec 2D §5.1, D2)", () => {
  const rows = phase3Rows(EXEMPT)
  assert.deepEqual(
    rows.map(({ rule, file, count }) => `${rule} ${file}: ${count}`),
    [],
  )
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 0)
})
