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
  // Both menus are non-modal, as every menu of the app: a modal one hides the page (aria-hidden) while the skip link
  // and the navigation stay focusable (axe aria-hidden-focus, E2E-1027B).
  assert.equal((menus.match(/<DropdownMenu\b[^>]*>/g) ?? []).length, 2)
  assert.deepEqual(menus.match(/<DropdownMenu\b[^>]*>/g), ["<DropdownMenu modal={false}>", "<DropdownMenu modal={false}>"])
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
  assert.match(card, /<Link href=\{mainLink\.href\} className=\{buttonVariants\(\{ variant: mainLink\.primary \? "default" : "outline", size: "md" \}\)\}>/)
  // Step 2 without audit:approve: a neutral link to the same findings, no call to review (final review M2).
  assert.match(page, /label: mainAction\.decide \? t\("nextStepReviewItems", \{ count: formatCount\(mainAction\.count\) \}\) : t\("nextStepViewPendingFindings", \{ count: formatCount\(mainAction\.count\) \}\), icon: <FileText className="h-4 w-4" \/>, primary: mainAction\.decide \}/)
  assert.match(card, /t\("stepWalkChecked", \{ checked: formatCount\(data\.steps\.walk\.checked\), total: formatCount\(data\.steps\.walk\.total\) \}\)/)
  // Step 2 counts findings (P2-R26): "รอ n" opens the findings page whose rows it counts, as "พิจารณา n รายการ" does.
  assert.match(card, /\{data\.steps\.review\.pendingFindings > 0 \? \(\s*<Link href=\{pendingReviewFindingsHref\}/)
  assert.match(card, /t\("stepReviewWaiting", \{ count: formatCount\(data\.steps\.review\.pendingFindings\) \}\)/)
  assert.match(card, /t\("stepReviewDecided", \{ count: formatCount\(data\.steps\.review\.decidedFindings\) \}\)/)
  assert.doesNotMatch(card, /result: "pending_review"/, "the step's count is findings, not the items of the list")
  assert.match(card, /\{closeConditions\.map\(\(condition\) => \(/)
  assert.doesNotMatch(card, /truncate|whitespace-nowrap|w-30/, "nothing in the card is cut")
  assert.match(page, /\{ key: "opener", ok: !data\.steps\.close\.openedByViewer, label: data\.steps\.close\.openedByViewer \? t\("closeOwnRoundNotice"\) : t\("closeSeparateApprover"\) \}/)
  // A closed round: one met line, "รอบนี้ปิดแล้ว", and no opener's row or warning (P2-R8, final review M1).
  assert.match(page, /const closeConditions: Array<\{ key: string; ok: boolean; label: string; href\?: string \}> = round\.status === "closed" \? \[\{ key: "closed", ok: true, label: t\("stepsClosedTitle"\) \}\] : \[\n\s+\{ key: "pendingItems"/)
  const close = read("src/components/audit/audit-round-close-button.tsx")
  assert.match(close, /export function AuditRoundCloseButton\(\{ roundId, disabled \}: \{ roundId: string; disabled: boolean \}\)/)
  assert.match(close, /return \(\s*<Button onClick=\{closeRound\} busy=\{saving\} disabled=\{disabled\}>\s*<Lock aria-hidden="true" \/>\s*\{t\("closeRound"\)\}\s*<\/Button>\s*\)/)
  assert.doesNotMatch(close, /ContentPanel|StatStrip|Notice|checklist/)
})

test("the phone bar: the main step first, the pending list, the findings to decide, back; no scan item without audit:edit (spec §8, P2-R7)", () => {
  const page = read(PAGE)
  assert.match(page, /const barActions: ActionBarLink\[\] = \[\n\s+\.\.\.\(mainLink \? \[mainLink\] : \[\]\),\n\s+\.\.\.\(mainLink\?\.href === pendingHref \? \[\] : \[\{ href: pendingHref, label: t\("pendingAssets"\), icon: <ListChecks className="h-4 w-4" \/> \}\]\),\n\s+\.\.\.\(mainAction\?\.kind === "review" \? \[\] : \[\{ href: pendingReviewFindingsHref, label: t\("openFindingReview"\), icon: <FileText className="h-4 w-4" \/> \}\]\),\n\s+\{ href: returnToHref, label: tCommon\("back"\), icon: <ArrowLeft className="h-4 w-4" \/> \},\n\s+\]/)
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

test("the table: ผล / ทรัพย์สิน / สิ่งที่ต่าง / ตรวจโดย / รูป / พิจารณา, then ⋯ with แก้ไขผลตรวจ for audit:edit only, on a checked item only, an out-of-scope find included (spec §8, P2-R7, P2-R17, P3-R4)", () => {
  const page = read(PAGE)
  const heads = [...page.matchAll(/<DataTableHead(?: [^>]*)?>\{(?:t|tCommon)\("(\w+)"\)\}<\/DataTableHead>/g)].map((match) => match[1])
  assert.deepEqual(heads, ["result", "assetColumn", "differenceColumn", "checkedByColumn", "photoColumn", "reviewColumn", "actions"])
  assert.equal(page.match(/<TableEmptyRow\s+colSpan=\{7\}/g)?.length, 1)
  assert.match(page, /const editHref = canScan && !isRoundReadOnly && item\.auditStatus !== "pending" \? buildAuditRoundScanEditHref\(\{ locale, roundId: round\.id, assetId: item\.asset\.id, returnTo: listHref \}\) : null/)
  assert.match(page, /<RowActions\s+code=\{item\.asset\.assetTag\}\s+name=\{item\.asset\.name\}\s+menuLabel=\{tCommon\("moreActionsFor", \{ code: item\.asset\.assetTag \}\)\}\s+next=\{undefined\}\s+groups=\{item\.groups\}\s*\/>/)
  assert.match(page, /\.\.\.\(editHref \? \[\{ kind: "link" as const, key: "edit", label: t\("editScanResult"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\] : \[\]\),/)
  assert.match(page, /\{ kind: "link" as const, key: "view", label: tCommon\("view"\), href: assetHref, icon: <Eye aria-hidden="true" \/> \},/)
  assert.match(page, /missingComponents: item\.missingComponents\.map\(\(component\) => \(\{ \.\.\.component, href: pageHref\(roundWideFilters, \{ search: component\.assetTag \}\) \}\)\)/)
  assert.equal(page.match(/<RoundItemDifferences\b/g)?.length, 2, "the phone card and the table")
  assert.equal(page.match(/<RoundItemMissingComponents\b/g)?.length, 2, "the phone card and the table")
  assert.match(page, /\{item\.editHref \? \(\s*<div className="mt-3 flex justify-end">\s*<Link href=\{item\.editHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.doesNotMatch(page, /item\.asset\.currentLocation|item\.asset\.custodian|t\("expectedLocation"\)/, "the table shows what differed, not the asset's current values")
  // สิ่งที่ต่าง reads the field's name, "แผนก: ฝ่ายบัญชี → ฝ่ายขาย", never the finding's type (board AU-Round).
  assert.match(page, /label: t\(`differenceField_\$\{difference\.field\}`\),/)
  assert.doesNotMatch(page, /label: tFinding\(`type_\$\{difference\.findingType\}`\)/)
  const messages = JSON.parse(read("messages/th.json"))
  assert.deepEqual(["location", "department", "custodian", "condition"].map((field) => messages.auditRound[`differenceField_${field}`]), ["ที่ตั้ง", "แผนก", "ผู้ถือครอง", "สภาพ"])
  // A long tag wraps inside the phone card; the ผล badge keeps its size beside it.
  assert.match(page, /<div className="flex min-w-0 items-start justify-between gap-2">\s*<Link href=\{item\.assetHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 min-w-0 items-center md:min-h-0"\)\}>\s*<span className="tag min-w-0 whitespace-normal break-all font-medium">\{item\.asset\.assetTag\}<\/span>\s*<\/Link>\s*<StatusBadge className="shrink-0" label=\{item\.resultLabel\} tone=\{item\.resultTone\} \/>/)
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
