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
  assert.match(component, /role="dialog"/)
  assert.match(component, /aria-modal="true"/)
  assert.match(component, /min-h-11 min-w-11/)
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
  assert.match(component, /window\.confirm/)
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
  assert.match(component, /recipientFallbackApplicable/)
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
