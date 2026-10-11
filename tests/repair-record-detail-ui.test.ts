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
