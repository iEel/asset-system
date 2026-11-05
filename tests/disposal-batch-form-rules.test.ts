import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  disposalBatchPhotoCount,
  planDisposalBatchUploads,
  runWithLimit,
  summarizeDisposalBatchUploads,
  validateDisposalBatchForm,
  type DisposalBatchUploadJob,
} from "../src/lib/disposal-batch-form-rules.ts"

const jpeg = { type: "image/jpeg", name: "lot.jpg" }
const pdf = { type: "application/pdf", name: "police-report.pdf" }
const filled = { disposalType: "dispose", reason: "เครื่องเสียซ่อมไม่คุ้มแล้ว", requestedById: "emp-1" }

test("validateDisposalBatchForm: one machine is refused, a row without its own photo is not", () => {
  assert.deepEqual(validateDisposalBatchForm({ assetCount: 1, lotFiles: [jpeg], ...filled }), { assets: "batchMinAssets" })
  assert.deepEqual(validateDisposalBatchForm({ assetCount: 2, lotFiles: [jpeg], ...filled }), {})
})

test("validateDisposalBatchForm: no lot photo is refused; a lost batch accepts a PDF alone", () => {
  assert.deepEqual(validateDisposalBatchForm({ assetCount: 2, lotFiles: [], ...filled }), { lotFiles: "photoRequired" })
  assert.deepEqual(validateDisposalBatchForm({ assetCount: 2, lotFiles: [pdf], ...filled, disposalType: "lost" }), {})
  assert.deepEqual(validateDisposalBatchForm({ assetCount: 2, lotFiles: [], ...filled, disposalType: "lost" }), { lotFiles: "fileRequired" })
})

test("validateDisposalBatchForm: method, reason and requester follow the single form's rules", () => {
  const errors = validateDisposalBatchForm({ assetCount: 0, lotFiles: [jpeg], disposalType: "", reason: "สั้น", requestedById: "" })
  assert.equal(errors.assets, "batchMinAssets")
  assert.equal(errors.disposalType, "required")
  assert.equal(errors.reason, "disposalReasonTooShort")
  assert.equal(errors.requestedById, "required")
  assert.equal(validateDisposalBatchForm({ assetCount: 2, lotFiles: [jpeg], ...filled, reason: "" }).reason, "required")
  assert.equal(validateDisposalBatchForm({ assetCount: 2, lotFiles: [jpeg], ...filled, reason: "ก".repeat(4001) }).reason, "tooLong")
})

test("disposalBatchPhotoCount counts the machines and those with a photo of their own", () => {
  const photo = { type: "image/jpeg" }
  const pdf = { type: "application/pdf" }
  assert.deepEqual(disposalBatchPhotoCount([{ files: [] }, { files: [photo, pdf] }, { files: [] }]), { machines: 3, withOwnPhoto: 1 })
  // A PDF alone never becomes the machine's own photo: that machine still uses the lot photo.
  assert.deepEqual(disposalBatchPhotoCount([{ files: [pdf] }, { files: [photo] }]), { machines: 2, withOwnPhoto: 1 })
})

test("planDisposalBatchUploads maps each row's files to its own request by assetId and the lot files to the batch", () => {
  const file = (name: string) => new File(["x"], name, { type: "image/jpeg" })
  const lotA = file("lot-a.jpg")
  const one = file("one.jpg")
  const twoA = file("two-a.jpg")
  const twoB = file("two-b.jpg")
  const created = {
    batch: { id: "batch-1" },
    // The server's order need not be the rows' order: the map is by assetId.
    requests: [
      { id: "req-2", assetId: "asset-2", disposalNo: "DP-0002" },
      { id: "req-1", assetId: "asset-1", disposalNo: "DP-0001" },
      { id: "req-3", assetId: "asset-3", disposalNo: "DP-0003" },
    ],
  }
  const jobs = planDisposalBatchUploads(
    created,
    [
      { assetId: "asset-1", assetTag: "NB-001", files: [one] },
      { assetId: "asset-3", assetTag: "NB-003", files: [] },
      { assetId: "asset-2", assetTag: "NB-002", files: [twoA, twoB] },
    ],
    [lotA],
  )
  assert.deepEqual(jobs, [
    { kind: "lot", batchId: "batch-1", file: lotA },
    { kind: "machine", requestId: "req-1", disposalNo: "DP-0001", assetTag: "NB-001", file: one },
    { kind: "machine", requestId: "req-2", disposalNo: "DP-0002", assetTag: "NB-002", file: twoA },
    { kind: "machine", requestId: "req-2", disposalNo: "DP-0002", assetTag: "NB-002", file: twoB },
  ])
})

test("summarizeDisposalBatchUploads names each failed machine", () => {
  const file = new File(["x"], "a.jpg", { type: "image/jpeg" })
  const machine = (requestId: string, disposalNo: string, assetTag: string): DisposalBatchUploadJob => ({ kind: "machine", requestId, disposalNo, assetTag, file })
  const summary = summarizeDisposalBatchUploads([
    { job: { kind: "lot", batchId: "batch-1", file }, ok: false },
    { job: { kind: "lot", batchId: "batch-1", file }, ok: true },
    { job: machine("req-1", "DP-0001", "NB-001"), ok: true },
    { job: machine("req-2", "DP-0002", "NB-002"), ok: false },
    { job: machine("req-2", "DP-0002", "NB-002"), ok: true },
    { job: machine("req-3", "DP-0003", "NB-003"), ok: true },
  ])
  assert.deepEqual(summary, {
    lotFailed: 1,
    machines: [{ requestId: "req-2", disposalNo: "DP-0002", assetTag: "NB-002", failed: 1 }],
  })
  assert.deepEqual(summarizeDisposalBatchUploads([]), { lotFailed: 0, machines: [] })
})

test("runWithLimit keeps at most the limit in flight and the results in task order", async () => {
  let inFlight = 0
  let peak = 0
  const tasks = Array.from({ length: 9 }, (_, index) => async () => {
    inFlight += 1
    peak = Math.max(peak, inFlight)
    await new Promise((resolve) => setTimeout(resolve, (9 - index) * 2))
    inFlight -= 1
    return index
  })
  assert.deepEqual(await runWithLimit(tasks, 4), [0, 1, 2, 3, 4, 5, 6, 7, 8])
  assert.equal(peak, 4)
  assert.deepEqual(await runWithLimit([], 4), [])
})

// Final review: Enter in the machine search never submits the form (the batch form sends at once since PB-R1).
test("Enter in the disposal asset picker's search does not submit the surrounding form", () => {
  const picker = readFileSync("src/components/disposal/disposal-asset-picker.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(picker, /function preventEnterSubmit\(event: React\.KeyboardEvent<HTMLInputElement>\) \{\n\s+if \(event\.key === "Enter"\) event\.preventDefault\(\)\n\}/)
  assert.match(picker, /<Input id=\{inputId\} value=\{query\} onChange=\{\(event\) => setQuery\(event\.target\.value\)\} onKeyDown=\{preventEnterSubmit\}/)
})
