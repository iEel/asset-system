import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { archiveDestinationPreview, type StorageGovernanceDryRunAction } from "../src/lib/storage-governance.ts"
import {
  STORAGE_MODULE_KEYS,
  STORAGE_ROWS_PREVIEW,
  buildStorageRows,
  filterStorageRows,
  parseStorageFilter,
  storageModuleLabelKey,
  type AssetRef,
  type StorageRefs,
} from "../src/lib/storage-page-model.ts"

// Page group 12 plan 3 task 3 (spec §8, §15 item 10): the storage page model.

const now = new Date("2026-11-09T03:00:00.000Z")

function emptyRefs(): StorageRefs {
  return { assetByPath: new Map(), batchByPath: new Map() }
}

function missing(filePath: string, module = "asset", expectedSizeBytes = 100): StorageGovernanceDryRunAction {
  return { action: "review_missing_db_file", filePath, module, expectedSizeBytes }
}

function orphan(relativePath: string, sizeBytes = 50): StorageGovernanceDryRunAction {
  return { action: "archive_orphan_file", relativePath, sizeBytes }
}

test("missing rows come first", () => {
  const rows = buildStorageRows(
    [orphan("b/z.jpg"), missing("uploads/b.jpg"), orphan("a/y.jpg"), missing("uploads/a.jpg")],
    emptyRefs(),
    now
  )
  assert.deepEqual(
    rows.map((row) => `${row.kind}:${row.kind === "missing" ? row.filePath : row.relativePath}`),
    ["missing:uploads/a.jpg", "missing:uploads/b.jpg", "orphan:a/y.jpg", "orphan:b/z.jpg"]
  )
  const first = rows[2]
  assert.equal(first.kind, "orphan")
  if (first.kind === "orphan") {
    assert.equal(first.sizeBytes, 50)
    assert.equal(first.destination, ".archive/2026-11-09/a/y.jpg")
  }
})

test("filter and show-all", () => {
  const actions = Array.from({ length: 12 }, (_, index) => orphan(`f/${String(index).padStart(2, "0")}.jpg`))
  const rows = buildStorageRows([...actions, missing("uploads/m.jpg")], emptyRefs(), now)

  const orphans = filterStorageRows(rows, "orphan", false)
  assert.equal(STORAGE_ROWS_PREVIEW, 8)
  assert.equal(orphans.rows.length, 8)
  assert.equal(orphans.total, 12)
  assert.equal(orphans.hidden, 4)

  const allOrphans = filterStorageRows(rows, "orphan", true)
  assert.equal(allOrphans.rows.length, 12)
  assert.equal(allOrphans.hidden, 0)

  const missingOnly = filterStorageRows(rows, "missing", false)
  assert.equal(missingOnly.rows.length, 1)
  assert.equal(missingOnly.total, 1)
  assert.equal(missingOnly.hidden, 0)

  const everything = filterStorageRows(rows, "all", false)
  assert.equal(everything.total, 13)
  assert.equal(everything.rows[0].kind, "missing")
  assert.equal(everything.hidden, 5)

  assert.equal(parseStorageFilter("missing"), "missing")
  assert.equal(parseStorageFilter(["orphan", "missing"]), "orphan")
  assert.equal(parseStorageFilter("nope"), "all")
  assert.equal(parseStorageFilter(undefined), "all")
})

test("clean storage has no rows and no show-all", () => {
  const rows = buildStorageRows([], emptyRefs(), now)
  assert.deepEqual(rows, [])
  for (const filter of ["all", "missing", "orphan"] as const) {
    assert.deepEqual(filterStorageRows(rows, filter, false), { rows: [], total: 0, hidden: 0 })
  }
})

test("unknown or missing asset resolves to null", () => {
  const asset: AssetRef = { id: "asset-1", name: "Notebook", assetTag: "NB-001" }
  const refs: StorageRefs = {
    assetByPath: new Map<string, AssetRef | null>([
      ["uploads/known.jpg", asset],
      ["uploads/gone.jpg", null],
    ]),
    batchByPath: new Map(),
  }
  const rows = buildStorageRows(
    [missing("uploads/known.jpg"), missing("uploads/gone.jpg", "maintenance"), missing("uploads/other.jpg", "asset_model")],
    refs,
    now
  )
  const byPath = new Map(rows.map((row) => [row.kind === "missing" ? row.filePath : row.relativePath, row]))
  const known = byPath.get("uploads/known.jpg")
  assert.ok(known && known.kind === "missing")
  assert.deepEqual(known.asset, asset)
  assert.equal(known.batch, null)
  assert.equal(known.module, "asset")
  assert.equal(known.expectedSizeBytes, 100)
  for (const path of ["uploads/gone.jpg", "uploads/other.jpg"]) {
    const row = byPath.get(path)
    assert.ok(row && row.kind === "missing")
    assert.equal(row.asset, null)
    assert.equal(row.batch, null)
  }
})

test("disposal batch shows the batch, not an asset", () => {
  const refs: StorageRefs = {
    assetByPath: new Map<string, AssetRef | null>([["uploads/batch.pdf", { id: "a", name: "x", assetTag: "X" }]]),
    batchByPath: new Map([["uploads/batch.pdf", { id: "batch-1", number: "DPB-2026-0001" }]]),
  }
  const [row] = buildStorageRows([missing("uploads/batch.pdf", "disposal_batch")], refs, now)
  assert.equal(row.kind, "missing")
  if (row.kind === "missing") {
    assert.deepEqual(row.batch, { id: "batch-1", number: "DPB-2026-0001" })
    assert.equal(row.asset, null)
  }

  const [unresolved] = buildStorageRows([missing("uploads/lost.pdf", "disposal_batch")], refs, now)
  assert.ok(unresolved.kind === "missing")
  assert.equal(unresolved.batch, null)
  assert.equal(unresolved.asset, null)
})

test("every module key has a Thai label", () => {
  const th = JSON.parse(readFileSync(new URL("../messages/th.json", import.meta.url), "utf8")) as {
    storagePage: Record<string, string>
  }
  const en = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf8")) as {
    storagePage: Record<string, string>
  }
  const expected = [
    "asset",
    "maintenance",
    "audit_finding",
    "disposal",
    "disposal_batch",
    "asset_model",
    "purchase_document",
    "asset_purchase",
    "checkout_photo_before",
    "checkout_receiver_signature",
    "checkin_photo_after",
    "checkin_return_signature",
    "checkin_receive_signature",
    "asset_component_install",
    "asset_component_remove",
  ]
  for (const module of expected) assert.ok(STORAGE_MODULE_KEYS.includes(module), `missing module ${module}`)
  for (const module of STORAGE_MODULE_KEYS) {
    const key = storageModuleLabelKey(module)
    assert.ok(key, `no label key for ${module}`)
    assert.ok(th.storagePage[key]?.trim(), `no Thai label storagePage.${key}`)
    assert.ok(en.storagePage[key]?.trim(), `no English label storagePage.${key}`)
  }
  assert.equal(storageModuleLabelKey("asset"), "moduleAsset")
  assert.equal(storageModuleLabelKey("something_new"), null)
})

test("archive destination keeps the date folder rule", () => {
  assert.equal(archiveDestinationPreview("assets/2026/photo.jpg", now), ".archive/2026-11-09/assets/2026/photo.jpg")
  assert.equal(archiveDestinationPreview("assets\\2026\\scan.pdf", now), ".archive/2026-11-09/assets/2026/scan.pdf")
  assert.equal(archiveDestinationPreview("top.png", new Date("2026-01-31T23:59:59.000Z")), ".archive/2026-01-31/top.png")
  assert.throws(() => archiveDestinationPreview("../escape.jpg", now))
})
