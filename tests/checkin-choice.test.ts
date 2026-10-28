import assert from "node:assert/strict"
import test from "node:test"
import { getCheckinChoice } from "../src/lib/checkin-choice.ts"
import type { AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

const holderLabel = "E001 - สมชาย ใจดี"
const checkout = { id: "co-1", documentNo: "HO-202610-0001", checkoutDate: "2026-10-01T00:00:00.000Z", handoverMode: "permanent_assignment", checkoutType: "user", expectedReturnDate: null, remark: null, conditionBefore: "cond-good", destinationLabel: holderLabel }
const row = (overrides: Record<string, unknown> = {}) => ({ id: "asset-1", assetTag: "NB-0228", name: "โน้ตบุ๊ก", serialNumber: null, statusLabel: "ใช้งานอยู่", placeLabel: holderLabel, currentLocationId: "loc-1", conditionId: "cond-good", eligible: true, reasonKey: null, checkout, holderKey: "employee:emp-1", holderLabel, holderEmployeeId: "emp-1", ...overrides }) as AssetOperationSearchRow
const active = new Set(["emp-1", "emp-2"])

test("a takeable handover row is chosen with its checkout; return-by is its holder when the holder is an active employee (spec 6.3)", () => {
  assert.deepEqual(getCheckinChoice(row(), active), { checkoutId: "co-1", returnByEmployeeId: "emp-1", returnByInactiveLabel: null, reasonKey: null })
  // S-R46: a holder who is no longer an active employee still returns it, and the form names them as a former employee.
  assert.deepEqual(getCheckinChoice(row(), new Set(["emp-2"])), { checkoutId: "co-1", returnByEmployeeId: "emp-1", returnByInactiveLabel: holderLabel, reasonKey: null })
  assert.deepEqual(getCheckinChoice(row({ holderEmployeeId: null }), active), { checkoutId: "co-1", returnByEmployeeId: null, returnByInactiveLabel: null, reasonKey: null })
})

test("a blocked row is chosen but not taken: no checkout, no return-by, its reason (spec 6.4)", () => {
  assert.deepEqual(getCheckinChoice(row({ eligible: false, reasonKey: "asset.transactionReasonActiveMaintenance" }), active), { checkoutId: "", returnByEmployeeId: null, returnByInactiveLabel: null, reasonKey: "asset.transactionReasonActiveMaintenance" })
})

test("nothing chosen, and a legacy row before its handover exists, take no checkout", () => {
  assert.deepEqual(getCheckinChoice(null, active), { checkoutId: "", returnByEmployeeId: null, returnByInactiveLabel: null, reasonKey: null })
  assert.deepEqual(getCheckinChoice(row({ legacy: true, checkout: undefined }), active), { checkoutId: "", returnByEmployeeId: null, returnByInactiveLabel: null, reasonKey: null })
})

test("S-R46: the return-by select offers a former holder once more, named as a former employee, and the RT- records their name", async () => {
  const { readFileSync } = await import("node:fs")
  const form = readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(form, /const returnByOptions = choice\.returnByInactiveLabel && choice\.returnByEmployeeId\n\s+\? \[\.\.\.employees, \{ id: choice\.returnByEmployeeId, label: t\("returnByFormer", \{ name: choice\.returnByInactiveLabel \}\) \}\]\n\s+: employees/)
  assert.match(form, /id="checkin-return-by"[\s\S]*?options=\{returnByOptions\}/)
  assert.match(form, /id="checkin-receive-by"[\s\S]*?options=\{employees\}/, "the receiver is an active employee")
  assert.ok(form.includes('if (next.returnByEmployeeId) setEmployeeField("returnBy", next.returnByEmployeeId, next.returnByInactiveLabel)'))
  assert.ok(form.includes('else if (prefilled && returnByEmployeeId === prefilled) setEmployeeField("returnBy", "")'), "S-R32's clear rule stays")
  assert.ok(form.includes("returnBy: employees.find((employee) => employee.id === initialChoice.returnByEmployeeId)?.label ?? initialChoice.returnByInactiveLabel ?? \"\""))
  assert.ok(form.includes("const selectedReturnBy = returnByOptions.find((employee) => employee.id === returnByEmployeeId)"))
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).checkin.returnByFormer
  assert.equal(words("th"), "{name} (พ้นสภาพ)")
  assert.equal(words("en"), "{name} (former employee)")
})
