import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDisposalRequestSummary,
  defaultDisposalRequester,
  disposalReadinessLine,
  getDisposalPhotoRequirementError,
  getDisposalQueuedFileError,
  initialDisposalAsset,
} from "../src/lib/disposal-request-form-rules.ts"

test("a request needs an image; a lost request needs any file", () => {
  assert.equal(getDisposalPhotoRequirementError([], "sell"), "photoRequired")
  assert.equal(getDisposalPhotoRequirementError([{ type: "application/pdf" }], "sell"), "photoRequired")
  assert.equal(getDisposalPhotoRequirementError([{ type: "image/jpeg" }], "sell"), null)
  assert.equal(getDisposalPhotoRequirementError([{ type: "application/pdf" }], "lost"), null)
  assert.equal(getDisposalPhotoRequirementError([], "lost"), "fileRequired")
  assert.equal(getDisposalPhotoRequirementError([{ type: "image/png" }], ""), null)
})

test("review focus 1: a queued PDF passes for lost, then fails again for sell until an image is queued", () => {
  const files = [{ type: "application/pdf" }]
  assert.equal(getDisposalPhotoRequirementError(files, "lost"), null)
  assert.equal(getDisposalPhotoRequirementError(files, "sell"), "photoRequired")
  assert.equal(getDisposalPhotoRequirementError([...files, { type: "image/webp" }], "sell"), null)
})

test("an image outside JPG, PNG and WEBP does not count as the photo", () => {
  assert.equal(getDisposalPhotoRequirementError([{ type: "image/heic" }], "sell"), "photoRequired")
  assert.equal(getDisposalPhotoRequirementError([{ type: "IMAGE/JPEG" }], "sell"), null)
})

test("HEIC/HEIF and other image types are refused when queued", () => {
  assert.equal(getDisposalQueuedFileError({ type: "image/heic", name: "a.heic" }), "DISPOSAL_PHOTO_TYPE")
  assert.equal(getDisposalQueuedFileError({ type: "", name: "IMG_1.HEIC" }), "DISPOSAL_PHOTO_TYPE")
  assert.equal(getDisposalQueuedFileError({ type: "", name: "IMG_2.heif" }), "DISPOSAL_PHOTO_TYPE")
  assert.equal(getDisposalQueuedFileError({ type: "image/gif", name: "a.gif" }), "DISPOSAL_PHOTO_TYPE")
  assert.equal(getDisposalQueuedFileError({ type: "image/jpeg", name: "a.jpg" }), null)
  assert.equal(getDisposalQueuedFileError({ type: "application/pdf", name: "a.pdf" }), null)
})

test("the readiness line shows only for a ready asset", () => {
  assert.equal(disposalReadinessLine({ eligible: true, blockers: [] }), "ready")
  assert.equal(disposalReadinessLine({ eligible: true, blockers: ["open_checkout"] }), "blocked")
  assert.equal(disposalReadinessLine({ eligible: false, blockers: [] }), "blocked")
})

test("the requester starts as the signed-in user's employee when listed (review focus 3)", () => {
  const employees = [{ id: "e1" }, { id: "e2" }]
  assert.deepEqual(defaultDisposalRequester({ employeeId: "e2" }, employees), { requestedById: "e2", needsChoice: false })
  assert.deepEqual(defaultDisposalRequester({ employeeId: null }, employees), { requestedById: "", needsChoice: true })
  assert.deepEqual(defaultDisposalRequester({ employeeId: "gone" }, employees), { requestedById: "", needsChoice: true })
})

test("the summary rows and checks", () => {
  const empty = buildDisposalRequestSummary({
    assetStatusName: "พร้อมใช้งาน",
    disposalType: "",
    approverLabel: null,
    photoCount: 0,
    fileCount: 0,
    requesterChosen: false,
    reasonOk: false,
  })
  const assetStatus = empty.rows.find((row) => row.key === "assetStatus")
  assert.deepEqual(assetStatus, { key: "assetStatus", now: "พร้อมใช้งาน", next: "pendingDisposal" })
  assert.deepEqual(empty.rows.find((row) => row.key === "request"), { key: "request", now: null, next: "pending" })
  assert.deepEqual(empty.rows.find((row) => row.key === "approver"), { key: "approver", now: null, next: "anyApprover" })
  const check = (summary: typeof empty, key: string) => summary.checks.find((item) => item.key === key)?.done
  assert.equal(check(empty, "asset"), true)
  assert.equal(check(empty, "method"), false)
  assert.equal(check(empty, "requesterReason"), false)
  assert.equal(check(empty, "photo"), false)

  const filled = buildDisposalRequestSummary({
    assetStatusName: "พร้อมใช้งาน",
    disposalType: "sell",
    approverLabel: "E001 - สมชาย",
    photoCount: 1,
    fileCount: 1,
    requesterChosen: true,
    reasonOk: true,
  })
  assert.equal(check(filled, "method"), true)
  assert.equal(check(filled, "photo"), true)
  assert.equal(check(filled, "requesterReason"), true)
  assert.deepEqual(filled.rows.find((row) => row.key === "approver"), { key: "approver", now: null, next: "E001 - สมชาย" })

  const noAsset = buildDisposalRequestSummary({ ...{ assetStatusName: null, disposalType: "lost", approverLabel: null }, photoCount: 0, fileCount: 1, requesterChosen: true, reasonOk: false })
  assert.equal(check(noAsset, "asset"), false)
  assert.equal(check(noAsset, "photo"), true, "a lost request counts any file")
  assert.equal(check(noAsset, "requesterReason"), false)
})

test("the ?assetId= prefill uses only a ready asset (review focus 5)", () => {
  assert.equal(initialDisposalAsset({ eligible: true, blockers: [] }), "use")
  assert.equal(initialDisposalAsset({ eligible: true, blockers: ["active_maintenance"] }), "blocked")
  assert.equal(initialDisposalAsset({ eligible: false, blockers: ["lifecycle_status"] }), "blocked")
  assert.equal(initialDisposalAsset(null), "none")
})
