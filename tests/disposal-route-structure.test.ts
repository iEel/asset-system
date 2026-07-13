import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getMobileShellMode } from "../src/lib/mobile-field-navigation.ts"

test("keeps the disposal list queue-first and puts request creation on its own route", () => {
  const listSource = readFileSync("src/app/[locale]/(dashboard)/disposal/page.tsx", "utf8")
  const newSource = readFileSync("src/app/[locale]/(dashboard)/disposal/new/page.tsx", "utf8")
  const paginationSource = readFileSync("src/components/disposal/disposal-pagination.tsx", "utf8")

  assert.doesNotMatch(listSource, /DisposalRequestForm/)
  assert.match(listSource, /href=\{`\/\$\{locale\}\/disposal\/new`\}/)
  assert.match(listSource, /prisma\.disposalRequest\.count/)
  assert.match(listSource, /prisma\.disposalRequest\.groupBy/)
  assert.match(listSource, /skip: \(filters\.page - 1\) \* filters\.pageSize/)
  assert.match(listSource, /take: filters\.pageSize/)
  assert.match(listSource, /<DisposalPagination/)
  assert.match(listSource, /buildDisposalQueryString\(filters, \{ status: (?:stage|tab)\.status, page: 1 \}\)/)
  assert.doesNotMatch(listSource, /function DisposalStatusBadge/)
  assert.doesNotMatch(listSource, /<DisposalStatusBadge/)
  assert.match(paginationSource, /\[25, 50, 100\]/)
  assert.match(paginationSource, /buildDisposalQueryString\(filters, \{ pageSize, page: 1 \}\)/)
  assert.match(paginationSource, /ChevronLeft/)
  assert.match(paginationSource, /ChevronRight/)
  assert.match(paginationSource, /aria-current=/)
  assert.match(newSource, /requirePagePermission\(locale, "disposal", "create"\)/)
  assert.match(newSource, /getDisposalAssetEligibilityError\(initialAsset\.status\) === null/)
  assert.doesNotMatch(newSource, /prisma\.asset\.findMany/)
  assert.match(newSource, /prisma\.asset\.findFirst/)
  assert.match(newSource, /<DisposalRequestForm/)
  assert.match(newSource, /normalizeOperationalReturnTo\(locale, "disposal", rawSearchParams\.returnTo\)/)
  assert.match(newSource, /ArrowLeft/)
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
  assert.match(pickerSource, /disabled=\{!option\.eligible\}/)
  assert.match(pickerSource, /option\.blockers/)
})

test("guards disposal creation against inactive actors and concurrent asset claims", () => {
  const requestRoute = readFileSync("src/app/api/disposal-requests/route.ts", "utf8")
  const batchRoute = readFileSync("src/app/api/disposal-batches/route.ts", "utf8")
  const executionRoute = readFileSync("src/app/api/disposal-requests/[id]/route.ts", "utf8")

  assert.match(requestRoute, /DISPOSAL_EMPLOYEE_NOT_FOUND/)
  assert.match(requestRoute, /tx\.asset\.updateMany/)
  assert.match(requestRoute, /statusUpdate\.count !== 1/)
  assert.match(requestRoute, /withPrismaUniqueRetry/)
  assert.match(batchRoute, /tx\.asset\.updateMany/)
  assert.match(batchRoute, /orderedAssetIds = \[\.\.\.packet\.assetIds\]\.sort\(\)/)
  assert.match(batchRoute, /withPrismaUniqueRetry/)
  assert.match(executionRoute, /id: input\.executedById, isActive: true/)
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
