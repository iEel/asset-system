import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("disposal forms use one page title and compact numbered sections", () => {
  const single = readFileSync("src/components/disposal/disposal-request-form.tsx", "utf8")
  const batch = readFileSync("src/components/disposal/disposal-batch-form.tsx", "utf8")

  assert.doesNotMatch(single, /<h2[^>]*>\{t\("createTitle"\)\}/)
  assert.doesNotMatch(batch, /<h2[^>]*>\{t\("batchCreateTitle"\)\}/)
  assert.match(single, /FormStep/)
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
