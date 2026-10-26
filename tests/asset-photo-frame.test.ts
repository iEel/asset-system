import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 asset detail task 4 (spec 2026-10-25 §7.5, addition 5): the photo card loads a card-size WebP from the
// thumbnail route, never the original, shows a placeholder when the image fails, and offers the upload to an editor.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const FRAME = "src/components/assets/asset-photo-frame.tsx"
const words = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).asset.photoFrame as Record<string, string>

test("the photo card loads the card-size thumbnail, and only a person's click opens the original (spec §7.5)", () => {
  const source = read(FRAME)
  assert.match(source, /^"use client"\n/)
  assert.match(source, /export function AssetPhotoFrame\(\{ attachmentId, alt, label, canUpload, uploadHref, previewable = true, className \}: \{ attachmentId: string \| null; alt: string; label\?: string; canUpload: boolean; uploadHref\?: string; previewable\?: boolean; className\?: string \}\)/)
  assert.equal(source.match(/<img\b/g)?.length, 1, "one image, in both the previewable and the plain frame")
  assert.match(source, /src=\{thumbnailUrl\(attachmentId, "card"\)\}/)
  assert.match(source, /onError=\{\(\) => setFailed\(true\)\}/)
  assert.equal(source.match(/\bbg-image-stage\b/g)?.length, 1, "the stage is on the image element only (dark mode P-R1)")
  assert.equal(source.match(/<AttachmentPreviewDialog\b/g)?.length, 1)
  assert.equal(source.match(/\?inline=1/g)?.length, 1, "the original is the preview dialog's source, read only once it opens")
  assert.match(source, /src=\{`\/api\/attachments\/\$\{attachmentId\}\?inline=1`\}/)
  assert.match(source, /downloadHref=\{`\/api\/attachments\/\$\{attachmentId\}`\}/)
  assert.equal(source.match(/<button\b/g)?.length, 1, "the image is the control (its N3 row)")
  assert.doesNotMatch(source, /next\/image|unoptimized/)
})

test("inside another control the frame is a plain picture: no button, no dialog (R26, Task 11's tiles)", () => {
  const source = read(FRAME)
  assert.match(source, /\{previewable \? \(\s*<button type="button"/)
  assert.match(source, /\{previewable \? \(\s*<AttachmentPreviewDialog\b/)
  // The frame fills its parent's box; the caller sizes it.
  assert.equal(source.match(/className=\{cn\("flex h-full w-full min-w-0 flex-col gap-2", className\)\}/g)?.length, 1)
  assert.doesNotMatch(source, /(?<![-\w])h-(?:\d+|\[[^\]]+\])/, "no height of its own (min-h-0 and max-h-full are not one)")
})

test("an empty card and a photo that fails say so, and offer the upload link to an editor only (spec §7.5, addition 5, R26)", () => {
  const source = read(FRAME)
  assert.equal(source.match(/<ActionEmptyState\b/g)?.length, 2)
  assert.match(source, /title=\{t\("photoFrame\.emptyTitle"\)\}/)
  assert.match(source, /description=\{t\("photoFrame\.emptyHelp"\)\}/)
  assert.match(source, /title=\{t\("photoFrame\.loadFailed"\)\}/)
  assert.equal(source.match(/tone="error"/g)?.length, 1)
  // A link to the files tab: "อัปโหลดรูป" from md, "ถ่ายรูป" below it (the camera input is the files tab's).
  assert.match(source, /const upload = canUpload && uploadHref \? \(\s*<Link href=\{uploadHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<span className="max-md:hidden">\{t\("photoFrame\.upload"\)\}<\/span>/)
  assert.match(source, /<span className="md:hidden">\{t\("photoFrame\.takePhoto"\)\}<\/span>/)
  assert.equal(source.match(/action=\{upload\}/g)?.length, 2)
  assert.doesNotMatch(source, /<input\b|capture=/, "no camera input in the card")
})

test("the photo card's words, th and en together", () => {
  assert.deepEqual(words("th"), {
    emptyTitle: "ยังไม่มีรูป",
    emptyHelp: "รูปช่วยให้หาเจอตอนเดินตรวจนับ",
    loadFailed: "โหลดรูปไม่ได้",
    upload: "อัปโหลดรูป",
    takePhoto: "ถ่ายรูป",
    open: "เปิดรูป {name} ขนาดเต็ม",
  })
  assert.deepEqual(words("en"), {
    emptyTitle: "No photo yet",
    emptyHelp: "A photo helps people find it during an audit count",
    loadFailed: "The photo could not be loaded",
    upload: "Upload a photo",
    takePhoto: "Take a photo",
    open: "Open the full-size photo of {name}",
  })
})
