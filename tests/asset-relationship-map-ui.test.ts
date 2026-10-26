import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { splitRelationshipPreview } from "../src/lib/asset-relationship-preview.ts"

test("relationship preview keeps five items visible and preserves the remaining items", () => {
  const links = Array.from({ length: 8 }, (_, index) => ({ id: String(index) }))
  const preview = splitRelationshipPreview(links)

  assert.deepEqual(preview.visible.map((item) => item.id), ["0", "1", "2", "3", "4"])
  assert.deepEqual(preview.remaining.map((item) => item.id), ["5", "6", "7"])
})

test("asset detail relationship map has explicit role summary and relationship lanes", () => {
  const map = readFileSync("src/components/assets/detail/asset-relationship-map.tsx", "utf8")
  const tab = readFileSync("src/components/assets/detail/asset-components-tab.tsx", "utf8")

  assert.match(map, /getRelationshipState\(/)
  assert.match(map, /RelationshipSummaryBadge/)
  assert.match(tab, /relationshipParentLane/)
  assert.match(tab, /relationshipCurrentViewing/)
  assert.match(tab, /relationshipComponentsCount/)
  assert.match(map, /RelationshipEmptyState/)
  assert.match(tab, /relationshipNoParentHelp/)
  assert.match(tab, /relationshipNoComponentsHelp/)
  assert.match(map, /md:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1\.1fr\)_auto_minmax\(0,1fr\)\]/)
  assert.match(map, /ArrowDown/)
  assert.match(map, /splitRelationshipPreview\(childLinks\)/)
  assert.match(map, /<details/)
  assert.match(tab, /relationshipMoreItems/)
})

test("relationship asset cards keep asset tags readable before badges and names", () => {
  const source = readFileSync("src/components/assets/detail/asset-relationship-map.tsx", "utf8")
  const cardStart = source.indexOf("function RelationshipAssetCard")
  const cardEnd = source.indexOf("function RelationshipLinkList", cardStart)
  const cardSource = source.slice(cardStart, cardEnd)

  assert.match(cardSource, /font-mono[\s\S]+\{relationshipAsset\.assetTag\}/)
  assert.match(cardSource, /\[overflow-wrap:anywhere\][\s\S]+\{relationshipAsset\.assetTag\}/)
  // Plan 2D-3: the role is the shared Chip (a name, 2D-2 R2), not a palette-colored badge.
  assert.match(cardSource, /flex flex-wrap items-center gap-2[\s\S]+<Chip>\{roleLabel\}<\/Chip>/)
  assert.doesNotMatch(cardSource, /truncate text-sm font-semibold text-foreground">\{relationshipAsset\.assetTag\}/)
  assert.match(cardSource, /focus-visible:ring-2/)
})

test("asset relationship map translations describe parent, current, and child empty states", () => {
  const thMessages = readFileSync("messages/th.json", "utf8")
  const enMessages = readFileSync("messages/en.json", "utf8")

  for (const key of [
    "relationshipParentLane",
    "relationshipCurrentViewing",
    "relationshipComponentsCount",
    "relationshipSummaryParent",
    "relationshipSummaryComponent",
    "relationshipSummaryStandalone",
    "relationshipNoParent",
    "relationshipNoParentHelp",
    "relationshipNoComponents",
    "relationshipNoComponentsHelp",
    "relationshipMoreItems",
  ]) {
    assert.match(thMessages, new RegExp(`"${key}"`))
    assert.match(enMessages, new RegExp(`"${key}"`))
  }
})
