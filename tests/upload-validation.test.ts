import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  detectUploadFileSignature,
  isUploadSignatureAllowed,
} from "../src/lib/upload-signature.ts"
import { resolveUploadScanArgs } from "../src/lib/upload-virus-scan.ts"
import { MAX_UPLOAD_BYTES, validateUploadFile, validateUploadFileContent } from "../src/lib/uploads.ts"

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

test("detects common upload file signatures", () => {
  assert.equal(detectUploadFileSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])), "pdf")
  assert.equal(detectUploadFileSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png")
  assert.equal(detectUploadFileSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "jpeg")
  assert.equal(detectUploadFileSignature(new TextEncoder().encode("GIF89a")), "gif")
  assert.equal(detectUploadFileSignature(new Uint8Array([0x50, 0x4b, 0x03, 0x04])), "zip")
})

test("rejects mismatched MIME, extension, and file content signatures", async () => {
  assert.equal(
    isUploadSignatureAllowed({
      mimeType: "application/pdf",
      extension: ".pdf",
      bytes: new TextEncoder().encode("MZ executable"),
    }),
    false
  )
  assert.equal(
    isUploadSignatureAllowed({
      mimeType: "image/png",
      extension: ".png",
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
    }),
    false
  )
  assert.equal(
    isUploadSignatureAllowed({
      mimeType: "",
      extension: ".xlsx",
      bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    }),
    true
  )
  await assert.rejects(
    () => validateUploadFileContent(new File(["MZ executable"], "invoice.pdf", { type: "application/pdf" })),
    /content does not match/
  )
})

test("resolves optional scanner argument templates", () => {
  assert.deepEqual(resolveUploadScanArgs("/uploads/file.pdf"), ["/uploads/file.pdf"])
  assert.deepEqual(resolveUploadScanArgs("/uploads/file.pdf", "--quiet --file {file}"), ["--quiet", "--file", "/uploads/file.pdf"])
})

test("upload routes keep metadata and content validation before writing bytes, then scan after write", () => {
  const files = [
    "src/lib/asset-operation-evidence.ts",
    "src/lib/asset-component-evidence.ts",
    "src/lib/purchase-documents.ts",
    "src/app/api/assets/[id]/attachments/route.ts",
    "src/app/api/audit-findings/[id]/attachments/route.ts",
    "src/app/api/maintenance-tickets/[id]/attachments/route.ts",
    "src/app/api/disposal-requests/[id]/attachments/route.ts",
    "src/app/api/models/[id]/attachments/route.ts",
  ]

  for (const file of files) {
    const source = readFileSync(file, "utf8")
    assert.match(source, /validateUploadFile\(file\)[\s\S]*await validateUploadFileContent\(file\)[\s\S]*await writeFile\(/, file)
    assert.match(source, /await writeFile\(filePath, bytes\)[\s\S]*await scanWrittenUploadFile\(filePath\)/, file)
  }
})

test("asset import routes validate workbook content before parsing", () => {
  const routes = [
    "src/app/api/assets/import-preview/route.ts",
    "src/app/api/assets/import-confirm/route.ts",
  ]

  for (const route of routes) {
    const source = readFileSync(route, "utf8")
    assert.match(source, /await validateUploadFileContent\(file\)[\s\S]*parseAssetImportWorkbook/, route)
  }
})
