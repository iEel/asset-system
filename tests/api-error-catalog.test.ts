import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

import { apiErrorKeyByMessage, describeApiError, getApiErrorKey } from "../src/lib/api-error-catalog.ts"

const thai = { lookup: (key: string) => `TH:${key}`, unknown: "เกิดข้อผิดพลาด", empty: "เกิดข้อผิดพลาด" }

test("a known server message becomes Thai with the original kept as detail", () => {
  const key = getApiErrorKey("Asset not found")
  assert.ok(key)
  assert.deepEqual(describeApiError("Asset not found", thai), { message: `TH:${key}`, detail: "Asset not found" })
})

test("an unknown server message falls back to a generic Thai line and keeps the original", () => {
  assert.deepEqual(describeApiError("Something odd happened", thai), { message: "เกิดข้อผิดพลาด", detail: "Something odd happened" })
})

test("empty input and text that is already Thai are not duplicated", () => {
  assert.deepEqual(describeApiError(undefined, thai), { message: "เกิดข้อผิดพลาด", detail: null })
  assert.deepEqual(describeApiError("   ", thai), { message: "เกิดข้อผิดพลาด", detail: null })
  assert.deepEqual(describeApiError("เกิดข้อผิดพลาด", thai), { message: "เกิดข้อผิดพลาด", detail: null })
})

test("on the English site the detail line disappears when it would repeat the message", () => {
  const english = { lookup: () => "Asset not found", unknown: "Something went wrong", empty: "Something went wrong" }
  assert.deepEqual(describeApiError("Asset not found", english), { message: "Asset not found", detail: null })
})

// Files whose errors never reach a browser as response text. Each entry needs a reason.
const internalErrorFiles: Record<string, string> = {
  "src/lib/manual-migration-ledger.ts": "CLI migration tool output",
  "src/lib/manual-migration-sql-server.ts": "CLI migration tool output",
  "src/lib/asset-qr-scanner.ts": "camera errors are mapped to cameraError/cameraNotFound in the scan UI",
  "src/lib/audit-offline-queue.ts": "client-side IndexedDB queue errors",
}

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.name.endsWith(".ts")) out.push(path.replaceAll("\\", "/"))
  }
  return out
}

test("every literal error message the server can send has a Thai translation", () => {
  const pattern = /(?:\berror:\s*|new\s+\w*Error\(\s*(?:\d+\s*,\s*)?)"([A-Za-z][^"]{2,160})"/g
  const files = [...walk("src/app/api"), ...walk("src/lib")].filter((file) => !(file in internalErrorFiles))
  const missing = new Set<string>()
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(pattern)) {
      if (!(match[1] in apiErrorKeyByMessage)) missing.add(`${match[1]}  (${file})`)
    }
  }
  assert.deepEqual([...missing], [])
})

test("every catalog key has Thai and English text", () => {
  for (const locale of ["th", "en"] as const) {
    const apiErrors = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors as Record<string, string>
    assert.equal(typeof apiErrors.unknown, "string", `${locale} apiErrors.unknown`)
    const missing = [...new Set(Object.values(apiErrorKeyByMessage))].filter((key) => typeof apiErrors[key] !== "string")
    assert.deepEqual(missing, [], locale)
  }
})

test("internal-file exceptions still exist", () => {
  for (const file of Object.keys(internalErrorFiles)) assert.ok(readFileSync(file, "utf8").length > 0, file)
})
