import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"

const root = process.cwd()

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8")
}

function getObjectAtPath(value: Record<string, unknown>, pathName: string) {
  return pathName.split(".").reduce<unknown>((current, key) => {
    assert.ok(current && typeof current === "object", `Missing ${pathName}`)
    return (current as Record<string, unknown>)[key]
  }, value)
}

test("bulk execution UI has the required interaction and accessibility contracts", async () => {
  const component = await source("src/components/disposal/disposal-bulk-execution.tsx")

  assert.match(component, /MAX_DISPOSAL_BULK_EXECUTION_ITEMS/)
  assert.match(component, /mode:\s*"preview"/)
  assert.match(component, /mode:\s*"commit"/)
  assert.match(component, /aria-live="polite"/)
  assert.match(component, /<AccessibleDialog[\s\S]*?busy=\{committing\}/)
  assert.match(component, /aria-busy=\{busy\}/)
  assert.match(component, /function BulkExecutionDialog/)
  assert.match(component, /returnFocusRef=\{triggerRef\}/)
  assert.match(component, /fallbackFocusRef=\{restoreTargetRef\}/)
  assert.match(component, /<AccessibleDialogFooter>/)
  assert.doesNotMatch(component, /<footer|sticky bottom-0/)
  assert.doesNotMatch(component, /fixed inset-0|role="dialog"|restoreFocusRef/)
  assert.match(component, /min-h-11 (?:min-)?w-11/)
  assert.match(component, /checkboxVariants\(/)
  assert.doesNotMatch(component, /fixed\s+bottom-0/)
})

test("approved queue alone mounts bulk execution controls", async () => {
  const page = await source("src/app/[locale]/(dashboard)/disposal/page.tsx")

  assert.match(page, /filters\.status === "approved"/)
  assert.match(page, /DisposalBulkExecutionProvider/)
  assert.match(page, /DisposalBulkExecutionSelectPageControl/)
  assert.match(page, /DisposalBulkExecutionCheckbox/)
  assert.match(page, /DisposalBulkExecutionSelectionToggle/)
  assert.match(page, /DisposalBulkExecutionToolbar/)
})

test("bulk execution selection, request, and retry rules are represented", async () => {
  const component = await source("src/components/disposal/disposal-bulk-execution.tsx")
  const state = await source("src/lib/disposal-bulk-execution-ui.ts")

  assert.match(state, /selectedType !== item\.disposalType/)
  assert.match(state, /state\.selectedIds\.length >= MAX_DISPOSAL_BULK_EXECUTION_ITEMS/)
  assert.match(component, /selectionKey/)
  assert.match(component, /AbortController/)
  assert.match(component, /confirm\(\{ title: copy\.discardSelection/)
  assert.match(component, /useHistoricalEvidenceException/)
  assert.match(component, /evidenceExceptionReason/)
  assert.match(component, /evidenceExceptionAcknowledged/)
  assert.match(component, /buildBulkExecutionCommitPayload\(previewPayload, eligibleIds\)/)
  assert.match(component, /preview\(unresolved, previewPayload\)/)
  assert.match(component, /toggleBulkExecutionItem/)
  assert.match(component, /toggleBulkExecutionPage/)
})

test("bulk execution integrates locked preview snapshots and merged unresolved results", async () => {
  const component = await source("src/components/disposal/disposal-bulk-execution.tsx")

  assert.match(component, /buildBulkExecutionPayload\(BULK_EXECUTION_MODES\.preview\.mode/)
  assert.match(component, /buildBulkExecutionCommitPayload\(previewPayload/)
  assert.match(component, /mergeBulkExecutionResults\(previewResponse, commitResponse\)/)
  assert.match(component, /getBulkExecutionUnresolvedIds/)
  assert.match(component, /previewControllerRef\.current\?\.abort\(\)/)
  assert.match(component, /dialogState === "committing"/)
})

test("bulk execution reviews server-derived item values and gates historical controls", async () => {
  const component = await source("src/components/disposal/disposal-bulk-execution.tsx")
  const page = await source("src/app/[locale]/(dashboard)/disposal/page.tsx")

  for (const field of ["recipientName", "documentNo", "saleValue", "salvageValue", "executionRemark"]) {
    assert.match(component, new RegExp(field))
    assert.match(page, new RegExp(field))
  }
  assert.match(component, /isHistoricalExceptionAvailable/)
  assert.match(component, /validateHistoricalException/)
  assert.match(component, /aria-describedby=/)
  assert.match(component, /aria-busy=/)
  assert.match(component, /aria-live="polite"/)
  assert.match(component, /format\(copy\.historicalReasonHelp,\s*\{[\s\S]*?count:\s*evidenceExceptionReason\.length,[\s\S]*?max:\s*2000/)
  assert.match(component, /format\(copy\.confirm,\s*\{\s*count:\s*reviewedItems\.length\s*\}\)/)
  assert.match(component, /format\(copy\.confirm,\s*\{\s*count:\s*eligible\.length\s*\}\)/)
})

test("bulk execution collects a shared recipient and labels its server-derived source", async () => {
  const component = await source("src/components/disposal/disposal-bulk-execution.tsx")
  const page = await source("src/app/[locale]/(dashboard)/disposal/page.tsx")

  assert.match(component, /const \[sharedRecipientName, setSharedRecipientName\] = useState\(""\)/)
  assert.match(component, /sharedRecipientName: sharedRecipientName\.trim\(\) \|\| null/)
  assert.match(
    component,
    /recipientFallbackApplicable\s*=\s*selectedType\s*!=\s*null\s*&&\s*\["sell",\s*"donate",\s*"dispose"\]\.includes\(selectedType\)/,
  )
  assert.match(component, /maxLength=\{200\}/)
  assert.match(component, /recipientSource === "shared"/)
  assert.match(page, /sharedRecipient: t\("bulkExecutionSharedRecipient"\)/)
  assert.match(page, /recipientSourceRequest: t\("bulkExecutionRecipientSourceRequest"\)/)
  assert.match(page, /recipientSourceShared: t\("bulkExecutionRecipientSourceShared"\)/)
})

test("bulk execution uses explicit selection mode, guarded rows, Bangkok date, and direct spacing", async () => {
  const component = await source("src/components/disposal/disposal-bulk-execution.tsx")
  const page = await source("src/app/[locale]/(dashboard)/disposal/page.tsx")

  assert.match(component, /selectionMode/)
  assert.match(component, /CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT/)
  assert.match(component, /getBangkokBusinessDate/)
  assert.doesNotMatch(page, /toISOString\(\)\.slice\(0, 10\)/)
  assert.match(page, /DisposalBulkExecutionProvider[\s\S]*className="space-y-6"/)
})

test("bulk execution copy has English and Thai parity", async () => {
  const [english, thai] = await Promise.all([
    source("messages/en.json").then(JSON.parse) as Promise<Record<string, unknown>>,
    source("messages/th.json").then(JSON.parse) as Promise<Record<string, unknown>>,
  ])
  const keys = [
    "bulkExecutionToolbarLabel", "bulkExecutionSelection", "bulkExecutionSelectionMode", "bulkExecutionCancelSelectionMode",
    "bulkExecutionSelectedCount", "bulkExecutionSelectionLimit", "bulkExecutionMixedType", "bulkExecutionSelectPage",
    "bulkExecutionClearSelection", "bulkExecutionReview", "bulkExecutionSelectItem", "bulkExecutionIncompatibleType",
    "bulkExecutionPreviewTitle", "bulkExecutionPreviewLoading", "bulkExecutionPreflightHelp", "bulkExecutionDate",
    "bulkExecutionExecutor", "bulkExecutionFinalStatus", "bulkExecutionHistoricalException", "bulkExecutionHistoricalReason",
    "bulkExecutionHistoricalReasonHelp", "bulkExecutionHistoricalAcknowledgement", "bulkExecutionPermanentConfirmation",
    "bulkExecutionConfirm", "bulkExecutionCommitting", "bulkExecutionResultTitle", "bulkExecutionExecuted",
    "bulkExecutionBlocked", "bulkExecutionFailed", "bulkExecutionRetry", "bulkExecutionClose", "bulkExecutionCancel",
    "bulkExecutionZeroEligible", "bulkExecutionRequestFailed", "bulkExecutionCommitFailed", "bulkExecutionDiscardSelection",
    "bulkExecutionHistoricalWarning", "bulkExecutionSharedValues", "bulkExecutionReviewedValues", "bulkExecutionRecipient", "bulkExecutionDocumentNo", "bulkExecutionSaleValue",
    "bulkExecutionSalvageValue", "bulkExecutionRemark", "bulkExecutionNotProvided", "bulkExecutionCancelPreview",
    "bulkExecutionSharedRecipient", "bulkExecutionSharedRecipientHelp", "bulkExecutionRecipientSourceRequest", "bulkExecutionRecipientSourceShared",
    "bulkExecutionErrors",
  ]

  for (const key of keys) {
    const expectedType = key === "bulkExecutionErrors" ? "object" : "string"
    assert.equal(typeof getObjectAtPath(english, `disposalPage.${key}`), expectedType, `English disposalPage.${key}`)
    assert.equal(typeof getObjectAtPath(thai, `disposalPage.${key}`), expectedType, `Thai disposalPage.${key}`)
  }

  for (const code of [
    "DISPOSAL_REQUEST_NOT_FOUND", "DISPOSAL_INVALID_STAGE", "DISPOSAL_SOD_CONFLICT", "DISPOSAL_ASSET_INELIGIBLE",
    "DISPOSAL_CONCURRENT_UPDATE", "DISPOSAL_FORBIDDEN", "DISPOSAL_EVIDENCE_REQUIRED", "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN",
    "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE", "DISPOSAL_BULK_MIXED_TYPES", "DISPOSAL_BULK_EXECUTION_FAILED",
  ]) {
    assert.equal(typeof getObjectAtPath(english, `disposalPage.bulkExecutionErrors.${code}`), "string", `English ${code}`)
    assert.equal(typeof getObjectAtPath(thai, `disposalPage.bulkExecutionErrors.${code}`), "string", `Thai ${code}`)
  }
})

test("every disposal bulk execution code is wired to English and Thai copy", async () => {
  const [apiErrors, bulkPolicy, page, english, thai] = await Promise.all([
    source("src/lib/disposal-api-error-codes.ts"),
    source("src/lib/disposal-bulk-execution.ts"),
    source("src/app/[locale]/(dashboard)/disposal/page.tsx"),
    source("messages/en.json").then(JSON.parse) as Promise<Record<string, unknown>>,
    source("messages/th.json").then(JSON.parse) as Promise<Record<string, unknown>>,
  ])
  const codes = [...new Set([
    ...apiErrors.matchAll(/"(DISPOSAL_[A-Z_]+)"/g),
    ...bulkPolicy.matchAll(/"(DISPOSAL_[A-Z_]+)"/g),
  ].map((match) => match[1]))]

  assert.match(page, /disposalBulkExecutionErrorCodes\.map/)
  for (const code of codes) {
    assert.equal(typeof getObjectAtPath(english, `disposalPage.bulkExecutionErrors.${code}`), "string", `English ${code}`)
    assert.equal(typeof getObjectAtPath(thai, `disposalPage.bulkExecutionErrors.${code}`), "string", `Thai ${code}`)
  }
})

// Plan 2B-2 Task 2 (spec 2B §8.6 row 4, §8.11 row 3): 2B owns only the list part of this 2C batch 3 file. The dialog
// (BulkExecutionDialog, SharedValueFields and the rest below it) belongs to 2C plan 3, which checks it in the next test.
test("bulk execution list controls use Button and checkboxVariants, and leave the dialog to 2C (spec 2B §8.6 row 4)", async () => {
  const component = (await source("src/components/disposal/disposal-bulk-execution.tsx")).replace(/\r\n/g, "\n")
  const list = component.slice(component.indexOf("export function DisposalBulkExecutionSelectionToggle"), component.indexOf("function BulkExecutionDialog"))
  const dialog = component.slice(component.indexOf("function BulkExecutionDialog"))

  assert.match(component, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(component, /^import \{ checkboxVariants \} from "@\/components\/ui\/field-variants"$/m)
  assert.match(list, /<Button\n\s+variant="outline"\n\s+onClick=\{\(\) => setSelectionMode\(!selection\.selectionMode\)\}\n\s+disabled=\{busy\}\n\s+aria-pressed=\{selection\.selectionMode\}\n\s+>/)
  assert.match(list, /<Button variant="outline" onClick=\{clear\} disabled=\{busy\}>/)
  assert.match(list, /<Button ref=\{triggerRef\} onClick=\{openReview\} disabled=\{busy\}>/, "opening the review dialog is not async, so the trigger has no busy state")
  assert.equal(list.match(/className=\{checkboxVariants\(/g)?.length, 2, "the select-page box and the row box")
  assert.doesNotMatch(list, /<button\b|disabled:opacity-50|rounded border-border|focus-within:ring/)
  // 2C plan 3 moved the dialog onto the dialog parts: BusyLabel keeps the one spinner (FMG GB1 1) and the old checkbox markup went (GF7 0).
  assert.equal(dialog.match(/<Loader2\b/g)?.length, 1)
  assert.doesNotMatch(dialog, /\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b|\baccent-primary\b|mb-1\.5 block text-sm font-medium text-foreground|ml-1 text-danger">\*/)
})

// Phase 2C batch 3 (spec 2C §5.5 row 14, I25, §5.7, I35, §4.3, §4.12): the dialog on the dialog parts. The button that
// starts the work stays in place with busy, cancel stays on screen but is off while committing, and "no eligible
// request" is a warning Notice in the body instead of a long button label.
test("bulk execution dialog uses the dialog parts, busy buttons that stay in place and the shared fields (2C batch 3)", async () => {
  const component = (await source("src/components/disposal/disposal-bulk-execution.tsx")).replace(/\r\n/g, "\n")
  const dialog = component.slice(component.indexOf("function BulkExecutionDialog"), component.indexOf("function ReviewedSharedValues"))

  assert.match(dialog, /closeLabel=\{previewing \? copy\.cancelPreview : copy\.close\}/, "while the preview runs, the X cancels it (spec §5.3)")
  assert.match(dialog, /onSubmit=\{handleSubmit\}\n\s+className=\{accessibleDialogFormClasses\}\n\s+>\n\s+<AccessibleDialogBody className="space-y-5">/)
  assert.match(dialog, /<Notice tone="warning" role="alert">\{copy\.zeroEligible\}<\/Notice>/)
  assert.equal(dialog.match(/copy\.zeroEligible/g)?.length, 1, "no button says the zero-eligible sentence")
  assert.match(dialog, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\n\s+\{previewing \? copy\.cancelPreview : dialogState === "result" \? copy\.close : copy\.cancel\}\n\s+<\/AccessibleDialogCancel>/)
  assert.match(dialog, /\{dialogState === "review" \|\| previewing \? \(\n\s+<Button type="submit" busy=\{previewing\} disabled=\{!hasSharedValues\}>/)
  assert.match(dialog, /\{dialogState === "preview" \|\| committing \? \(\n\s+<Button type="submit" busy=\{committing\} disabled=\{eligible\.length === 0 \|\| !permanentConfirmed\}>\n\s+\{format\(copy\.confirm, \{ count: eligible\.length \}\)\}/)
  assert.match(dialog, /<Button onClick=\{retry\}>\{copy\.retry\}<\/Button>/)
  assert.match(dialog, /<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" \/>/)
  assert.match(dialog, /<Field label=\{copy\.historicalReason\} required>\n\s+<Textarea\n/)
  assert.equal(dialog.match(/<FieldHint id=\{historicalHelpId\} className="text-muted-foreground">/g)?.length, 2, "muted, not faint, ink on the warning fill (DESIGN.md §2)")
  assert.equal(dialog.match(/className=\{checkboxVariants\(\{ size: "lg" \}\)\}/g)?.length, 2)
  assert.match(dialog, /className=\{cn\(checkboxVariants\(\{ size: "lg" \}\), "mt-0\.5"\)\}/)
  assert.equal(dialog.match(/<input\b/g)?.length, 3, "only the three checkboxes stay native inputs")
  assert.equal(dialog.match(/<Field label=\{copy\.(?:executionDate|executor|finalStatus)\} required>/g)?.length, 3)
  assert.match(dialog, /<Field label=\{copy\.sharedRecipient\} hint=\{copy\.sharedRecipientHelp\} className="sm:col-span-3">/)
  assert.doesNotMatch(dialog, /<footer|<button\b|<select|<textarea|<label className="(?:block )?text-sm font-medium|disabled:opacity|flex-col-reverse/)
})
