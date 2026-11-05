import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("disposal forms use one page title and compact numbered sections", () => {
  const single = readFileSync("src/components/disposal/disposal-request-form.tsx", "utf8")
  const batch = readFileSync("src/components/disposal/disposal-batch-form.tsx", "utf8")

  assert.doesNotMatch(single, /<h2[^>]*>\{t\("createTitle"\)\}/)
  assert.doesNotMatch(batch, /<h2[^>]*>\{t\("batchCreateTitle"\)\}/)
  // The request form is board DP-New (group 6 plan 3 Task 2): its sections are the frame's own.
  assert.match(single, /<FormSection number=\{1\} title=\{t\("createForm\.sectionAsset"\)\}/)
  assert.doesNotMatch(single, /function FormStep/)
  // The batch form is board DP-Batch-New (request batches Task 2): the machines, the lot photo, then the method as cards.
  assert.match(batch, /<FormSection number=\{1\} title=\{t\("batchForm\.sectionAssets"\)\}>/)
  assert.match(batch, /<FormSection number=\{2\} title=\{t\("batchForm\.sectionLot"\)\}>/)
  assert.match(batch, /<FormSection number=\{3\} title=\{t\("batchForm\.sectionRequest"\)\}>/)
  assert.match(batch, /<ChoiceCard\n/)
  assert.doesNotMatch(batch, /<NativeSelect\b/)
  assert.doesNotMatch(batch, /function FormStep/)
  assert.match(single, /reasonCharacterCount/)
  assert.match(batch, /reasonCharacterCount/)
})

test("disposal form section copy exists in both locales", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    // The old step titles (formSteps) went with the old batch form (request batches Task 2).
    assert.equal(messages.formSteps, undefined)
    for (const key of ["sectionAssets", "sectionLot", "sectionRequest"]) assert.equal(typeof messages.batchForm[key], "string", key)
    assert.equal(typeof messages.reasonCharacterCount, "string")
  }
})

test("disposal money fields name the unit in their own keys, and the read-only labels keep theirs (K26, I33)", () => {
  const units = { th: "(บาท)", en: "(THB)" } as const
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    for (const key of ["saleValue", "salvageValue"]) {
      assert.equal(messages[`${key}Baht`], `${messages[key]} ${units[locale]}`, `${locale}.${key}Baht`)
    }
    // The actual values' money fields went with the execution dialog (group 6 plan 4, P4-R1); their read-only labels stay.
    for (const key of ["saleValue", "salvageValue", "actualSaleValue", "actualSalvageValue"]) {
      assert.doesNotMatch(messages[key], /บาท|THB/, `${locale}.${key} also labels read-only values that already show ฿`)
    }
    assert.equal(typeof messages.requestEvidenceDescription, "string", `${locale}.requestEvidenceDescription`)
  }
})
