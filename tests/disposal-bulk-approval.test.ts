import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  getDisposalBulkApprovalBlockCode,
  summarizeDisposalBulkApproval,
  type DisposalBulkApprovalItem,
} from "../src/lib/disposal-bulk-approval.ts"

const candidate = {
  id: "request-1",
  disposalNo: "DP-20260713-0001",
  isActive: true,
  requestStatus: "pending",
  requestedById: "employee-requester",
  createdBy: "user-requester",
  asset: {
    assetTag: "IT-001",
    status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย" },
  },
}

const actor = { userId: "user-approver", employeeId: "employee-approver" }

test("allows a pending request whose asset remains pending disposal", () => {
  assert.equal(getDisposalBulkApprovalBlockCode(candidate, actor, true), null)
})

test("blocks stale stage, SOD conflicts, and invalid asset lifecycle", () => {
  assert.equal(getDisposalBulkApprovalBlockCode({ ...candidate, requestStatus: "approved" }, actor, true), "DISPOSAL_INVALID_STAGE")
  assert.equal(getDisposalBulkApprovalBlockCode(candidate, { ...actor, employeeId: candidate.requestedById }, true), "DISPOSAL_SOD_CONFLICT")
  assert.equal(getDisposalBulkApprovalBlockCode({ ...candidate, asset: { ...candidate.asset, status: { name: "Ready" } } }, actor, true), "DISPOSAL_ASSET_INELIGIBLE")
})

test("summarizes preview and commit outcomes without hiding blocked items", () => {
  const items: DisposalBulkApprovalItem[] = [
    { requestId: "1", disposalNo: "DP-1", assetTag: "IT-1", outcome: "approved", code: null },
    { requestId: "2", disposalNo: "DP-2", assetTag: "IT-2", outcome: "blocked", code: "DISPOSAL_SOD_CONFLICT" },
    { requestId: "3", disposalNo: "DP-3", assetTag: "IT-3", outcome: "failed", code: "DISPOSAL_APPROVAL_FAILED" },
  ]
  assert.deepEqual(summarizeDisposalBulkApproval(items), {
    selected: 3,
    eligible: 0,
    blocked: 1,
    approved: 1,
    failed: 1,
  })
})

test("bulk commit delegates each item to an approval service that checks its permission boundary", () => {
  const service = readFileSync("src/lib/disposal-approval-service.ts", "utf8")

  assert.match(service, /type DisposalApprovalActor = DisposalBulkApprovalActor &/)
  assert.match(service, /permissions: string\[\]/)
  assert.match(service, /roles: string\[\]/)
  assert.match(service, /actor\.roles\.includes\("system_admin"\)/)
  assert.match(service, /actor\.permissions\.includes\("disposal:approve"\)/)
})

test("bulk approval UI keeps selection page-scoped and uses server preflight", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8")

  assert.match(source, /export function DisposalBulkApprovalProvider/)
  assert.match(source, /export function DisposalBulkSelectionToggle/)
  assert.match(source, /export function DisposalBulkApprovalToolbar/)
  assert.match(source, /export function DisposalBulkApprovalCheckbox/)
  assert.match(source, /mode:\s*"preview"/)
  assert.match(source, /mode:\s*"commit"/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /MAX_DISPOSAL_BULK_APPROVAL_ITEMS/)
  assert.match(source, /if \(!link\) return/)
  assert.doesNotMatch(source, /fixed\s+bottom-0/)
})

test("bulk approval uses required server-provided copy for every visible state", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8")

  assert.match(source, /export type DisposalBulkApprovalCopy = \{[\s\S]*?errors: Record<DisposalBulkApprovalCode, string>/)
  assert.match(source, /copy: DisposalBulkApprovalCopy/)
  assert.match(source, /copy\.sharedRemarkHelp/)
  assert.match(source, /copy\.remarkLimit/)
  assert.match(source, /copy\.committing/)
  assert.match(source, /copy\.zeroEligible/)
  assert.match(source, /copy\.retry/)
  assert.match(source, /copy\.errors\[code\]/)
  assert.doesNotMatch(source, /getBulkCopy/)
  assert.doesNotMatch(source, /useLocale|useMessages|useTranslations/)
})

test("bulk approval exposes an initial desktop select-page control with accessible mixed state", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8")

  assert.match(source, /export function DisposalBulkApprovalSelectPageControl/)
  assert.match(source, /input\.indeterminate = partiallySelected/)
  assert.match(source, /aria-checked=\{partiallySelected \? "mixed" : allSelected\}/)
  assert.match(source, /disabled=\{disabled\}/)
  assert.match(source, /togglePageSelection/)
})

test("bulk approval aborts and ignores stale preview and commit completions", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8")

  assert.match(source, /const selectionGenerationRef = useRef\(0\)/)
  assert.match(source, /const requestGenerationRef = useRef\(0\)/)
  assert.match(source, /const previewControllerRef = useRef<AbortController \| null>\(null\)/)
  assert.match(source, /const commitControllerRef = useRef<AbortController \| null>\(null\)/)
  assert.match(source, /function isCurrentRequest\(/)
  assert.match(source, /if \(!isCurrentRequest\("preview", controller, selectionGeneration, requestGeneration\)\) return/)
  assert.match(source, /if \(!isCurrentRequest\("commit", controller, selectionGeneration, requestGeneration\)\) return/)
  assert.match(source, /previewControllerRef\.current\?\.abort\(\)/)
  assert.match(source, /commitControllerRef\.current\?\.abort\(\)/)
  assert.match(source, /signal: controller\.signal/)
})

test("bulk approval invalidates requests on selection-key changes and clears stale previews", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8")

  assert.match(source, /selectionGenerationRef\.current \+= 1/)
  assert.match(source, /useEffect\(\(\) => \{[\s\S]*?selectionGenerationRef\.current \+= 1[\s\S]*?previewControllerRef\.current\?\.abort\(\)[\s\S]*?commitControllerRef\.current\?\.abort\(\)/)
  assert.match(source, /async function preview\(\) \{[\s\S]*?setResponse\(null\)[\s\S]*?setDialogState\("previewing"\)/)
  assert.doesNotMatch(source, /skipDiscardConfirmationRef/)
  assert.match(source, /function confirmDiscard\(\) \{\s*if \(selected\.size === 0\) return true/)
})

test("bulk approval has localized copy ready for the queue integration", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    for (const key of ["bulkSelection", "bulkSelectionMode", "bulkSelectionLimit", "bulkPreflightHelp", "bulkSharedRemark", "bulkZeroEligible"]) {
      assert.equal(typeof messages[key], "string", `${locale}:${key}`)
    }
    assert.equal(typeof messages.bulkErrors.DISPOSAL_APPROVAL_FAILED, "string")
  }
})
