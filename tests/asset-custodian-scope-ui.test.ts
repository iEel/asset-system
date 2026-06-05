import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("asset create forms label asset owner scope separately from custodian scope", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.equal(th.asset.assetOwnerCompany, "บริษัทเจ้าของทรัพย์สิน / ใช้สร้างรหัส")
  assert.equal(th.asset.assetOwnerBranch, "สาขาเจ้าของรหัส")
  assert.match(th.asset.assetOwnerCompanyHelp, /Asset Tag/)
  assert.equal(en.asset.assetOwnerCompany, "Asset Owner Company / Tag Scope")
  assert.equal(en.asset.assetOwnerBranch, "Owner Branch / Tag Scope")
})

test("single asset form can opt into cross-company custodians with a visible warning", () => {
  const source = readFileSync("src/components/assets/asset-form.tsx", "utf8")

  assert.match(source, /allowCrossCompanyCustodian/)
  assert.match(source, /allowCrossCompanyCustodian \? employees : employees\.filter/)
  assert.match(source, /crossCompanyCustodianWarning/)
  assert.match(source, /assetOwnerCompany/)
  assert.match(source, /assetOwnerBranch/)
})

test("edit asset form opens cross-company custodian mode when the saved custodian is outside the owner scope", () => {
  const source = readFileSync("src/components/assets/asset-form.tsx", "utf8")

  assert.match(source, /shouldAllowCrossCompanyCustodianOnLoad\(asset, employees, branches, departments\)/)
  assert.match(source, /useState\(\(\) => shouldAllowCrossCompanyCustodianOnLoad\(asset, employees, branches, departments\)\)/)
})

test("batch asset form can opt into cross-company custodians for common and row custodians", () => {
  const source = readFileSync("src/components/assets/asset-batch-form.tsx", "utf8")

  assert.match(source, /allowCrossCompanyCustodian/)
  assert.match(source, /allowCrossCompanyCustodian \? employees : employees\.filter/)
  assert.match(source, /hasCrossCompanyCustodian/)
  assert.match(source, /crossCompanyCustodianWarning/)
  assert.match(source, /assetOwnerCompany/)
  assert.match(source, /assetOwnerBranch/)
})
