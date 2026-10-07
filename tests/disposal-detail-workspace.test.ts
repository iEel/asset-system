import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const detailPath = "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx"
const detailSource = () => readFileSync(detailPath, "utf8")

test("disposal detail surfaces one stage-aware next action in a workflow workspace", () => {
  assert.ok(existsSync("src/components/disposal/disposal-workflow-stepper.tsx"))

  const source = detailSource()
  assert.match(source, /DisposalWorkflowStepper/)
  assert.match(source, /getDisposalNextAction/)
  assert.match(source, /nextAction === "review"/)
  assert.match(source, /<DisposalDecisionButton/)
  assert.match(source, /nextAction === "execute"/)
  assert.match(source, /<DisposalExecutionButton/)
  assert.match(source, /getCurrentOwnerContext/)
  assert.match(source, /centralApprovalQueue/)
  assert.match(source, /executionQueue/)
})

test("disposal detail progressively reveals reviewed and completed information", () => {
  const source = detailSource()

  assert.match(source, /disposalRequest\.requestStatus !== "pending" \? \(/)
  assert.match(source, /disposalRequest\.requestStatus === "disposed" \? \(/)
})

test("disposal detail preserves operational navigation and uses an ArrowLeft back affordance", () => {
  const source = detailSource()

  assert.match(source, /ArrowLeft/)
  assert.match(source, /normalizeOperationalReturnTo/)
  assert.match(source, /<DisposalMobileActionBar/)
  assert.match(source, /href=\{returnToHref\}/)
  assert.doesNotMatch(source, /Trash2/)
})

test("mobile disposal detail promotes the stage action without duplicating desktop controls", () => {
  const source = detailSource()
  const actionBar = readFileSync("src/components/disposal/disposal-mobile-action-bar.tsx", "utf8")

  assert.match(source, /primaryAction=\{nextActionControl\}/)
  assert.match(source, /hidden[^\"]*md:flex/)
  assert.match(actionBar, /primaryAction/)
  assert.match(actionBar, /fixed inset-x-0 bottom-0/)
  assert.match(actionBar, /md:hidden/)
})

test("disposal evidence remains downloadable but only managers can upload or delete", () => {
  const source = readFileSync("src/components/disposal/disposal-attachments.tsx", "utf8")

  assert.match(source, /canManage: boolean/)
  assert.match(source, /\{canManage \? \(/)
  assert.match(source, /<FileDropzone/)
  assert.match(source, /\{canManage \? \(/)
  assert.match(source, /\/api\/attachments\/\$\{attachment\.id\}/)
  assert.match(source, /href=\{`\/api\/attachments\/\$\{attachment\.id\}`\}/)
  assert.match(source, /aria-label=\{tCommon\("delete"\)\}/)
})

test("disposal history uses existing movement translations rather than raw underscored values", () => {
  const source = detailSource()

  assert.match(source, /getTranslations\("asset"\)/)
  assert.match(source, /tAsset\(`movementTypes\.\$\{movement\.movementType\}`\)/)
  assert.doesNotMatch(source, /movement\.movementType\.replaceAll\("_", " "\)/)
})

test("decision and execution dialogs use the shared accessible dialog", () => {
  for (const path of [
    "src/components/disposal/disposal-decision-button.tsx",
    "src/components/disposal/disposal-execution-button.tsx",
  ]) {
    const dialogSource = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
    assert.match(dialogSource, /<AccessibleDialog[\s\S]*?busy=\{saving\}/, path)
    assert.match(dialogSource, /returnFocusRef=\{triggerRef\}/, path)
    assert.doesNotMatch(dialogSource, /fixed inset-0|role="dialog"|restoreFocusRef|event\.key === "Tab"|handleKeyDown/, path)
  }
  assert.match(
    readFileSync("src/components/disposal/disposal-execution-button.tsx", "utf8"),
    /initialFocusRef=\{executionDateRef\}/,
  )
})

test("the print action is structured for pending-request versus final-document copy", () => {
  const source = detailSource()

  assert.match(source, /const printLabel = disposalRequest\.requestStatus === "disposed" \? t\("printFinalDocument"\) : t\("printRequest"\)/)
  assert.match(source, /\{printLabel\}/)
})

test("child requests disclose their source batch and inherited evidence", () => {
  const source = detailSource()

  assert.match(source, /batch: \{ select: \{ id: true, batchNo: true \} \}/)
  assert.match(source, /module: "disposal_batch"/)
  assert.match(source, /batchAttachments/)
  assert.match(source, /\/disposal\/batches\/\$\{disposalRequest\.batch\.id\}/)
})
