import assert from "node:assert/strict"
import test from "node:test"

import { summarizeDisposalEvidenceUploads } from "../src/lib/disposal-upload-outcome.ts"

test("keeps a created request successful when some evidence uploads fail", () => {
  const outcome = summarizeDisposalEvidenceUploads("request-1", [
    { fileName: "asset.jpg", ok: true },
    { fileName: "approval.pdf", ok: false },
  ])

  assert.deepEqual(outcome, {
    requestId: "request-1",
    uploadedCount: 1,
    failedFileNames: ["approval.pdf"],
    status: "created_with_upload_errors",
  })
})

test("reports a clean creation when every evidence file uploads", () => {
  assert.deepEqual(summarizeDisposalEvidenceUploads("request-2", []), {
    requestId: "request-2",
    uploadedCount: 0,
    failedFileNames: [],
    status: "created",
  })
})

