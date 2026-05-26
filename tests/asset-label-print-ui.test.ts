import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("label print page exposes QR target safety messaging", () => {
  const source = readFileSync("src/components/assets/asset-label-print.tsx", "utf8")

  assert.match(source, /isLikelyLocalAssetQrValue/)
  assert.match(source, /qrLocalWarning/)
  assert.match(source, /qrPrintTarget/)
})

test("label print typography uses high-contrast black text for thermal tape", () => {
  const source = readFileSync("src/components/assets/asset-label-print.tsx", "utf8")

  assert.match(source, /print-color-adjust: exact/)
  assert.match(source, /text-black/)
  assert.match(source, /secondaryClass[\s\S]+font-black/)
  assert.doesNotMatch(source, /text-slate-600|text-slate-700/)
})
