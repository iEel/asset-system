import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Source pins for the group 6 photo rules on the routes (spec §5, §9.5): the upload type rule on both disposal upload
// routes, the last-photo guard on attachment delete, and the approver's photo view.

const read = (path: string) => readFileSync(path, "utf8")

test("both disposal upload routes refuse other image types after the general upload check", () => {
  for (const path of [
    "src/app/api/disposal-requests/[id]/attachments/route.ts",
    "src/app/api/disposal-batches/[id]/attachments/route.ts",
  ]) {
    const source = read(path)
    assert.match(source, /getDisposalUploadTypeError\(file\.type\)/, path)
    assert.match(source, /disposalApiError\(typeError, "Use a JPG, PNG or WEBP photo", 400\)/, path)
    assert.ok(source.indexOf("validateUploadFile(file)") < source.indexOf("getDisposalUploadTypeError("), `${path} checks the type after validateUploadFile`)
    assert.ok(source.indexOf("getDisposalUploadTypeError(") < source.indexOf("writeFile("), `${path} refuses before writing the file`)
  }
})

test("attachment delete keeps the last disposal photo, after the permission check", () => {
  const source = read("src/app/api/attachments/[id]/route.ts")
  const del = source.slice(source.indexOf("export async function DELETE"))
  assert.match(del, /existing\.module === "disposal" \|\| existing\.module === "disposal_batch"/)
  assert.match(del, /getDisposalLastFileBlock\(prisma, existing\)/)
  assert.match(del, /NextResponse\.json\(\{ code: block, error: block \}, \{ status: 409 \}\)/)
  assert.ok(del.indexOf("requireAttachmentPermission(") < del.indexOf("getDisposalLastFileBlock("))
  assert.ok(del.indexOf("getDisposalLastFileBlock(") < del.indexOf("prisma.attachment.update("))
})

test("an approver may view disposal photos; edit stays disposal:edit", () => {
  const source = read("src/lib/attachment-access.ts")
  assert.match(
    source,
    /\(module === "disposal" \|\| module === "disposal_batch"\) && action === "view" && hasPermission\(user, "disposal", "approve"\)/
  )
})

test("the new codes are known to the disposal error lists and the API error catalog", () => {
  for (const code of ["DISPOSAL_PHOTO_TYPE", "DISPOSAL_LAST_PHOTO"]) {
    assert.match(read("src/lib/disposal-api-error-codes.ts"), new RegExp(`"${code}"`))
    assert.match(read("src/lib/disposal-error-message.ts"), new RegExp(`"${code}"`))
  }
  const catalog = read("src/lib/api-error-catalog.ts")
  assert.match(catalog, /"DISPOSAL_PHOTO_TYPE": "disposalPhotoType"/)
  assert.match(catalog, /"DISPOSAL_LAST_PHOTO": "disposalLastPhoto"/)
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(read(`messages/${locale}.json`))
    assert.ok(messages.apiErrors.disposalPhotoType, `${locale} apiErrors.disposalPhotoType`)
    assert.ok(messages.apiErrors.disposalLastPhoto, `${locale} apiErrors.disposalLastPhoto`)
    assert.ok(messages.disposalPage.errors.DISPOSAL_PHOTO_TYPE, `${locale} disposalPage.errors.DISPOSAL_PHOTO_TYPE`)
    assert.ok(messages.disposalPage.errors.DISPOSAL_LAST_PHOTO, `${locale} disposalPage.errors.DISPOSAL_LAST_PHOTO`)
  }
})
