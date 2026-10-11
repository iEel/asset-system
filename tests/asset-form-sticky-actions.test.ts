import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const assetFormSource = () => readFileSync("src/components/assets/asset-form.tsx", "utf8")

test("asset form keeps save actions in a sticky form footer", () => {
  const source = assetFormSource()

  assert.match(source, /<StickyFormFooter[\s>]/)
  assert.match(source, /<form onSubmit=\{handleSubmit\} className="space-y-5">/)
  assert.doesNotMatch(source, /fixed bottom-3|lg:left-\[calc|bg-surface\/95|backdrop-blur|pb-36 sm:pb-24/)
})

test("asset form save action is busy while saving and keeps its other disabled guards", () => {
  const source = assetFormSource()

  assert.match(source, /busy=\{saving\}/)
  assert.match(
    source,
    /disabled=\{isProtectedStatusChange\s*\|\|\s*duplicateState\.checking\s*\|\|\s*duplicateState\.assetTagExists\s*\|\|\s*duplicateState\.serialNumberExists\}/,
  )
  // The two "add" buttons and the serial scanner keep disabled={saving} on purpose; only the save gate loses it.
  assert.doesNotMatch(source, /disabled=\{saving\s*\|\|/)
})
