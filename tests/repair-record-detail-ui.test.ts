import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const detailPath = "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx"
const actionsPath = "src/components/maintenance/repair-record-actions.tsx"
const printPath = "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx"

test("an unfinished record offers one finish action and a confirmed cancel", () => {
  const source = readFileSync(actionsPath, "utf8")
  assert.match(source, /action: "complete"/)
  assert.match(source, /action: "cancel"/)
  assert.match(source, /AccessibleDialog/)
  assert.match(source, /expectedUpdatedAt/)
  assert.match(source, /toLocalDateInputValue\(\)/)
})

test("finishing a repair starts from the existing remark instead of replacing it", () => {
  const source = readFileSync(actionsPath, "utf8")
  const completeState = source.match(/function completeFrom\([^)]*\)[^{]*\{\s*return \{\s*returnDate: toLocalDateInputValue\(\),[^}]*\}/)
  assert.ok(completeState, "complete dialog state not found")
  assert.match(completeState[0], /remark: details\.remark/)
  assert.match(completeState[0], /conditionId: initialConditionId/)
})

// Final review 1 (Critical): router.refresh() keeps the client state, so each dialog takes the record's current values
// every time it opens, never the values of the first page load.
test("each dialog reads the record's current values when it opens, not the page load's (final review 1)", () => {
  const source = readFileSync(actionsPath, "utf8").replace(/\r\n/g, "\n")
  const opener = (name: string) => {
    const start = source.indexOf(`${name}: (opener?: HTMLElement | null) => {`)
    assert.ok(start > 0, name)
    return source.slice(start, source.indexOf("},", start))
  }
  assert.match(opener("openComplete"), /setComplete\(completeFrom\(details, initialConditionId\)\)/)
  assert.match(opener("openEdit"), /setEdit\(editFrom\(details\)\)/)
  assert.match(opener("openCancel"), /setReason\(""\)/)
  assert.match(source, /\}\), \[details, initialConditionId\]\)/, "the openers read the latest details")
  assert.match(source, /useState\(\(\) => completeFrom\(details, initialConditionId\)\)/)
  assert.match(source, /useState\(\(\) => editFrom\(details\)\)/)
  assert.match(source, /function editFrom\(details: RecordDetails\) \{\n\s+return \{\n\s+reportedDate: details\.reportedDate,\n\s+problem: details\.problem,/)
})

test("editing changes details only, never status or result", () => {
  const source = readFileSync(actionsPath, "utf8")
  const updateBody = source.slice(source.indexOf('action: "update"'), source.indexOf('action: "update"') + 400)
  assert.doesNotMatch(updateBody, /outcome|repairStatus/)
})

test("the detail page drops the old workflow controls", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /<RepairRecordActionsProvider\b/)
  assert.doesNotMatch(source, /MaintenanceTicket(Close|Status|Planning|Cancel)Button/)
  assert.doesNotMatch(source, /closeChecklist|isMaintenanceOverdue/)
  assert.match(source, /getRepairRecordStatusTone/)
})

test("old workflow values stay visible on old records only", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /hasLegacyDetails/)
  assert.match(source, /legacyFields/)
})

test("recorders can attach files to their own records from the detail page", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /canAttachToRepairRecord\(/)
  assert.match(source, /canEdit=\{canAttach\}/)
})

test("the printout uses the repair record fields", () => {
  const source = readFileSync(printPath, "utf8")
  assert.match(source, /tRecord\("outcomeQuestion"\)/)
  assert.doesNotMatch(source, /assignedTo|dueDate|laborCost|inspectedBy/)
})

test("old workflow buttons are gone", () => {
  for (const file of ["maintenance-ticket-close-button", "maintenance-ticket-status-button", "maintenance-ticket-planning-button", "maintenance-ticket-cancel-button"]) {
    assert.equal(existsSync(`src/components/maintenance/${file}.tsx`), false, file)
  }
})

test("the three repair dialogs keep their buttons in a fixed footer and keep focus while saving (2C batch 1a)", () => {
  const source = readFileSync(actionsPath, "utf8").replace(/\r\n/g, "\n")
  // Each dialog's form checks itself (v-track plan 2 M5).
  assert.equal(source.match(/<form onSubmit=\{handle(?:Complete|Cancel|Edit)\} noValidate className=\{accessibleDialogFormClasses\}>/g)?.length, 3)
  assert.equal(source.match(/<AccessibleDialogBody className="space-y-4">/g)?.length, 3)
  assert.equal(source.match(/<AccessibleDialogFooter>/g)?.length, 3)
  assert.equal(source.match(/description=\{<span className="tag">\{repairNo\}<\/span>\}/g)?.length, 3)
  assert.equal(source.match(/<AccessibleDialogCancel>\{tCommon\("back"\)\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" busy=\{saving\}>/g)?.length, 2)
  assert.match(source, /<AccessibleDialogCancel>\{t\("keep"\)\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" variant="destructive" busy=\{saving\}>/)
  // Group 5 plan 3 Task 3 (G5P3-R2): the provider owns the three dialogs and renders no button of its own.
  assert.doesNotMatch(source, /<Button variant="(?:danger|outline)" size="md" onClick=/)
  assert.doesNotMatch(source, /function (?:Field|DialogButtons)\(|secondaryButton|const (?:inputClass|textareaClass)\b|<button|<input|<textarea|Loader2/)
})

// Plan 2B-4 Task 3 (spec 2B §4.4.5, §4.5.3, §8.8 row 3, B2, I32): the repair page header is PageHeader with the asset's
// name as the h1 (a repair record has no name of its own) and the repair code, the status and the asset code as meta.
// Back is PageBackLink, at every width; 2C plan 5 took the back item out of the phone bar (2B spec §4.6.4) and moved
// the O11 bottom padding to actionBarPagePadding. This file reads the page raw (CRLF): no line breaks in these regexes.
test("the repair page header is PageHeader with the asset name, and its PageBackLink is the one back control (spec 2B §4.4.5, §4.6.4)", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /breadcrumbs=\{\[\{ label: t\("title"\), href: listCrumbHref \}, \{ label: ticket\.repairNo, code: true \}\]\}\s*title=\{ticket\.asset\.name\}/)
  assert.match(source, /<span className="tag">\{ticket\.repairNo\}<\/span>\s*<StatusBadge label=\{t\(`status\.\$\{recordStatus\}`\)\} tone=\{getRepairRecordStatusTone\(ticket\.repairStatus\)\} \/>\s*<span>\s*\{t\("asset"\)\} <span className="tag">\{ticket\.asset\.assetTag\}<\/span>\s*<\/span>/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.doesNotMatch(source, /label: tCommon\("back"\)|ArrowLeft/, "the bar has no back item of its own (2C plan 5)")
  // The bar's room follows its primary, ซ่อมเสร็จ (G5P3-R8; 2C plan 5, O11).
  assert.match(source, /<div className=\{`space-y-6 \$\{canComplete \? actionBarPagePadding\.withPrimary : actionBarPagePadding\.single\}`\}>/, "room for the ActionBar")
  // The asset panel moved to RepairRecordAssetPanel (Task 2), the details and the history to RepairRecordDetails and
  // RepairRecordHistory (Task 3): the legacy list remains.
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 1)
  assert.doesNotMatch(source, /\bWrench\b|<h1\b|<Breadcrumbs\b|formatCurrency|function Info\b|"-"/)
})

// Group 5 plan 1 Task 5 (G5P1-R16, spec §8.3): the disposal-review panel counts repairs as the asset tab does, through
// summarizeAssetRepairs over the asset's active records, so PM visits and cancelled records stay out.
test("the record page's disposal-review panel reads summarizeAssetRepairs, not an aggregate", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /prisma\.maintenanceTicket\.findMany\(\{\s*where: \{ assetId: ticket\.asset\.id, isActive: true \},\s*select: \{ id: true, repairStatus: true, maintenancePlanId: true, reportedDate: true, returnDate: true, repairCost: true \},\s*\}\)/)
  assert.match(source, /summarizeAssetRepairs\(/)
  assert.match(source, /repairCost: record\.repairCost == null \? null : Number\(record\.repairCost\)/)
  assert.match(source, /const shouldReviewDisposal = assetRepairSummary\.replacementWarning/)
  assert.doesNotMatch(source, /_count|_sum|maintenanceTicket\.aggregate/)
  assert.match(source, /t\("disposalReviewCount", \{ count: assetRepairSummary\.repairCount \}\)/)
  assert.match(source, /formatMoney\(assetRepairSummary\.totalCost, \{ unit: tCommon\("baht"\) \}\)/)
  assert.match(source, /\{purchasePrice > 0 \? <p>\{t\("disposalReviewRatio", \{ percent: Math\.round\(repairCostRatio \* 100\) \}\)\}<\/p> : null\}/)
})

// Group 5 plan 3 Task 2 (G5P3-R3, R5, R7, R10, spec §8.3): the page reads the asset facts, the movements oldest first,
// the attachments, the actors in one user read, the open disposal request and the cancel movement once, and hands them
// to the record's rules.
test("the record page reads its facts once and hands them to the record's rules (group 5 plan 3)", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /loadRepairAssetFacts\(prisma as unknown as RepairAssetFactsDb, ticket\.asset\.id\)/)
  assert.match(source, /buildRepairNextStep\(/)
  assert.match(source, /buildRepairHistory\(/)
  assert.match(source, /repairDurationLine\(/)
  assert.match(source, /prisma\.assetMovement\.findMany\(\{\s*where: \{ referenceType: "maintenance", referenceId: ticket\.id \},\s*orderBy: \{ performedAt: "asc" \},/)
  assert.equal(source.match(/prisma\.user\.findMany\(/g)?.length, 1, "one read names every actor")
  assert.match(source, /select: \{ id: true, username: true, displayName: true, email: true, employee: \{ select: \{ code: true, fullNameTh: true \} \} \}/)
  assert.match(source, /assetHistoryActorLabel\(/)
  assert.match(source, /prisma\.disposalRequest\.findFirst\(\{\s*where: \{ \.\.\.openDisposalRequestWhere, assetId: ticket\.asset\.id \}/)
  assert.match(source, /movementType === "maintenance_cancel"/)
  assert.match(source, /getMaintenanceAttachmentType\(/)
  assert.match(source, /<RepairRecordAssetPanel facts=\{facts\} locale=\{locale\} recordCount=\{assetRecords\.length\} returnTo=\{returnToHref\} \/>/)
})

test("the disposal-review panel keeps one rule and hides its button only when the card shows the request or the open request (G5P3-R7, final review 2)", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /const cardOffersDisposal = nextStepOffersDisposal\(nextStep\)\r?\n/)
  assert.doesNotMatch(source, /disposal\.kind === "canRequest"/)
  assert.match(source, /action=\{\s*cardOffersDisposal \? null : \(\s*<Link href=\{disposalRequestHref\}/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  assert.equal(th.repairRecord.openDisposalRequest, "ยื่นคำขอตัดจำหน่าย")
})

const panelPath = "src/components/maintenance/repair-record-asset-panel.tsx"

test("the record's asset panel: photo, name to the asset, tag, the status as a badge, holder, place and the asset's repair list (G5P3-R10)", () => {
  assert.ok(existsSync(panelPath))
  const source = readFileSync(panelPath, "utf8")
  assert.doesNotMatch(source, /^"use client"/, "server-safe")
  assert.match(source, /export function RepairRecordAssetPanel\(\{ facts, locale, recordCount, returnTo \}/)
  assert.match(source, /<AssetThumbnail photo=\{facts\.photo\} assetTag=\{facts\.assetTag\} assetName=\{facts\.name\} size=\{44\}/)
  assert.match(source, /href=\{`\/\$\{locale\}\/assets\/\$\{facts\.id\}`\}/)
  assert.match(source, /<StatusBadge label=\{facts\.statusLabel\} tone=\{getAssetStateTone\(facts\.statusName\)\} \/>/)
  assert.match(source, /\/maintenance\?assetId=\$\{facts\.id\}/)
  assert.match(source, /t\("detail\.assetRepairHistory", \{ count: recordCount \}\)/)
  for (const key of ["currentStatus", "custodian", "location"]) assert.match(source, new RegExp(`t\\("${key}"\\)`), key)
  for (const field of ["holderName", "departmentName", "roomName", "branchName"]) assert.match(source, new RegExp(`facts\\.${field}`), field)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  assert.equal(th.repairRecord.detail.assetRepairHistory, "ประวัติซ่อมทั้งหมดของทรัพย์สินนี้ · {count, number} รายการ")
  assert.equal(th.repairRecord.currentStatus, "สถานะปัจจุบัน")
  assert.equal(th.repairRecord.custodian, "ผู้ถือครอง")
  assert.equal(th.repairRecord.location, "ที่ตั้ง")
})

// Group 5 plan 3 Task 3 (G5P3-R2, R8, R9, spec §8.1-§8.6): one dialog owner, the header's อื่น ๆ menu, the next-step card,
// the history oldest first and the phone bar. Every read strips \r (the working tree is CRLF).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const headerActionsPath = "src/components/maintenance/repair-record-header-actions.tsx"
const cardPath = "src/components/maintenance/repair-next-step-card.tsx"
const phoneBarPath = "src/components/maintenance/repair-record-phone-bar.tsx"
const historyPath = "src/components/maintenance/repair-record-history.tsx"

test("one client provider owns the three dialogs; openers pass themselves so focus returns there (G5P3-R2, Review Focus 5)", () => {
  const source = read(actionsPath)
  assert.match(source, /^"use client"/)
  assert.match(source, /export function RepairRecordActionsProvider\(\{\n?\s*recordId,\s*repairNo,\s*expectedUpdatedAt,\s*isOpen,\s*details,\s*conditionOptions,\s*initialConditionId,\s*held,\s*assetId,\s*locale,\s*canReturn,\s*todayKey,\s*children,?\s*\}/)
  assert.match(source, /export function useRepairRecordActions\(\)/)
  for (const name of ["openComplete", "openCancel", "openEdit"]) assert.match(source, new RegExp(`${name}: \\(opener\\?: HTMLElement \\| null\\) =>`), name)
  assert.equal(source.match(/returnFocusRef=\{returnFocusRef\}/g)?.length, 3, "each dialog returns focus to its opener")
  assert.doesNotMatch(source, /DropdownMenu/)
})

test("the complete dialog: no result chosen, a required error, the refusal under ซ่อมไม่ได้ when held, and a date not after today (G5P3-R9)", () => {
  const source = read(actionsPath)
  assert.doesNotMatch(source, /outcome: "usable" as Outcome/)
  assert.match(source, /outcome: "" as Outcome \| "",/)
  assert.ok(source.includes('if (values.outcome !== undefined) check("outcome", values.outcome ? null : "repairOutcomeRequired")'))
  assert.ok(source.includes('(todayKey && values.returnDate > todayKey ? "repairDateInFuture" : null)'))
  // Final review 9: the refusal sits in an always-mounted live region inside the result group, so choosing ซ่อมไม่ได้
  // announces it, and it is read with the group.
  assert.match(source, /<div role="status" aria-live="polite" data-repair-held-region className="mt-2 empty:mt-0">\n\s+\{complete\.outcome === "beyond_repair" && held \? \(\n\s+<RepairHeldNotice held=\{held\} assetId=\{assetId\} locale=\{locale\} canReturn=\{canReturn\} \/>/)
  const group = source.slice(source.indexOf('<FieldGroup legend={t("outcomeQuestion")}'), source.indexOf("</FieldGroup>"))
  assert.match(group, /data-repair-held-region/, "the region is inside the result group")
  assert.match(source, /<Input type="date" required min=\{details\.reportedDate\} max=\{latestTodayKey\(\)\} /)
  assert.match(source, /const now = getBangkokDateKey\(new Date\(\)\)\n\s+return now > todayKey \? now : todayKey/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  assert.equal(th.apiErrors.repairOutcomeRequired, "เลือกผลการซ่อม")
  assert.equal(th.repairRecord.editHelp, "เปลี่ยนสถานะหรือผลการซ่อมที่นี่ไม่ได้ ถ้าผลผิด ให้แก้สถานะที่หน้าทรัพย์สิน (แก้สถานะ) แล้วระบุในหมายเหตุ")
})

test("the header: ซ่อมเสร็จ, พิมพ์ and อื่น ๆ with edit and cancel in a DropdownMenu; no danger button and no dialog inside the menu (spec §8.1)", () => {
  assert.ok(existsSync(headerActionsPath))
  const source = read(headerActionsPath)
  assert.match(source, /^"use client"/)
  assert.match(source, /<DropdownMenu modal=\{false\}>/)
  assert.match(source, /<DropdownMenuSeparator \/>/)
  assert.match(source, /variant="destructive"/)
  assert.match(source, /t\("detail\.more"\)/)
  assert.doesNotMatch(source, /variant="danger"|AccessibleDialog/)
  const menu = source.slice(source.indexOf("<DropdownMenuContent"), source.indexOf("</DropdownMenuContent>"))
  assert.doesNotMatch(menu, /AccessibleDialog/)
  assert.match(menu, /openEdit\(menuTriggerRef\.current\)/)
  assert.match(menu, /\{isOpen \? \(/, "ยกเลิกบันทึก on open records only")
  assert.match(source, /\{canEdit \? \(\n\s+<DropdownMenu/, "the menu is hidden when empty")
  assert.match(source, /<Button size="md" onClick=\{\(event\) => openComplete\(event\.currentTarget\)\}/)
  const page = read(detailPath)
  assert.match(page, /<RepairRecordHeaderActions printHref=\{printHref\} canEdit=\{canEdit\} isOpen=\{isOpen\} \/>/)
  assert.doesNotMatch(page, /variant: "danger"|variant="danger"/)
})

test("the header meta reads the day count while open, else the close or cancel date (spec §8.1)", () => {
  const page = read(detailPath)
  assert.match(page, /t\("detail\.reportedOn", \{ date: formatAssetDetailDate\(ticket\.reportedDate, locale\) \}\)/)
  assert.match(page, /t\(`detail\.\$\{duration\.key\}`, \{ days: duration\.days \}\)/)
  assert.match(page, /t\("detail\.closedOn", \{/)
  assert.match(page, /t\("detail\.cancelledOn", \{/)
  assert.doesNotMatch(page, /data-repair-duration/)
})

test("the next-step card: every state, the outcome rows with the refusal, the buttons by permission and the phone form (spec §8.2, §8.6)", () => {
  assert.ok(existsSync(cardPath))
  const source = read(cardPath)
  assert.doesNotMatch(source, /^"use client"/, "server-safe; the ซ่อมเสร็จ button is a client part")
  assert.match(source, /data-repair-next-step=\{nextStep\.kind\}/)
  assert.match(source, /data-repair-outcome-row=\{row\.outcome\}/)
  assert.match(source, /<ContentPanel\b/)
  assert.match(source, /<RepairHeldNotice held=\{row\.outlook\.held\} assetId=\{assetId\} locale=\{locale\} canReturn=\{canReturn\} \/>/)
  assert.match(source, /<RepairCompleteButton\b/)
  assert.match(source, /href="#attachments"/)
  assert.match(source, /\{canEdit \?/)
  assert.match(source, /\{canAttach \?/)
  assert.match(source, /t\("detail\.completeByEditor"\)/)
  assert.match(source, /!canEdit && canCreate/)
  assert.match(source, /hidden md:flex/, "no buttons inside on the phone")
  for (const key of ["nextOpenVendor", "nextOpenInternal", "nextOpenHelp", "phoneStatusNow", "ifUsable", "ifBeyond", "closedWithOutcome", "closedDone", "nextDisposal", "disposalOpen", "disposalByCreator", "writtenOff", "cancelledTitle", "cancelReason"]) {
    assert.match(source, new RegExp(`"detail\\.${key}"`), key)
  }
  assert.doesNotMatch(source, /assetDisposed|t\("cancelReason"\)/)
  for (const note of ["backTo", "backToNoDocument", "holderStays", "noHolder", "thenDisposal"]) assert.match(source, new RegExp(`detail\\.note\\.${note}`), note)
  assert.match(source, /`\/\$\{locale\}\/disposal\/\$\{disposal\.id\}`/)
  assert.match(source, /\{canCreateDisposal \?/)
  assert.doesNotMatch(source, /border-dashed|border-primary|bg-primary-soft|text-(?:success|warning|danger)\b/)
  const page = read(detailPath)
  assert.match(page, /<RepairNextStepCard\b/)
})

test("the card after ซ่อมไม่ได้: the request only for รอตัดจำหน่าย, no step on another status, the open request a link only with disposal:view (final review 2, 8)", () => {
  const source = read(cardPath)
  assert.match(source, /disposal\.kind === "canRequest"/)
  assert.match(source, /disposal\.kind === "openRequest"/)
  assert.match(source, /disposal\.kind === "writtenOff"/)
  // "none": the close line as the title and the status now, nothing else.
  assert.match(source, /\} else if \(disposal\.kind === "none"\) \{\n\s+title = closedLine\n\s+body = statusNow\n/)
  assert.match(source, /canViewDisposal: boolean/)
  assert.match(source, /canViewDisposal \? \(\n\s+<Link href=\{`\/\$\{locale\}\/disposal\/\$\{disposal\.id\}`\}/)
  const page = read(detailPath)
  assert.match(page, /const canViewDisposal = hasPermission\(user, "disposal", "view"\)/)
  assert.match(page, /canViewDisposal=\{canViewDisposal\}/)
})

test("the cancelled card: the reason on its own line, labelled เหตุผล, not the dialog's field label (final review 5)", () => {
  const source = read(cardPath)
  assert.match(source, /<p className="text-sm text-muted-foreground">\{t\("detail\.cancelReason"\)\}<\/p>\n\s+<p className="whitespace-pre-wrap text-sm text-foreground">\{nextStep\.reason\}<\/p>/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.repairRecord.detail.cancelReason, "เหตุผล")
  assert.equal(en.repairRecord.detail.cancelReason, "Reason")
})

test("the card's table and buttons sit side by side only from xl; below it the buttons are a row under the table (final review 4)", () => {
  const source = read(cardPath)
  assert.match(source, /<div className="grid gap-4 xl:grid-cols-\[minmax\(0,1fr\)_auto\] xl:items-start">/)
  assert.doesNotMatch(source, /md:grid-cols-\[minmax\(0,1fr\)_auto\]|md:w-52|md:flex-col/)
  assert.match(source, /hidden md:flex md:flex-wrap md:gap-2 xl:w-52 xl:flex-col xl:\[&>\*\]:w-full/)
  // One set of tracks for the head and the rows (subgrid): auto below xl so หลังกดซ่อมเสร็จ keeps its room, fixed from xl.
  assert.match(source, /md:grid-cols-\[auto_minmax\(0,auto\)_minmax\(0,1fr\)\] xl:grid-cols-\[minmax\(0,11rem\)_minmax\(0,10rem\)_minmax\(0,1fr\)\]/)
  assert.equal(source.match(/md:col-span-3 md:grid-cols-subgrid/g)?.length, 2, "the head and each row use the table's tracks")
})

test("after ซ่อมเสร็จ or ยกเลิกบันทึก, focus moves to the next-step card's heading; edit keeps it on its opener (final review 10)", () => {
  const card = read(cardPath)
  assert.match(card, /<ContentPanel title=\{title\} titleId=\{REPAIR_NEXT_STEP_TITLE_ID\}>/)
  assert.match(read("src/lib/repair-record-detail-rules.ts"), /export const REPAIR_NEXT_STEP_TITLE_ID = "repair-next-step-title"/)
  const panel = read("src/components/ui/content-panel.tsx")
  assert.match(panel, /titleId\?: string/)
  assert.match(panel, /<h2 id=\{titleId\} tabIndex=\{titleId \? -1 : undefined\}/)
  const source = read(actionsPath)
  assert.match(source, /if \(successKey !== "updated"\) returnFocusRef\.current = document\.getElementById\(REPAIR_NEXT_STEP_TITLE_ID\)\n\s+setDialog\(null\)/)
})

test("the history shows old-workflow status updates as text, through the record's status words (final review 6)", () => {
  const page = read(detailPath)
  assert.match(page, /const assetStatusMovementTypes = new Set\(\["maintenance_create", "maintenance_pm_create", "maintenance_close", "maintenance_cancel"\]\)/)
  assert.match(page, /if \(assetStatusMovementTypes\.has\(movementType\)\) return \{ kind: "status", value: label \}/)
  assert.match(page, /if \(movementType === "maintenance_status_update"\) return \{ kind: "text", value: repairCodeLabel\(label\) \}/)
  assert.match(page, /t\.has\(`status\.\$\{code\}`\)/)
  assert.match(page, /tMaintenance\.has\(`statuses\.\$\{code\}`\)/)
  assert.doesNotMatch(page, /movementType\.startsWith\("maintenance_"\)/)
  assert.match(page, /referenceId: movement\.referenceId,/)
})

test("details: the name first with the code under it, รอกดซ่อมเสร็จ while open, ยังไม่ระบุ for an empty cost or invoice (spec §8.3)", () => {
  const details = read("src/components/maintenance/repair-record-details.tsx")
  assert.doesNotMatch(details, /^"use client"/)
  assert.match(details, /value: isOpen \? t\("detail\.awaitingComplete"\) :/)
  assert.equal(details.match(/nilLabel: t\("detail\.notGiven"\)/g)?.length, 2)
  assert.match(details, /<span className="block">\{ticket\.vendor\.name\}<\/span>\n\s+<span className="tag block w-fit">\{ticket\.vendor\.code\}<\/span>/)
  assert.match(details, /<span className="block">\{ticket\.reportedBy\.fullNameTh\}<\/span>\n\s+<span className="tag block w-fit">\{ticket\.reportedBy\.code\}<\/span>/)
  assert.match(details, /\.\.\.\(isOpen \? \[\] : \[\{ key: "returnDate"/, "วันที่ซ่อมเสร็จ once closed")
  assert.match(read(detailPath), /<RepairRecordDetails\n\s+ticket=\{\{ \.\.\.ticket, repairCost: ticket\.repairCost == null \? null : Number\(ticket\.repairCost\) \}\}/)
})

test("the history: oldest first, each item marked, actors, badges, the hollow future step and short dates on the phone (spec §8.3)", () => {
  assert.ok(existsSync(historyPath))
  const source = read(historyPath)
  assert.match(source, /data-repair-history-event=\{event\.kind\}/)
  assert.match(source, /\{history\.map\(\(event/)
  assert.doesNotMatch(source + read(detailPath), /\.reverse\(\)|toReversed|orderBy: \{ performedAt: "desc" \}/)
  assert.match(source, /statusMarkerVariants\(\{ tone: "info" \}\)/, "the future step is a hollow ring, not a dashed dot")
  assert.match(source, /t\("detail\.notYet"\)/)
  assert.match(source, /t\("detail\.attachedFiles", \{/)
  assert.match(source, /t\("detail\.historyHelp"\)/)
  assert.match(source, /<StatusBadge\b/)
  assert.match(source, /event\.actor/)
  assert.match(source, /md:hidden/)
  assert.doesNotMatch(source, /border-dashed/)
  assert.match(read(detailPath), /<RepairRecordHistory\b/)
})

test("the phone bar: ซ่อมเสร็จ as primaryAction and เพิ่มเติม as more, by permission (G5P3-R8)", () => {
  assert.ok(existsSync(phoneBarPath))
  const source = read(phoneBarPath)
  assert.match(source, /^"use client"/)
  assert.match(source, /<ActionBar\s+label=\{tCommon\("actions"\)\}\s+actions=\{actions\}\s+primaryAction=\{primary\}\s+more=\{/)
  assert.match(source, /label: t\("detail\.phoneMore"\)/)
  assert.match(source, /openerRef: moreTriggerRef/)
  assert.match(source, /openComplete\(event\.currentTarget\)/)
  assert.match(source, /openEdit\(moreTriggerRef\.current\)/)
  assert.match(source, /openCancel\(moreTriggerRef\.current\)/)
  assert.match(source, /destructive: true/)
  assert.match(read(detailPath), /<RepairRecordPhoneBar\b/)
})

test("the detail words of spec §13 (repairRecord (detail))", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  const d = th.repairRecord.detail
  const expected: Record<string, string> = {
    reportedOn: "แจ้งซ่อม {date}",
    closedOn: "ซ่อมเสร็จ {date}",
    cancelledOn: "ยกเลิก {date}",
    // {days, number} and {count, number}: the en values are plurals (tests/i18n-plural-count.test.ts, final review 11).
    sentDays: "ส่งซ่อมมา {days, number} วัน",
    repairDays: "ซ่อมมา {days, number} วัน",
    sentToday: "ส่งซ่อมวันนี้",
    repairToday: "ซ่อมวันนี้",
    more: "อื่น ๆ",
    phoneMore: "เพิ่มเติม",
    nextOpenVendor: 'ขั้นถัดไป: เมื่อรับเครื่องคืนจาก {vendor} แล้ว กด "ซ่อมเสร็จ"',
    nextOpenInternal: 'ขั้นถัดไป: เมื่อซ่อมเสร็จแล้ว กด "ซ่อมเสร็จ"',
    nextOpenHelp: "ตอนกดจะถามวันที่ซ่อมเสร็จกับผลการซ่อม ระบบไม่เลือกผลไว้ให้ สถานะทรัพย์สินจะเปลี่ยนตามผลที่เลือก",
    headOutcome: "ถ้าผลการซ่อมเป็น",
    headNow: "สถานะทรัพย์สินตอนนี้",
    headAfter: "หลังกดซ่อมเสร็จ",
    attachBefore: "แนบรูปก่อนซ่อม",
    completeByEditor: "ผู้มีสิทธิ์แก้ไขบันทึกซ่อมเป็นผู้กดซ่อมเสร็จ",
    phoneStatusNow: "สถานะทรัพย์สินตอนนี้ {status} หลังกดซ่อมเสร็จจะเป็นไปตามผลที่เลือก",
    ifUsable: "ถ้าใช้งานได้",
    ifBeyond: "ถ้าซ่อมไม่ได้ เสนอจำหน่าย",
    closedWithOutcome: "ซ่อมเสร็จแล้ว {date} · {outcome}",
    closedDone: "ซ่อมเสร็จแล้ว {date}",
    nextDisposal: "ขั้นถัดไป: ยื่นคำขอตัดจำหน่าย",
    disposalOpen: "มีคำขอตัดจำหน่าย {disposalNo} แล้ว",
    disposalByCreator: "ผู้มีสิทธิ์ยื่นคำขอตัดจำหน่ายเป็นผู้ยื่นต่อ",
    writtenOff: "ทรัพย์สินนี้ตัดจำหน่ายหรือปลดระวางแล้ว",
    cancelReason: "เหตุผล",
    cancelledTitle: "ยกเลิกบันทึกนี้แล้ว {date}",
    reportedDate: "วันที่แจ้งซ่อม",
    awaitingComplete: "รอกดซ่อมเสร็จ",
    notGiven: "ยังไม่ระบุ",
    historyHelp: "ลำดับเหตุการณ์ของบันทึกนี้",
    attachedFiles: "แนบ{type} {count, number} ไฟล์",
    notYet: "ยังไม่ถึง",
    assetRepairHistory: "ประวัติซ่อมทั้งหมดของทรัพย์สินนี้ · {count, number} รายการ",
    "note.backTo": "กลับไปที่ {holder} ตามใบส่งมอบ {documentNo}",
    "note.backToNoDocument": "กลับไปที่ {holder}",
    "note.holderStays": "ผู้ถือครอง {holder} คงเดิม",
    "note.noHolder": "ไม่มีผู้ถือครอง",
    "note.thenDisposal": "แล้วยื่นคำขอตัดจำหน่ายต่อ",
  }
  for (const [key, value] of Object.entries(expected)) {
    const [head, tail] = key.split(".")
    assert.equal(tail ? d[head]?.[tail] : d[key], value, key)
    const enValue = tail ? en.repairRecord.detail[head]?.[tail] : en.repairRecord.detail[key]
    assert.equal(typeof enValue, "string", `en ${key}`)
  }
  assert.equal(d.assetDisposed, undefined)
  // English names the button by its label, "Repair finished", never "Repair done" (final review 11).
  assert.equal(en.repairRecord.complete, "Repair finished")
  const enDetail = JSON.stringify(en.repairRecord.detail)
  assert.doesNotMatch(enDetail, /Repair done/)
  assert.match(en.repairRecord.detail.headAfter, /Repair finished/)
  for (const [key, arg, unit] of [["sentDays", "days", "day"], ["repairDays", "days", "day"], ["attachedFiles", "count", "file"], ["assetRepairHistory", "count", "record"]]) {
    assert.ok(en.repairRecord.detail[key].includes(`{${arg}, plural, one {# ${unit}} other {# ${unit}s}}`), `en ${key}`)
  }
  // The attachment words: "แนบ" + the type gives "แนบรูปก่อนซ่อม 12 ไฟล์" (Review Focus 3).
  assert.equal(th.maintenancePage.attachmentTypes.other, "อื่น ๆ")
  assert.equal(th.maintenancePage.attachmentTypes.before_repair, "รูปก่อนซ่อม")
  assert.equal(th.maintenancePage.attachmentTypes.invoice, "ใบแจ้งหนี้")
  assert.equal(th.repairRecord.movement.conditionChange, "เปลี่ยนสภาพ")
})
