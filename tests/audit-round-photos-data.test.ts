import assert from "node:assert/strict"
import test from "node:test"

import { loadAuditRoundPhotos, type AuditRoundPhotoDb } from "../src/lib/audit-round-photos-data.ts"

// The loader of round photos (audit photos spec §2, plan 2 task 1): every photo of the assets, newest first, each with
// the round assignAuditRoundPhotos gives it (null when none).

type Where = Record<string, unknown> & { assetId: { in: string[] } }
type Args = { where: Where; select: unknown; orderBy?: unknown }
type PhotoRow = { id: string; assetId: string; originalName: string; uploadedAt: Date }
type LinkRow = { auditRoundId: string; assetId: string; photoEvidence: string | null }
type ScanRow = { auditRoundId: string; assetId: string; scannedAt: Date }

function fakeDb(rows: { photos?: PhotoRow[]; links?: LinkRow[]; scans?: ScanRow[] }) {
  const calls: { table: string; args: Args }[] = []
  const db: AuditRoundPhotoDb = {
    attachment: {
      async findMany(args: Args) {
        calls.push({ table: "attachment", args })
        return (rows.photos ?? []).filter((row) => args.where.assetId.in.includes(row.assetId))
      },
    },
    auditItem: {
      async findMany(args: Args) {
        calls.push({ table: "auditItem", args })
        return (rows.links ?? []).filter((row) => args.where.assetId.in.includes(row.assetId))
      },
    },
    auditScanHistory: {
      async findMany(args: Args) {
        calls.push({ table: "auditScanHistory", args })
        return (rows.scans ?? []).filter((row) => args.where.assetId.in.includes(row.assetId))
      },
    },
  }
  return { db, calls }
}

const at = (iso: string) => new Date(iso)

test("loadAuditRoundPhotos maps a linked photo and a timed photo, and leaves an unmatched photo with no round", async () => {
  const { db, calls } = fakeDb({
    photos: [
      { id: "p-linked", assetId: "a1", originalName: "linked.jpg", uploadedAt: at("2026-11-01T08:00:00Z") },
      { id: "p-timed", assetId: "a1", originalName: "timed.jpg", uploadedAt: at("2026-11-05T09:10:00Z") },
      { id: "p-none", assetId: "a2", originalName: "none.jpg", uploadedAt: at("2026-11-03T12:00:00Z") },
    ],
    links: [{ auditRoundId: "r-link", assetId: "a1", photoEvidence: JSON.stringify(["p-linked"]) }],
    scans: [{ auditRoundId: "r-scan", assetId: "a1", scannedAt: at("2026-11-05T09:00:00Z") }],
  })
  const photos = await loadAuditRoundPhotos(db, ["a1", "a2"])
  assert.deepEqual(photos, [
    { id: "p-timed", assetId: "a1", originalName: "timed.jpg", uploadedAt: at("2026-11-05T09:10:00Z"), auditRoundId: "r-scan" },
    { id: "p-none", assetId: "a2", originalName: "none.jpg", uploadedAt: at("2026-11-03T12:00:00Z"), auditRoundId: null },
    { id: "p-linked", assetId: "a1", originalName: "linked.jpg", uploadedAt: at("2026-11-01T08:00:00Z"), auditRoundId: "r-link" },
  ])
  assert.deepEqual(calls.map((call) => call.table), ["attachment", "auditItem", "auditScanHistory"])
  const items = calls[1].args
  assert.deepEqual(items.where, { assetId: { in: ["a1", "a2"] }, photoEvidence: { not: null } })
  assert.deepEqual(items.select, { auditRoundId: true, assetId: true, photoEvidence: true })
  const scans = calls[2].args
  // No uploadedFrom: from the oldest photo, minus 30 minutes.
  assert.deepEqual(scans.where, { assetId: { in: ["a1", "a2"] }, scannedAt: { gte: at("2026-11-01T07:30:00Z") } })
  assert.deepEqual(scans.select, { auditRoundId: true, assetId: true, scannedAt: true })
})

test("loadAuditRoundPhotos reads only the thumbnail types of module asset, active", async () => {
  const { db, calls } = fakeDb({})
  await loadAuditRoundPhotos(db, ["a1"])
  const photoRead = calls[0]
  assert.equal(photoRead.table, "attachment")
  assert.deepEqual(photoRead.args.where, {
    assetId: { in: ["a1"] },
    module: "asset",
    isActive: true,
    fileType: { in: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] },
  })
  assert.deepEqual(photoRead.args.select, { id: true, assetId: true, originalName: true, uploadedAt: true })
  // No photos: no scan read.
  assert.deepEqual(calls.map((call) => call.table), ["attachment", "auditItem"])
})

test("loadAuditRoundPhotos chunks every id list at 2,000", async () => {
  const assetIds = Array.from({ length: 2500 }, (_, index) => `a${index}`)
  const { db, calls } = fakeDb({
    photos: [
      { id: "p-first", assetId: "a0", originalName: "first.jpg", uploadedAt: at("2026-11-01T08:00:00Z") },
      { id: "p-last", assetId: "a2499", originalName: "last.jpg", uploadedAt: at("2026-11-02T08:00:00Z") },
    ],
  })
  const photos = await loadAuditRoundPhotos(db, assetIds)
  for (const table of ["attachment", "auditItem", "auditScanHistory"]) {
    const reads = calls.filter((call) => call.table === table)
    assert.deepEqual(reads.map((call) => call.args.where.assetId.in.length), [2000, 500], table)
  }
  assert.deepEqual(photos.map((photo) => photo.id), ["p-last", "p-first"], "newest first across chunks")
})

test("loadAuditRoundPhotos with uploadedFrom reads scans from 30 minutes before it", async () => {
  const uploadedFrom = at("2026-11-04T00:00:00Z")
  const { db, calls } = fakeDb({
    photos: [{ id: "p1", assetId: "a1", originalName: "p1.jpg", uploadedAt: at("2026-11-04T00:10:00Z") }],
    scans: [{ auditRoundId: "r1", assetId: "a1", scannedAt: at("2026-11-03T23:50:00Z") }],
  })
  const photos = await loadAuditRoundPhotos(db, ["a1"], { uploadedFrom })
  assert.deepEqual(calls[0].args.where.uploadedAt, { gte: uploadedFrom })
  assert.deepEqual(calls[2].args.where.scannedAt, { gte: at("2026-11-03T23:30:00Z") })
  assert.equal(photos[0].auditRoundId, "r1")
})

test("loadAuditRoundPhotos with no asset ids reads nothing", async () => {
  const { db, calls } = fakeDb({})
  assert.deepEqual(await loadAuditRoundPhotos(db, []), [])
  assert.deepEqual(calls, [])
})

test("loadAuditRoundPhotos orders equal upload times by id desc", async () => {
  const same = at("2026-11-01T08:00:00Z")
  const { db } = fakeDb({
    photos: [
      { id: "p-a", assetId: "a1", originalName: "a.jpg", uploadedAt: same },
      { id: "p-b", assetId: "a1", originalName: "b.jpg", uploadedAt: same },
    ],
  })
  const photos = await loadAuditRoundPhotos(db, ["a1"])
  assert.deepEqual(photos.map((photo) => photo.id), ["p-b", "p-a"])
})
