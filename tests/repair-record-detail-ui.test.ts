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
  assert.match(source, /isOpen \?/)
})

test("finishing a repair starts from the existing remark instead of replacing it", () => {
  const source = readFileSync(actionsPath, "utf8")
  const completeState = source.match(/useState\(\{\s*returnDate: toLocalDateInputValue\(\),[^}]*\}\)/)
  assert.ok(completeState, "complete dialog state not found")
  assert.match(completeState[0], /remark: details\.remark/)
})

test("editing changes details only, never status or result", () => {
  const source = readFileSync(actionsPath, "utf8")
  const updateBody = source.slice(source.indexOf('action: "update"'), source.indexOf('action: "update"') + 400)
  assert.doesNotMatch(updateBody, /outcome|repairStatus/)
})

test("the detail page drops the old workflow controls", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /RepairRecordActions/)
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
  assert.match(source, /<Button variant="danger" size="md" onClick=\{\(\) => setDialog\("cancel"\)\}>/)
  assert.match(source, /<Button variant="outline" size="md" onClick=\{\(\) => setDialog\("edit"\)\}>/)
  assert.doesNotMatch(source, /function (?:Field|DialogButtons)\(|secondaryButton|const (?:inputClass|textareaClass)\b|<button|<input|<textarea|Loader2/)
})

// Plan 2B-4 Task 3 (spec 2B §4.4.5, §4.5.3, §8.8 row 3, B2, I32): the repair page header is PageHeader with the asset's
// name as the h1 (a repair record has no name of its own) and the repair code, the status and the asset code as meta.
// Back is PageBackLink, at every width; 2C plan 5 took the back item out of the phone bar (2B spec §4.6.4) and moved
// the O11 bottom padding to actionBarPagePadding. This file reads the page raw (CRLF): no line breaks in these regexes.
test("the repair page header is PageHeader with the asset name, and its PageBackLink is the one back control (spec 2B §4.4.5, §4.6.4)", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /breadcrumbs=\{\[\{ label: t\("title"\), href: listCrumbHref \}, \{ label: ticket\.repairNo, code: true \}\]\}\s*title=\{ticket\.asset\.name\}/)
  assert.match(source, /<span className="tag">\{ticket\.repairNo\}<\/span>\s*<StatusBadge label=\{t\(`status\.\$\{recordStatus\}`\)\} tone=\{getRepairRecordStatusTone\(ticket\.repairStatus\)\} \/>\s*<span className="tag">\{ticket\.asset\.assetTag\}<\/span>/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.doesNotMatch(source, /label: tCommon\("back"\)|ArrowLeft/, "the bar has no back item of its own (2C plan 5)")
  assert.match(source, /<div className=\{`space-y-6 \$\{actionBarPagePadding\.single\}`\}>/, "room for the ActionBar (2C plan 5, O11)")
  // The asset panel moved to RepairRecordAssetPanel (group 5 plan 3 Task 2): details, legacy and history remain.
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 3)
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

test("the disposal-review panel keeps one rule and hides its button when the next step offers the request (G5P3-R7)", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /nextStep\.kind === "closedBeyond" && nextStep\.disposal\.kind === "canRequest"/)
  assert.match(source, /action=\{\s*nextStepOffersDisposal \? null : \(\s*<Link href=\{disposalRequestHref\}/)
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
  assert.equal(th.repairRecord.detail.assetRepairHistory, "ประวัติซ่อมทั้งหมดของทรัพย์สินนี้ · {count} รายการ")
  assert.equal(th.repairRecord.currentStatus, "สถานะปัจจุบัน")
  assert.equal(th.repairRecord.custodian, "ผู้ถือครอง")
  assert.equal(th.repairRecord.location, "ที่ตั้ง")
})
