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

test("the attachment type select uses Field and NativeSelect (2C batch 1a), and delete asks through useConfirm (K12, batch 5)", () => {
  const source = readFileSync("src/components/maintenance/maintenance-attachments.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<Field label=\{t\("attachmentType"\)\} className="mb-3">\n\s+<NativeSelect\n/)
  assert.doesNotMatch(source, /<select|mb-1\.5 block text-sm font-medium/)
  assert.match(source, /<FileDropzone\n\s+file=\{selectedFile\}/)
  // Batch 5 (spec 2C §5.9, K12): the shared confirm with the verb "ลบ" replaces the file's own dialog; the delete
  // button (Button danger icon-sm busy since plan 2D-4) only starts handleDelete, which asks first.
  assert.match(source, /async function handleDelete\(id: string\) \{\n\s+if \(!\(await confirm\(\{ title: tCommon\("deleteConfirm"\), confirmLabel: tCommon\("delete"\), tone: "destructive" \}\)\)\) return\n\s+setDeletingId\(id\)/)
  assert.match(source, /onClick=\{\(\) => void handleDelete\(attachment\.id\)\}/)
  assert.doesNotMatch(source, /AccessibleDialog|pendingDeleteId|savedSuccess/)
})
