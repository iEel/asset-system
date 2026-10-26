import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const PAGE = "src/app/[locale]/(dashboard)/audit/rounds/page.tsx"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const fn = (source: string, name: string) => {
  const start = source.indexOf(`\nfunction ${name}(`)
  assert.ok(start !== -1, `function ${name}`)
  const end = source.indexOf("\nfunction ", start + 1)
  return source.slice(start, end === -1 ? undefined : end)
}

test("audit rounds UX copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditRound.nextActionsTitle, "string")
    assert.equal(typeof messages.auditRound.nextActionsHelp, "string")
    assert.equal(typeof messages.auditRound.actionContinueScan, "string")
    assert.equal(typeof messages.auditRound.actionReviewFindings, "string")
    assert.equal(typeof messages.auditRound.actionCloseReadyRounds, "string")
    assert.equal(typeof messages.auditRound.quickFiltersTitle, "string")
    assert.equal(typeof messages.auditRound.viewAll, "string")
    assert.equal(typeof messages.auditRound.viewOpen, "string")
    assert.equal(typeof messages.auditRound.viewPending, "string")
    assert.equal(typeof messages.auditRound.viewReview, "string")
    assert.equal(typeof messages.auditRound.viewClosed, "string")
    assert.equal(typeof messages.auditRound.viewReadyToClose, "string")
    assert.equal(typeof messages.auditRound.readyToClose, "string")
    assert.equal(typeof messages.auditRound.blockedPendingReview, "string")
    assert.equal(typeof messages.auditRound.roundActionPending, "string")
    assert.equal(typeof messages.auditRound.roundActionOutOfScope, "string")
    assert.equal(typeof messages.auditRound.actionOpenActions, "string")
    assert.equal(typeof messages.auditRound.round, "string")
    assert.equal(typeof messages.auditRound.nextStep, "string")
    assert.equal(typeof messages.auditRound.searchRounds, "string")
    assert.equal(typeof messages.auditRound.roundCount, "string")
    assert.equal(typeof messages.auditRound.itemCount, "string")
    assert.equal(typeof messages.auditRound.daysLeft, "string")
    assert.equal(typeof messages.auditRound.daysOverdue, "string")
    assert.equal(typeof messages.auditRound.notStarted, "string")
    assert.equal(typeof messages.auditRound.progressLine, "string")
    assert.equal(typeof messages.auditRound.progressBarLabel, "string")
    assert.equal(typeof messages.auditRound.nextStepContinueScan, "string")
    assert.equal(typeof messages.auditRound.nextStepReview, "string")
    assert.equal(typeof messages.auditRound.nextStepActions, "string")
    assert.equal(typeof messages.auditRound.openActionsCount, "string")
    assert.equal(typeof messages.auditRound.coverageLine, "string")
    assert.equal(typeof messages.auditRound.coverageBreakdown, "string")
    assert.equal(typeof messages.auditRound.coverageOpenChecked, "string")
    assert.equal(messages.auditRound.actionContinueScan, messages === th ? "เดินตรวจต่อ" : "Continue the walk")
  }
})

test("the rounds list counts with the one round count: the strip round-wide, the search on the tabs and table only, coverage on own items (group 2 plan 1 task 5, R1, R4, R6)", () => {
  const page = read(PAGE)
  // Every round once, unsearched; the search gives ids only.
  assert.match(page, /prisma\.auditRound\.findMany\(\{\n\s+where: \{ isActive: true \},\n\s+include: auditRoundListInclude,\n\s+orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\],\n\s+\}\)/)
  assert.match(page, /searchText \? prisma\.auditRound\.findMany\(\{ where: \{ isActive: true, \.\.\.buildAuditRoundSearchWhere\(searchText\) \}, select: \{ id: true \} \}\) : null/)
  assert.match(page, /const rounds = matchedRounds \? allRounds\.filter\(\(round\) => matchedRoundIds\.has\(round\.id\)\) : allRounds/)
  // One round count for own items; decisions and action plans apart; out-of-scope finds from scan history (R4).
  assert.match(page, /getAuditRoundCounts\(roundIds\)/)
  assert.match(page, /by: \["auditRoundId", "reviewStatus", "actionStatus"\]/)
  assert.match(page, /OR: \[\{ reviewStatus: "pending" \}, \{ actionStatus: \{ in: \[\.\.\.openAuditFindingActionStatuses\] \} \}\]/)
  assert.match(page, /prisma\.auditScanHistory\.groupBy/)
  // Coverage: own items, the Bangkok year.
  assert.match(page, /where: withAuditRoundOwnItems\(\{ auditRound: \{ isActive: true, auditYear: currentYear, status: auditRoundCoverageWhere \} \}\)/)
  assert.match(page, /const currentYear = bangkokYear\(now\)/)
  // The strip and the coverage's open work: every operational round, unsearched (R1).
  assert.match(page, /const operationalRounds = allRounds\.filter\(\(round\) => isAuditRoundOperationalStatus\(round\.status\)\)/)
  assert.match(page, /const openWork = sumAuditRoundWork\(operationalRounds\.map\(insightOf\)\)/)
  assert.match(page, /const pendingRounds = filterRoundsByView\(allRounds, insightsByRoundId, "pending"\)/)
  assert.match(page, /const readyRounds = filterRoundsByView\(allRounds, insightsByRoundId, "readyToClose"\)/)
  // The table and the tab counts follow the search.
  assert.match(page, /const filteredRounds = filterRoundsByView\(rounds, insightsByRoundId, activeView\)/)
  assert.match(page, /count: filterRoundsByView\(rounds, insightsByRoundId, value\)\.length/)
  // The strip's links: the work view without the search, the action plans apart, no link to a ready round at 0 (R3, R8).
  assert.match(page, /: buildAuditRoundsHref\(locale, "pending", "", \{ pageSize: listPage\.pageSize \}\)/)
  assert.match(page, /count: openWork\.pendingReview,/)
  assert.match(page, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/findings\?status=action_open`, auditRoundsReturnHref\)/)
  assert.match(page, /href: readyRounds\.length > 0 \? buildAuditRoundsHref\(locale, "readyToClose", "", \{ pageSize: listPage\.pageSize \}\) : undefined,/)
  assert.doesNotMatch(page, /readyRounds\[0\]/, "the cell opens every ready round, not the newest one (final review I1)")
  assert.doesNotMatch(page, /_count: \{ select|round\._count|auditItem\.groupBy|openFollowUpCount|followUps|hasMismatch|"mismatch"|getFullYear\(\)/)
  assert.doesNotMatch(read("src/lib/audit-rounds-list-rules.ts"), /from "@\/|\bprisma\./, "the rules stay pure")
})

test("the rounds list in the spec's order: strip, status tabs and the work view's chip, the table with its search, then the folded coverage (group 2 spec §6)", () => {
  const page = read(PAGE)
  assert.match(page, /view\?: string/)
  const at = (needle: string) => {
    const index = page.indexOf(needle)
    assert.ok(index !== -1, needle)
    return index
  }
  const order = [
    'meta={t("roundCount", { count: formatCount(filteredRounds.length) })}',
    '<ActionPanel title={t("nextActionsTitle")} help={t("nextActionsHelp")} actions={actionItems} />',
    '<QuickFilterBar title={t("quickFiltersTitle")} current={activeTab} filters={statusTabs} />',
    '<FilterChipList chips={workViewChips} label={t("activeFilters")} removeLabel={t("clearFilter")} />',
    '<div className={cn(getPanelClasses(), "overflow-hidden")}>',
    'placeholder={t("searchRounds")}',
    '<details className={cn(getPanelClasses(), "group/coverage p-4 sm:p-5")}>',
  ].map(at)
  assert.deepEqual(order, [...order].sort((a, b) => a - b))
  // The work view (รอตรวจ / รอพิจารณา / ปิดรอบได้) is a chip under the กำลังดำเนินการ tab; removing it keeps the search.
  assert.match(page, /const workViewChips = isAuditRoundWorkView\(activeView\)\n\s+\? \[\{ key: activeView, label: viewLabels\[activeView\], href: buildAuditRoundsHref\(locale, "open", searchText, \{ pageSize: listPage\.pageSize \}\) \}\]\n\s+: \[\]/)
  assert.match(fn(page, "QuickFilterBar"), /<TabNav\b[\s\S]*?current=\{current\}[\s\S]*?scroll=\{false\}/)
  assert.doesNotMatch(page, /t\("subtitle"\)/)
})

test("the strip: เดินตรวจต่อ says how many open rounds it covers, รอบที่ปิดได้แล้ว has no link at 0 (group 2 spec §6, R8)", () => {
  const page = read(PAGE)
  assert.match(page, /help: t\("actionContinueScanHelp", \{ count: formatCount\(pendingRounds\.length\) \}\),/)
  assert.match(page, /href: readyRounds\.length > 0 \? buildAuditRoundsHref\(locale, "readyToClose", "", \{ pageSize: listPage\.pageSize \}\) : undefined,/)
  assert.doesNotMatch(page, /readyRounds\[0\]/, "the cell opens every ready round, not the newest one (final review I1)")
  assert.match(page, /href\?: string/)
})

test("the table: รอบ with the name as the link and the number under it, ขอบเขต with its items, dates with days left, a PaceBar, one status badge, ขั้นถัดไป in its own wrapping cell, ⋯ only (group 2 spec §6, §13 bug 1)", () => {
  const page = read(PAGE)
  const heads = [...page.matchAll(/<DataTableHead(?: [^>]*)?>\{(?:t|tCommon)\("(\w+)"\)\}<\/DataTableHead>/g)].map((match) => match[1])
  assert.deepEqual(heads, ["round", "scope", "dateRange", "progress", "status", "nextStep", "actions"])
  assert.equal(page.match(/<TableEmptyRow\s+colSpan=\{7\}/g)?.length, 2)
  assert.match(page, /<Link href=\{row\.detailHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "font-semibold"\)\}>\{round\.name\}<\/Link>/)
  assert.equal(page.match(/t\("itemCount", \{ count: formatCount\(row\.insight\.total\) \}\)/g)?.length, 2, "the scope's items, card and table")
  assert.match(page, /<DataTableCell className="min-w-44">\s*<RoundNextStep \{\.\.\.row\.nextStep\} \/>/)
  assert.match(page, /<RowActions\s+code=\{round\.auditNo\}\s+name=\{round\.name\}\s+menuLabel=\{tCommon\("moreActionsFor", \{ code: round\.auditNo \}\)\}\s+next=\{undefined\}\s+groups=\{row\.groups\}\s*\/>/)
  for (const part of ["RoundStatusBadges", "RoundNextStep", "RoundDates", "RoundProgress"]) {
    assert.equal(page.match(new RegExp(`<${part}\\b`, "g"))?.length, 2, `${part}: the phone card and the table`)
  }
  // One place builds a row: the next step with canScan, so a viewer never gets a scan link (E2E M5).
  assert.equal(page.match(/buildAuditRoundNextStep\(\{/g)?.length, 1)
  assert.match(page, /buildAuditRoundNextStep\(\{\n\s+locale,\n\s+roundId: round\.id,\n\s+insight,\n\s+canScan,\n\s+canClose: canCloseAuditRoundFromList\(\{ canApprove: canClose, userId: user\.id, createdBy: round\.createdBy \}\),\n\s+returnTo: auditRoundsReturnHref,\n\s+\}\)/)
  assert.match(page, /const detailHref = appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}`, auditRoundsReturnHref\)/)
  assert.doesNotMatch(page, /AuditProgressBar|buildRoundRowActions|buildAuditRoundWorkflowLinks|ReadyToCloseBadge|roundActionReview|blockedPendingItems|round\._count/)
})

test("ขั้นถัดไป wraps and is never cut: the main task on line 1, the second in warning text with its icon on line 2, the out-of-scope link beside it (group 2 spec §6, §13 bug 1)", () => {
  const nextStep = fn(read(PAGE), "RoundNextStep")
  assert.match(nextStep, /if \(!main && !second && !outOfScope\) return <Nil \/>/)
  assert.match(nextStep, /<Link href=\{main\.href\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-start font-medium md:min-h-0"\)\}>\{main\.label\}<\/Link>/)
  assert.match(nextStep, /<span className="inline-flex items-center gap-1 text-warning">\s*<WarningIcon aria-hidden="true" className="size-3\.5 shrink-0" \/>\s*\{second\}\s*<\/span>/)
  assert.match(nextStep, /<Link href=\{outOfScope\.href\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-meta md:min-h-0"\)\}>\{outOfScope\.label\}<\/Link>/)
  assert.doesNotMatch(nextStep, /truncate|whitespace-nowrap|line-clamp|w-30|max-w-/)
})

test("one status badge: the round's status, or รอพิจารณา when it is fully scanned with decisions pending; พร้อมปิดรอบ beside it; dates and progress by the rules (group 2 spec §6, §14)", () => {
  const page = read(PAGE)
  const badges = fn(page, "RoundStatusBadges")
  assert.match(badges, /isAuditRoundAwaitingDecision\(insight\) \? \(\s*<StatusBadge label=\{labels\.pendingReview\} tone="warning" \/>\s*\) : \(\s*<StatusBadge label=\{labels\.status\} status=\{effectiveAuditRoundStatus\(status\)\} \/>\s*\)/)
  assert.match(badges, /\{insight\.readyToClose \? <StatusBadge label=\{labels\.ready\} tone="success" \/> : null\}/)
  const dates = fn(page, "RoundDates")
  assert.match(dates, /due\.kind === "overdue" \? "text-danger" : "text-warning"/)
  const progress = fn(page, "RoundProgress")
  assert.match(progress, /if \(!progress\.started\) return <span className="text-muted-foreground">\{notStarted\}<\/span>/)
  assert.match(progress, /<PaceBar value=\{progress\.value\} pace=\{null\} label=\{barLabel\} behind=\{false\} \/>/)
  assert.match(page, /due: buildAuditRoundDueLine\(round\.status, round\.endDate, today\),/)
  assert.match(page, /progress: buildAuditRoundProgress\(insight\),/)
  assert.match(page, /const canClose = hasPermission\(user, "audit", "approve"\)/)
  assert.match(page, /const today = startOfBangkokDay\(now\)/)
})

test("the coverage folds to one line (bar, percent, sentence) and opens the five numbers and the gap lists (group 2 spec §6, §13 bug 5, R6)", () => {
  const page = read(PAGE)
  const details = page.slice(page.indexOf('<details className={cn(getPanelClasses(), "group/coverage p-4 sm:p-5")}>'), page.indexOf("</details>"))
  const summary = details.slice(0, details.indexOf("</summary>"))
  assert.match(summary, /<h2 className="text-base font-semibold text-foreground">\{t\("coverageTitle", \{ year: toDisplayYear\(currentYear, locale\) \}\)\}<\/h2>/)
  // The bar is named by the percent, and the visible percent is not read again, so the line is read once (final review M4).
  assert.match(summary, /<PaceBar value=\{coverageShare\} pace=\{null\} label=\{formatPercent\(coverageShare\)\} behind=\{false\} \/>/)
  assert.match(summary, /<span className="num text-sm font-semibold text-foreground" aria-hidden="true">\{formatPercent\(coverageShare\)\}<\/span>/)
  assert.doesNotMatch(summary, /label=\{coverageLine\}/)
  // The open/closed cue: a chevron that turns when the panel is open.
  assert.match(summary, /<ChevronDown className="size-4 shrink-0 motion-safe:transition-transform group-open\/coverage:rotate-180" aria-hidden="true" \/>/)
  assert.match(summary, /\{coverageLine\}/)
  assert.match(summary, /\{t\("coverageBreakdown"\)\}/)
  assert.match(page, /const coverageLine = t\("coverageLine", \{ covered: formatCount\(coveredAssetCount\), total: formatCount\(activeAssets\.length\), missing: formatCount\(uncoveredAssetCount\) \}\)/)
  const open = details.slice(details.indexOf("</summary>"))
  for (const key of ["activeAssets", "covered", "uncovered", "openPendingItems", "openPendingReview"]) assert.match(open, new RegExp(`\\{ key: "${key}", label: t\\(`), key)
  assert.match(open, /value: formatCount\(openWork\.pending\), foot: t\("coverageOpenChecked", \{ count: formatCount\(openWork\.checked\) \}\)/)
  assert.match(open, /\{t\("coverageRoundCount"\)\}: <span className="num font-semibold text-foreground">\{formatCount\(currentYearRoundCount\)\}<\/span>/)
  assert.equal(open.match(/<CoverageGapList\b/g)?.length, 2)
})

test("DESIGN.md: the rounds list draws its bars with PaceBar; AuditProgressBar stays on the round page until plan 2 (group 2 plan 1 task 6)", () => {
  const design = read("DESIGN.md")
  const rule = design.slice(design.indexOf("\n**The Data Bars Rule.** "), design.indexOf("\n**The Status With Evidence Rule.** "))
  assert.ok(rule.includes("`AuditProgressBar` (the round page, until group 2 plan 2) and the audit scan header's bar are older progress bars"))
  assert.ok(rule.includes("The rounds list draws each round's progress and the year's coverage with `PaceBar` (group 2 plan 1)."))
})
