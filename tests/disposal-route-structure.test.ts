import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getMobileShellMode } from "../src/lib/mobile-field-navigation.ts"

test("keeps the disposal list queue-first and puts request creation on its own route", () => {
  const listSource = readFileSync("src/app/[locale]/(dashboard)/disposal/page.tsx", "utf8")
  const newSource = readFileSync("src/app/[locale]/(dashboard)/disposal/new/page.tsx", "utf8")

  assert.doesNotMatch(listSource, /DisposalRequestForm/)
  assert.match(listSource, /href=\{`\/\$\{locale\}\/disposal\/new`\}/)
  assert.match(listSource, /prisma\.disposalRequest\.count/)
  assert.match(listSource, /prisma\.disposalRequest\.groupBy/)
  assert.match(listSource, /skip: \(filters\.page - 1\) \* filters\.pageSize/)
  assert.match(listSource, /take: filters\.pageSize/)
  assert.match(listSource, /<Pagination\b/)
  assert.match(listSource, /buildDisposalQueryString\(filters, \{ status: (?:stage|tab)\.status, page: 1 \}\)/)
  assert.doesNotMatch(listSource, /function DisposalStatusBadge/)
  assert.doesNotMatch(listSource, /<DisposalStatusBadge/)
  assert.match(listSource, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(pageSize\) => \(\{ value: pageSize, href: `\/\$\{locale\}\/disposal\?\$\{buildDisposalQueryString\(filters, \{ pageSize, page: 1 \}\)\}` \}\)\)\}/)
  assert.match(listSource, /buildDisposalQueryString\(filters, \{ page: filters\.page - 1 \}\)/)
  assert.match(listSource, /buildDisposalQueryString\(filters, \{ page: filters\.page \+ 1 \}\)/)
  assert.match(newSource, /requirePagePermission\(locale, "disposal", "create"\)/)
  // The ?assetId= prefill (group 6 plan 3 Task 1): lifecycle and readiness as the POST computes them, through the rule.
  assert.match(newSource, /getDisposalAssetEligibilityError\(initialAsset\.status\) !== null \? \["lifecycle_status" as const\]/)
  assert.match(newSource, /getDisposalReadinessBlockersForAsset\(initialAsset\)/)
  assert.match(newSource, /\.\.\.disposalReadinessAssetSelect/)
  assert.match(newSource, /initialDisposalAsset\(initialAsset \? \{ eligible: initialBlockers\.length === 0, blockers: initialBlockers \} : null\)/)
  assert.match(newSource, /initialAsset && initialAssetRule === "use"/)
  assert.match(newSource, /initialAsset && initialAssetRule === "blocked"/)
  // Group 6 plan 3 Task 2: the page names the blocked asset; the form shows the notice over its picker.
  assert.match(newSource, /initialBlocked=\{blockedInitialAsset\}/)
  assert.match(readFileSync("src/components/disposal/disposal-request-form.tsx", "utf8"), /data-disposal-initial-blocked=""/)
  assert.doesNotMatch(newSource, /prisma\.asset\.findMany/)
  assert.match(newSource, /prisma\.asset\.findFirst/)
  assert.match(newSource, /<DisposalRequestForm/)
  assert.match(newSource, /normalizeOperationalReturnTo\(locale, "disposal", rawSearchParams\.returnTo\)/)
  assert.match(newSource, /<PageBackLink href=\{returnToHref\}/)
  assert.match(newSource, /initialAsset=\{eligibleInitialAsset\}/)
  assert.match(newSource, /initialReason=\{getSingleSearchParam\(rawSearchParams\.reason\)\}/)
  assert.match(newSource, /initialSourceType=\{getSingleSearchParam\(rawSearchParams\.sourceType\)\}/)
  assert.match(newSource, /initialSourceId=\{getSingleSearchParam\(rawSearchParams\.sourceId\)\}/)
})

test("moves disposal source links to the create route without dropping prefill context", () => {
  const maintenanceSource = readFileSync("src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx", "utf8")
  const findingSource = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8")

  assert.match(maintenanceSource, /\/disposal\/new\?assetId=.*reason=.*sourceType=maintenance.*sourceId=/)
  assert.match(findingSource, /\/disposal\/new\?assetId=.*reason=.*sourceType=audit_finding.*sourceId=/)
  assert.match(maintenanceSource, /appendOperationalReturnTo\(/)
  assert.match(findingSource, /appendOperationalReturnTo\(/)
})

test("treats disposal creation as a focused mobile task", () => {
  assert.equal(getMobileShellMode("/th/disposal"), "navigation")
  assert.equal(getMobileShellMode("/th/disposal/new"), "focus")
  assert.equal(getMobileShellMode("/th/disposal/request-id"), "focus")
  assert.equal(getMobileShellMode("/th/disposal/batch/new"), "focus")
})

test("searches eligible disposal assets remotely instead of rendering the full asset register", () => {
  const pickerSource = readFileSync("src/components/disposal/disposal-asset-picker.tsx", "utf8")
  const requestFormSource = readFileSync("src/components/disposal/disposal-request-form.tsx", "utf8")
  const batchFormSource = readFileSync("src/components/disposal/disposal-batch-form.tsx", "utf8")
  const batchPageSource = readFileSync("src/app/[locale]/(dashboard)/disposal/batch/new/page.tsx", "utf8")
  const routeSource = readFileSync("src/app/api/disposal-assets/route.ts", "utf8")

  assert.match(pickerSource, /\/api\/disposal-assets\?q=/)
  assert.match(requestFormSource, /<DisposalAssetPicker/)
  assert.match(batchFormSource, /<DisposalAssetPicker/)
  assert.doesNotMatch(batchPageSource, /prisma\.asset\.findMany/)
  assert.doesNotMatch(batchPageSource, /getDisposalOptions/)
  assert.match(routeSource, /requirePermission\(user, "disposal", "create"\)/)
  assert.match(routeSource, /take: id \? 1 : 100/)
  assert.match(routeSource, /slice\(0, 50\)/)
  assert.match(routeSource, /getDisposalReadinessBlockers/)
  assert.match(routeSource, /eligible: blockers\.length === 0/)
  // ?id= also returns the request form's asset card, with the register photo as the asset page picks it (group 6
  // plan 3 Task 1); the q= branch carries no card and reads no photo.
  assert.match(routeSource, /const cardPhotoId = id && assets\.length > 0 \? await readAssetRegisterPhotoId\(assets\[0\]\.id\) : null/)
  assert.match(routeSource, /\.\.\.\(id\r?\n\s+\? \{\r?\n\s+card: \{/)
  for (const field of ["name: asset.name", "assetTag: asset.assetTag", "statusName: asset.status.name", "statusNameTh: asset.status.nameTh", "locationName: asset.currentLocation.name", "branchName: asset.branch.name", "custodianName: asset.custodian?.fullNameTh ?? null", "photoAttachmentId: cardPhotoId"]) {
    assert.ok(routeSource.includes(field), field)
  }
  assert.match(routeSource, /where: \{ module: "asset", assetId, isActive: true, fileType: \{ startsWith: "image\/" \} \}/)
  assert.match(routeSource, /orderBy: \{ uploadedAt: "desc" \}/)
  assert.match(routeSource, /images\.find\(\(attachment\) => isThumbnailable\(attachment\.fileType\)\)/)
  assert.match(pickerSource, /disabled=\{!option\.eligible\}/)
  assert.match(pickerSource, /option\.blockers/)
})

test("guards disposal creation against inactive actors and concurrent asset claims", () => {
  const requestRoute = readFileSync("src/app/api/disposal-requests/route.ts", "utf8")
  const batchRoute = readFileSync("src/app/api/disposal-batches/route.ts", "utf8")
  const roundService = readFileSync("src/lib/disposal-round-service.ts", "utf8")

  assert.match(requestRoute, /DISPOSAL_EMPLOYEE_NOT_FOUND/)
  assert.match(requestRoute, /tx\.asset\.updateMany/)
  assert.match(requestRoute, /statusUpdate\.count !== 1/)
  assert.match(requestRoute, /withPrismaUniqueRetry/)
  assert.match(batchRoute, /tx\.asset\.updateMany/)
  assert.match(batchRoute, /orderedAssetIds = \[\.\.\.packet\.assetIds\]\.sort\(\)/)
  assert.match(batchRoute, /withPrismaUniqueRetry/)
  assert.match(roundService, /id: input\.executedById, isActive: true/)
  assert.match(requestRoute, /getDisposalReadinessBlockers/)
  assert.match(batchRoute, /getDisposalReadinessBlockers/)
})

test("links queue items to batch workspaces while print remains independent of the additive migration", () => {
  const listPage = readFileSync("src/app/[locale]/(dashboard)/disposal/page.tsx", "utf8")
  const detailPage = readFileSync("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx", "utf8")
  const printPage = readFileSync("src/app/[locale]/(print)/disposal/[id]/print/page.tsx", "utf8")
  const batchPage = readFileSync("src/app/[locale]/(dashboard)/disposal/batch/new/page.tsx", "utf8")
  const schemaReadiness = readFileSync("src/lib/disposal-schema-readiness.ts", "utf8")

  assert.match(listPage, /batch: \{ select: \{ id: true, batchNo: true \} \}/)
  assert.match(listPage, /request\.batch\.batchNo/)
  assert.match(detailPage, /batch: \{ select: \{ id: true, batchNo: true \} \}/)
  assert.match(printPage, /omit: \{ batchId: true \}/)
  assert.match(batchPage, /isDisposalBatchSchemaReady\(\)/)
  assert.match(batchPage, /<ActionEmptyState/)
  assert.match(schemaReadiness, /OBJECT_ID\(N'dbo\.disposal_batches'/)
  assert.match(schemaReadiness, /COL_LENGTH\(N'dbo\.disposal_requests', N'batchId'\)/)
})

test("single and bulk approval share one transactional approval service", () => {
  const service = readFileSync("src/lib/disposal-approval-service.ts", "utf8")
  const singleRoute = readFileSync("src/app/api/disposal-requests/[id]/route.ts", "utf8")
  assert.match(service, /tx\.disposalRequest\.updateMany/)
  assert.match(service, /requestStatus:\s*"pending"/)
  assert.match(service, /tx\.assetMovement\.create/)
  assert.match(service, /writeAuditLog\(tx/)
  assert.match(service, /deriveDisposalBatchStatus/)
  assert.match(singleRoute, /approveDisposalRequest\(/)
})

test("approval service enforces authorization and revalidates lifecycle under serializable isolation", () => {
  const service = readFileSync("src/lib/disposal-approval-service.ts", "utf8")

  assert.match(service, /hasDisposalApprovalPermission\(command\.actor\)/)
  assert.match(service, /throw new DisposalApprovalServiceError\("DISPOSAL_FORBIDDEN"/)
  assert.match(service, /const currentCandidate = await loadApprovalCandidate\(tx, command\.requestId, batchSchemaReady\)/)
  assert.match(service, /getDisposalBulkApprovalBlockCode\(\s*currentCandidate,\s*command\.actor,\s*command\.segregationRequired,?\s*\)/)
  assert.match(service, /Prisma\.TransactionIsolationLevel\.Serializable/)
  assert.match(service, /deriveDisposalBatchStatus\(children\.map\(\(child\) => child\.requestStatus\)\)/)
})

test("bulk approval route guards permission and revalidates each request", () => {
  const source = readFileSync("src/app/api/disposal-requests/bulk-decision/route.ts", "utf8")
  const matrix = readFileSync("src/lib/rbac-route-matrix.ts", "utf8")

  assert.match(source, /requireAuth\(\)/)
  assert.match(source, /requirePermission\(user, "disposal", "approve"\)/)
  assert.match(source, /disposalBulkDecisionSchema\.parse/)
  assert.match(source, /inspectDisposalApprovalRequests/)
  assert.match(source, /for \(const requestId of input\.requestIds\)/)
  assert.match(source, /approveDisposalRequest/)
  assert.match(source, /roles:\s*user\.roles/)
  assert.match(source, /permissions:\s*user\.permissions/)
  assert.match(matrix, /disposal-requests\/bulk-decision\/route\.ts/)
})

test("bulk approval route sanitizes unexpected infrastructure errors", () => {
  const source = readFileSync("src/app/api/disposal-requests/bulk-decision/route.ts", "utf8")

  assert.match(source, /error instanceof ZodError/)
  assert.match(source, /console\.error\("Disposal bulk approval failed"/)
  assert.match(source, /code:\s*"DISPOSAL_APPROVAL_FAILED"/)
  assert.match(source, /status:\s*500/)
  assert.match(source, /if \(error instanceof ZodError\) return errorResponse\(error, 400\)/)
})

test("approval service keeps single approval compatible before batch schema readiness", () => {
  const service = readFileSync("src/lib/disposal-approval-service.ts", "utf8")

  assert.match(service, /isDisposalBatchSchemaReady/)
  assert.match(service, /loadApprovalCandidate\([^)]*batchSchemaReady/)
  assert.match(service, /batchSchemaReady[\s\S]*?batchId:\s*true/)
  assert.match(service, /batchId:\s*null/)
  assert.doesNotMatch(service, /const approvalCandidateSelect = \{[\s\S]*?batchId:\s*true/)
})

test("bulk commit invokes the approval service even when inspection reports a blocked item", () => {
  const source = readFileSync("src/app/api/disposal-requests/bulk-decision/route.ts", "utf8")

  assert.doesNotMatch(source, /if \(previewItem\.outcome === "blocked"\) \{[\s\S]*?continue/)
  assert.match(source, /for \(const requestId of input\.requestIds\) \{[\s\S]*?try \{[\s\S]*?approveDisposalRequest\(/)
})

test("bulk commit uses a stable submitted-ID fallback without inspection metadata", () => {
  const source = readFileSync("src/app/api/disposal-requests/bulk-decision/route.ts", "utf8")

  assert.doesNotMatch(source, /inspectedById/)
  assert.match(source, /getBulkApprovalFailure\(error, requestId\)/)
  assert.match(source, /display: \{ disposalNo: requestId, assetTag: "-" \}/)
})

test("bulk commit does not inspect before independently approving every submitted ID", () => {
  const source = readFileSync("src/app/api/disposal-requests/bulk-decision/route.ts", "utf8")
  const commitSource = source.slice(source.indexOf("const items: DisposalBulkApprovalItem[]"))

  assert.match(source, /if \(input\.mode === "preview"\) \{[\s\S]*?inspectDisposalApprovalRequests/)
  assert.doesNotMatch(commitSource, /inspectDisposalApprovalRequests/)
  assert.match(commitSource, /for \(const requestId of input\.requestIds\) \{[\s\S]*?approveDisposalRequest\(/)
})

test("bulk commit preserves typed service errors when preview metadata is unavailable", () => {
  const source = readFileSync("src/app/api/disposal-requests/bulk-decision/route.ts", "utf8")
  const failureHandler = source.slice(source.indexOf("function getBulkApprovalFailure"))

  assert.ok(
    failureHandler.indexOf("error instanceof DisposalApprovalServiceError")
      < failureHandler.indexOf("display: { disposalNo: requestId, assetTag: \"-\" }"),
  )
  assert.match(failureHandler, /display: error\.item/)
})

test("bulk commit preserves DISPOSAL_FORBIDDEN as a typed blocked service error", () => {
  const source = readFileSync("src/app/api/disposal-requests/bulk-decision/route.ts", "utf8")
  const failureHandler = source.slice(source.indexOf("function getBulkApprovalFailure"))

  assert.match(failureHandler, /code: error\.code\b/)
  assert.match(readFileSync("src/lib/disposal-bulk-approval.ts", "utf8"), /"DISPOSAL_FORBIDDEN"/)
  assert.match(source, /outcome: code === "DISPOSAL_APPROVAL_FAILED" \? "failed" : "blocked"/)
})

// Group 6 plan 4 (P4-R1, spec §9.4): an actual disposal is recorded only through a disposal round. The two old paths
// answer 410 DISPOSAL_USE_ROUND; the round counts request and batch evidence and writes its audit in its transaction.
test("execution happens only in a round, which enforces the evidence policy and writes its audit transactionally", () => {
  const route = readFileSync("src/app/api/disposal-requests/[id]/route.ts", "utf8")
  const bulkRoute = readFileSync("src/app/api/disposal-requests/bulk-execution/route.ts", "utf8")
  const roundRoute = readFileSync("src/app/api/disposal-rounds/route.ts", "utf8")
  const roundService = readFileSync("src/lib/disposal-round-service.ts", "utf8")
  const executionService = readFileSync("src/lib/disposal-execution-service.ts", "utf8")

  assert.match(route, /if \(action === "execute"\) return disposalApiError\("DISPOSAL_USE_ROUND", "DISPOSAL_USE_ROUND", 410\)/)
  assert.doesNotMatch(route, /executeDisposalRequest/)
  assert.match(bulkRoute, /requirePermission\(user, "disposal", "edit"\)\s+return disposalApiError\("DISPOSAL_USE_ROUND", "DISPOSAL_USE_ROUND", 410\)/)
  assert.doesNotMatch(bulkRoute, /disposal-bulk-execution/)
  assert.match(roundRoute, /requirePermission\(user, "disposal", "edit"\)/)
  assert.match(roundRoute, /status: 201/)
  assert.match(roundRoute, /code: error\.code, error: error\.code, items: error\.items \}, \{ status: 409 \}/)
  assert.match(roundService, /module, referenceId: \{ in: chunk \}, isActive: true/)
  assert.match(roundService, /groupBy\("disposal_batch", batchIds\)/)
  assert.match(roundService, /isolationLevel: "Serializable", timeout: 120_000, maxWait: 10_000/)
  assert.match(roundService, /withPrismaUniqueRetry\(save\)/)
  assert.match(executionService, /execute_historical_without_evidence/)
  assert.match(executionService, /writeAuditLogs\(tx, audits\)/)
  assert.match(executionService, /requestStatus: "approved", isActive: true/)
  assert.doesNotMatch(executionService, /export async function executeDisposalRequest\(/)
})

test("execution sanitizes unexpected infrastructure failures", () => {
  const route = readFileSync("src/app/api/disposal-requests/[id]/route.ts", "utf8")

  assert.match(route, /error instanceof ZodError/)
  assert.match(route, /console\.error\("Disposal execution failed", error\)/)
  assert.match(route, /code:\s*"DISPOSAL_EXECUTION_FAILED"/)
  assert.match(route, /error:\s*"DISPOSAL_EXECUTION_FAILED"/)
  assert.match(route, /status:\s*500/)
  assert.match(route, /issue\.path\[0\] === "evidenceExceptionReason"/)
  assert.match(route, /DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED/)
  assert.doesNotMatch(route, /catch \(error\) \{\s*return errorResponse\(error, 400\)/)
})

test("the decision route rejects through the guarded service and resolves Pending Disposal without a status id", () => {
  const route = readFileSync("src/app/api/disposal-requests/[id]/route.ts", "utf8")
  const service = readFileSync("src/lib/disposal-approval-service.ts", "utf8")
  const rejectService = service.slice(service.indexOf("export async function rejectDisposalRequest"))

  assert.doesNotMatch(route, /tx\.disposalRequest\.update\(\{/)
  assert.match(route, /rejectDisposalRequest\(/)
  assert.match(route, /\{ name: "Pending Disposal" \}/)
  assert.match(route, /if \(input\.nextStatusId\)/)
  assert.match(route, /DISPOSAL_PENDING_STATUS_MISSING/)
  assert.match(route, /\{ reason:/)
  assert.match(rejectService, /tx\.disposalRequest\.updateMany\(\{\s*where: \{ id: [^}]*isActive: true, requestStatus: "pending" \}/)
  assert.match(rejectService, /Prisma\.TransactionIsolationLevel\.Serializable/)
  assert.match(rejectService, /deriveDisposalBatchStatus/)
  assert.match(rejectService, /logAudit/)
})

test("the bulk preview and the approve answer carry the separation-of-duties reason", () => {
  const service = readFileSync("src/lib/disposal-approval-service.ts", "utf8")
  const bulkRoute = readFileSync("src/app/api/disposal-requests/bulk-decision/route.ts", "utf8")
  const errors = readFileSync("src/lib/disposal-api-errors.ts", "utf8")

  assert.match(service, /getDisposalApprovalBlock\(/)
  assert.match(service, /sodReason: block\?\.sodReason \?\? null/)
  assert.match(bulkRoute, /sodReason:/)
  assert.match(errors, /extra\?: \{ reason\?: DisposalSodReason \}/)
})
