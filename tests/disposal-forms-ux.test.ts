import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("disposal forms use one page title and compact numbered sections", () => {
  const single = readFileSync("src/components/disposal/disposal-request-form.tsx", "utf8")
  const batch = readFileSync("src/components/disposal/disposal-batch-form.tsx", "utf8")

  assert.doesNotMatch(single, /<h2[^>]*>\{t\("createTitle"\)\}/)
  assert.doesNotMatch(batch, /<h2[^>]*>\{t\("batchCreateTitle"\)\}/)
  assert.match(single, /<FormSection number=\{1\} title=\{t\("formSteps\.asset"\)\}/)
  assert.doesNotMatch(single, /function FormStep/)
  assert.match(batch, /FormStep/)
  assert.match(single, /reasonCharacterCount/)
  assert.match(batch, /reasonCharacterCount/)
})

test("disposal form section copy exists in both locales", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    assert.equal(typeof messages.formSteps.asset, "string")
    assert.equal(typeof messages.formSteps.request, "string")
    assert.equal(typeof messages.formSteps.evidence, "string")
    assert.equal(typeof messages.reasonCharacterCount, "string")
  }
})

test("disposal money fields name the unit in their own keys, and the read-only labels keep theirs (K26, I33)", () => {
  const units = { th: "(บาท)", en: "(THB)" } as const
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    for (const key of ["saleValue", "salvageValue", "actualSaleValue", "actualSalvageValue"]) {
      assert.equal(messages[`${key}Baht`], `${messages[key]} ${units[locale]}`, `${locale}.${key}Baht`)
      assert.doesNotMatch(messages[key], /บาท|THB/, `${locale}.${key} also labels read-only values that already show ฿`)
    }
    assert.equal(typeof messages.requestEvidenceDescription, "string", `${locale}.requestEvidenceDescription`)
  }
})
