import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { CHECKIN_RETURN_DATE_ERROR_KEYS, checkinHandoverDay, checkinReturnDateError, isLegacyBackfilledHandover } from "../src/lib/checkin-route-rules.ts"
import { issuesToFieldErrors } from "../src/lib/field-errors.ts"
import { assetCheckinSchema } from "../src/lib/validations/asset-operations.ts"

const at = (returnDay: string, handoverDay: string | null = "2026-10-01") => checkinReturnDateError({ returnDay, todayDay: "2026-10-31", handoverDay })

test("วันที่คืน is no later than today and no earlier than the handover's day, in Bangkok days (group 3 spec §8.3, P2-R13)", () => {
  assert.deepEqual(["2026-11-01", "2026-10-31", "2026-10-15", "2026-10-01", "2026-09-30"].map((day) => at(day)),
    ["CHECKIN_RETURN_DATE_IN_FUTURE", null, null, null, "CHECKIN_RETURN_DATE_BEFORE_HANDOVER"])
})

test("a legacy-backfilled handover (no handover day) has no lower bound, and the upper bound stays (P2-R13)", () => {
  assert.deepEqual(["2020-01-01", "2026-10-31", "2026-11-01"].map((day) => at(day, null)), [null, null, "CHECKIN_RETURN_DATE_IN_FUTURE"])
})

test("a day after today and before a future-dated handover reads the future refusal first", () => {
  assert.equal(at("2026-11-02", "2026-11-05"), "CHECKIN_RETURN_DATE_IN_FUTURE")
})

test("each bound reads its own catalog key under วันที่คืน", () => {
  assert.deepEqual(CHECKIN_RETURN_DATE_ERROR_KEYS, { CHECKIN_RETURN_DATE_IN_FUTURE: "checkinReturnDateInFuture", CHECKIN_RETURN_DATE_BEFORE_HANDOVER: "checkinReturnDateBeforeHandover" })
})

test("the handover's day is its Bangkok day, from a Date or an ISO string; a legacy backfill has none (P2-R13)", () => {
  assert.equal(checkinHandoverDay({ checkoutDate: new Date("2026-10-01T16:59:59Z"), remark: null }), "2026-10-01")
  assert.equal(checkinHandoverDay({ checkoutDate: new Date("2026-10-01T17:00:00Z"), remark: "ส่งมอบให้ฝ่ายบัญชี" }), "2026-10-02")
  assert.equal(checkinHandoverDay({ checkoutDate: "2026-10-01T17:00:00.000Z", remark: null }), "2026-10-02", "the picker row's ISO string")
  assert.equal(checkinHandoverDay({ checkoutDate: new Date("2026-10-31T02:00:00Z"), remark: "legacy_return_backfill: Created from current custodian before check-in" }), null)
})

test("the legacy mark is the remark the legacy backfill writes", () => {
  const remark = readFileSync("src/lib/legacy-checkout-write.ts", "utf8").match(/export const legacyReturnBackfillRemark = "([^"]+)"/)?.[1]
  assert.ok(remark, "the legacy backfill keeps its remark constant")
  assert.equal(isLegacyBackfilledHandover(remark), true)
  for (const other of [null, undefined, "", "ส่งมอบให้ฝ่ายบัญชี", "legacy return"]) assert.equal(isLegacyBackfilledHandover(other), false, String(other))
})

test("the rules stay pure: relative .ts imports only, no database", () => {
  const source = readFileSync("src/lib/checkin-route-rules.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client|\bprisma\./)
  for (const line of source.split(/\r?\n/).filter((line) => line.startsWith("import "))) assert.match(line, /from "\.\/[\w-]+\.ts"$/, line)
})

const body = { checkoutId: "co-1", returnDate: "2026-10-07", returnBy: "สมชาย", receiveBy: "สมหญิง", conditionAfter: "c-1", nextStatusId: "s-1", nextLocationId: "l-1" }

test("missingComponentIds: absent or empty means everything came back; ids are trimmed and deduplicated (P2-R1)", () => {
  assert.deepEqual(assetCheckinSchema.parse(body).missingComponentIds, [])
  assert.deepEqual(assetCheckinSchema.parse({ ...body, missingComponentIds: [] }).missingComponentIds, [])
  assert.deepEqual(assetCheckinSchema.parse({ ...body, returnByEmployeeId: "emp-5", missingComponentIds: ["comp-1", " comp-2 ", "comp-1"] }).missingComponentIds, ["comp-1", "comp-2"])
})

test("missingComponentIds refuses more than 100 ids, a blank id and a value that is not a list (P2-R1)", () => {
  const fieldErrors = (missingComponentIds: unknown) =>
    issuesToFieldErrors(assetCheckinSchema.safeParse({ ...body, returnByEmployeeId: "emp-5", missingComponentIds }).error?.issues ?? [])
  assert.deepEqual(fieldErrors(Array.from({ length: 101 }, (_, index) => `comp-${index}`)), { missingComponentIds: "outOfRange" })
  assert.deepEqual(fieldErrors(["comp-1", " "]), { "missingComponentIds.1": "required" })
  assert.deepEqual(fieldErrors("comp-1"), { missingComponentIds: "required" })
})

test("ผู้คืน must be an employee when a component did not come back; the refusal lands under returnBy (spec §8.5, P2-R18)", () => {
  const refused = assetCheckinSchema.safeParse({ ...body, returnByEmployeeId: "", missingComponentIds: ["comp-1"] })
  assert.deepEqual(issuesToFieldErrors(refused.error?.issues ?? []), { returnBy: "checkinMissingComponentReturnerRequired" })
  assert.equal(assetCheckinSchema.safeParse({ ...body, returnByEmployeeId: "emp-5", missingComponentIds: ["comp-1"] }).success, true)
  assert.equal(assetCheckinSchema.safeParse({ ...body, returnBy: "หัวหน้าแผนก" }).success, true, "with everything back, a typed name still returns")
})
