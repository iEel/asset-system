import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

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

test("the overview's photo is the card-size frame of the newest image the thumbnail route renders: no sidebar card (spec §7.5, R27)", () => {
  const source = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.doesNotMatch(source, /function SidebarPhotoCard|fetchPriority="high"|isPreviewableImage/)
  assert.match(source, /const primaryAssetPhoto = assetAttachments\.find\(\(attachment\) => isThumbnailable\(attachment\.fileType\)\)/, "รูปหลัก: the newest thumbnailable module asset image (Task 11's tiles use the same rule)")
  assert.match(source, /const primaryModelPhoto = modelPhotos\.find\(\(attachment\) => isThumbnailable\(attachment\.fileType\)\)/, "HEIC and SVG are documents, never the frame's image")
  assert.match(source, /attachmentId: primaryAssetPhoto\?\.id \?\? primaryModelPhoto\?\.id \?\? null,/)
  assert.match(source, /isModelPhoto: !primaryAssetPhoto && Boolean\(primaryModelPhoto\),/)
})

test("no evidence drawer: the files tab shows the evidence (spec §7.7, §7.9)", () => {
  const source = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.equal(existsSync("src/components/assets/asset-evidence-drawer.tsx"), false)
  assert.doesNotMatch(source, /evidenceDrawerItems|allEvidenceItems|<section id="evidence"|<SummaryPill/)
})
