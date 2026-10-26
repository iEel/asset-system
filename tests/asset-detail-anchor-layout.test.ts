import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the remark is a row of ข้อมูลทรัพย์สิน, which keeps the overview and purchase anchors; the repair and audit sections keep their ids until their tabs are rebuilt (group 1 asset detail task 8, R23)", () => {
  const source = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  const overview = read("src/components/assets/detail/asset-overview.tsx")
  assert.doesNotMatch(source, /<section id="(?:overview|specs|ownership|purchase|notes)"/)
  assert.match(overview, /<div id="overview" className="min-w-0 scroll-mt-24/)
  assert.match(overview, /<div id="purchase" className="scroll-mt-24">/, "the reports' warranty link lands on the purchase rows")
  assert.match(overview, /\{ key: "remark", label: tAsset\("remark"\), value: details\.remark \}/)
  assert.notEqual(source.indexOf('<section id="maintenance"'), -1)
  assert.notEqual(source.indexOf('<section id="audit"'), -1)
  assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "maintenance"\)/)
  assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "audit"\)/)
  assert.doesNotMatch(source, /sectionLinks\.map/)
})
