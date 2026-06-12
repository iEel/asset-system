import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { assetPhotoGalleryPreviewLimit, getAssetPhotoGalleryState } from "../src/lib/asset-photo-gallery.ts"

test("asset photo gallery shows a compact preview before expanding", () => {
  const photos = Array.from({ length: assetPhotoGalleryPreviewLimit + 3 }, (_, index) => `photo-${index + 1}`)

  const collapsed = getAssetPhotoGalleryState(photos, false)

  assert.deepEqual(collapsed.visibleItems, photos.slice(0, assetPhotoGalleryPreviewLimit))
  assert.equal(collapsed.hiddenCount, 3)
  assert.equal(collapsed.hasOverflow, true)

  const expanded = getAssetPhotoGalleryState(photos, true)

  assert.deepEqual(expanded.visibleItems, photos)
  assert.equal(expanded.hiddenCount, 0)
  assert.equal(expanded.hasOverflow, true)
})

test("asset detail sidebar photo preview stays compact", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

  assert.match(source, /function SidebarPhotoCard/)
  assert.match(source, /h-32/)
  assert.doesNotMatch(source, /flex aspect-\[4\/3\] w-full items-center/)
})

test("asset detail evidence is a drawer, not a duplicate gallery section", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

  assert.match(source, /<AssetEvidenceDrawer/)
  assert.match(source, /const evidenceDrawerItems = allEvidenceItems\.map/)
  assert.doesNotMatch(source, /id: "evidence"/)
  assert.doesNotMatch(source, /<section id="evidence"/)
  assert.doesNotMatch(source, /<SummaryPill/)
})
