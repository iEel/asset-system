import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const assetDetailSource = () => readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")

test("asset detail keeps the notes anchor before short tail workflow sections", () => {
  const source = assetDetailSource()
  const notesLinkIndex = source.indexOf('{ id: "notes", label: t("detailSections.notes") }')
  const maintenanceLinkIndex = source.indexOf('{ id: "maintenance", label: t("detailSections.maintenance") }')
  const notesSectionIndex = source.indexOf('<section id="notes"')
  const maintenanceSectionIndex = source.indexOf('<section id="maintenance"')
  const auditSectionIndex = source.indexOf('<section id="audit"')

  assert.notEqual(notesLinkIndex, -1)
  assert.notEqual(maintenanceLinkIndex, -1)
  assert.notEqual(notesSectionIndex, -1)
  assert.notEqual(maintenanceSectionIndex, -1)
  assert.notEqual(auditSectionIndex, -1)
  assert.ok(notesLinkIndex < maintenanceLinkIndex)
  assert.ok(notesSectionIndex < maintenanceSectionIndex)
  assert.ok(notesSectionIndex < auditSectionIndex)
})
