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

test("the attachment type select uses Field and NativeSelect, and the delete dialog waits for batch 5 (2C batch 1a)", () => {
  const source = readFileSync("src/components/maintenance/maintenance-attachments.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<Field label=\{t\("attachmentType"\)\} className="mb-3">\n\s+<NativeSelect\n/)
  assert.doesNotMatch(source, /<select|mb-1\.5 block text-sm font-medium/)
  assert.match(source, /<FileDropzone\n\s+file=\{selectedFile\}/)
  assert.match(source, /<AccessibleDialog open=\{Boolean\(pendingDeleteId\)\} title=\{tCommon\("deleteConfirm"\)\}/)
})
