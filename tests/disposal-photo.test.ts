import assert from "node:assert/strict"
import test from "node:test"

import {
  disposalEvidenceAccept,
  disposalPhotoAccept,
  disposalPhotoMimeTypes,
  getDisposalLastFileBlock,
  getDisposalUploadTypeError,
  isDisposalPhotoFile,
  listDisposalPhotos,
  type DisposalPhotoDb,
} from "../src/lib/disposal-photo.ts"

type FakeAttachment = {
  id: string
  module: string
  referenceId: string
  originalName: string
  fileType: string
  uploadedAt: Date
  isActive: boolean
}

type FakeRequest = {
  id: string
  batchId: string | null
  requestStatus: string
  disposalType: string
  isActive: boolean
}

type FindManyAttachmentArgs = { where: { module: string; referenceId: { in: string[] }; isActive: boolean } }
type FindFirstRequestArgs = { where: { id: string; isActive: boolean } }
type FindManyRequestArgs = { where: { batchId: string; isActive: boolean; requestStatus: { in: string[] } } }

function fakeDb(attachments: FakeAttachment[], requests: FakeRequest[] = []) {
  const calls = { attachmentFindMany: [] as string[] }
  const db = {
    attachment: {
      async findMany(args: FindManyAttachmentArgs) {
        calls.attachmentFindMany.push(args.where.module)
        return attachments
          .filter((row) => row.isActive === args.where.isActive && row.module === args.where.module && args.where.referenceId.in.includes(row.referenceId))
          .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime())
          .map(({ id, module, referenceId, originalName, fileType, uploadedAt }) => ({ id, module, referenceId, originalName, fileType, uploadedAt }))
      },
    },
    disposalRequest: {
      async findFirst(args: FindFirstRequestArgs) {
        const row = requests.find((request) => request.id === args.where.id && request.isActive === args.where.isActive)
        return row ? { id: row.id, batchId: row.batchId, requestStatus: row.requestStatus, disposalType: row.disposalType } : null
      },
      async findMany(args: FindManyRequestArgs) {
        return requests
          .filter((request) => request.batchId === args.where.batchId && request.isActive === args.where.isActive && args.where.requestStatus.in.includes(request.requestStatus))
          .map(({ id, batchId, requestStatus, disposalType }) => ({ id, batchId, requestStatus, disposalType }))
      },
    },
  }
  return { db: db as unknown as DisposalPhotoDb, calls }
}

function at(hour: number, minute = 0) {
  return new Date(Date.UTC(2026, 10, 4, hour, minute))
}

function file(id: string, module: string, referenceId: string, fileType: string, uploadedAt = at(9), isActive = true): FakeAttachment {
  return { id, module, referenceId, originalName: `${id}.bin`, fileType, uploadedAt, isActive }
}

function request(id: string, overrides: Partial<FakeRequest> = {}): FakeRequest {
  return { id, batchId: null, requestStatus: "pending", disposalType: "scrap", isActive: true, ...overrides }
}

test("the accepted photo types and accept strings", () => {
  assert.deepEqual([...disposalPhotoMimeTypes], ["image/jpeg", "image/png", "image/webp"])
  assert.equal(disposalPhotoAccept, "image/jpeg,image/png,image/webp")
  assert.equal(disposalEvidenceAccept, "image/jpeg,image/png,image/webp,application/pdf")
})

test("isDisposalPhotoFile counts any image type as a photo", () => {
  assert.equal(isDisposalPhotoFile("image/jpeg"), true)
  assert.equal(isDisposalPhotoFile("image/heic"), true)
  assert.equal(isDisposalPhotoFile("image/gif"), true)
  assert.equal(isDisposalPhotoFile("application/pdf"), false)
  assert.equal(isDisposalPhotoFile(""), false)
  assert.equal(isDisposalPhotoFile(null), false)
  assert.equal(isDisposalPhotoFile(undefined), false)
})

test("getDisposalUploadTypeError refuses images outside JPG, PNG and WEBP only", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"]) {
    assert.equal(getDisposalUploadTypeError(type), null, type)
  }
  for (const type of ["image/heic", "image/heif", "image/gif", "image/avif"]) {
    assert.equal(getDisposalUploadTypeError(type), "DISPOSAL_PHOTO_TYPE", type)
  }
})

test("listDisposalPhotos returns each request's own images oldest first, then its batch's", async () => {
  const { db, calls } = fakeDb([
    file("a-pdf", "disposal", "A", "application/pdf", at(8)),
    file("a-late", "disposal", "A", "image/jpeg", at(10)),
    file("a-early", "disposal", "A", "image/png", at(9)),
    file("a-gone", "disposal", "A", "image/png", at(7), false),
    file("x-photo", "disposal_batch", "X", "image/webp", at(11)),
  ])

  const photos = await listDisposalPhotos(db, [
    { id: "A", batchId: null },
    { id: "B", batchId: "X" },
    { id: "C", batchId: null },
  ])

  assert.deepEqual(photos.get("A"), [
    { id: "a-early", originalName: "a-early.bin", fileType: "image/png", uploadedAt: at(9), source: "request" },
    { id: "a-late", originalName: "a-late.bin", fileType: "image/jpeg", uploadedAt: at(10), source: "request" },
  ])
  assert.deepEqual(photos.get("B"), [
    { id: "x-photo", originalName: "x-photo.bin", fileType: "image/webp", uploadedAt: at(11), source: "batch" },
  ])
  assert.deepEqual(photos.get("C"), [])
  assert.deepEqual(calls.attachmentFindMany.sort(), ["disposal", "disposal_batch"])
})

test("listDisposalPhotos with no owners answers an empty map without a query", async () => {
  const { db, calls } = fakeDb([])
  const photos = await listDisposalPhotos(db, [])
  assert.equal(photos.size, 0)
  assert.deepEqual(calls.attachmentFindMany, [])
})

function target(row: FakeAttachment) {
  return { id: row.id, module: row.module, referenceId: row.referenceId, fileType: row.fileType }
}

test("deleting the only image of a pending request is refused", async () => {
  const only = file("p1", "disposal", "R", "image/jpeg")
  const { db } = fakeDb([only], [request("R")])
  assert.equal(await getDisposalLastFileBlock(db, target(only)), "DISPOSAL_LAST_PHOTO")
})

test("deleting one of two images of a pending request is allowed", async () => {
  const first = file("p1", "disposal", "R", "image/jpeg")
  const { db } = fakeDb([first, file("p2", "disposal", "R", "image/png")], [request("R")])
  assert.equal(await getDisposalLastFileBlock(db, target(first)), null)
})

test("deleting a request's only image is allowed while its batch has an image", async () => {
  const only = file("p1", "disposal", "R", "image/jpeg")
  const { db } = fakeDb([only, file("b1", "disposal_batch", "X", "image/png")], [request("R", { batchId: "X" })])
  assert.equal(await getDisposalLastFileBlock(db, target(only)), null)
})

test("an approved request keeps its last image", async () => {
  const only = file("p1", "disposal", "R", "image/jpeg")
  const { db } = fakeDb([only], [request("R", { requestStatus: "approved" })])
  assert.equal(await getDisposalLastFileBlock(db, target(only)), "DISPOSAL_LAST_PHOTO")
})

test("a disposed or rejected request may lose its last image", async () => {
  for (const requestStatus of ["disposed", "rejected"]) {
    const only = file("p1", "disposal", "R", "image/jpeg")
    const { db } = fakeDb([only], [request("R", { requestStatus })])
    assert.equal(await getDisposalLastFileBlock(db, target(only)), null, requestStatus)
  }
})

test("a lost request counts every file, not only images", async () => {
  const pdf = file("d1", "disposal", "R", "application/pdf")
  const lostOnlyPdf = fakeDb([pdf], [request("R", { disposalType: "lost" })])
  assert.equal(await getDisposalLastFileBlock(lostOnlyPdf.db, target(pdf)), "DISPOSAL_LAST_PHOTO")

  const image = file("p1", "disposal", "R", "image/jpeg")
  const lostPdfAndImage = fakeDb([pdf, image], [request("R", { disposalType: "lost" })])
  assert.equal(await getDisposalLastFileBlock(lostPdfAndImage.db, target(image)), null)
})

test("deleting a PDF from a pending request that is not lost is allowed", async () => {
  const pdf = file("d1", "disposal", "R", "application/pdf")
  const { db } = fakeDb([pdf, file("p1", "disposal", "R", "image/jpeg")], [request("R")])
  assert.equal(await getDisposalLastFileBlock(db, target(pdf)), null)

  const pdfOnly = fakeDb([pdf], [request("R")])
  assert.equal(await getDisposalLastFileBlock(pdfOnly.db, target(pdf)), null)
})

test("deleting a batch's only image is refused while a pending child has no image of its own", async () => {
  const batchPhoto = file("b1", "disposal_batch", "X", "image/png")
  const { db } = fakeDb(
    [batchPhoto, file("p1", "disposal", "R1", "image/jpeg")],
    [request("R1", { batchId: "X" }), request("R2", { batchId: "X" })]
  )
  assert.equal(await getDisposalLastFileBlock(db, target(batchPhoto)), "DISPOSAL_LAST_PHOTO")
})

test("deleting a batch's only image is allowed when every child has its own image", async () => {
  const batchPhoto = file("b1", "disposal_batch", "X", "image/png")
  const { db } = fakeDb(
    [batchPhoto, file("p1", "disposal", "R1", "image/jpeg"), file("p2", "disposal", "R2", "image/webp")],
    [request("R1", { batchId: "X" }), request("R2", { batchId: "X" }), request("R3", { batchId: "X", requestStatus: "disposed" })]
  )
  assert.equal(await getDisposalLastFileBlock(db, target(batchPhoto)), null)
})

test("any other module is never blocked", async () => {
  const assetPhoto = file("a1", "asset", "R", "image/jpeg")
  const { db } = fakeDb([assetPhoto], [request("R")])
  assert.equal(await getDisposalLastFileBlock(db, target(assetPhoto)), null)
})
