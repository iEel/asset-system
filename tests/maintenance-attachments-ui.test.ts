import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { isMaintenancePhotoType, maintenanceAttachmentTypes } from "../src/lib/maintenance-attachments.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const COMPONENT = "src/components/maintenance/maintenance-attachments.tsx"
const PAGE = "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx"

test("read-only attachment UI omits mutation controls", () => {
  const source = read(COMPONENT)
  assert.match(source, /canEdit:\s*boolean/)
  assert.match(source, /canDelete:\s*boolean/)
  assert.match(source, /canEdit\s*\?\s*\(/)
  assert.match(source, /canDelete(?: && preview)?\s*\?\s*\(/)
  assert.doesNotMatch(source, /window\.confirm/)
})

test("maintenance detail lets recorders attach and editors delete, and passes the record's state", () => {
  const source = read(PAGE)
  assert.match(source, /canEdit=\{canAttach\}/)
  assert.match(source, /canDelete=\{canEdit\}/)
  assert.match(source, /<MaintenanceAttachments[^>]*repairStatus=\{ticket\.repairStatus\}/)
  // Final review 3: the state is the key, so after ซ่อมเสร็จ the refresh remounts the panel with the new default type.
  assert.match(source, /<MaintenanceAttachments key=\{ticket\.repairStatus\} /)
})

test("after a delete in the preview, focus goes to the panel's heading, not to <body> (final review 10)", () => {
  const source = read(COMPONENT)
  assert.match(source, /<ContentPanel\n\s+title=\{t\("attachments"\)\}\n\s+titleId=\{ATTACHMENTS_TITLE_ID\}/)
  assert.match(source, /focusHeadingOnClose\.current = true\n\s+setPreview\(null\)/)
  assert.match(source, /onCloseAutoFocus=\{\(event\) => \{\n\s+if \(!focusHeadingOnClose\.current\) return\n\s+focusHeadingOnClose\.current = false\n\s+event\.preventDefault\(\)\n\s+document\.getElementById\(ATTACHMENTS_TITLE_ID\)\?\.focus\(\)/)
  const dialog = read("src/components/ui/attachment-preview-dialog.tsx")
  assert.match(dialog, /onCloseAutoFocus\?: \(event: Event\) => void/)
  assert.match(dialog, /<DialogContent\n\s+onCloseAutoFocus=\{onCloseAutoFocus\}/)
})

test("the attachment type select uses Field and NativeSelect (2C batch 1a), and delete asks through useConfirm (K12, batch 5)", () => {
  const source = read(COMPONENT)
  assert.match(source, /<Field label=\{t\("attachmentType"\)\} hint=\{defaultTypeHint\} className="mb-3">\n\s+<NativeSelect\n/)
  assert.doesNotMatch(source, /<select|mb-1\.5 block text-sm font-medium/)
  assert.match(source, /<FileDropzone\n\s+file=\{selectedFile\}/)
  assert.match(source, /async function handleDelete\(id: string\) \{\n\s+if \(!\(await confirm\(\{ title: tCommon\("deleteConfirm"\), confirmLabel: tCommon\("delete"\), tone: "destructive" \}\)\)\) return\n\s+setDeletingId\(id\)/)
  assert.match(source, /onClick=\{\(\) => void handleDelete\(preview\.id\)\}/)
  assert.doesNotMatch(source, /AccessibleDialog|pendingDeleteId|savedSuccess/)
})

// Group 5 plan 3 Task 4 (spec §8.5): typed by the record's state, thumbnails, the phone camera and the uploader's notice.
test("the type select starts at defaultAttachmentType(repairStatus) with the hint of why", () => {
  const source = read(COMPONENT)
  assert.match(source, /repairStatus: string/)
  assert.match(source, /const defaultType = defaultAttachmentType\(repairStatus\)/)
  assert.match(source, /useState<MaintenanceAttachmentType>\(defaultType\)/)
  assert.doesNotMatch(source, /useState<MaintenanceAttachmentType>\("after_repair"\)/)
  assert.match(source, /t\("attachmentTypeDefaultOpen", \{ type: t\(`attachmentTypes\.\$\{defaultType\}`\) \}\)/)
  assert.match(source, /t\("attachmentTypeDefaultClosed", \{ type: t\(`attachmentTypes\.\$\{defaultType\}`\) \}\)/)
})

test("the camera opens only for a photo type, and the drop zone reads ถ่ายรูปหรือแนบใบเสร็จ", () => {
  assert.deepEqual(maintenanceAttachmentTypes.filter(isMaintenancePhotoType), ["before_repair", "after_repair"])
  const source = read(COMPONENT)
  assert.match(source, /capture=\{isMaintenancePhotoType\(attachmentType\) \? "environment" : undefined\}/)
  assert.match(source, /title=\{t\("dropAttachmentTitle"\)\}/)
  assert.equal(source.match(/capture=/g)?.length, 1)
  // The sub-line names the photo to take below md only, where the camera opens; from md, and for the other types, it
  // keeps "or click to choose a file" (final review 12, as the asset photo frame).
  assert.match(source, /browseLabel=\{\n\s+isMaintenancePhotoType\(attachmentType\) \? \(\n\s+<>\n\s+<span className="md:hidden">\{t\(attachmentType === "before_repair" \? "takeBeforePhoto" : "takeAfterPhoto"\)\}<\/span>\n\s+<span className="hidden md:inline">\{t\("dropFileHint"\)\}<\/span>\n\s+<\/>\n\s+\) : \(\n\s+t\("dropFileHint"\)\n\s+\)\n\s+\}/)
  assert.match(read("src/components/ui/file-dropzone.tsx"), /browseLabel: React\.ReactNode/)
})

test("the thumbnails are small, open AttachmentPreviewDialog, and keep download and delete in the preview", () => {
  const source = read(COMPONENT)
  assert.match(source, /isThumbnailable\(attachment\.fileType\)/)
  assert.match(source, /src=\{thumbnailUrl\(attachment\.id\)\}/)
  assert.match(source, /onClick=\{\(\) => setPreview\(attachment\)\}/)
  assert.match(source, /<AttachmentPreviewDialog\n/)
  assert.match(source, /downloadHref=\{preview \? `\/api\/attachments\/\$\{preview\.id\}` : undefined\}/)
  assert.match(source, /actions=\{\n?\s*canDelete && preview \? \(/)
  // One raw button: the tile (image, PDF or a named file) is the control (2D-4 R5).
  assert.equal(source.match(/<button\b/g)?.length, 1)
  const dialog = read("src/components/ui/attachment-preview-dialog.tsx")
  assert.match(dialog, /actions\?: React\.ReactNode/)
})

test("the head counts the files, the empty text, and the notice for an uploader who cannot delete", () => {
  const source = read(COMPONENT)
  assert.match(source, /t\("attachmentCount", \{ count: attachments\.length \}\)/)
  assert.match(source, /<EmptyNote>\{t\("noAttachments"\)\}<\/EmptyNote>/)
  assert.match(source, /\{!canDelete \? <Notice tone="warning"[^>]*>\{t\("closedEvidenceAppendOnlyHelp"\)\}<\/Notice> : null\}/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).maintenancePage
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).maintenancePage
  assert.equal(th.closedEvidenceAppendOnlyHelp, "ลบไฟล์ได้เฉพาะผู้มีสิทธิ์แก้ไขบันทึกซ่อม ถ้าแนบผิดให้แจ้งผู้มีสิทธิ์")
  // Spec §13 "{count} ไฟล์", written as {count, number} by the plural rule of tests/i18n-plural-count.test.ts.
  assert.equal(th.attachmentCount, "{count, number} ไฟล์")
  assert.equal(th.noAttachments, "ยังไม่มีไฟล์แนบ")
  assert.equal(th.attachmentTypeDefaultOpen, "ตั้งเป็น{type}ไว้ให้ เพราะบันทึกยังไม่ซ่อมเสร็จ")
  assert.equal(th.attachmentTypeDefaultClosed, "ตั้งเป็น{type}ไว้ให้ เพราะซ่อมเสร็จแล้ว")
  assert.equal(th.dropAttachmentTitle, "ถ่ายรูปหรือแนบใบเสร็จ")
  assert.equal(th.takeBeforePhoto, "ถ่ายรูปก่อนซ่อม")
  assert.equal(th.takeAfterPhoto, "ถ่ายรูปหลังซ่อม")
  for (const key of ["closedEvidenceAppendOnlyHelp", "attachmentCount", "noAttachments", "attachmentTypeDefaultOpen", "attachmentTypeDefaultClosed", "dropAttachmentTitle", "takeBeforePhoto", "takeAfterPhoto"]) {
    assert.doesNotMatch(th[key], /ใบงาน/, key)
    assert.equal(typeof en[key], "string", key)
  }
})
