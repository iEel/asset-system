import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("asset detail relationship map has explicit role summary and relationship lanes", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

  assert.match(source, /getRelationshipState\(/)
  assert.match(source, /RelationshipSummaryBadge/)
  assert.match(source, /relationshipParentLane/)
  assert.match(source, /relationshipCurrentViewing/)
  assert.match(source, /relationshipComponentsCount/)
  assert.match(source, /RelationshipEmptyState/)
  assert.match(source, /relationshipNoParentHelp/)
  assert.match(source, /relationshipNoComponentsHelp/)
  assert.match(source, /md:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1\.1fr\)_auto_minmax\(0,1fr\)\]/)
})

test("relationship asset cards keep asset tags readable before badges and names", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
  const cardStart = source.indexOf("function RelationshipAssetCard")
  const cardEnd = source.indexOf("function RelationshipLinkList", cardStart)
  const cardSource = source.slice(cardStart, cardEnd)

  assert.match(cardSource, /font-mono[\s\S]+\{relationshipAsset\.assetTag\}/)
  assert.match(cardSource, /\[overflow-wrap:anywhere\][\s\S]+\{relationshipAsset\.assetTag\}/)
  assert.match(cardSource, /flex flex-wrap items-center gap-2[\s\S]+getRelationshipBadgeClass/)
  assert.doesNotMatch(cardSource, /truncate text-sm font-semibold text-foreground">\{relationshipAsset\.assetTag\}/)
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
  ]) {
    assert.match(thMessages, new RegExp(`"${key}"`))
    assert.match(enMessages, new RegExp(`"${key}"`))
  }
})
