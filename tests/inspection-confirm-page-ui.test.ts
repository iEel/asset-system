import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// ยืนยันผลตรวจ, the round's confirm page (inspection-confirm plan 3 task 2): the server page and the read-only list.
// Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/audit/rounds/[id]/confirm/page.tsx"
const WORKSPACE = "src/components/audit/inspection-confirm/inspection-confirm-workspace.tsx"
const ROW = "src/components/audit/inspection-confirm/inspection-row.tsx"

test("the page gates on audit:view, offers confirm to asset:edit and reads the round's rows (plan 3 task 2)", () => {
  const page = read(PAGE)
  assert.match(page, /requirePagePermission\(locale, "audit", "view"\)/)
  assert.match(page, /hasPermission\(user, "asset", "edit"\)/)
  assert.match(page, /loadRoundInspectionRows\(prisma, /)
  assert.match(page, /\.map\(toInspectionPageRow\)/)
  assert.match(page, /params: Promise<\{ locale: string; id: string \}>/)
  assert.match(page, /searchParams: Promise</)
})

test("a missing or inactive round is notFound(); a cancelled round shows the header and cancelledNotice only", () => {
  const page = read(PAGE)
  assert.match(page, /if \(!round \|\| !round\.isActive\) notFound\(\)/)
  const cancelled = page.slice(page.indexOf('if (round.status === "cancelled")'))
  assert.ok(page.includes('if (round.status === "cancelled")'))
  const branch = cancelled.slice(0, cancelled.indexOf("const rows"))
  assert.match(branch, /t\("cancelledNotice"\)/)
  assert.doesNotMatch(branch, /InspectionConfirmWorkspace/)
})

test("the header: the trail ตรวจนับ › รอบตรวจนับ › auditNo › ยืนยันผลตรวจ, eyebrow, title, lead and the back link", () => {
  const page = read(PAGE)
  assert.match(page, /\{ label: t\("crumbAudit"\)/)
  assert.match(page, /\{ label: t\("crumbRounds"\), href: `\/\$\{locale\}\/audit\/rounds` \}/)
  assert.match(page, /\{ label: round\.auditNo, href: links\.round, code: true \}/)
  assert.match(page, /\{ label: t\("title"\) \}/)
  assert.match(page, /t\("eyebrow", \{ auditNo: round\.auditNo \}\)/)
  assert.match(page, /t\("lead"\)/)
  assert.match(page, /<PageBackLink href=\{links\.round\} label=\{t\("backToRound"\)\} \/>/)
})

test("the round page's way back comes along: returnTo read as the pending page reads it, for the crumb, the back link, the empty state and the tabs (final review)", () => {
  const page = read(PAGE)
  assert.match(page, /searchParams: Promise<\{ tab\?: string \| string\[\]; returnTo\?: string \| string\[\] \}>/)
  assert.match(page, /const roundHref = normalizeAuditRoundDetailReturnTo\(locale, round\.id, rawReturnTo\)/)
  assert.match(page, /round: roundHref,/)
  assert.match(page, /returnTo=\{rawReturnTo \? roundHref : null\}/)
  // No pagination, on purpose (the ruling), said where the rows are read.
  assert.match(page, /No pagination[\s\S]{0,200}INSPECTION_CONFIRM_MAX_ASSETS \(500\)/)
  const workspace = read(WORKSPACE)
  assert.match(workspace, /if \(returnTo\) params\.set\("returnTo", returnTo\)/)
  assert.match(workspace, /href: tabHref\(key\)/)
})

test("the links: the round, its pending findings and the round page's pending list", () => {
  const page = read(PAGE)
  assert.match(page, /pendingFindings: `\/\$\{locale\}\/audit\/findings\?status=pending&roundId=\$\{round\.id\}`/)
  assert.match(page, /pendingItems: appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/pending`, roundHref\)/)
  assert.match(page, /prisma\.assetStatus\.findMany\(/)
})

test("the workspace: no rows at all is ActionEmptyState back to the round, without tabs", () => {
  const workspace = read(WORKSPACE)
  assert.match(workspace, /^"use client"/)
  const empty = workspace.slice(workspace.indexOf("if (total === 0)"), workspace.indexOf("<TabNav"))
  assert.match(empty, /<ActionEmptyState/)
  assert.match(empty, /title=\{t\("emptyTitle"\)\}/)
  assert.match(empty, /description=\{t\("emptyBody"\)\}/)
  assert.match(empty, /actionHref=\{links\.round\}/)
  assert.match(empty, /actionLabel=\{t\("backToRound"\)\}/)
  assert.match(workspace, /t\("emptyTabTitle"\)/)
})

test("the tabs: five, each with its count, linking with ?tab=", () => {
  const workspace = read(WORKSPACE)
  assert.match(workspace, /inspectionConfirmTabs\.map\(/)
  assert.match(workspace, /count: formatCount\(counts\[key\]\)/)
  assert.match(workspace, /const params = new URLSearchParams\(\{ tab: key \}\)/)
  assert.match(workspace, /return `\$\{confirmPath\}\?\$\{params\.toString\(\)\}`/)
})

test("the tick column only where ticking is possible (ready tab and asset:edit); noEditNotice without asset:edit (final review)", () => {
  const workspace = read(WORKSPACE)
  const row = read(ROW)
  assert.match(workspace, /\{!canConfirm \? <Notice tone="info"[^>]*>\{t\("noEditNotice"\)\}<\/Notice> : null\}/)
  assert.match(workspace, /const ticking = canConfirm && \(tab === "ready" \|\| tab === "notFound"\)/)
  assert.match(workspace, /\{ticking \? <DataTableHead/)
  assert.match(workspace, /const columnCount = 5 \+ \(ticking \? 1 : 0\) \+ \(damagedActions \? 1 : 0\)/)
  assert.equal(workspace.match(/canConfirm=\{ticking\}/g)?.length, 2, "the card and the table row")
  assert.match(row, /\{canConfirm \? <DataTableCell/)
  // A ready tab with nothing to tick names the column neutrally.
  assert.match(workspace, /\) : \(\n\s+t\("selectColumn"\)\n\s+\)/)
})

test("tab banners: awaiting review links to pending findings, not scanned to the pending list; laterTabNote is gone (plan 4 task 3)", () => {
  const workspace = read(WORKSPACE)
  assert.match(workspace, /t\("awaitingReviewBanner"\)/)
  assert.match(workspace, /href=\{links\.pendingFindings\}/)
  assert.match(workspace, /t\("notScannedBanner"\)/)
  assert.match(workspace, /href=\{links\.pendingItems\}/)
  assert.doesNotMatch(workspace, /laterTabNote/)
})

test("the row: tag links to the asset, result badge from auditRoundResultBadge, holder or noHolder, target badge or handoverUnclear, finding link", () => {
  const row = read(ROW)
  assert.match(row, /`\/\$\{locale\}\/assets\/\$\{row\.assetId\}`/)
  assert.match(row, /auditRoundResultBadge\(row\.auditStatus, row\.auditResult\)/)
  assert.match(row, /tRound\(badge\.labelKey\)/)
  assert.match(row, /t\("noHolder"\)/)
  // A not-found row becomes Missing (plan 2's data computes targetStatusName for "confirm" only).
  assert.match(row, /return row\.tab === "notFound" \? "Missing" : row\.targetStatusName/)
  assert.match(row, /statusLabels\[target\]/)
  assert.match(row, /className="text-warning[^"]*">\{t\("handoverUnclear"\)\}/)
  // The finding link keeps the round (final review): this round's pending list, its back link to the round.
  assert.match(row, /`\/\$\{locale\}\/audit\/findings\?status=pending&roundId=\$\{roundId\}&finding=\$\{row\.firstPendingFindingId\}`/)
  assert.equal(read(WORKSPACE).match(/roundId=\{roundId\} row=\{row\}/g)?.length, 2)
  assert.match(row, /t\("openFinding"\)/)
})

test("phone cards below md, the table from md (the house classes)", () => {
  const workspace = read(WORKSPACE)
  assert.match(workspace, /getMobileCardListClasses\(\)/)
  assert.match(workspace, /getDesktopTableOnlyClasses\(\)/)
  assert.match(workspace, /<InspectionRowCard /)
  assert.match(workspace, /<InspectionTableRow /)
})

// Plan 3 task 3: the selection, the confirm dialog and the result.
const DIALOG = "src/components/audit/inspection-confirm/inspection-confirm-dialog.tsx"

test("the dialog posts { assetIds, reason, outcome } to the round's confirm-results route (plan 3 task 3, plan 4 task 3)", () => {
  const dialog = read(DIALOG)
  assert.match(dialog, /^"use client"/)
  assert.match(dialog, /fetch\(`\/api\/audit-rounds\/\$\{roundId\}\/confirm-results`/)
  assert.match(dialog, /JSON\.stringify\(\{ assetIds, reason, outcome \}\)/)
  assert.match(dialog, /outcome: InspectionConfirmOutcome/)
})

test("a 409 reads blocked and maps its codes through inspectionBlockedMessageKeys; after 200 and 409 the owner settles", () => {
  const dialog = read(DIALOG)
  const workspace = read(WORKSPACE)
  const conflict = dialog.slice(dialog.indexOf("response.status === 409"))
  assert.ok(dialog.includes("response.status === 409"))
  assert.match(conflict.slice(0, 400), /payload\?\.blocked/)
  assert.match(workspace, /inspectionBlockedMessageKeys\[/)
  assert.ok(dialog.includes("if (response.ok)"))
  // The dialog no longer refreshes: the workspace replaces the URL with the same tab.
  assert.doesNotMatch(dialog, /router\.|useRouter/)
  assert.match(workspace, /void settle\(\{ kind: "success", confirmed, outcome: /)
  assert.match(workspace, /void settle\(\{ kind: "changed", blocked \}\)/)
})

test("after a confirm the page stays on its tab, the answer shows once the dialog has closed, and takes focus (final review)", () => {
  const workspace = read(WORKSPACE)
  const settle = workspace.slice(workspace.indexOf("async function settle("), workspace.indexOf("function handleConfirmed("))
  assert.ok(workspace.includes("async function settle("))
  const steps = ["const closed = waitForDialogToClose()", "closeDialog()", "router.replace(tabHref(tab), { scroll: false })", "await closed", "setResult({ ...answer, roundId, tab, focused: false }"]
  const at = steps.map((step) => settle.indexOf(step))
  for (const [index, position] of at.entries()) assert.ok(position >= 0, steps[index])
  assert.deepEqual([...at].sort((a, b) => a - b), at, "in order")
  assert.doesNotMatch(workspace, /router\.refresh\(\)/)
  // The answer outlives the replace's remount: it is the layout's state, for this round and tab.
  assert.match(workspace, /const \{ result, setResult \} = useInspectionConfirmResult\(\)/)
  assert.match(workspace, /const shownResult = result\?\.roundId === roundId && result\.tab === tab \? result : null/)
  assert.match(read("src/app/[locale]/(dashboard)/audit/rounds/[id]/confirm/layout.tsx"), /<InspectionConfirmResultProvider>\{children\}<\/InspectionConfirmResultProvider>/)
  // The region: always mounted, focusable, the dialog's fallback, focused once the answer shows.
  assert.match(workspace, /ref=\{resultRegionRef\}\n\s+role="status"\n\s+aria-live="polite"\n\s+tabIndex=\{-1\}/)
  assert.match(workspace, /fallbackFocusRef=\{resultRegionRef\}/)
  assert.match(workspace, /resultRegionRef\.current\?\.focus\(\)/)
  const dialog = read(DIALOG)
  assert.match(dialog, /fallbackFocusRef=\{fallbackFocusRef\}/)
})

test("the dialog's server error is announced; the cap notice sits in an always-mounted status region (final review)", () => {
  const dialog = read(DIALOG)
  assert.match(dialog, /\{error \? <p role="alert" className="mt-2 text-sm text-danger">/)
  const workspace = read(WORKSPACE)
  assert.match(workspace, /<div role="status" aria-live="polite" className="min-w-0">\n\s+\{capped \? <Notice tone="info">\{t\("cappedNotice"/)
})

test("the dialog: AccessibleDialog with busy, the reason prefilled with reasonDefault and auditNo, 3–500 after trim", () => {
  const dialog = read(DIALOG)
  assert.match(dialog, /<AccessibleDialog/)
  assert.match(dialog, /busy=\{isSubmitting\}/)
  assert.match(dialog, /t\("reasonDefault", \{ auditNo \}\)/)
  assert.match(dialog, /minLength\(values\.reason, 3\)/)
  assert.match(dialog, /maxLength\(values\.reason\.trim\(\), 500\)/)
  assert.match(dialog, /fieldErrors\.applyServer\(payload\)/)
  assert.match(dialog, /t\("historyNote"\)/)
  assert.match(dialog, /status: "In Use", key: "dialogLineInUse"/)
  assert.match(dialog, /\{t\(line\.key\)\}/)
  assert.match(dialog, /returnFocusRef=\{returnFocusRef\}/)
  // A second submit while posting is ignored.
  assert.match(dialog, /if \(submittingRef\.current\) return/)
})

test("select-all uses selectAllInspectionRows and says when it caps; the bars: DesktopSelectionBar and a md:hidden phone bar", () => {
  const workspace = read(WORKSPACE)
  assert.match(workspace, /selectAllInspectionRows\(/)
  assert.match(workspace, /t\("cappedNotice", \{ max: /)
  assert.match(workspace, /<DesktopSelectionBar/)
  assert.match(workspace, /sticky bottom-\[calc\(3\.75rem\+env\(safe-area-inset-bottom\)\)\][^"]*md:hidden/)
  assert.match(workspace, /t\("selectionSummary", \{/)
  assert.match(workspace, /t\("confirmOpen"\)/)
  assert.match(workspace, /isInspectionRowSelectable\(/)
})

test("a ready row with no target has a disabled tick described by its handoverUnclear text; the selection is per tab", () => {
  const workspace = read(WORKSPACE)
  const row = read(ROW)
  assert.match(workspace, /aria-describedby=\{/)
  assert.match(row, /id=\{unclearId\}/)
  assert.match(workspace, /selection\.tab === tab/)
  assert.match(workspace, /t\("successNotice", \{ count: /)
  assert.match(workspace, /t\("changedNotice"\)/)
})

test("a row waiting on a decision or a check shows no target status yet (inspection-confirm plan 3 look step)", () => {
  const row = readFileSync("src/components/audit/inspection-confirm/inspection-row.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(row, /row\.tab === "awaitingReview" \|\| row\.tab === "notScanned" \? \(\n\s*<Nil \/>/)
})

// Inspection-confirm plan 4 task 3: the damaged and not-found tabs, the lost-disposal block and the disposal line.
const DATA = "src/lib/inspection-confirm-data.ts"
const NEW_DISPOSAL = "src/app/[locale]/(dashboard)/disposal/new/page.tsx"
const REQUEST_FORM = "src/components/disposal/disposal-request-form.tsx"

test("the page passes canRepair and canDispose and reads the round's disposal summary (plan 4 task 3)", () => {
  const page = read(PAGE)
  assert.match(page, /const canRepair = hasPermission\(user, "maintenance", "create"\)/)
  assert.match(page, /const canDispose = hasPermission\(user, "disposal", "create"\)/)
  assert.match(page, /canRepair=\{canRepair\}/)
  assert.match(page, /canDispose=\{canDispose\}/)
  assert.match(page, /loadRoundDisposalSummary\(prisma, round\.id\)/)
})

test("the damaged buttons open the dialog with outcome damaged for one asset; router.push only after a 200", () => {
  const workspace = read(WORKSPACE)
  assert.match(workspace, /t\("damagedRepair"\)/)
  assert.match(workspace, /t\("damagedDispose"\)/)
  assert.match(workspace, /openDamaged\(event, row, damagedRepairHref\(/)
  assert.match(workspace, /openDamaged\(event, row, damagedDisposalHref\(/)
  assert.match(workspace, /outcome: "damaged", assetIds: \[row\.assetId\]/)
  // The repair button needs maintenance:create, the disposal button disposal:create, both canConfirm.
  assert.match(workspace, /const damagedActions = canConfirm && tab === "damaged" && \(canRepair \|\| canDispose\)/)
  assert.match(workspace, /\{canRepair \? \(/)
  assert.match(workspace, /\{canDispose \? \(/)
  // router.push appears once, inside handleConfirmed (the dialog's 200 branch).
  assert.equal(workspace.match(/router\.push\(/g)?.length, 1)
  const confirmed = workspace.slice(workspace.indexOf("function handleConfirmed("), workspace.indexOf("function handleChanged("))
  assert.match(confirmed, /router\.push\(next\)/)
  const dialog = read(DIALOG)
  const ok = dialog.slice(dialog.indexOf("if (response.ok)"), dialog.indexOf("response.status === 409"))
  assert.match(ok, /onConfirmed\(/)
  // The damaged returnTo is this page on the damaged tab.
  assert.match(workspace, /tabHref\("damaged"\)/)
})

test("the not-found bar opens the dialog with outcome missing; the dialog's defaults and lines follow the outcome", () => {
  const workspace = read(WORKSPACE)
  assert.match(workspace, /t\("missingOpen"\)/)
  assert.match(workspace, /openBulk\(event, tab === "notFound" \? "missing" : "confirm"\)/)
  const dialog = read(DIALOG)
  assert.match(dialog, /t\("damagedReasonDefault", \{ auditNo \}\)/)
  assert.match(dialog, /t\("missingReasonDefault", \{ auditNo \}\)/)
  assert.match(dialog, /status: "Missing", key: "missingDialogLine"/)
  assert.match(dialog, /t\("missingDialogTitle", \{ count: assetIds\.length \}\)/)
  assert.match(dialog, /t\("missingSubmit", \{ count: assetIds\.length \}\)/)
  assert.match(workspace, /t\("missingSuccess", \{ count: /)
})

test("the lost-disposal block shows under the not-found tab, also when empty, with disposal:create", () => {
  const workspace = read(WORKSPACE)
  assert.match(workspace, /const lostHref = canDispose \? lostDisposalHref\(locale, roundId, missingForDisposal, tabHref\("notFound"\)\) : null/)
  assert.match(workspace, /tab === "notFound" && lostHref \?/)
  assert.match(workspace, /t\("lostBlock", \{ count: missingForDisposal\.length \}\)/)
  assert.match(workspace, /t\("lostLink"\)/)
  // Shown when the whole confirm list is empty too (the not-found assets have left Under Inspection).
  const empty = workspace.slice(workspace.indexOf("if (total === 0)"), workspace.indexOf("const tabItems"))
  assert.match(empty, /\{lostBlock\}/)
})

test("the disposal line under the header: requests and approved, the round link when approved > 0", () => {
  const page = read(PAGE)
  assert.match(page, /disposal\.requests > 0 \?/)
  assert.match(page, /t\("disposalLine", \{ requests: disposal\.requests, approved: disposal\.approved \}\)/)
  assert.match(page, /disposal\.approved > 0 \?/)
  assert.match(page, /`\/\$\{locale\}\/disposal\?status=approved&auditRound=\$\{round\.id\}`/)
  assert.match(page, /t\("disposalRoundLink"\)/)
})

test("loadRoundDisposalSummary: not-found items of Missing assets with no open request, by tag; requests from the round", () => {
  const data = read(DATA)
  const body = data.slice(data.indexOf("export async function loadRoundDisposalSummary("))
  assert.ok(data.includes("export async function loadRoundDisposalSummary("))
  assert.match(body, /auditResult: "not_found"/)
  assert.match(body, /status: \{ name: "Missing" \}/)
  assert.match(body, /requestStatus: \{ in: \["pending", "approved"\] \}/)
  assert.match(body, /loadAuditRoundDisposalFindingIds\(db, auditRoundId\)/)
  assert.match(body, /sourceType: "audit_round", sourceId: auditRoundId/)
  assert.match(body, /requestStatus: "approved"/)
})

test("/disposal/new starts with the method of a valid ?type= (the lost link passes type=lost)", () => {
  const page = read(NEW_DISPOSAL)
  assert.match(page, /initialDisposalType=\{initialMethod\}/)
  assert.match(page, /disposalTypeFilters as readonly string\[\]\)\.includes\(initialDisposalType\)/)
  const form = read(REQUEST_FORM)
  assert.match(form, /initialDisposalType\?: string/)
  assert.match(form, /disposalType: initialDisposalType \?\? "",/)
})
