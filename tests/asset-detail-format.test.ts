import assert from "node:assert/strict"
import test from "node:test"

import {
  compactMovementDetails,
  getMissingPhotoChecklistLabels,
  getWarrantyState,
  maskLicenseKey,
} from "../src/lib/asset-detail-format.ts"

test("masks license keys without exposing the middle", () => {
  assert.equal(maskLicenseKey(null), null)
  assert.equal(maskLicenseKey("ABC123"), "••••")
  assert.equal(maskLicenseKey("AAAA-BBBB-CCCC-DDDD"), "AAAA••••DDDD")
})

test("calculates warranty tone from a stable reference date", () => {
  const now = new Date("2026-05-20T08:00:00.000Z")

  assert.deepEqual(getWarrantyState(null, now), { tone: "neutral", daysLeft: null })
  assert.deepEqual(getWarrantyState(new Date("2026-05-19T00:00:00.000Z"), now), { tone: "danger", daysLeft: -1 })
  assert.deepEqual(getWarrantyState(new Date("2026-06-10T00:00:00.000Z"), now), { tone: "warning", daysLeft: 21 })
  assert.deepEqual(getWarrantyState(new Date("2026-07-01T00:00:00.000Z"), now), { tone: "success", daysLeft: 42 })
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

test("removes empty and duplicate movement details while preserving order", () => {
  const details = compactMovementDetails([
    { label: "From", value: "A" },
    { label: "To", value: "" },
    { label: "From", value: "A" },
    { label: "To", value: "B", href: "/b" },
  ])

  assert.deepEqual(details, [
    { label: "From", value: "A" },
    { label: "To", value: "B", href: "/b" },
  ])
})
