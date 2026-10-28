import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 2 plan 4 Task 3 (spec §10, Appendix A §10, P4-R1 to P4-R3, P4-R7, P4-R11 to P4-R13, P4-R28): the findings page
// shell on Task 2's data. Task 2's rules (the tabs, the links, the way back) are tested by value in its own tests; these
// pin the wiring and the markup Task 7's E2E reads. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/audit/findings/page.tsx"
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).auditFinding

test("the header: Task 2's way back, and one ส่งออก ▾ for audit:export whose links carry the filters and the locale, never the open finding or the page (P4-R7, P4-R12)", () => {
  const page = read(PAGE)
  assert.match(page, /const \{ rows, total, listPage, counts, back \} = data/)
  assert.match(page, /const backLabel = back\.target === "round" \? t\("backToRound"\) : t\("backToRounds"\)/)
  assert.match(page, /back=\{<PageBackLink href=\{back\.href\} label=\{backLabel\} \/>\}/)
  assert.match(page, /actions=\{canExport \? <AuditFindingsExportMenu excelHref=\{`\/api\/audit-findings\/export\?\$\{exportParams\.toString\(\)\}`\} pdfHref=\{`\/api\/audit-findings\/export-pdf\?\$\{exportParams\.toString\(\)\}`\} \/> : null\}/)
  assert.match(page, /exportParams\.set\("status", status\)\n\s+exportParams\.set\("locale", locale\)/)
  assert.doesNotMatch(page, /exportParams\.set\("(?:finding|page|pageSize|returnTo)"/, "an export is the whole filtered list")
  const menu = read("src/components/audit/audit-findings-export-menu.tsx")
  assert.match(menu, /^"use client"$/m)
  assert.match(menu, /^export function AuditFindingsExportMenu\(\{ excelHref, pdfHref \}: \{ excelHref: string; pdfHref: string \}\) \{$/m)
  assert.match(menu, /<DropdownMenu modal=\{false\}>/)
  assert.match(menu, /<Button variant="outline" size="md">\s*<Download aria-hidden="true" \/>\s*\{tCommon\("export"\)\}\s*<ChevronDown aria-hidden="true" \/>\s*<\/Button>/)
  assert.match(menu, /<a href=\{excelHref\} download>[\s\S]*?\{t\("exportFindings"\)\}\s*<DropdownMenuItemDescription>\{t\("exportFilteredHint"\)\}<\/DropdownMenuItemDescription>/)
  assert.match(menu, /<a href=\{pdfHref\} download>[\s\S]*?\{t\("exportFindingsPdf"\)\}\s*<DropdownMenuItemDescription>\{t\("exportFilteredHint"\)\}<\/DropdownMenuItemDescription>/)
})

test("six tabs with Task 2's counts, the sub-chips of ต้องติดตาม under them, a bell filter as its one chip, and no StatStrip (spec §10, P4-R1, P4-R3)", () => {
  const page = read(PAGE)
  assert.match(page, /const view = auditFindingStatusView\(status\)/)
  assert.match(page, /pending: t\("status_pending"\),\n\s+approved: t\("status_approved"\),\n\s+rejected: t\("status_rejected"\),\n\s+followUp: t\("tabFollowUp"\),\n\s+closed: t\("filterClosed"\),\n\s+all: t\("status_all"\),/)
  assert.match(page, /action_open: t\("filterActionOpen"\),\n\s+overdue: t\("filterOverdue"\),\n\s+exception: t\("status_exception"\),/)
  assert.match(page, /const resolutionFilters = auditFindingTabs\.map\(\(tab\) => \(\{ key: tab, label: tabLabels\[tab\], count: formatCount\(counts\[auditFindingTabStatus\[tab\]\]\), href: filterHref\(\{ status: auditFindingTabStatus\[tab\] \}\) \}\)\)/)
  assert.match(page, /const followUpChips = auditFindingFollowUpChips\.map\(\(chip\) => \(\{ key: chip, label: chipLabels\[chip\], count: formatCount\(counts\[chip\]\), href: filterHref\(\{ status: chip \}\) \}\)\)/)
  assert.match(page, /<TabNav aria-label=\{t\("quickFilters"\)\} items=\{resolutionFilters\} current=\{view\.tab\} scroll=\{false\} \/>\n\s+\{view\.tab === "followUp" \? <TabNav aria-label=\{t\("followUpChipsLabel"\)\} items=\{followUpChips\} current=\{view\.chip \?\? ""\} scroll=\{false\} \/> : null\}/)
  const chips = page.slice(page.indexOf("const filterChips"), page.indexOf("\n  ]\n", page.indexOf("const filterChips")))
  assert.match(chips, /\.\.\.\(isAuditFindingWaitingStatus\(status\) \? \[\{ key: "status", label: waitingLabels\[status\], href: filterHref\(\{ status: "follow_up" \}\) \}\] : \[\]\),/)
  assert.doesNotMatch(chips, /roundId|findingType/, "the selects show the round and the topic, so neither is a chip")
  assert.doesNotMatch(page, /<StatStrip\b|resolutionSummaryItems|ResolutionMetric|SUMMARY_STATUSES|summaryPendingReview|resolutionTitle|quickFiltersHelp|auditFindingResolutionStatuses/)
})

test("the filter row: รอบ and เรื่อง before the search, a round outside the options still named, the search keeping the status and the way back (spec §10, bug 19, P4-R28)", () => {
  const page = read(PAGE)
  const search = page.slice(page.indexOf("<MasterDataSearch"), page.indexOf("<FilterChipList"))
  assert.match(search, /hiddenInputs=\{Object\.fromEntries\(auditFindingsHrefQuery\(buildAuditFindingsHref\(locale, filters, \{ search: "", roundId: null, findingType: null, pageSize: listPage\.pageSize \}\)\)\)\}/)
  assert.match(search, /leading=\{\n\s+<>\n\s+<FilterSelect label=\{t\("roundShort"\)\} name="roundId" defaultValue=\{roundId \?\? ""\} allLabel=\{t\("roundFilterAll"\)\} options=\{roundOptions\} hideLabel fieldSize="md" className="sm:w-56" \/>\n\s+<FilterSelect label=\{t\("findingTopic"\)\} name="findingType" defaultValue=\{findingType \?\? ""\} allLabel=\{t\("topicFilterAll"\)\} options=\{topicOptions\} hideLabel fieldSize="md" className="sm:w-40" \/>\n\s+<\/>\n\s+\}/)
  assert.match(page, /const roundOptions: FilterSelectOption\[\] = data\.roundOptions\.map\(\(round\) => \(\{ value: round\.id, label: `\$\{round\.auditNo\} · \$\{round\.name\}` \}\)\)/)
  assert.match(page, /if \(roundId && !roundOptions\.some\(\(option\) => option\.value === roundId\)\) \{\n\s+roundOptions\.push\(\{ value: roundId, label: data\.filterRound \? `\$\{data\.filterRound\.auditNo\} · \$\{data\.filterRound\.name\}` : t\("filterNotListed"\) \}\)\n\s+\}/)
  // The topic is the round page's own short word (Task 2's auditFindingTypeShortLabelKeys); an unknown stored type reads
  // ไม่อยู่ในรายการ, never its code.
  assert.match(page, /const topicLabel = \(type: string\) => \{\n\s+const known = resolveAuditFindingType\(type\)\n\s+return known \? tRound\(auditFindingTypeShortLabelKeys\[known\]\) : t\("filterNotListed"\)\n\s+\}/)
  assert.match(page, /const topicOptions: FilterSelectOption\[\] = auditFindingTypes\.map\(\(type\) => \(\{ value: type, label: topicLabel\(type\) \}\)\)/)
  const layout = read("src/components/master-data/master-data-layout.tsx")
  assert.match(layout, /^  hiddenInputs = \{\},\n  leading,\n  children,\n\}: \{$/m)
  assert.match(layout, /  leading\?: ReactNode\n/)
  assert.ok(layout.indexOf("{leading}") > layout.indexOf('type="hidden"') && layout.indexOf("{leading}") < layout.indexOf("<SearchField"), "leading sits after the hidden inputs and before the search")
})

test("the list's links are Task 2's one writer: a row keeps the page and opens its finding, a tab, sub-chip or filter goes to page 1 with no finding open, the pager goes to its page with no finding open while a page past the end goes to the last page with its finding kept (P4-R30), and every link keeps the way back (spec 2B §5.9.1; spec §10)", () => {
  const page = read(PAGE)
  assert.match(page, /const filters = parseAuditFindingsListFilters\(locale, await searchParams\)/)
  assert.match(page, /getAuditFindingsPageData\(\{ locale, filters, user, canApprove, typeSearchLabels, rules: waitingRules, now: pageLoadedAt \}\)/)
  assert.match(page, /const auditFindingsReturnHref = buildAuditFindingsHref\(locale, filters, \{ page: listPage\.page, pageSize: listPage\.pageSize, finding: filters\.findingId \}\)/)
  assert.match(page, /const pageHref = \(next: \{ page\?: number; pageSize\?: number \}\) => buildAuditFindingsHref\(locale, filters, next\)/, "the pager closes the panel, as a filter does (P4-R30)")
  assert.match(page, /redirect\(buildAuditFindingsHref\(locale, filters, \{ page: lastPage, pageSize: listPage\.pageSize, finding: filters\.findingId \}\)\)/, "the redirect past the end keeps the open finding (P4-R30)")
  assert.doesNotMatch(page, /redirect\(pageHref\(/, "not through the pager's href, which drops the finding")
  assert.match(page, /const filterHref = \(next: Pick<AuditFindingsHrefOverrides, "status" \| "search" \| "roundId" \| "findingType">\) => buildAuditFindingsHref\(locale, filters, \{ \.\.\.next, pageSize: listPage\.pageSize \}\)/)
  assert.match(page, /const findingHref = \(id: string\) => buildAuditFindingsHref\(locale, filters, \{ page: listPage\.page, pageSize: listPage\.pageSize, finding: id \}\)/)
  assert.match(page, /const closeHref = buildAuditFindingsHref\(locale, filters, \{ page: listPage\.page, pageSize: listPage\.pageSize \}\)/)
  assert.match(page, /const disposalHrefFor = \(finding: \{ id: string; findingType: string; asset: \{ id: string \} \| null; auditRound: \{ auditNo: string \} \}\) =>\n\s+canCreateDisposal && finding\.asset\n\s+\? appendOperationalReturnTo\(/)
  assert.doesNotMatch(page, /function buildAuditFindingsHref|new URLSearchParams\(\)\n\s+params\.set\("status"/, "the builder is Task 2's, in audit-finding-filters.ts")
})

test("two panes from xl: the list, then the 420px pane with its one panel slot, sticky from xl and opening each finding at its top; below xl an open finding takes the page behind กลับไปรายการไม่ตรง (spec §10, P4-R13, P4-R31)", () => {
  const page = read(PAGE)
  assert.match(page, /const chosen = data\.panel\?\.finding \?\? null/)
  assert.match(page, /<div data-audit-findings-panes className="grid min-w-0 gap-6 xl:grid-cols-\[minmax\(0,1fr\)_420px\] xl:items-start xl:gap-4">/)
  assert.match(page, /<div data-audit-findings-list className=\{cn\("min-w-0 space-y-4", chosen && "max-xl:hidden"\)\}>/)
  assert.match(page, /<div data-audit-finding-pane className=\{cn\("min-w-0 xl:sticky xl:top-4 xl:max-h-\[calc\(100dvh_-_var\(--shell-top\)_-_3rem\)\] xl:overflow-y-auto", !chosen && "max-xl:hidden"\)\}>\n\s+\{chosen \? <AuditFindingPaneTop key=\{chosen\.id\} \/> : null\}\n\s+\{chosen \? <PageBackLink href=\{closeHref\} label=\{t\("backToList"\)\} className="mb-3 xl:hidden" \/> : null\}\n\s+\{panel\}\n\s+<\/div>/)
  assert.match(read("src/components/audit/audit-finding-pane-top.tsx"), /if \(window\.matchMedia\("\(min-width: 1280px\)"\)\.matches\) document\.querySelector\("\[data-audit-finding-pane\]"\)\?\.scrollTo\(\{ top: 0 \}\)\n\s+else document\.getElementById\("main"\)\?\.scrollTo\(\{ top: 0 \}\)/, "each finding opens at its top: the page below xl, the pane from xl (P4-R31)")
  assert.ok(page.indexOf("<div data-audit-findings-list") < page.indexOf("<div data-audit-finding-pane "), "the list comes first")
  assert.doesNotMatch(page, /<aside\b|fixed inset-0/, "a section, not a landmark aside; full screen is the content area, not an overlay")
})

test("the table: เรื่อง as a Chip, the asset with its parent, ตามระบบ → ที่พบ with the plan's line, รอบ; a row opens the panel in place, carries its hooks and the open one is marked (spec §10, P4-R2, P4-R11)", () => {
  const page = read(PAGE)
  const table = page.slice(page.indexOf("<DataTable framed={false}"), page.indexOf("</DataTable>"))
  assert.deepEqual([...table.matchAll(/<DataTableHead\b[^>]*>(.*?)<\/DataTableHead>/g)].map((match) => match[1]), ['{t("findingTopic")}', '{t("asset")}', '{t("comparisonColumn")}', '{t("roundShort")}'])
  assert.match(table, /^<DataTable framed=\{false\} layout="fixed" minWidth=\{520\} className="hidden md:block" caption=\{t\("title"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(table, /<colgroup>\s*<col className="w-24" \/>\s*<col \/>\s*<col className="w-44" \/>\s*<col className="w-28" \/>\s*<\/colgroup>/)
  assert.match(table, /<TableEmptyRow colSpan=\{4\} emptyState=\{\{ icon: <FileText \/>, \.\.\.empty, actionVariant: "secondary" \}\} \/>/)
  assert.match(table, /<ClickableTableRow\n\s+key=\{row\.id\}\n\s+href=\{findingHref\(row\.id\)\}\n\s+scroll=\{false\}\n\s+current=\{row\.id === chosen\?\.id\}\n\s+rowData=\{\{ "data-audit-finding-row": row\.id, "data-finding-type": row\.findingType \}\}\n\s+label=\{`\$\{tCommon\("view"\)\}: \$\{code\} · \$\{topic\}`\}\n\s+>/)
  assert.match(table, /<DataTableCell><Chip data-audit-finding-subject>\{topic\}<\/Chip><\/DataTableCell>/)
  assert.match(table, /<Link href=\{findingHref\(row\.id\)\} scroll=\{false\} data-audit-finding-open className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "break-all"\)\}>\s*<span className="tag">\{code\}<\/span>\s*<\/Link>/)
  assert.match(table, /\{row\.parent \? <div className="break-words text-meta text-muted-foreground">\{t\("componentOfParent", \{ assetTag: row\.parent\.assetTag, name: row\.parent\.name \}\)\}<\/div> : null\}/)
  assert.match(table, /\{line \? <div className="mt-1 text-meta text-muted-foreground">\{line\}<\/div> : null\}/)
  assert.match(page, /const followUpLine = \(row: AuditFindingsPageRow\) =>\n\s+row\.actionStatus === "not_required"\n\s+\? null\n\s+: \[t\(`actionStatus_\$\{row\.actionStatus\}`\), row\.ownerLabel \?\? t\("noActionOwner"\), \.\.\.\(row\.actionDueDate \? \[t\("dueOn", \{ date: formatDateTime\(row\.actionDueDate\) \}\)\] : \[\]\)\]\.join\(" · "\)/)
  assert.doesNotMatch(table, /<StatusBadge\b|<AuditFindingReviewActions\b|<RowActions\b|sticky=|AuditFindingEvidenceList|buttonVariants\(/, "the decision, the plan, the badges and the evidence are the panel's")
  assert.doesNotMatch(page, /actionOwnerId \?|employeeLabelById/, "the owner is a name or Nil, never an id (P4-R11)")
})

test("phone cards stay, each one link that opens the panel full screen at the top through ?finding=, with the row's hooks (P4-R13)", () => {
  const page = read(PAGE)
  const cards = page.slice(page.indexOf('<div className="grid gap-3 p-3 md:hidden">'), page.indexOf("<DataTable framed={false}"))
  assert.match(cards, /<ActionEmptyState icon=\{<FileText \/>\} \{\.\.\.empty\} actionVariant="secondary" \/>/)
  assert.match(cards, /<article\n\s+key=\{row\.id\}\n\s+data-audit-finding-card=\{row\.id\}\n\s+data-finding-type=\{row\.findingType\}\n\s+className="relative min-w-0 rounded-md border border-border bg-background p-4 transition-colors hover:bg-row-hover"\n\s+>/)
  assert.match(cards, /<Link\n\s+href=\{findingHref\(row\.id\)\}\n\s+data-audit-finding-open\n\s+className="block break-words font-semibold text-foreground before:absolute before:inset-0 before:rounded-md before:content-\[''\] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring"\n\s+>/)
  assert.match(cards, /<StatusBadge className="shrink-0" label=\{resolutionStateLabels\[resolutionState\]\} tone=\{RESOLUTION_STATE_TONES\[resolutionState\]\} \/>/)
  assert.match(cards, /<Chip data-audit-finding-subject>\{topicLabel\(row\.findingType\)\}<\/Chip>/)
  assert.match(cards, /\{row\.parent \? <p className="mt-1 break-words text-meta text-muted-foreground">\{t\("componentOfParent", \{ assetTag: row\.parent\.assetTag, name: row\.parent\.name \}\)\}<\/p> : null\}/)
  assert.doesNotMatch(cards, /scroll=\{false\}|<button\b|<Button\b|buttonVariants|<AuditFindingReviewActions\b/, "one link per card, opening at the top; the actions are in the panel")
})

test("the empty states: ล้างคำค้น after a search, else the way back (spec §5, Appendix A §10)", () => {
  const page = read(PAGE)
  assert.match(page, /const clearSearchHref = filterHref\(\{ search: "" \}\)/)
  assert.match(page, /const empty = searchText\n\s+\? \{ title: t\("emptySearchTitle"\), description: t\("emptySearchHelp"\), actionHref: clearSearchHref, actionLabel: t\("clearSearch"\) \}\n\s+: \{ title: t\("emptyTitle"\), description: t\("emptyHelp"\), actionHref: back\.href, actionLabel: backLabel \}/)
})

// Task 4 deletes this test with the interim body: its panel has its own tests, under the same two hooks.
test("until Task 4 the panel slot holds today's facts, badges, evidence, the asset and disposal links, and the review actions for audit:approve alone (Appendix A §10, M4)", () => {
  const page = read(PAGE)
  const panel = page.slice(page.indexOf("const panel = chosen ? ("), page.indexOf("return (\n    <div className=\"space-y-6\">"))
  assert.match(panel, /<div data-audit-finding-panel data-finding-id=\{chosen\.id\} className="min-w-0">\n\s+<ContentPanel divided title=\{t\("panelTitle"\)\}>\n\s+<div data-audit-finding-panel-body className="space-y-4">/)
  assert.match(panel, /<div data-audit-finding-panel-empty className="min-w-0">\n\s+<ContentPanel title=\{t\("panelTitle"\)\}>\n\s+<EmptyNote>\{findingId \? t\("panelNotFound"\) : t\("panelEmpty"\)\}<\/EmptyNote>/)
  assert.match(panel, /<FindingStatusBadges items=\{findingStatusBadges\(chosen, resolveFindingState\(chosen, today\)\)\} \/>/)
  assert.match(panel, /\{ key: "systemValue", label: t\("systemValue"\), value: chosen\.expectedLabel \}/)
  assert.match(panel, /\{ key: "actionOwner", label: t\("actionOwner"\), value: chosen\.ownerLabel, nilLabel: t\("noActionOwner"\) \}/)
  assert.match(panel, /<span className="tag font-medium">\{chosen\.asset\.assetTag\}<\/span> - \{chosen\.asset\.name\}/)
  assert.match(panel, /<Link href=\{`\/\$\{locale\}\/audit\/rounds\/\$\{chosen\.auditRound\.id\}`\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(panel, /<AuditFindingEvidenceList\n\s+attachments=\{chosen\.evidence\}/)
  assert.match(panel, /\{chosen\.asset \? <Link href=\{`\/\$\{locale\}\/assets\/\$\{chosen\.asset\.id\}`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\{t\("openAsset"\)\}<\/Link> : null\}/)
  assert.match(panel, /\{chosenDisposalHref \? \(\n\s+<Link href=\{chosenDisposalHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(panel, /\{canApprove \? \(\n\s+<AuditFindingReviewActions\n\s+key=\{chosen\.id\}\n\s+findingId=\{chosen\.id\}/)
  assert.match(panel, /employees=\{data\.employees\}/)
  assert.match(panel, /reviewBlocked=\{chosen\.reportedByViewer\}/)
  assert.match(page, /<StatusBadge label=\{item\.label\} status=\{item\.status\} tone=\{item\.tone\} \/>/, "the panel's badges, one list")
  assert.match(page, /<ul className="flex flex-wrap items-start gap-2">/, "the panel's badges wrap in a row")
})

test("ClickableTableRow: scroll={false} keeps the list where it is, current marks the open record with aria-current and primary-soft, hovered or not, and rowData puts a test's hooks on the row (DESIGN.md Data Tables)", async () => {
  const source = read("src/components/ui/clickable-table-row.tsx")
  assert.match(source, /^  scroll = true,\n  current = false,\n  rowData,\n  children,\n\}: \{$/m)
  assert.match(source, /  rowData\?: Readonly<Record<`data-\$\{string\}`, string>>\n/)
  assert.match(source, /<tr\n\s+\{\.\.\.rowData\}\n\s+ref=\{rowRef\}/)
  assert.match(source, /router\.push\(href, \{ scroll \}\)/)
  assert.match(source, /aria-current=\{current \? "true" : undefined\}/)
  assert.match(source, /^const clickableTableRowCurrentClasses = "bg-primary-soft hover:bg-primary-soft focus-within:bg-primary-soft has-\[\[aria-expanded=true\]\]:bg-primary-soft"$/m)
  assert.match(source, /className=\{cn\(dataTableRowClasses, "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", current && clickableTableRowCurrentClasses, className\)\}/)
  // The fill wins over the shared hover, focus and open-menu fills (tailwind-merge drops them).
  const { cn } = await import("../src/lib/utils.ts")
  const merged = cn("group/row transition-colors hover:bg-row-hover hover:duration-0 focus-within:bg-row-hover focus-within:duration-0 has-[[aria-expanded=true]]:bg-row-hover", "bg-primary-soft hover:bg-primary-soft focus-within:bg-primary-soft has-[[aria-expanded=true]]:bg-primary-soft").split(" ")
  for (const gone of ["hover:bg-row-hover", "focus-within:bg-row-hover", "has-[[aria-expanded=true]]:bg-row-hover"]) assert.ok(!merged.includes(gone), gone)
  assert.ok(merged.includes("hover:bg-primary-soft"))
  const design = read("DESIGN.md")
  assert.ok(design.includes("`ClickableTableRow current` marks the record open beside the list"))
  assert.ok(design.includes("`MasterDataSearch leading`"))
})

test("the words of the findings page shell, in th and en (glossary: รายการไม่ตรง, ผู้ถือครอง, ที่ตั้ง, นอกขอบเขต, ส่วนควบ)", () => {
  const th = messages("th")
  const en = messages("en")
  const expected: Record<string, [string, string]> = {
    backToRound: ["กลับไปหน้ารอบ", "Back to the round"],
    backToList: ["กลับไปรายการไม่ตรง", "Back to the discrepancies"],
    followUpChipsLabel: ["งานที่ต้องติดตาม", "Follow-up work"],
    findingTopic: ["เรื่อง", "Issue"],
    roundShort: ["รอบ", "Round"],
    roundFilterAll: ["ทุกรอบ", "All rounds"],
    topicFilterAll: ["ทุกเรื่อง", "All issues"],
    filterNotListed: ["ไม่อยู่ในรายการ", "Not in the list"],
    componentOfParent: ["ส่วนควบของ {assetTag} {name}", "Component of {assetTag} {name}"],
    comparisonColumn: ["ตามระบบ → ที่พบ", "System → found"],
    panelTitle: ["พิจารณารายการไม่ตรง", "Review the discrepancy"],
    panelEmpty: ["เลือกรายการทางซ้ายเพื่อพิจารณา", "Choose a row on the left to review it"],
    panelNotFound: ["ไม่พบรายการไม่ตรงที่เลือก", "The chosen discrepancy was not found"],
    openAsset: ["เปิดหน้าทรัพย์สิน", "Open the asset"],
    exportFilteredHint: ["ตามตัวกรองที่เลือก", "With the filters in use"],
    emptySearchTitle: ["ไม่พบรายการไม่ตรงที่ตรงกับคำค้น", "No discrepancy matches the search"],
    emptySearchHelp: ["ลองคำค้นอื่น หรือล้างคำค้นเพื่อดูทุกรายการในแท็บนี้", "Try other words, or clear the search to see every row of this tab"],
    clearSearch: ["ล้างคำค้น", "Clear search"],
  }
  for (const [key, [thText, enText]] of Object.entries(expected)) {
    assert.equal(th[key], thText, `th ${key}`)
    assert.equal(en[key], enText, `en ${key}`)
  }
  // The tab and sub-chip words are today's keys, unchanged, and Task 2's tabFollowUp.
  for (const [key, text] of Object.entries({ status_pending: "รอพิจารณา", status_approved: "อนุมัติแล้ว", status_rejected: "ปฏิเสธแล้ว", tabFollowUp: "ต้องติดตาม", filterClosed: "ปิดแล้ว", status_all: "ทั้งหมด", filterActionOpen: "ต้องแก้ไข", filterOverdue: "เกินกำหนด", status_exception: "ต้องตรวจสอบพิเศษ", exportFindings: "ส่งออกรายการไม่ตรง", exportFindingsPdf: "ส่งออก PDF", quickFilters: "ตัวกรองงาน" })) {
    assert.equal(th[key], text, key)
  }
  for (const gone of ["resolutionTitle", "resolutionHelp", "quickFiltersHelp", "summaryPendingReview", "summaryPendingReviewHelp", "summaryOpenActions", "summaryOpenActionsHelp", "summaryOverdue", "summaryOverdueHelp", "summaryClosed", "summaryClosedHelp"]) {
    assert.equal(th[gone], undefined, `th ${gone}`)
    assert.equal(en[gone], undefined, `en ${gone}`)
  }
})
