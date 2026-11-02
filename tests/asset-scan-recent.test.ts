import assert from "node:assert/strict"
import test from "node:test"
import { addAssetScanRecent, assetScanRecentKey, readAssetScanRecent, writeAssetScanRecent } from "../src/lib/asset-scan-recent.ts"

const item = (n: number) => ({ id: `id-${n}`, assetTag: `NB-${n}`, name: `Notebook ${n}` })
const storageWith = (raw: string | null) => ({ getItem: () => raw })

test("the key is per user and locale (group 4 plan 4)", () => {
  assert.equal(assetScanRecentKey("user-1", "th"), "asset-scan-recent:v1:user-1:th")
  assert.equal(assetScanRecentKey("user-1", "en"), "asset-scan-recent:v1:user-1:en")
})

test("a stored list that is not valid reads as a valid list of at most ten, never an error (Review Focus 5)", () => {
  const key = assetScanRecentKey("u", "th")
  assert.deepEqual(readAssetScanRecent(null, key), [])
  assert.deepEqual(readAssetScanRecent(storageWith(null), key), [])
  assert.deepEqual(readAssetScanRecent(storageWith("{"), key), [])
  assert.deepEqual(readAssetScanRecent(storageWith('{"id":"x"}'), key), [])
  assert.deepEqual(readAssetScanRecent(storageWith('"text"'), key), [])
  const throwing = {
    getItem: () => {
      throw new Error("blocked")
    },
  }
  assert.deepEqual(readAssetScanRecent(throwing, key), [])

  const fifteen = Array.from({ length: 15 }, (_, index) => item(index + 1))
  const read = readAssetScanRecent(storageWith(JSON.stringify(fifteen)), key)
  assert.equal(read.length, 10)
  assert.deepEqual(read.map((entry) => entry.id), fifteen.slice(0, 10).map((entry) => entry.id))
})

test("junk entries are dropped and extra fields are not kept", () => {
  const raw = JSON.stringify([
    null,
    "id-0",
    { id: "", assetTag: "NB-0", name: "x" },
    { id: "id-1", assetTag: 5, name: "x" },
    { id: "id-2", assetTag: "NB-2" },
    { ...item(3), statusName: "Ready", href: "https://evil.example" },
    item(4),
    item(3),
  ])
  assert.deepEqual(readAssetScanRecent(storageWith(raw), "k"), [item(3), item(4)])
})

test("adding puts the item first, moves an existing id to the front and keeps ten", () => {
  const list = [1, 2, 3].map(item)
  assert.deepEqual(addAssetScanRecent(list, item(2)).map((entry) => entry.id), ["id-2", "id-1", "id-3"])
  const renamed = { ...item(3), name: "Renamed" }
  assert.deepEqual(addAssetScanRecent(list, renamed)[0], renamed)
  assert.equal(addAssetScanRecent(list, renamed).length, 3)
  const ten = Array.from({ length: 10 }, (_, index) => item(index + 1))
  const added = addAssetScanRecent(ten, item(11))
  assert.equal(added.length, 10)
  assert.equal(added[0].id, "id-11")
  assert.equal(added.at(-1)?.id, "id-9")
})

test("writing saves the list, removes the key when empty and never throws", () => {
  const saved = new Map<string, string>()
  const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => void saved.set(key, value),
    removeItem: (key: string) => void saved.delete(key),
  }
  const key = assetScanRecentKey("u", "th")
  writeAssetScanRecent(storage, key, [item(1), item(2)])
  assert.deepEqual(readAssetScanRecent(storage, key), [item(1), item(2)])
  writeAssetScanRecent(storage, key, [])
  assert.equal(saved.has(key), false)

  const full = {
    setItem: () => {
      throw new Error("QuotaExceededError")
    },
    removeItem: () => {
      throw new Error("blocked")
    },
  }
  assert.doesNotThrow(() => writeAssetScanRecent(full, key, [item(1)]))
  assert.doesNotThrow(() => writeAssetScanRecent(full, key, []))
  assert.doesNotThrow(() => writeAssetScanRecent(null, key, [item(1)]))
})
