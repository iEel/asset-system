import assert from "node:assert/strict"
import test from "node:test"

import {
  getMissingPhotoChecklistLabels,
  maskLicenseKey,
} from "../src/lib/asset-detail-format.ts"

test("masks license keys without exposing the middle", () => {
  assert.equal(maskLicenseKey(null), null)
  assert.equal(maskLicenseKey("ABC123"), "••••")
  assert.equal(maskLicenseKey("AAAA-BBBB-CCCC-DDDD"), "AAAA••••DDDD")
})

test("detects missing photo checklist labels using normalized and legacy names", () => {
  const missing = getMissingPhotoChecklistLabels(
    ["Serial/Sticker", "ด้านหน้า", "ด้านหลัง"],
    [
      { id: "1", originalName: "Serial_Sticker - asset.jpg", fileType: "image/jpeg" },
      { id: "2", originalName: "ด้านหน้า - old.jpg", fileType: "image/jpeg" },
      { id: "3", originalName: "manual.pdf", fileType: "application/pdf" },
    ],
  )

  assert.deepEqual(missing, ["ด้านหลัง"])
})
