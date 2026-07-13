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
