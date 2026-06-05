import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

test("asset register thumbnails prefer model photos before asset photos", () => {
  const pageSource = readFileSync(join(process.cwd(), "src", "app", "[locale]", "(dashboard)", "assets", "page.tsx"), "utf8")
  const tableAssetsStart = pageSource.indexOf("const tableAssets")
  const photoSelectionStart = pageSource.indexOf("photo:", tableAssetsStart)
  const modelPhotoSelection = pageSource.indexOf("modelPhotoByModelId.get(asset.model.id)", photoSelectionStart)
  const assetPhotoSelection = pageSource.indexOf("asset.attachments[0]", photoSelectionStart)

  assert.notEqual(tableAssetsStart, -1)
  assert.notEqual(photoSelectionStart, -1)
  assert.notEqual(modelPhotoSelection, -1)
  assert.notEqual(assetPhotoSelection, -1)
  assert.ok(
    modelPhotoSelection < assetPhotoSelection,
    "asset register photo selection should use the model photo before falling back to the asset photo"
  )
})
