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
  assert.match(source, /MAX_DISPOSAL_BULK_APPROVAL_ITEMS/)
  assert.match(source, /if \(!link \|\| !shouldGuardLinkClick\(event, link\)\) return/)
  assert.doesNotMatch(source, /fixed\s+bottom-0/)
})

test("bulk approval dialog uses the shared accessible dialog", () => {
  const dialogSource = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(dialogSource, /<AccessibleDialog[\s\S]*?busy=\{busy\}/)
  assert.match(dialogSource, /returnFocusRef=\{triggerRef\}/)
  assert.match(dialogSource, /fallbackFocusRef=\{restoreTargetRef\}/)
  assert.match(dialogSource, /size="xl"/)
  assert.match(dialogSource, /data-disposal-bulk-dialog="true"/)
  // The provider wrapper keeps its own tabIndex={-1}; only the dialog must drop the hand-rolled focus surface.
  const dialogFunction = dialogSource.slice(dialogSource.indexOf("function DisposalBulkApprovalDialog"))
  assert.doesNotMatch(dialogSource, /fixed inset-0|role="dialog"|restoreFocusRef/)
  assert.doesNotMatch(dialogFunction.slice(0, dialogFunction.indexOf("\nfunction ", 1)), /tabIndex=\{-1\}/)
})

test("bulk approval mobile selection uses 44px targets and exposes blocked reasons", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8")

  assert.match(source, /min-h-11 (?:min-)?w-11/)
  assert.match(source, /checkboxVariants\(/)
  assert.match(source, /blockedCode[\s\S]*?tabIndex=\{0\}/)
  assert.match(source, /getErrorLabel\(item\.blockedCode\)/)
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
  assert.match(source, /async function discardSelectionThen\(proceed: \(\) => void\) \{\s*const confirmed = await confirm\(\{ title: copy\.discardSelection/)
  assert.match(source, /if \(bypassGuardRef\.current \|\| selected\.size === 0\) return/)
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

// Plan 2B-2 Task 1 (spec 2B §8.6 row 3, §8.11 row 3): 2B owns only the list part of this 2C batch 3 file. The dialog
// (DisposalBulkApprovalDialog and the helpers below it) belongs to 2C plan 3, which checks it in the next test.
test("bulk approval list controls use Button, busy and checkboxVariants, and leave the dialog to 2C (spec 2B §8.6 row 3)", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8").replace(/\r\n/g, "\n")
  const list = source.slice(source.indexOf("export function DisposalBulkSelectionToggle"), source.indexOf("function DisposalBulkApprovalDialog"))
  const dialog = source.slice(source.indexOf("function DisposalBulkApprovalDialog"))

  assert.match(source, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(source, /^import \{ checkboxVariants \} from "@\/components\/ui\/field-variants"$/m)
  assert.match(list, /<Button variant="outline" onClick=\{toggleMode\} disabled=\{busy\} className="md:hidden">/)
  assert.match(list, /<Button variant="outline" onClick=\{selectPage\} disabled=\{busy\}>\{copy\.selectPage\}<\/Button>/)
  assert.match(list, /<Button variant="outline" onClick=\{clear\} disabled=\{busy\}>\{copy\.clearSelection\}<\/Button>/)
  assert.match(list, /<Button ref=\{triggerRef\} onClick=\{\(\) => void preview\(\)\} busy=\{busy\}>/, "the shared spinner while the preview runs; busy, never disabled beside it (FMG GB4)")
  assert.match(list, /className=\{linkVariants\(\{ size: "inherit" \}\)\}>\{copy\.retry\}<\/button>/)
  assert.match(list, /<label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">\n\s+<input\n\s+ref=\{inputRef\}/, "the select-page box gets a 44px target")
  assert.equal(list.match(/className=\{checkboxVariants\(/g)?.length, 2, "the select-page box and the row box")
  assert.doesNotMatch(list, /<Loader2\b|disabled:opacity-50|rounded border-border|focus-within:ring/)
  // 2C plan 3 moved the dialog onto the dialog parts: its two status-line spinners stay (FMG GB1 2) and its old label went (GF7 0).
  assert.equal(dialog.match(/<Loader2\b/g)?.length, 2)
  assert.doesNotMatch(dialog, /mb-1\.5 block text-sm font-medium text-foreground/)
})

// Phase 2C batch 3 (spec 2C §5.5 row 13, §5.3, I25, I27, §4.3 F6): the dialog on the dialog parts. The approve button
// stays in place with busy while the commit runs, so focus stays on it; cancel and the X are off while busy.
test("bulk approval dialog uses the dialog parts, a shared remark field and a busy approve button (2C batch 3)", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8").replace(/\r\n/g, "\n")
  const dialog = source.slice(source.indexOf("function DisposalBulkApprovalDialog"), source.indexOf("function BulkSummary"))

  assert.doesNotMatch(dialog, /closeLabel=/, "the X takes its name from the dialog itself (spec §5.3)")
  assert.match(dialog, /<form data-disposal-bulk-dialog="true" onSubmit=\{handleSubmit\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-5">/)
  assert.equal(dialog.match(/<Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" \/>/g)?.length, 2, "the preview and commit status lines")
  assert.match(dialog, /<Field\n\s+label=\{copy\.sharedRemark\}\n\s+hint=\{<><span className="block">\{copy\.sharedRemarkHelp\}<\/span><span className="block">\{formatCopy\(copy\.remarkLimit, \{ count: approvalRemark\.length \}\)\}<\/span><\/>\}\n\s+>\n\s+<Textarea value=\{approvalRemark\} maxLength=\{4000\} rows=\{4\} disabled=\{busy\}/)
  assert.match(dialog, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{dialogState === "result" \? copy\.close : copy\.cancel\}<\/AccessibleDialogCancel>\n\s+\{dialogState === "preview" && error \? <Button variant="outline" onClick=\{\(\) => void commit\(\)\} disabled=\{eligible\.length === 0\}>\{copy\.retry\}<\/Button> : null\}\n\s+\{dialogState === "preview" \|\| dialogState === "committing" \? \(\n\s+<Button type="submit" busy=\{dialogState === "committing"\} disabled=\{eligible\.length === 0\}>\n\s+<CheckSquare2 aria-hidden="true" \/>/)
  assert.doesNotMatch(dialog, /<button\b|<textarea|<label|disabled:opacity-50|min-h-11/)
})
