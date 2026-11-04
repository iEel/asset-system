import assert from "node:assert/strict"
import test from "node:test"

import { getDisposalRoundFieldErrors } from "../src/lib/disposal-type-policy.ts"
import { disposalRoundInputSchema, MAX_DISPOSAL_ROUND_ITEMS } from "../src/lib/validations/disposal-round.ts"

const now = new Date("2026-11-05T03:00:00.000Z") // 10:00 Bangkok, 5 Nov

function uuid(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`
}

function commit(overrides: Record<string, unknown> = {}) {
  return {
    mode: "commit",
    requestIds: [uuid(1), uuid(2)],
    disposalType: "sell",
    executionDate: "2026-11-04",
    executedById: "employee-executor",
    recipientName: "ร้านรับซื้อของเก่า",
    documentNo: "INV-001",
    saleValue: "3000",
    remark: null,
    ...overrides,
  }
}

function fields(result: ReturnType<typeof disposalRoundInputSchema.safeParse>) {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."))
}

test("a round holds at most 200 machines; 201 ids are refused", () => {
  assert.equal(MAX_DISPOSAL_ROUND_ITEMS, 200)
  const ids200 = Array.from({ length: 200 }, (_, index) => uuid(index + 1))
  assert.equal(disposalRoundInputSchema.safeParse(commit({ requestIds: ids200 })).success, true)
  const refused = disposalRoundInputSchema.safeParse(commit({ requestIds: [...ids200, uuid(201)] }))
  assert.deepEqual(fields(refused), ["requestIds"])
})

test("the ids are unique uuids", () => {
  assert.deepEqual(fields(disposalRoundInputSchema.safeParse(commit({ requestIds: [uuid(1), uuid(1)] }))), ["requestIds"])
  assert.deepEqual(fields(disposalRoundInputSchema.safeParse(commit({ requestIds: ["not-a-uuid"] }))), ["requestIds.0"])
  assert.deepEqual(fields(disposalRoundInputSchema.safeParse(commit({ requestIds: [] }))), ["requestIds"])
})

test("a sale without the lump price names saleValue", () => {
  assert.deepEqual(
    getDisposalRoundFieldErrors({ disposalType: "sell", executionDate: new Date("2026-11-04"), recipientName: "ผู้ซื้อ", documentNo: "INV-1", saleValue: null }, now).map((error) => error.field),
    ["saleValue"],
  )
  assert.deepEqual(fields(disposalRoundInputSchema.safeParse(commit({ saleValue: "" }))), ["saleValue"])
})

test("the lump price is a decimal of at least 0 with 2 places", () => {
  assert.equal(disposalRoundInputSchema.safeParse(commit({ saleValue: "0" })).success, true)
  assert.equal(disposalRoundInputSchema.safeParse(commit({ saleValue: "1234.56" })).success, true)
  assert.deepEqual(fields(disposalRoundInputSchema.safeParse(commit({ saleValue: "-1" }))), ["saleValue"])
  assert.deepEqual(fields(disposalRoundInputSchema.safeParse(commit({ saleValue: "12.345" }))), ["saleValue"])
})

test("destroy without a remark names remark", () => {
  assert.deepEqual(
    getDisposalRoundFieldErrors({ disposalType: "destroy", executionDate: new Date("2026-11-04"), documentNo: "DOC-1" }, now).map((error) => error.field),
    ["remark"],
  )
  assert.deepEqual(fields(disposalRoundInputSchema.safeParse(commit({ disposalType: "destroy", recipientName: null, saleValue: null }))), ["remark"])
})

test("donate without a recipient names recipientName", () => {
  assert.deepEqual(
    getDisposalRoundFieldErrors({ disposalType: "donate", executionDate: new Date("2026-11-04"), documentNo: "DOC-1", recipientName: "  " }, now).map((error) => error.field),
    ["recipientName"],
  )
})

test("the document number is always required", () => {
  assert.deepEqual(
    getDisposalRoundFieldErrors({ disposalType: "lost", executionDate: new Date("2026-11-04"), remark: "หายระหว่างขนย้าย" }, now).map((error) => error.field),
    ["documentNo"],
  )
})

test("a disposal date after the Bangkok today names executionDate", () => {
  const input = { disposalType: "lost" as const, documentNo: "DOC-1", remark: "หาย" }
  assert.deepEqual(getDisposalRoundFieldErrors({ ...input, executionDate: new Date("2026-11-06") }, now).map((error) => error.field), ["executionDate"])
  // Today by the Bangkok day is allowed.
  assert.deepEqual(getDisposalRoundFieldErrors({ ...input, executionDate: new Date("2026-11-05") }, now), [])
  // 23:30 UTC on 4 Nov is already 5 Nov in Bangkok: the 5th is today, the 6th is not.
  const lateUtc = new Date("2026-11-04T23:30:00.000Z")
  assert.deepEqual(getDisposalRoundFieldErrors({ ...input, executionDate: new Date("2026-11-05") }, lateUtc), [])
  assert.deepEqual(fields(disposalRoundInputSchema.safeParse(commit({ executionDate: "2999-01-01" }))), ["executionDate"])
})

test("lost with a remark and a document, no recipient and no price, has no errors", () => {
  const input = { disposalType: "lost" as const, executionDate: new Date("2026-11-04"), documentNo: "DOC-1", remark: "หายระหว่างขนย้าย", recipientName: null, saleValue: null }
  assert.deepEqual(getDisposalRoundFieldErrors(input, now), [])
  assert.equal(disposalRoundInputSchema.safeParse(commit({ disposalType: "lost", recipientName: null, saleValue: null, remark: "หายระหว่างขนย้าย" })).success, true)
})

test("a commit needs the method, the date and the executor; a preview needs only the ids", () => {
  assert.deepEqual(
    fields(disposalRoundInputSchema.safeParse(commit({ disposalType: undefined, executionDate: undefined, executedById: undefined }))).sort(),
    ["disposalType", "executedById", "executionDate"],
  )
  const preview = disposalRoundInputSchema.safeParse({ mode: "preview", requestIds: [uuid(1)] })
  assert.equal(preview.success, true)
})

test("the evidence exception needs a reason of 20 to 2,000 characters", () => {
  assert.deepEqual(fields(disposalRoundInputSchema.safeParse(commit({ useHistoricalEvidenceException: true, evidenceExceptionReason: "สั้น" }))), ["evidenceExceptionReason"])
  assert.equal(disposalRoundInputSchema.safeParse(commit({ useHistoricalEvidenceException: true, evidenceExceptionReason: "ทรัพย์สินถูกตัดจำหน่ายจริงในอดีตและไม่มีหลักฐานหลงเหลือ" })).success, true)
})
