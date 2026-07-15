import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const scanLookupRoutePath = "src/app/api/audit-rounds/[id]/scan-lookup/route.ts"
const scanRoutePath = "src/app/api/audit-rounds/[id]/scan/route.ts"
const reviewRoutePath = "src/app/api/audit-findings/[id]/review/route.ts"
const scanFormPath = "src/components/audit/audit-scan-form.tsx"
const scanHelpersPath = "src/components/audit/audit-scan-helpers.ts"
const scanTypesPath = "src/components/audit/audit-scan-types.ts"
const auditValidationPath = "src/lib/validations/audit.ts"

test("audit scan lookup returns master field ids for out-of-scope actual data", () => {
  const route = readFileSync(scanLookupRoutePath, "utf8")

  assert.match(route, /currentLocationId:\s*true/)
  assert.match(route, /custodianId:\s*true/)
  assert.match(route, /departmentId:\s*true/)
  assert.match(route, /conditionId:\s*true/)
  assert.match(route, /ownershipType:\s*true/)
  assert.match(route, /currentLocationId:\s*asset\.currentLocationId/)
  assert.match(route, /custodianId:\s*asset\.custodianId/)
  assert.match(route, /departmentId:\s*asset\.departmentId/)
  assert.match(route, /conditionId:\s*asset\.conditionId/)
})

test("audit scan form captures out-of-scope actual fields before saving", () => {
  const form = readFileSync(scanFormPath, "utf8")
  const helpers = readFileSync(scanHelpersPath, "utf8")
  const types = readFileSync(scanTypesPath, "utf8")

  assert.match(types, /export type OutOfScopeAsset = \{[\s\S]*currentLocationId:\s*string/)
  assert.match(types, /export type OutOfScopeAsset = \{[\s\S]*custodianId:\s*string \| null/)
  assert.match(types, /export type OutOfScopeAsset = \{[\s\S]*departmentId:\s*string \| null/)
  assert.match(types, /export type OutOfScopeAsset = \{[\s\S]*conditionId:\s*string \| null/)
  assert.match(types, /export type OutOfScopeAsset = \{[\s\S]*ownershipType\?:\s*string \| null/)
  assert.match(form, /getOutOfScopeActualValues\(values,\s*outOfScopeAsset\)/)
  assert.match(form, /hasOutOfScopeActualMismatch\(outOfScopeAsset,\s*outOfScopeActualValues\)/)
  assert.match(form, /actualLocationId:\s*outOfScopeActualValues\.actualLocationId/)
  assert.match(form, /actualCustodianId:\s*outOfScopeActualValues\.actualCustodianId/)
  assert.match(form, /actualDepartmentId:\s*outOfScopeActualValues\.actualDepartmentId/)
  assert.match(form, /actualConditionId:\s*outOfScopeActualValues\.actualConditionId/)
  assert.match(form, /function resetAuditPhotoQueue\(\)/)
  assert.match(form, /function clearAuditScanTarget\(\)/)
  assert.match(
    form,
    /function selectInRoundAuditItem\(item: AuditScanItem, options: \{ mode\?: "scan" \| "edit" \} = \{\}\)/
  )
  assert.match(helpers, /actualLocationId:\s*item\.expectedLocationId \?\? ""/)
  assert.match(helpers, /actualCustodianId:\s*item\.expectedCustodianId \?\? ""/)
  assert.match(helpers, /actualDepartmentId:\s*item\.expectedDepartmentId \?\? ""/)
  assert.match(helpers, /actualConditionId:\s*item\.expectedConditionId \?\? ""/)
  assert.match(form, /const shouldShowAuditPhotoEvidence = Boolean\(outOfScopeAsset \|\| isDetailedScanVisible \|\| queuedAuditPhotos\.length > 0\)/)
  assert.match(form, /\{shouldShowAuditPhotoEvidence && \(/)
  assert.match(form, /const evidenceAttachmentIds = queuedAuditPhotos\.length > 0\s*\?\s*await uploadQueuedAuditPhotos\(outOfScopeAsset\.id\)\s*:\s*\[\]/)
  assert.match(form, /evidenceAttachmentIds,/)
  assert.match(form, /clearAuditScanTarget\(\)/)
  assert.match(helpers, /actualCustodianId:\s*values\.actualCustodianId,/)
  assert.match(helpers, /actualDepartmentId:\s*values\.actualDepartmentId,/)
  assert.match(helpers, /actualConditionId:\s*values\.actualConditionId,/)
  assert.match(form, /outOfScopeAsset && \(/)
  assert.match(form, /t\("actualDataTitle"\)/)
  assert.match(form, /t\("actualLocation"\)/)
  assert.match(form, /t\("actualCustodian"\)/)
  assert.match(form, /t\("actualDepartment"\)/)
  assert.match(form, /t\("actualCondition"\)/)
})

test("out-of-scope scan save creates reviewable field findings without updating master asset", () => {
  const route = readFileSync(scanRoutePath, "utf8")
  const validation = readFileSync(auditValidationPath, "utf8")
  const outOfScopeStart = route.indexOf("if (!item)")
  const normalScanStart = route.indexOf("const actual = {")
  assert.notEqual(outOfScopeStart, -1, "missing out-of-scope branch")
  assert.notEqual(normalScanStart, -1, "missing normal scan branch")
  const outOfScopeBlock = route.slice(outOfScopeStart, normalScanStart)

  assert.match(validation, /evidenceAttachmentIds:\s*z\.array/)
  assert.match(route, /function buildOutOfScopeFieldFindings/)
  assert.match(route, /function optionalActualValue/)
  assert.match(route, /fieldFindings\.length > 0 && evidenceAttachmentIds\.length === 0/)
  assert.match(route, /Evidence attachment is required/)
  assert.match(route, /module:\s*"audit_finding"/)
  assert.match(route, /referenceId:\s*findingId/)
  assert.match(route, /departmentId:\s*optionalActualValue\(input\.actualDepartmentId,\s*asset\.departmentId\)/)
  assert.match(route, /custodianId:\s*optionalActualValue\(input\.actualCustodianId,\s*asset\.custodianId\)/)
  assert.match(route, /conditionId:\s*optionalActualValue\(input\.actualConditionId,\s*asset\.conditionId\)/)
  assert.match(route, /departmentId:\s*optionalActualValue\(input\.actualDepartmentId,\s*item\.expectedDepartmentId\)/)
  assert.match(route, /custodianId:\s*optionalActualValue\(input\.actualCustodianId,\s*item\.expectedCustodianId\)/)
  assert.match(route, /conditionId:\s*optionalActualValue\(input\.actualConditionId,\s*item\.expectedConditionId\)/)
  assert.match(route, /findingType:\s*"wrong_location"/)
  assert.match(route, /findingType:\s*"wrong_custodian"/)
  assert.match(route, /findingType:\s*"wrong_department"/)
  assert.match(route, /findingType:\s*"wrong_condition"/)
  assert.match(route, /actionTaken:\s*"out_of_scope_actual_field_reported"/)
  assert.match(route, /fieldFindingTypes/)
  assert.doesNotMatch(outOfScopeBlock, /tx\.asset\.update/)
})

test("reviewing out-of-scope findings confirms the event without master updates", () => {
  const route = readFileSync(reviewRoutePath, "utf8")
  const outOfScopeStart = route.indexOf('finding.findingType === "out_of_scope"')
  const notFoundStart = route.indexOf('finding.findingType === "not_found"')
  assert.notEqual(outOfScopeStart, -1, "missing out-of-scope review branch")
  assert.notEqual(notFoundStart, -1, "missing not-found review branch")
  const outOfScopeReviewBlock = route.slice(outOfScopeStart, notFoundStart)

  assert.match(route, /finding\.findingType === "out_of_scope"/)
  assert.match(route, /actionTaken:\s*"out_of_scope_confirmed_no_master_update"/)
  assert.doesNotMatch(outOfScopeReviewBlock, /tx\.asset\.update/)
  assert.doesNotMatch(outOfScopeReviewBlock, /tx\.assetMovement\.create/)
})
