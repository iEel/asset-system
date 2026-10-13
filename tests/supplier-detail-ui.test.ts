import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const componentPath = "src/components/master-data/supplier-purchase-documents.tsx"
const documents = existsSync(componentPath) ? readFileSync(componentPath, "utf8") : ""
const detail = readFileSync("src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx", "utf8")

test("purchase documents use adaptive desktop and mobile presentations", () => {
  assert.notEqual(documents, "", "supplier-purchase-documents.tsx must exist")
  assert.match(documents, /data-supplier-documents-desktop/)
  assert.match(documents, /hidden[^"\n]*md:block/)
  assert.match(documents, /data-supplier-documents-mobile/)
  assert.match(documents, /md:hidden/)
  assert.match(documents, /<DataTable\b/)
  assert.match(documents, /<article/)
  assert.match(documents, /<dl/)
})

test("supplier detail uses a compact mobile metric strip", () => {
  // Spec 2B §5.5, §10.4 table A: the local MetricCard grid became StatStrip (two columns below lg, one row from lg).
  assert.match(detail, /<StatStrip\b/)
  assert.match(detail, /SupplierPurchaseDocuments/)
})

test("supplier detail actions are touch-safe and keyboard visible", () => {
  assert.match(detail, /min-h-11/)
  assert.match(detail, /focus-visible:ring-2/)
  assert.match(detail, /aria-hidden="true"/)
})
