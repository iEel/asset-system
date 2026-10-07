import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("read-only attachment UI omits mutation controls", () => {
  const source = readFileSync("src/components/maintenance/maintenance-attachments.tsx", "utf8")
  assert.match(source, /canEdit:\s*boolean/)
  assert.match(source, /canDelete:\s*boolean/)
  assert.match(source, /canEdit\s*\?\s*\(/)
  assert.match(source, /canDelete\s*\?\s*\(/)
  assert.doesNotMatch(source, /window\.confirm/)
})

test("maintenance detail lets recorders attach and editors delete", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx", "utf8")
  assert.match(source, /canEdit=\{canAttach\}/)
  assert.match(source, /canDelete=\{canEdit\}/)
})
