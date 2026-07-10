import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const assetDetailSource = () => readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

test("asset detail keeps notes in the overview tab before operational sections", () => {
  const source = assetDetailSource()
  const notesSectionIndex = source.indexOf('<section id="notes"')
  const maintenanceSectionIndex = source.indexOf('<section id="maintenance"')
  const auditSectionIndex = source.indexOf('<section id="audit"')

  assert.notEqual(notesSectionIndex, -1)
  assert.notEqual(maintenanceSectionIndex, -1)
  assert.notEqual(auditSectionIndex, -1)
  assert.ok(notesSectionIndex < maintenanceSectionIndex)
  assert.ok(notesSectionIndex < auditSectionIndex)
  assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "notes"\)/)
  assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "maintenance"\)/)
  assert.doesNotMatch(source, /sectionLinks\.map/)
})
