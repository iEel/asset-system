import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const routeSource = readFileSync("src/app/api/assets/[id]/checkout/route.ts", "utf8")
const formSource = readFileSync("src/components/asset-operations/checkout-form.tsx", "utf8")

test("checkout route persists mode and derives status server-side", () => {
  assert.match(routeSource, /handoverMode:\s*input\.handoverMode/)
  assert.match(routeSource, /getHandoverTargetStatusName\(input\.handoverMode\)/)
  assert.match(routeSource, /handoverMode:\s*requiredFormText\(formData, "handoverMode"\)/)
  assert.doesNotMatch(routeSource, /body\.set\("statusId"/)
})

test("checkout form requires an explicit user handover mode", () => {
  assert.match(formSource, /handoverMode:\s*""/)
  assert.match(formSource, /permanent_assignment/)
  assert.match(formSource, /temporary_loan/)
  assert.match(formSource, /values\.handoverMode === "temporary_loan"/)
  assert.match(formSource, /body\.set\("handoverMode", values\.handoverMode\)/)
  assert.match(formSource, /resultingStatus/)
})

test("handover mode guidance and recovery messages are localized", () => {
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    const checkout = messages.checkout as Record<string, string>
    for (const key of [
      "handoverMode",
      "permanentAssignment",
      "permanentAssignmentHelp",
      "temporaryLoan",
      "temporaryLoanHelp",
      "resultingStatus",
      "handoverModeRequired",
      "permanentUserOnly",
      "permanentCustodianRequired",
      "permanentDueDateNotAllowed",
      "temporaryDueDateRequired",
      "returnBeforeCheckout",
    ]) {
      assert.equal(typeof checkout[key], "string", `${locale}.checkout.${key}`)
      assert.ok(checkout[key]?.trim(), `${locale}.checkout.${key} must not be empty`)
    }
  }
})

test("the checkout form uses the shared fields and a busy save button (2C batch 1b)", () => {
  const source = formSource.replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /function Field\(|<input|<select|<textarea|Loader2/)
  assert.match(source, /<NativeSelect value=\{value\} required=\{required\} onChange=/)
  assert.match(source, /<Field label=\{t\("expectedReturn"\)\} required>\n\s+<Input\n\s+type="date"\n\s+value=\{values\.expectedReturnDate\}\n\s+min=\{values\.checkoutDate\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\} className="w-full sm:w-auto">\n\s+<Save \/>/)
  // A non-user checkout is always a temporary loan: plain text in the field-label style, not a banner (K24).
  assert.match(source, /<p className=\{fieldLabelClasses\}>\{t\("handoverMode"\)\}<\/p>\n\s+<p className="mt-1\.5 text-sm text-foreground">\{t\("temporaryLoan"\)\}<\/p>/)
  assert.equal(source.match(/<FormContextBanner /g)?.length, 1)
})
