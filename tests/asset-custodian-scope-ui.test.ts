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

test("asset forms can opt into cross-branch locations without changing asset tag ownership scope", () => {
  const singleForm = readFileSync("src/components/assets/asset-form.tsx", "utf8")
  const batchForm = readFileSync("src/components/assets/asset-batch-form.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(singleForm, /allowCrossBranchLocation/)
  assert.match(singleForm, /allowCrossBranchLocation \? locations : locations\.filter/)
  assert.match(singleForm, /shouldAllowCrossBranchLocationOnLoad\(asset, locations\)/)
  assert.match(singleForm, /getLocationOptionLabel\(location, allowCrossBranchLocation, branches\)/)
  assert.match(singleForm, /crossBranchLocationWarning/)

  assert.match(batchForm, /allowCrossBranchLocation/)
  assert.match(batchForm, /allowCrossBranchLocation \? locations : locations\.filter/)
  assert.match(batchForm, /getLocationOptionLabel\(location, allowCrossBranchLocation, branches\)/)
  assert.match(batchForm, /crossBranchLocationWarning/)

  assert.equal(th.asset.allowCrossBranchLocation, "แสดงที่ตั้งต่างบริษัท/ต่างสาขา")
  assert.equal(en.asset.allowCrossBranchLocation, "Show cross-branch locations")
})
