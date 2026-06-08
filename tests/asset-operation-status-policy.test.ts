import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  canCorrectAssetStatus,
  getAssetRegisterStatusChangeError,
  getAssetStatusCorrectionError,
  getDisposalExecutionStatusError,
  getMaintenanceCloseStatusError,
} from "../src/lib/asset-lifecycle-exception-policy.ts"
import { getAssetOperationStatusError } from "../src/lib/asset-operation-policy.ts"

test("blocks checkout for closed and review-required asset statuses", () => {
  for (const statusName of ["Disposed", "Retired", "Pending Disposal", "Under Maintenance", "Lost", "Missing"]) {
    assert.equal(
      getAssetOperationStatusError("checkout", { name: statusName, nameTh: statusName }),
      "Asset status does not allow checkout",
      statusName
    )
  }

  assert.equal(getAssetOperationStatusError("checkout", { name: "Ready", nameTh: "พร้อมใช้งาน" }), null)
})

test("blocks normal transfer for closed and pending-disposal asset statuses", () => {
  for (const statusName of ["Disposed", "Retired", "Pending Disposal"]) {
    assert.equal(
      getAssetOperationStatusError("transfer", { name: statusName, nameTh: statusName }),
      "Asset status does not allow transfer",
      statusName
    )
  }

  assert.equal(getAssetOperationStatusError("transfer", { name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม" }), null)
  assert.equal(getAssetOperationStatusError("transfer", { name: "Ready", nameTh: "พร้อมใช้งาน" }), null)
})

test("restricts maintenance close to ready or pending disposal asset states", () => {
  assert.equal(getMaintenanceCloseStatusError({ name: "Ready" }), null)
  assert.equal(getMaintenanceCloseStatusError({ name: "Pending Disposal" }), null)
  assert.equal(getMaintenanceCloseStatusError({ name: "Disposed" }), "Maintenance close can only set asset status to Ready or Pending Disposal")
  assert.equal(getMaintenanceCloseStatusError({ name: "Checked Out" }), "Maintenance close can only set asset status to Ready or Pending Disposal")
})

test("restricts disposal execution to final disposed or retired states", () => {
  assert.equal(getDisposalExecutionStatusError({ name: "Disposed" }), null)
  assert.equal(getDisposalExecutionStatusError({ name: "Retired" }), null)
  assert.equal(getDisposalExecutionStatusError({ name: "Ready" }), "Disposal execution can only set asset status to Disposed or Retired")
  assert.equal(getDisposalExecutionStatusError({ name: "Pending Disposal" }), "Disposal execution can only set asset status to Disposed or Retired")
})

test("blocks protected lifecycle status changes through generic asset edit", () => {
  assert.equal(
    getAssetRegisterStatusChangeError({ name: "Ready" }, { name: "Pending Disposal" }),
    "Protected lifecycle statuses must be changed through the proper workflow or status correction"
  )
  assert.equal(
    getAssetRegisterStatusChangeError({ name: "Disposed" }, { name: "Ready" }),
    "Protected lifecycle statuses must be changed through the proper workflow or status correction"
  )
  assert.equal(getAssetRegisterStatusChangeError({ name: "Ready" }, { name: "Checked Out" }), null)
  assert.equal(getAssetRegisterStatusChangeError({ name: "Ready" }, { name: "Ready" }), null)
})

test("allows controlled status correction from protected states back to ready", () => {
  for (const statusName of ["Pending Disposal", "Disposed", "Retired", "Lost", "Missing", "Under Maintenance", "Pending Repair"]) {
    assert.equal(getAssetStatusCorrectionError({ name: statusName }, { name: "Ready" }), null, statusName)
  }

  assert.equal(
    getAssetStatusCorrectionError({ name: "Disposed" }, { name: "Checked Out" }),
    "Status correction can only return protected lifecycle statuses to Ready"
  )
  assert.equal(
    getAssetStatusCorrectionError({ name: "Ready" }, { name: "Ready" }),
    "This asset status does not require controlled correction"
  )
})

test("status correction action is only visible for recoverable statuses", () => {
  for (const statusName of ["Pending Disposal", "Disposed", "Retired", "Lost", "Missing", "Under Maintenance", "Pending Repair"]) {
    assert.equal(canCorrectAssetStatus({ name: statusName }), true, statusName)
  }
  assert.equal(canCorrectAssetStatus({ name: "Ready" }), false)
  assert.equal(canCorrectAssetStatus({ name: "Checked Out" }), false)
})

test("lifecycle routes call exception policy helpers", () => {
  const routes = [
    ["src/app/api/maintenance-tickets/[id]/route.ts", /getMaintenanceCloseStatusError/],
    ["src/app/api/disposal-requests/[id]/route.ts", /getDisposalExecutionStatusError/],
    ["src/app/api/assets/[id]/route.ts", /getAssetRegisterStatusChangeError/],
    ["src/app/api/assets/[id]/status-correction/route.ts", /getAssetStatusCorrectionError/],
  ] as const

  for (const [route, pattern] of routes) {
    const source = readFileSync(route, "utf8")
    assert.match(source, pattern, route)
  }
})

test("asset detail exposes controlled status correction action", () => {
  const pageSource = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  const componentSource = readFileSync("src/components/assets/asset-status-correction-button.tsx", "utf8")

  assert.match(pageSource, /AssetStatusCorrectionButton/)
  assert.match(pageSource, /canCorrectAssetStatus/)
  assert.match(componentSource, /\/api\/assets\/\$\{assetId\}\/status-correction/)
  assert.match(componentSource, /reason\.trim\(\)\.length < 5/)
})

test("asset edit form guides protected lifecycle changes to the right workflow", () => {
  const optionsSource = readFileSync("src/lib/asset-form-options.ts", "utf8")
  const formSource = readFileSync("src/components/assets/asset-form.tsx", "utf8")

  assert.match(optionsSource, /select: \{ id: true, name: true, nameTh: true \}/)
  assert.match(optionsSource, /statuses: statuses\.map\(\(status\) => \(\{ id: status\.id, label: status\.nameTh, name: status\.name \}\)\)/)
  assert.match(formSource, /protectedAssetWorkflowStatuses/)
  assert.match(formSource, /isProtectedStatusChange/)
  assert.match(formSource, /protectedStatusEditBlocked/)
  assert.match(formSource, /\/\$\{locale\}\/maintenance\?assetId=\$\{encodeURIComponent\(asset\.id\)\}/)
  assert.match(formSource, /openRepairWorkflow/)
})

test("asset lifecycle workflow guidance messages are localized", () => {
  for (const file of ["messages/th.json", "messages/en.json"]) {
    const messages = JSON.parse(readFileSync(file, "utf8"))
    assert.equal(typeof messages.asset.protectedStatusEditBlocked, "string", file)
    assert.equal(typeof messages.asset.protectedStatusEditHelp, "string", file)
    assert.equal(typeof messages.asset.protectedStatusCorrectionHelp, "string", file)
    assert.equal(typeof messages.asset.openRepairWorkflow, "string", file)
  }
})
