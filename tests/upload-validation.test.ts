import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { MAX_UPLOAD_BYTES, validateUploadFile } from "../src/lib/uploads.ts"

test("rejects empty, oversize, disallowed, and spoofed upload files", () => {
  assert.throws(() => validateUploadFile(new File([], "empty.pdf", { type: "application/pdf" })), /empty/)

  assert.throws(
    () => validateUploadFile(new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "large.pdf", { type: "application/pdf" })),
    /exceeds 10 MB/
  )

  assert.throws(() => validateUploadFile(new File(["x"], "script.js", { type: "application/javascript" })), /not allowed/)
  assert.throws(() => validateUploadFile(new File(["x"], "invoice.exe", { type: "application/pdf" })), /extension/)
})

test("accepts supported upload MIME and extension combinations", () => {
  assert.doesNotThrow(() => validateUploadFile(new File(["pdf"], "invoice.pdf", { type: "application/pdf" })))
  assert.doesNotThrow(() => validateUploadFile(new File(["png"], "asset-photo.png", { type: "image/png" })))
  assert.doesNotThrow(() =>
    validateUploadFile(new File(["xlsx"], "asset-import.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }))
  )
})

test("upload routes keep file validation before writing bytes", () => {
  const routes = [
    "src/app/api/assets/[id]/attachments/route.ts",
    "src/app/api/audit-findings/[id]/attachments/route.ts",
    "src/app/api/maintenance-tickets/[id]/attachments/route.ts",
    "src/app/api/disposal-requests/[id]/attachments/route.ts",
    "src/app/api/models/[id]/attachments/route.ts",
  ]

  for (const route of routes) {
    const source = readFileSync(route, "utf8")
    assert.match(source, /validateUploadFile\(file\)[\s\S]*await writeFile\(/, route)
  }
})
