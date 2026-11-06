import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const routeSource = readFileSync("src/app/api/assets/[id]/checkin/route.ts", "utf8")
const formSource = readFileSync("src/components/asset-operations/checkin-form.tsx", "utf8")
const legacyRouteSource = readFileSync("src/app/api/assets/[id]/legacy-checkout/route.ts", "utf8")
// The return's transaction body runs in src/lib/checkin-write.ts (group 7 plan 4 task 1).
const checkinWriteSource = readFileSync("src/lib/checkin-write.ts", "utf8")

test("checkin validates active handover mode and status inside the transaction", () => {
  const transactionStart = routeSource.indexOf("prisma.$transaction(async (tx) => {")
  const transactionEnd = routeSource.indexOf("await logAudit", transactionStart)
  assert.match(routeSource.slice(transactionStart, transactionEnd), /writeCheckinInTransaction\(tx, /)
  const writeStart = checkinWriteSource.indexOf("export async function writeCheckinInTransaction(")
  const writeEnd = checkinWriteSource.indexOf("export async function readMissingComponentPlan(", writeStart)
  assert.ok(writeStart >= 0 && writeEnd > writeStart)
  const transactionBody = checkinWriteSource.slice(writeStart, writeEnd)
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

test("the check-in form uses the shared fields and a busy save button (2C batch 1b)", () => {
  const source = formSource.replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /function Field\(|<input|<select|<textarea|Loader2/)
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate /)
  assert.match(source, /<Field label=\{t\("returnDate"\)\} id="checkin-return-date" required error=\{fieldErrors\.message\("returnDate"\)\}>\n\s+<Input type="date" value=\{values\.returnDate\}[^\n]* required \/>/)
  assert.match(source, /<NativeSelect value=\{values\.nextStatusId\} required onChange=/)
  assert.ok(source.includes("busy: saving || readingForSubmit"))
  assert.doesNotMatch(source, /<Button type="submit" busy=\{saving\} className="w-full sm:w-auto">/)
})
