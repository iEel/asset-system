import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const scanLookupRoutePath = "src/app/api/audit-rounds/[id]/scan-lookup/route.ts"
const scanRoutePath = "src/app/api/audit-rounds/[id]/scan/route.ts"
const reviewRoutePath = "src/app/api/audit-findings/[id]/review/route.ts"
const scanCheckFormPath = "src/components/audit/audit-scan-check-form.tsx"
const scanWorkspacePath = "src/components/audit/audit-scan-workspace.tsx"
const scanSessionPath = "src/lib/audit-scan-session.ts"
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

test("audit scan check form captures out-of-scope actual fields before saving", () => {
  const form = readFileSync(scanCheckFormPath, "utf8")
  const workspace = readFileSync(scanWorkspacePath, "utf8")
  const session = readFileSync(scanSessionPath, "utf8")
  const types = readFileSync(scanTypesPath, "utf8")

  assert.match(types, /export type AuditLookupAsset = \{[\s\S]*currentLocationId:\s*string/)
  assert.match(types, /export type AuditLookupAsset = \{[\s\S]*custodianId:\s*string \| null/)
  assert.match(types, /export type AuditLookupAsset = \{[\s\S]*departmentId:\s*string \| null/)
  assert.match(types, /export type AuditLookupAsset = \{[\s\S]*conditionId:\s*string \| null/)
  assert.match(types, /export type AuditLookupAsset = \{[\s\S]*ownershipType\?:\s*string \| null/)
  assert.match(form, /buildCheckDefaults\(\{ mode: "out_of_scope", master: lookupMasterValues\(target\.asset\), room \}\)/)
  assert.match(form, /masterCheckValues\(lookupMasterValues\(target\.asset\)\)/)
  assert.match(form, /locationId: asset\.currentLocationId/)
  assert.match(form, /custodianId: asset\.custodianId/)
  assert.match(form, /departmentId: asset\.departmentId/)
  assert.match(form, /conditionId: asset\.conditionId/)
  assert.match(form, /const diff = diffCheckValues\(values, expected, ownershipType\)/)
  assert.match(session, /actualLocationId: values\.location \|\| null/)
  assert.match(session, /actualCustodianId: values\.custodian \|\| null/)
  assert.match(session, /actualDepartmentId: values\.department \|\| null/)
  assert.match(session, /actualConditionId: values\.condition \|\| null/)

  const outOfScope = workspace.slice(workspace.indexOf("async function submitOutOfScope"), workspace.indexOf("async function confirmComponent"))
  assert.ok(outOfScope.length > 0, "missing submitOutOfScope")
  assert.match(outOfScope, /evidenceAttachmentIds\.push\(\(await uploadPhotoFile\(asset\.id, photo\.file, photo\.label\)\)\.id\)/)
  assert.ok(outOfScope.indexOf("evidenceAttachmentIds.push") < outOfScope.indexOf("/scan`"), "evidence uploads before the scan post")
  assert.match(outOfScope, /\.\.\.toScanPayloadValues\(submission\.values\)/)
  assert.match(outOfScope, /evidenceAttachmentIds,/)
  assert.match(outOfScope, /finishSave\(/)
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
