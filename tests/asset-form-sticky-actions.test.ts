import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const assetFormSource = () => readFileSync("src/components/assets/asset-form.tsx", "utf8")

test("asset form keeps save actions visible in a fixed bottom bar", () => {
  const source = assetFormSource()

  assert.match(source, /pb-36 sm:pb-24/)
  assert.match(source, /fixed bottom-3/)
  assert.match(source, /lg:left-\[calc\(16rem\+1\.5rem\)\]/)
  assert.match(source, /bg-surface\/95/)
  assert.match(source, /backdrop-blur/)
  assert.match(source, /sm:flex-row sm:items-center sm:justify-end/)
  assert.match(source, /<Save className="h-4 w-4" \/>/)
})

test("asset form fixed save action preserves existing disabled guards", () => {
  const source = assetFormSource()

  assert.match(
    source,
    /disabled=\{saving \|\| isProtectedStatusChange \|\| duplicateState\.checking \|\| duplicateState\.assetTagExists \|\| duplicateState\.serialNumberExists\}/,
  )
})
