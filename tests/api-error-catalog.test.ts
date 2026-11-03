import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

import { apiErrorKeyByMessage, describeApiError, getApiErrorKey, isUnauthorizedError } from "../src/lib/api-error-catalog.ts"
import { assetOperationRefusalReasonKeys } from "../src/lib/asset-operation-eligibility.ts"
import { bulkMoveBlockedOrder } from "../src/lib/bulk-move-blocked.ts"

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
    ASSET_COMPONENT_OUTSTANDING: "componentOutstanding",
  })

  // S-R43: an open repair no longer refuses a return; another next status than ส่งซ่อม is refused under that field.
  assert.equal(getApiErrorKey("ASSET_CHECKIN_REPAIR_OPEN"), null)
  assert.equal(getApiErrorKey("ASSET_CHECKIN_REPAIR_STATUS_REQUIRED"), "checkinRepairStatusRequired")
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors
  assert.deepEqual([words("th").checkinRepairStatusRequired, words("en").checkinRepairStatusRequired], [
    "มีงานซ่อมที่ยังไม่ปิด หลังรับคืนต้องเป็น ส่งซ่อม", "This asset has an open repair. After the return it must go to Send for repair.",
  ])
  for (const locale of ["th", "en"] as const) assert.equal(words(locale).checkinRepairOpen, undefined, locale)
  // The ทรัพย์สินอื่น destination is gone (group 3 spec §7.3), and its word with it.
  assert.equal(getApiErrorKey("ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED"), null)
  for (const locale of ["th", "en"] as const) assert.equal(words(locale).checkoutDestinationNotAllowed, undefined, locale)
  for (const locale of ["th", "en"] as const) {
    const table = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    for (const [code, reasonKey] of Object.entries(assetOperationRefusalReasonKeys)) {
      assert.equal(table.apiErrors[getApiErrorKey(code)!], table.asset[reasonKey.slice("asset.".length)], `${locale} ${code}`)
    }
  }
})

test("an inactive checkout destination reads its own words under the field (group 3 spec §6, §7.2)", () => {
  assert.equal(getApiErrorKey("ASSET_CHECKOUT_DESTINATION_INACTIVE"), "checkoutDestinationInactive")
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors.checkoutDestinationInactive
  assert.deepEqual([words("th"), words("en")], ["ปลายทางนี้ไม่มีในระบบหรือถูกปิดใช้งานแล้ว เลือกใหม่", "This destination is missing or inactive. Choose another one."])
  // Under each field its own sentence (final review M10); the one above stays for the toast.
  const field = (locale: "th" | "en", key: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors[key]
  for (const [key, th, en] of [
    ["checkoutReceiverInactive", "พนักงานคนนี้พ้นสภาพหรือถูกปิดใช้งานแล้ว เลือกคนอื่น", "This employee has left or is inactive. Choose someone else."],
    ["checkoutDepartmentInactive", "แผนกนี้ถูกปิดใช้งานแล้ว เลือกแผนกอื่น", "This department is inactive. Choose another."],
    ["checkoutLocationInactive", "ที่ตั้งนี้ถูกปิดใช้งานแล้ว เลือกที่ตั้งอื่น", "This location is inactive. Choose another."],
  ]) assert.deepEqual([field("th", key), field("en", key)], [th, en], key)
})

test("a broken or salvage asset refused by ส่งมอบ reads its reason under the asset field, and the toast reads the code's words (group 3 spec §19.2)", () => {
  assert.equal(getApiErrorKey("ASSET_CHECKOUT_CONDITION_BLOCKED"), "checkoutConditionBlocked")
  const field = (locale: "th" | "en", key: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors[key]
  const reason = (locale: "th" | "en", key: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset[key]
  assert.deepEqual([field("th", "checkoutConditionBlocked"), field("en", "checkoutConditionBlocked")], ["ส่งมอบไม่ได้เพราะสภาพของทรัพย์สิน", "This asset cannot be handed over in its condition."])
  // Under the field the picker's own words (asset.transactionReasonCondition*).
  for (const name of ["Damaged", "NonFunctional", "Salvage"]) {
    for (const locale of ["th", "en"] as const) {
      assert.equal(typeof field(locale, `checkoutCondition${name}`), "string", `${locale} ${name}`)
      assert.equal(field(locale, `checkoutCondition${name}`), reason(locale, `transactionReasonCondition${name}`), `${locale} ${name}`)
    }
  }
})

test("a broken return department reads words that tell an admin what to fix, and a settings save with an unknown code reads its own (group 3 spec §12, P2-R8)", () => {
  assert.equal(getApiErrorKey("ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE"), "checkinDepartmentUnavailable")
  assert.equal(getApiErrorKey("CHECKIN_DEPARTMENT_CODE_UNKNOWN"), "checkinDepartmentCodeUnknown")
  const words = (locale: "th" | "en", key: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors[key]
  assert.deepEqual([words("th", "checkinDepartmentUnavailable"), words("en", "checkinDepartmentUnavailable")], [
    "บันทึกรับคืนไม่ได้ เพราะแผนกที่รับคืนเข้าคลังไม่มีในระบบหรือถูกปิดใช้งาน ให้ผู้ดูแลระบบแก้ที่ ตั้งค่าระบบ > องค์กร",
    "The return cannot be saved: the return department is missing or inactive. An administrator can fix it in System Settings > Organization.",
  ])
  assert.deepEqual([words("th", "checkinDepartmentCodeUnknown"), words("en", "checkinDepartmentCodeUnknown")], [
    "ไม่มีแผนกที่ใช้งานอยู่ซึ่งใช้รหัสนี้ ตรวจรหัสที่ ข้อมูลหลัก > แผนก",
    "No active department has this code. Check the code in Master Data > Department.",
  ])
})

test("the return's date, room and returner refusals read their own words under their fields (group 3 spec §8.3, §8.5; P2-R13, P2-R15, P2-R18)", () => {
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors
  for (const [code, key, th, en] of [
    ["CHECKIN_RETURN_DATE_IN_FUTURE", "checkinReturnDateInFuture", "วันที่คืนต้องไม่เกินวันนี้", "The return date cannot be later than today."],
    ["CHECKIN_RETURN_DATE_BEFORE_HANDOVER", "checkinReturnDateBeforeHandover", "วันที่คืนต้องไม่ก่อนวันที่ส่งมอบ", "The return date cannot be before the handover date."],
    ["ASSET_CHECKIN_LOCATION_INACTIVE", "checkinLocationInactive", "ที่ตั้งนี้ไม่มีในระบบหรือถูกปิดใช้งานแล้ว เลือกที่ตั้งอื่น", "This location is missing or inactive. Choose another."],
    ["CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED", "checkinMissingComponentReturnerRequired", "ส่วนควบที่ยังไม่ได้คืนจะอยู่กับผู้คืน เลือกผู้คืนจากรายชื่อพนักงาน", "A component that has not come back stays with the person returning. Choose that person from the employee list."],
  ]) {
    assert.equal(getApiErrorKey(code), key, code)
    assert.deepEqual([words("th")[key], words("en")[key]], [th, en], key)
  }
  // A second save of the same HO- reads the existing words (P2-R15).
  assert.equal(getApiErrorKey("ASSET_CHANGED_DURING_OPERATION"), "assetChangedDuringOperation")
})

test("a missing-components list the server cannot honour reads its own words under its field (group 3 spec §8.5, P2-R1)", () => {
  assert.equal(getApiErrorKey("ASSET_CHECKIN_MISSING_COMPONENT_INVALID"), "checkinMissingComponentInvalid")
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors
  assert.deepEqual([words("th").checkinMissingComponentInvalid, words("en").checkinMissingComponentInvalid], [
    "ส่วนควบบางชิ้นในรายการไม่ได้ติดอยู่กับทรัพย์สินนี้แล้ว โหลดหน้าใหม่แล้วลองอีกครั้ง",
    "A component in the list is no longer installed in this asset. Reload the page and try again.",
  ])
})

test("a late component return dated before its RT- reads its own words under the date (P2-R13)", () => {
  assert.equal(getApiErrorKey("COMPONENT_RETURN_DATE_BEFORE_CHECKIN"), "componentReturnDateBeforeCheckin")
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors.componentReturnDateBeforeCheckin
  assert.deepEqual([words("th"), words("en")], ["วันที่คืนต้องไม่ก่อนวันที่รับคืนเครื่องหลัก", "The return date cannot be before the day the parent asset was returned."])
})

test("โอนย้าย's own refusals read their words: the toast per code, a broken asset's reason under the asset field as the picker says it, and an inactive destination reuses ส่งมอบ's words (group 3 plan 3; P3-R1, P3-R5, P3-R6)", () => {
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
  assert.equal(getApiErrorKey("ASSET_TRANSFER_CONDITION_BLOCKED"), "transferConditionBlocked")
  assert.equal(getApiErrorKey("ASSET_TRANSFER_DEPARTMENT_LOCKED"), "transferDepartmentLocked")
  assert.equal(getApiErrorKey("ASSET_TRANSFER_DESTINATION_INACTIVE"), "checkoutDestinationInactive")
  for (const [key, th, en] of [
    ["transferConditionBlocked", "โอนย้ายให้ผู้ถือครองใหม่ไม่ได้เพราะสภาพของทรัพย์สิน", "This asset cannot go to a new holder in its condition."],
    ["transferDepartmentLocked", "ข้อมูลผู้ถือครองของทรัพย์สินเปลี่ยนไป แผนกจึงเป็นไปตามผู้ถือครอง ตรวจสอบแล้วบันทึกอีกครั้ง", "The asset's holder has changed, so its department follows the holder. Check it and save again."],
    ["transferConditionDamaged", "สภาพเสียหาย ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่", "Damaged: send it for repair before giving it to a new holder"],
    ["transferConditionNonFunctional", "ใช้งานไม่ได้ ต้องส่งซ่อมก่อนโอนย้ายให้ผู้ถือครองใหม่", "Not working: send it for repair before giving it to a new holder"],
    ["transferConditionSalvage", "เป็นซาก รอตัดจำหน่าย โอนย้ายให้ผู้ถือครองใหม่ไม่ได้", "Salvage awaiting disposal: it cannot go to a new holder"],
  ]) assert.deepEqual([messages("th").apiErrors[key], messages("en").apiErrors[key]], [th, en], key)
  // Under the asset field, the picker's own words (T1's asset.transactionReasonTransferCondition*), word for word.
  for (const name of ["Damaged", "NonFunctional", "Salvage"]) {
    for (const locale of ["th", "en"] as const) {
      assert.equal(messages(locale).apiErrors[`transferCondition${name}`], messages(locale).asset[`transactionReasonTransferCondition${name}`], `${locale} ${name}`)
    }
  }
})

test("every answer of the bulk move reads through the catalog, and its two old texts are gone (group 3 spec §5, §10.3; P4-R4, P4-R5, P4-R14)", () => {
  assert.deepEqual(bulkMoveBlockedOrder.map((code) => getApiErrorKey(code)), ["assetNotFoundOrInactive", "componentOutstanding", "licenseMoveNotAllowed", "assetActiveCheckoutExists", "statusBlocksTransfer"])
  assert.equal(getApiErrorKey("ASSET_TRANSFER_DESTINATION_INACTIVE"), "checkoutDestinationInactive")
  assert.equal(getApiErrorKey("ASSET_CHANGED_DURING_OPERATION"), "assetChangedDuringOperation")
  assert.equal(getApiErrorKey("Disposed or retired assets cannot be moved."), null)
  assert.equal(getApiErrorKey("Some assets already have active checkouts"), null)
  for (const locale of ["th", "en"] as const) {
    const apiErrors = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).apiErrors as Record<string, string | undefined>
    assert.equal(apiErrors.disposedAssetCannotMove, undefined, locale)
    assert.equal(apiErrors.someAssetsOnCheckout, undefined, locale)
    assert.equal(typeof apiErrors.checkoutLocationInactive, "string", locale)
  }
})

test("the repair record's new refusals read their words: on loan, a date after today and a missing result (group 5 spec §5, G5P1-R6, G5P1-R7)", () => {
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
  assert.equal(getApiErrorKey("MAINTENANCE_DATE_IN_FUTURE"), "repairDateInFuture")
  assert.equal(getApiErrorKey("repairDateInFuture"), "repairDateInFuture")
  assert.equal(getApiErrorKey("repairOutcomeRequired"), "repairOutcomeRequired")
  assert.equal(getApiErrorKey("MAINTENANCE_ASSET_ON_LOAN"), "maintenanceAssetOnLoan")
  const onLoan = ["ทรัพย์สินนี้มีใบส่งมอบที่ยังไม่รับคืน ต้องรับคืนก่อน", "This asset has a handover that is not returned yet. Record the return first."]
  const future = ["วันที่ต้องไม่หลังวันนี้", "The date cannot be after today"]
  const outcome = ["เลือกผลการซ่อม", "Choose the repair result"]
  for (const [index, locale] of (["th", "en"] as const).entries()) {
    const m = messages(locale)
    assert.equal(m.apiErrors.maintenanceAssetOnLoan, onLoan[index], locale)
    assert.equal(m.maintenancePage.errors.MAINTENANCE_ASSET_ON_LOAN, onLoan[index], locale)
    assert.equal(m.apiErrors.repairDateInFuture, future[index], locale)
    assert.equal(m.maintenancePage.errors.MAINTENANCE_DATE_IN_FUTURE, future[index], locale)
    assert.equal(m.apiErrors.repairOutcomeRequired, outcome[index], locale)
  }
})
