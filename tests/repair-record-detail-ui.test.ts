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
  assert.equal(source.match(/<form\n\s+className=\{accessibleDialogFormClasses\}/g)?.length, 3)
  assert.equal(source.match(/<AccessibleDialogBody className="space-y-4">/g)?.length, 3)
  assert.equal(source.match(/<AccessibleDialogFooter>/g)?.length, 3)
  assert.equal(source.match(/description=\{<span className="tag">\{repairNo\}<\/span>\}/g)?.length, 3)
  assert.equal(source.match(/<AccessibleDialogCancel>\{tCommon\("back"\)\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" busy=\{saving\}>/g)?.length, 2)
  assert.match(source, /<AccessibleDialogCancel>\{t\("keep"\)\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" variant="destructive" busy=\{saving\}>/)
  assert.match(source, /<Button variant="danger" onClick=\{\(\) => setDialog\("cancel"\)\}>/)
  assert.match(source, /<Button variant="outline" onClick=\{\(\) => setDialog\("edit"\)\}>/)
  assert.doesNotMatch(source, /function (?:Field|DialogButtons)\(|secondaryButton|const (?:inputClass|textareaClass)\b|<button|<input|<textarea|Loader2/)
})

// Plan 2B-4 Task 3 (spec 2B §4.4.5, §4.5.3, §8.8 row 3, B2, I32): the repair page header is PageHeader with the asset's
// name as the h1 (a repair record has no name of its own) and the repair code, the status and the asset code as meta.
// Back is PageBackLink, at every width; 2C plan 5 took the back item out of the phone bar (2B spec §4.6.4) and moved
// the O11 bottom padding to actionBarPagePadding. This file reads the page raw (CRLF): no line breaks in these regexes.
test("the repair page header is PageHeader with the asset name, and its PageBackLink is the one back control (spec 2B §4.4.5, §4.6.4)", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /breadcrumbs=\{\[\{ label: t\("title"\), href: returnToHref \}, \{ label: ticket\.repairNo, code: true \}\]\}\s*title=\{ticket\.asset\.name\}/)
  assert.match(source, /<span className="tag">\{ticket\.repairNo\}<\/span>\s*<StatusBadge label=\{t\(`status\.\$\{recordStatus\}`\)\} tone=\{getRepairRecordStatusTone\(ticket\.repairStatus\)\} \/>\s*<span className="tag">\{ticket\.asset\.assetTag\}<\/span>/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.doesNotMatch(source, /label: tCommon\("back"\)|ArrowLeft/, "the bar has no back item of its own (2C plan 5)")
  assert.match(source, /<div className=\{`space-y-6 \$\{actionBarPagePadding\.single\}`\}>/, "room for the ActionBar (2C plan 5, O11)")
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 4)
  assert.doesNotMatch(source, /\bWrench\b|<h1\b|<Breadcrumbs\b|formatCurrency|function Info\b|"-"/)
})
