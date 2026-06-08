import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

test("asset register exposes clone action that opens create asset with cloneFrom", () => {
  const source = readFileSync(join(process.cwd(), "src", "components", "assets", "asset-register-table.tsx"), "utf8")

  assert.match(source, /cloneAsset/)
  assert.match(source, /cloneFrom=\$\{encodeURIComponent\(asset\.id\)\}/)
})

test("new asset page preloads clone source from search params", () => {
  const source = readFileSync(join(process.cwd(), "src", "app", "[locale]", "(dashboard)", "assets", "new", "page.tsx"), "utf8")

  assert.match(source, /searchParams: Promise/)
  assert.match(source, /cloneFrom/)
  assert.match(source, /buildAssetCloneFormState/)
  assert.match(source, /cloneSource=/)
})

test("asset form renders clone context while keeping batch mode hidden during clone", () => {
  const formSource = readFileSync(join(process.cwd(), "src", "components", "assets", "asset-form.tsx"), "utf8")
  const workspaceSource = readFileSync(join(process.cwd(), "src", "components", "assets", "asset-create-workspace.tsx"), "utf8")

  assert.match(formSource, /cloneSource/)
  assert.match(formSource, /cloneBannerTitle/)
  assert.match(workspaceSource, /props\.cloneSource/)
  assert.match(workspaceSource, /<AssetForm \{\.\.\.props\} \/>/)
})
