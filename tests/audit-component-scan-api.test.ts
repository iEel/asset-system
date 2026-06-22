import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit scan validation accepts component confirmation fields", () => {
  const validation = readFileSync("src/lib/validations/audit.ts", "utf8")

  assert.match(validation, /confirmedWithParentAssetId:\s*optionalText/)
  assert.match(validation, /componentConfirmationReason:\s*optionalText/)
})

test("audit scan lookup returns parent and component relationship context", () => {
  const route = readFileSync("src/app/api/audit-rounds/[id]/scan-lookup/route.ts", "utf8")

  assert.match(route, /parentComponents/)
  assert.match(route, /installedInLinks/)
  assert.match(route, /buildAuditComponentLookupContext/)
  assert.match(route, /relatedAuditItems/)
  assert.match(route, /components:/)
  assert.match(route, /installedIn:/)
})

test("audit scan route confirms components with parent context", () => {
  const route = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")

  assert.match(route, /confirmedWithParentAssetId/)
  assert.match(route, /assertComponentInstalledUnderParent/)
  assert.match(route, /confirmed_with_parent/)
  assert.match(route, /componentConfirmationReason/)
  assert.match(route, /parentAssetTag/)
  assert.match(route, /Component confirmation reason is required/)
  assert.match(route, /Component is not included in this audit round/)
  assert.match(route, /buildComponentConfirmationFindingActions/)
  assert.match(route, /findingType:\s*"not_found"/)
  assert.match(route, /found_later_by_component_confirmation/)
  assert.match(route, /resolvedNotFoundFinding:\s*result\.resolvedNotFoundFinding/)
  assert.match(route, /Prisma\.TransactionIsolationLevel\.Serializable/)
  assert.match(route, /runComponentConfirmationTransaction/)
  assert.match(route, /isRetryableComponentConfirmationTransactionError/)
  assert.match(route, /componentConfirmationTransactionMaxAttempts/)
})

test("audit scan and finding review sync only supported audit fields to confirmed components", () => {
  const scanRoute = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")
  const reviewRoute = readFileSync("src/app/api/audit-findings/[id]/review/route.ts", "utf8")

  assert.match(scanRoute, /syncInstalledComponentsWithParent/)
  assert.match(scanRoute, /parent_audit_confirmation_sync/)
  assert.match(scanRoute, /restrictToAssetIds/)
  assert.match(reviewRoute, /syncInstalledComponentsWithParent/)
  assert.match(reviewRoute, /parent_audit_finding_sync/)
  assert.doesNotMatch(scanRoute, /branchId:\s*actual/)
  assert.doesNotMatch(reviewRoute, /conditionId:\s*finding\.actualValue[\s\S]*syncInstalledComponentsWithParent/)
})

test("audit scan route requires component confirmation parent to be in the same round", () => {
  const route = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")

  assert.match(route, /assertComponentInstalledUnderParent\(tx, id, parentAssetId, item\.assetId\)/)
  assert.match(route, /auditRoundId_assetId:\s*\{\s*auditRoundId,\s*assetId:\s*parentAssetId\s*\}/)
  assert.match(route, /Component parent is not included in this audit round/)
})
