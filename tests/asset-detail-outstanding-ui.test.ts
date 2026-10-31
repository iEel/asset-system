import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 3 spec §8.5 "Asset pages" (plan 2 Task 12): an outstanding link is listed on both sides with Task 5's line and
// counted on neither; the parts draw it in neutral ink (DESIGN.md FactStrip, The Where Color Lives Rule).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"
const DETAIL = "src/components/assets/detail/"

test("the asset page reads each outstanding link's RT- once, in a round it already makes, builds every line with the one formatter and counts none (group 3 spec §8.5)", () => {
  const page = read(PAGE)
  assert.match(page, /import \{[^}]*\bformatOutstandingComponentLine\b[^}]*\} from "@\/lib\/asset-component-outstanding"/)
  // The parent's links carry each component's holder.
  assert.match(page, /parentComponents: \{\n\s+orderBy: \{ installedAt: "desc" \},\n\s+include: \{\n\s+componentAsset: \{\n\s+select: \{ id: true, assetTag: true, name: true, serialNumber: true, custodian: \{ select: \{ code: true, fullNameTh: true \} \} \},/)
  // Both sides: the parent's outstanding links, and this asset's own, the link the frame's action rule reads (Task 4).
  assert.match(page, /const outstandingComponentLinks = asset\.parentComponents\.filter\(\(component\) => isOutstandingLink\(component\)\)/)
  assert.match(page, /const ownOutstandingLink = asset\.installedInLinks\.find\(\(link\) => link\.id === frame\.outstanding\?\.linkId && isOutstandingLink\(link\)\) \?\? null/)
  assert.match(page, /const outstandingCheckinIdOf = \(link: \{ referenceType: string \| null; referenceId: string \| null \}\) => \(link\.referenceType === "checkin" \? link\.referenceId : null\)/)
  assert.match(page, /const outstandingCheckinIds = \[\.\.\.new Set\(outstandingLinks\.flatMap\(\(link\) => outstandingCheckinIdOf\(link\) \?\? \[\]\)\)\]/)
  // The RT- numbers: one bounded read of the ids the links name, beside the photo reads.
  assert.match(page, /const \[photoChecklist, modelPhotos, licenseAssignedAsset, outstandingCheckins\] = await Promise\.all\(\[/)
  assert.match(page, /outstandingCheckinIds\.length > 0\n\s+\? prisma\.assetCheckin\.findMany\(\{ where: \{ id: \{ in: outstandingCheckinIds \} \}, select: \{ id: true, documentNo: true \} \}\)\n\s+: Promise\.resolve\(\[\]\),/)
  assert.equal(page.match(/prisma\.assetCheckin\.findMany\(/g)?.length, 1)
  // One line on every page, in Task 5's words.
  assert.match(page, /const outstandingWords = \{ outstanding: t\("componentOutstanding"\), withHolder: \(holder: string\) => t\("componentOutstandingWith", \{ holder \}\) \}/)
  assert.match(page, /formatOutstandingComponentLine\(\{ holder, documentNo: outstandingDocumentNoOf\(link\) \}, outstandingWords\)/)
  assert.doesNotMatch(page, /\.filter\(Boolean\)\.join\(" · "\)/)
  // Listed first, each with its line; the fitted ones follow. The tab's count and serial warning stay installed-only.
  assert.match(page, /const listedComponentsForPanel = \[\n\s+\.\.\.outstandingComponentLinks\.map\(\(component\) => \(\{ \.\.\.component, outstandingLine: outstandingLineOf\(component, component\.componentAsset\.custodian\) \}\)\),\n\s+\.\.\.currentComponentsForPanel\.map\(\(component\) => \(\{ \.\.\.component, outstandingLine: null \}\)\),\n\s+\]/)
  assert.match(page, /components: \{ count: detailCounts\.components, hasWarning: componentMissingSerialCount > 0 \}/)
  // This asset's own: the strip's first fact, the overview's parent row and the tab's parent lane.
  assert.match(page, /outstanding: ownOutstanding \? \{ parent: ownOutstanding\.parentAsset, heldBy: asset\.custodian, documentNo: ownOutstanding\.documentNo \} : null,/)
  assert.match(page, /const parentLinksForPanel = \[\.\.\.installedInLinksForPanel\.map\(\(link\) => \(\{ \.\.\.link, outstandingLine: null \}\)\), \.\.\.\(ownOutstanding \? \[ownOutstanding\] : \[\]\)\]/)
  assert.match(page, /parent: parentLinksForPanel\[0\]\n\s+\? \{ assetTag: parentLinksForPanel\[0\]\.parentAsset\.assetTag, name: parentLinksForPanel\[0\]\.parentAsset\.name, href: parentLinksForPanel\[0\]\.parentHref, outstandingLine: parentLinksForPanel\[0\]\.outstandingLine \}/)
  assert.match(page, /children: listedComponentsForPanel\.map\(\(component\) => \(\{/)
  assert.match(page, /parents=\{parentLinksForPanel\.map\(\(link\) => \(\{/)
  assert.match(page, /components=\{listedComponentsForPanel\.map\(\(component\) => \(\{/)
  assert.equal(page.match(/outstandingLine: (?:component|link)\.outstandingLine,/g)?.length, 3, "the overview's children, the tab's parents and its components")
})

test("the parts draw the line in neutral ink: the strip's sub-line, a line under the overview's row, a line on the relationship card; the lane's counts stay fitted-only (group 3 spec §8.5)", () => {
  const strip = read(`${DETAIL}asset-detail-fact-strip.tsx`)
  assert.match(strip, /^import \{ formatOutstandingComponentLine \} from "@\/lib\/asset-component-outstanding"$/m)
  assert.match(strip, /value: holder\.parent \? parentValue\(holder\.parent\) : <Nil \/>,/)
  assert.match(strip, /\} else if \(holder\.kind === "outstanding"\) \{/)
  assert.match(strip, /label: t\("componentOf"\),\n\s+value: parentValue\(holder\.parent\),\n\s+sub: formatOutstandingComponentLine\(\{ holder: holder\.heldBy, documentNo: holder\.documentNo \}, \{ outstanding: tAsset\("componentOutstanding"\), withHolder: \(name\) => tAsset\("componentOutstandingWith", \{ holder: name \}\) \}\),/)
  const overview = read(`${DETAIL}asset-overview.tsx`)
  assert.match(overview, /children: \{ id: string; assetTag: string; name: string; href: string; outstandingLine: string \| null \}\[\]/)
  assert.match(overview, /parent: \{ assetTag: string; name: string; href: string; outstandingLine: string \| null \} \| null/)
  assert.match(overview, /\{components\.parent\.outstandingLine \? <span className="block text-meta">\{components\.parent\.outstandingLine\}<\/span> : null\}/)
  assert.match(overview, /\{child\.outstandingLine \? <span className="block text-meta text-muted-foreground">\{child\.outstandingLine\}<\/span> : null\}/)
  const tab = read(`${DETAIL}asset-components-tab.tsx`)
  assert.match(tab, /export type AssetRelationshipAsset = \{ id: string; href: string; assetTag: string; name: string; role: string; slotNo: string \| null; outstandingLine: string \| null \}/)
  assert.match(tab, /note: item\.outstandingLine \?\? null,/)
  assert.match(tab, /const installedCount = components\.filter\(\(item\) => !item\.outstandingLine\)\.length/)
  assert.equal(tab.match(/count: installedCount/g)?.length, 3, "the lane's count and the two summaries")
  assert.match(tab, /moreItemsLabel=\{t\("relationshipMoreItems", \{ count: Math\.max\(components\.length - 5, 0\) \}\)\}/, "the cards past five, outstanding ones included")
  const map = read(`${DETAIL}asset-relationship-map.tsx`)
  assert.match(map, /\{link\?\.note \? <div className="text-meta text-muted-foreground \[overflow-wrap:anywhere\]">\{link\.note\}<\/div> : null\}/)
  for (const source of [strip, overview, tab, map]) assert.doesNotMatch(source, /text-(?:success|warning|danger)\b/)
})

test("the histories: the link rows bring their status and last change, and the ประวัติ words of the late return (group 3 spec §8.5, §8.6)", () => {
  assert.match(read("src/lib/asset-component-history.ts"), /removedAt: true,\n\s+status: true,\n\s+updatedAt: true,\n\s+reason: true,/)
  const loader = read("src/lib/asset-history.ts")
  assert.match(loader, /receivedBy: \(name\) => t\("asset\.history\.receivedBy", \{ name \}\),/)
  assert.match(loader, /lateReturnOutcomes: \{ reattached: t\("asset\.history\.lateReturnReattached"\), standalone: t\("asset\.history\.lateReturnStandalone"\) \},/)
  for (const [locale, words] of [
    ["th", ["ค้างคืน", "อยู่กับ {holder}", "รับโดย {name}", "กลับเข้าเครื่องหลัก", "แยกเป็นทรัพย์สินเดี่ยว"]],
    ["en", ["Outstanding", "With {holder}", "Received by {name}", "Back in its parent asset", "Stands alone"]],
  ] as const) {
    const asset = JSON.parse(read(`messages/${locale}.json`)).asset
    assert.deepEqual([asset.componentOutstanding, asset.componentOutstandingWith, asset.history.receivedBy, asset.history.lateReturnReattached, asset.history.lateReturnStandalone], words, locale)
  }
  assert.ok(read("docs/06_WORKFLOWS.md").includes('"ค้างคืน · อยู่กับ <holder> · <RT->" (`formatOutstandingComponentLine`'))
})
