import assert from "node:assert/strict"
import test from "node:test"

import {
  AUDIT_PHOTO_EVIDENCE_MAX_IDS,
  AUDIT_PHOTO_WINDOW_MINUTES,
  appendPhotoEvidence,
  assignAuditRoundPhotos,
  parsePhotoEvidence,
} from "../src/lib/audit-round-photos-rules.ts"

// Audit photos (spec 2026-11-10-audit-photos-design §2): which audit round a photo belongs to, and the format of the
// audit_items.photoEvidence link.

const MIN = 60_000
const T0 = new Date("2026-11-10T09:00:00.000Z")
const at = (ms: number) => new Date(T0.getTime() + ms)
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

test("constants", () => {
  assert.equal(AUDIT_PHOTO_WINDOW_MINUTES, 30)
  assert.equal(AUDIT_PHOTO_EVIDENCE_MAX_IDS, 12)
})

test("parsePhotoEvidence reads a JSON array of ids and nothing else", () => {
  assert.deepEqual(parsePhotoEvidence('["a","b"]'), ["a", "b"])
  assert.deepEqual(parsePhotoEvidence(null), [])
  assert.deepEqual(parsePhotoEvidence(undefined), [])
  assert.deepEqual(parsePhotoEvidence(""), [])
  assert.deepEqual(parsePhotoEvidence("x"), [])
  assert.deepEqual(parsePhotoEvidence('{"a":1}'), [])
  assert.deepEqual(parsePhotoEvidence('["a",3]'), ["a"])
})

test("appendPhotoEvidence adds new ids once, up to 12, never past 500 characters", () => {
  assert.deepEqual(appendPhotoEvidence(null, ["a"]), { value: '["a"]', linked: ["a"] })
  assert.deepEqual(appendPhotoEvidence('["a"]', ["a", "b"]), { value: '["a","b"]', linked: ["b"] })

  const twelve = Array.from({ length: 12 }, (_, i) => uuid(i + 1))
  const full = appendPhotoEvidence(null, twelve)
  assert.deepEqual(full.linked, twelve)
  assert.equal(full.value?.length, 12 * 36 + 12 * 2 + 11 + 2)
  assert.ok((full.value?.length ?? 0) <= 500)

  const more = appendPhotoEvidence(full.value, [uuid(13)])
  assert.deepEqual(more.linked, [])
  assert.equal(more.value, full.value)
})

test("assignAuditRoundPhotos: the link wins over the time rule", () => {
  const result = assignAuditRoundPhotos({
    photos: [{ id: "p1", assetId: "A", uploadedAt: T0 }],
    links: [{ auditRoundId: "R1", assetId: "A", photoEvidence: '["p1"]' }],
    scans: [{ auditRoundId: "R2", assetId: "A", scannedAt: at(-1 * MIN) }],
  })
  assert.equal(result.get("p1"), "R1")
})

test("assignAuditRoundPhotos: the time window is [scan, scan + 30 min)", () => {
  const result = assignAuditRoundPhotos({
    photos: [
      { id: "zero", assetId: "A", uploadedAt: at(0) },
      { id: "almost", assetId: "A", uploadedAt: at(29 * MIN + 59_000) },
      { id: "thirty", assetId: "A", uploadedAt: at(30 * MIN) },
      { id: "before", assetId: "A", uploadedAt: at(-1000) },
    ],
    links: [],
    scans: [{ auditRoundId: "R1", assetId: "A", scannedAt: T0 }],
  })
  assert.equal(result.get("zero"), "R1")
  assert.equal(result.get("almost"), "R1")
  assert.equal(result.has("thirty"), false)
  assert.equal(result.has("before"), false)
})

test("assignAuditRoundPhotos: the latest matching scan wins", () => {
  const result = assignAuditRoundPhotos({
    photos: [{ id: "p1", assetId: "A", uploadedAt: T0 }],
    links: [],
    scans: [
      { auditRoundId: "R2", assetId: "A", scannedAt: at(-5 * MIN) },
      { auditRoundId: "R1", assetId: "A", scannedAt: at(-20 * MIN) },
    ],
  })
  assert.equal(result.get("p1"), "R2")
})

test("assignAuditRoundPhotos: another asset's scan or link never assigns", () => {
  const result = assignAuditRoundPhotos({
    photos: [{ id: "p1", assetId: "A", uploadedAt: T0 }],
    links: [{ auditRoundId: "R1", assetId: "B", photoEvidence: '["p1"]' }],
    scans: [
      { auditRoundId: "R1", assetId: "B", scannedAt: at(-20 * MIN) },
      { auditRoundId: "R2", assetId: "B", scannedAt: at(-5 * MIN) },
    ],
  })
  assert.equal(result.has("p1"), false)
  assert.equal(result.size, 0)
})
