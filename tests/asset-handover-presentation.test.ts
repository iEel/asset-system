import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const checkoutPrint = readFileSync("src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx", "utf8")
const checkinPrint = readFileSync("src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx", "utf8")

test("checkout and checkin print documents include their custody mode", () => {
  assert.match(checkoutPrint, /checkout\.handoverMode/)
  assert.match(checkoutPrint, /permanentAssignment/)
  assert.match(checkoutPrint, /temporaryLoan/)
  assert.match(checkinPrint, /handoverMode:\s*true/)
  assert.match(checkinPrint, /permanentAssignmentShort/)
  assert.match(checkinPrint, /temporaryLoanShort/)
})

test("handover presentation copy is localized", () => {
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    assert.ok(messages.asset.handoverMode)
    assert.ok(messages.asset.handoverModeLegacy)
    assert.ok(messages.checkout.permanentAssignment)
    assert.ok(messages.checkout.temporaryLoan)
  }
})
