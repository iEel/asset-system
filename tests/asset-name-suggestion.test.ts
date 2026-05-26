import assert from "node:assert/strict"
import test from "node:test"

import { buildSuggestedAssetName } from "../src/lib/asset-name-suggestion.ts"

test("builds a readable asset name from category, brand, and model labels", () => {
  assert.equal(
    buildSuggestedAssetName(
      { label: "Desktop Computer - คอมพิวเตอร์ตั้งโต๊ะ" },
      { label: "Dell" },
      { label: "Optiplex 3050 SFF" }
    ),
    "Desktop Computer Dell Optiplex 3050 SFF"
  )
})

test("does not repeat the brand when the model already starts with the brand", () => {
  assert.equal(
    buildSuggestedAssetName(
      { label: "Notebook - คอมพิวเตอร์พกพา" },
      { label: "Dell" },
      { label: "Dell Latitude 5440" }
    ),
    "Notebook Dell Latitude 5440"
  )
})

test("ignores blank labels when suggesting an asset name", () => {
  assert.equal(buildSuggestedAssetName({ label: "Printer - เครื่องพิมพ์" }, { label: " " }, null), "Printer")
})
