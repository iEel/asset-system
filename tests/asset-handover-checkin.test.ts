import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const routeSource = readFileSync("src/app/api/assets/[id]/checkin/route.ts", "utf8")
const formSource = readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8")
const legacyRouteSource = readFileSync("src/app/api/assets/[id]/legacy-checkout/route.ts", "utf8")

test("checkin validates active handover mode and status inside the transaction", () => {
  const transactionStart = routeSource.indexOf("prisma.$transaction(async (tx) => {")
  const transactionEnd = routeSource.indexOf("await logAudit", transactionStart)
  const transactionBody = routeSource.slice(transactionStart, transactionEnd)
  assert.match(transactionBody, /tx\.assetCheckout\.findFirst/)
  assert.match(transactionBody, /handoverMode:\s*true/)
  assert.match(transactionBody, /status:\s*\{\s*select:\s*\{\s*name:\s*true/)
  assert.match(transactionBody, /getCheckinHandoverStatusError/)
  assert.ok(transactionBody.indexOf("getCheckinHandoverStatusError") < transactionBody.indexOf("tx.assetCheckin.create"))
})

test("checkin form presents current custody as read-only context", () => {
  assert.match(formSource, /currentCustody/)
  assert.match(formSource, /permanentAssignmentShort/)
  assert.match(formSource, /temporaryLoanShort/)
  assert.doesNotMatch(formSource, /name="handoverMode"/)
})

test("legacy return backfill creates a permanent assignment in In Use", () => {
  assert.match(legacyRouteSource, /handoverMode:\s*"permanent_assignment"/)
  assert.match(legacyRouteSource, /getRequiredAssetStatusId\("In Use"\)/)
})

test("checkin custody copy is localized", () => {
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    for (const key of [
      "currentCustody",
      "handoverDocumentNo",
      "custodyType",
      "permanentAssignmentShort",
      "temporaryLoanShort",
      "currentAssetStatus",
      "handoverModeMissing",
      "handoverStatusMismatch",
    ]) {
      assert.ok(messages.checkin[key]?.trim(), `${locale}.checkin.${key}`)
    }
  }
})
