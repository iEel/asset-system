import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

import { apiErrorKeyByMessage, describeApiError, getApiErrorKey, isUnauthorizedError } from "../src/lib/api-error-catalog.ts"
import { assetOperationRefusalReasonKeys } from "../src/lib/asset-operation-eligibility.ts"

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

test("the fixed validation message and its code read as one Thai line (spec 2C §8.5)", () => {
  assert.equal(getApiErrorKey("Invalid request data"), "validationFailed")
  assert.equal(getApiErrorKey("VALIDATION_FAILED"), "validationFailed")
  assert.deepEqual(describeApiError("Invalid request data", thai), { message: "TH:validationFailed", detail: "Invalid request data" })
  const text = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors.validationFailed as string
  assert.equal(text("th"), "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง ตรวจสอบแล้วลองอีกครั้ง")
  assert.equal(text("en"), "Invalid request data")
  // The English text equals the server message, so the English site shows no second line.
  const english = { lookup: () => text("en"), unknown: "Something went wrong", empty: "Something went wrong" }
  assert.deepEqual(describeApiError("Invalid request data", english), { message: "Invalid request data", detail: null })
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

// Files whose `message:` literals are not error text a route sends to a form (V track spec §6.3 widened the scan to
// `message:`, where the zod issue messages of src/lib/validations and src/lib/disposal-type-policy.ts live). Each entry needs a reason.
const nonErrorMessageFiles: Record<string, string> = {
  "src/app/api/audit-rounds/[id]/scan/route.ts": "the 202 out-of-scope scan result; the scan screen shows its own text",
  "src/lib/disposal-bulk-execution-ui.ts": "selection codes (mixed, limit) that the bulk execution screen turns into its own text",
  "src/lib/ldap-auth.ts": "the LDAP connection test result, which the settings screen shows as sent",
}

test("every literal error message the server can send has a Thai translation", () => {
  const pattern = /(?:\berror:\s*|\bmessage:\s*|new\s+\w*Error\(\s*(?:\d+\s*,\s*)?)"([A-Za-z][^"]{2,160})"/g
  const files = [...walk("src/app/api"), ...walk("src/lib")].filter((file) => !(file in internalErrorFiles))
  const missing = new Set<string>()
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(pattern)) {
      if (match[0].startsWith("message") && file in nonErrorMessageFiles) continue
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
  for (const file of [...Object.keys(internalErrorFiles), ...Object.keys(nonErrorMessageFiles)]) assert.ok(readFileSync(file, "utf8").length > 0, file)
})

test("a cross-site keep-alive has its own message", () => {
  assert.equal(getApiErrorKey("Forbidden: cross-site request"), "crossSiteRequest")
})

test("a 401's text is recognised wherever it reaches the screen", () => {
  assert.equal(isUnauthorizedError(new Error("Unauthorized")), true); assert.equal(isUnauthorizedError("Unauthorized"), true)
  for (const other of [new Error("Forbidden: insufficient permissions"), "กรุณาเข้าสู่ระบบใหม่", null, undefined]) assert.equal(isUnauthorizedError(other), false)
  // Only the session's own 401 text counts; the integration token's refusal is not the person's session.
  assert.equal(isUnauthorizedError("Unauthorized · ref 0123abcd"), true)
  assert.equal(isUnauthorizedError("INTEGRATION_UNAUTHORIZED"), false)
  assert.equal(isUnauthorizedError(new Error("Forbidden")), false)
})

test("a transaction refusal reads the picker's words for the same rule (server-search spec 6.5, S-R6)", () => {
  assert.deepEqual(Object.fromEntries(Object.keys(assetOperationRefusalReasonKeys).map((code) => [code, getApiErrorKey(code)])), {
    ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED: "componentCheckoutNotAllowed", ASSET_LICENSE_CHECKOUT_NOT_ALLOWED: "licenseCheckoutNotAllowed",
    ASSET_COMPONENT_CHECKIN_NOT_ALLOWED: "componentCheckinNotAllowed", ASSET_LICENSE_CHECKIN_NOT_ALLOWED: "licenseCheckinNotAllowed",
    ASSET_LICENSE_MOVE_NOT_ALLOWED: "licenseMoveNotAllowed",
  })
  // S-R43: an open repair no longer refuses a return; another next status than ส่งซ่อม is refused under that field.
  assert.equal(getApiErrorKey("ASSET_CHECKIN_REPAIR_OPEN"), null)
  assert.equal(getApiErrorKey("ASSET_CHECKIN_REPAIR_STATUS_REQUIRED"), "checkinRepairStatusRequired")
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors
  assert.deepEqual([words("th").checkinRepairStatusRequired, words("en").checkinRepairStatusRequired], [
    "มีงานซ่อมที่ยังไม่ปิด เลือกสถานะถัดไปเป็น ส่งซ่อม", "This asset has an open repair. Choose Send to repair as the next status.",
  ])
  for (const locale of ["th", "en"] as const) assert.equal(words(locale).checkinRepairOpen, undefined, locale)
  // The destination refusal has one word of its own (S-R39), not a picker reason.
  assert.equal(getApiErrorKey("ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED"), "checkoutDestinationNotAllowed")
  for (const locale of ["th", "en"] as const) {
    const table = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    for (const [code, reasonKey] of Object.entries(assetOperationRefusalReasonKeys)) {
      assert.equal(table.apiErrors[getApiErrorKey(code)!], table.asset[reasonKey.slice("asset.".length)], `${locale} ${code}`)
    }
  }
})
