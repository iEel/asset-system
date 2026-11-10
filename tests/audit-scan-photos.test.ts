import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

import type { AssetPhotoPreviewDb } from "../src/lib/asset-photo-preview.ts"

// The scan page's photo (audit photos spec §3, plan 1 task 3): the asset's own newest photo, else its model's newest
// photo (fromModel), else none; only the thumbnail route's image types; id lists in chunks of 2,000; and no read for a
// photo the viewer may not see. The reader imports hasAttachmentPermission, whose file imports the db and the auth
// helpers, so both are mocked here as tests/model-photo-access.test.ts does.

const mockedModuleSources = new Map<string, string>([
  ["@/lib/auth-utils", `
    export function hasPermission(user, module, action) {
      if (user.roles.includes("system_admin")) return true
      return user.permissions.includes(module + ":" + action)
    }
  `],
  ["@/lib/db", `
    export const prisma = {}
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

type User = { id: string; name: string; roles: string[]; permissions: string[]; employeeId: string | null }
type AuditScanPhoto = { attachmentId: string; fromModel: boolean }
type AuditScanPhotoAccess = { assetPhotos: boolean; modelPhotos: boolean }
type ScanPhotos = {
  auditScanPhotoAccess(user: User): AuditScanPhotoAccess
  chooseAuditScanPhoto(own: string | null | undefined, model: string | null | undefined, access: AuditScanPhotoAccess): AuditScanPhoto | null
  readAuditScanPhotos(
    db: AssetPhotoPreviewDb,
    assets: readonly { id: string; modelId: string | null }[],
    access: AuditScanPhotoAccess,
  ): Promise<Map<string, AuditScanPhoto>>
}
const { auditScanPhotoAccess, chooseAuditScanPhoto, readAuditScanPhotos } = await import(
  pathToFileURL("src/lib/audit-scan-photos.ts").href
) as ScanPhotos

const both: AuditScanPhotoAccess = { assetPhotos: true, modelPhotos: true }
const THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]

type Args = {
  where: { module: string; referenceId?: { in: string[] }; assetId?: { in: string[] }; fileType?: { in: string[] } } & Record<string, unknown>
  select: unknown
  orderBy: unknown
}
type Row = { id: string; referenceId: string; assetId: string | null }

function fakeDb(rows: { model?: Row[]; asset?: Row[] } = {}) {
  const calls: Args[] = []
  const db: AssetPhotoPreviewDb = {
    attachment: {
      // Rows are given newest first, as the orderBy answers.
      async findMany(args: Args) {
        calls.push(args)
        if (args.where.module === "asset_model") return (rows.model ?? []).filter((row) => args.where.referenceId?.in.includes(row.referenceId))
        return (rows.asset ?? []).filter((row) => row.assetId && args.where.assetId?.in.includes(row.assetId))
      },
    },
  }
  return { db, calls }
}
const assetRow = (id: string, assetId: string): Row => ({ id, referenceId: assetId, assetId })
const modelRow = (id: string, modelId: string): Row => ({ id, referenceId: modelId, assetId: null })

test("chooseAuditScanPhoto: the asset's own photo wins, the model's is the fallback, marked fromModel", () => {
  assert.deepEqual(chooseAuditScanPhoto("own-1", "model-1", both), { attachmentId: "own-1", fromModel: false })
  assert.deepEqual(chooseAuditScanPhoto(null, "model-1", both), { attachmentId: "model-1", fromModel: true })
  assert.deepEqual(chooseAuditScanPhoto(undefined, "model-1", both), { attachmentId: "model-1", fromModel: true })
  assert.deepEqual(chooseAuditScanPhoto("own-1", null, both), { attachmentId: "own-1", fromModel: false })
  assert.equal(chooseAuditScanPhoto(null, null, both), null)
  assert.equal(chooseAuditScanPhoto(undefined, undefined, both), null)
})

test("chooseAuditScanPhoto: without asset:view the own photo is skipped; without either view there is no photo", () => {
  const modelOnly = { assetPhotos: false, modelPhotos: true }
  assert.deepEqual(chooseAuditScanPhoto("own-1", "model-1", modelOnly), { attachmentId: "model-1", fromModel: true })
  assert.equal(chooseAuditScanPhoto("own-1", null, modelOnly), null)
  const assetOnly = { assetPhotos: true, modelPhotos: false }
  assert.equal(chooseAuditScanPhoto(null, "model-1", assetOnly), null)
  const none = { assetPhotos: false, modelPhotos: false }
  assert.equal(chooseAuditScanPhoto("own-1", "model-1", none), null)
})

test("auditScanPhotoAccess: asset:view opens both, brand:view only the model photo, neither opens none", () => {
  const user = (...permissions: string[]): User => ({ id: "u", name: "T", roles: [], permissions, employeeId: null })
  assert.deepEqual(auditScanPhotoAccess(user("asset:view")), { assetPhotos: true, modelPhotos: true })
  assert.deepEqual(auditScanPhotoAccess(user("brand:view")), { assetPhotos: false, modelPhotos: true })
  assert.deepEqual(auditScanPhotoAccess(user("audit:view")), { assetPhotos: false, modelPhotos: false })
})

test("readAuditScanPhotos reads only the thumbnail route's image types, newest first", async () => {
  const { db, calls } = fakeDb()
  await readAuditScanPhotos(db, [{ id: "a1", modelId: "m1" }], both)
  assert.equal(calls.length, 2)
  for (const call of calls) {
    assert.deepEqual(call.where.fileType, { in: THUMBNAIL_TYPES })
    assert.equal(call.where.isActive, true)
    assert.deepEqual(call.orderBy, [{ uploadedAt: "desc" }, { id: "desc" }])
  }
  assert.deepEqual(calls[0].where.module, "asset")
  assert.deepEqual(calls[0].where.assetId, { in: ["a1"] })
  assert.deepEqual(calls[1].where.module, "asset_model")
  assert.deepEqual(calls[1].where.referenceId, { in: ["m1"] })
})

test("readAuditScanPhotos reads the model photo only for assets without their own photo", async () => {
  const { db, calls } = fakeDb({
    asset: [assetRow("own-a1-new", "a1"), assetRow("own-a1-old", "a1")],
    model: [modelRow("m1-new", "m1"), modelRow("m1-old", "m1"), modelRow("m2-new", "m2"), modelRow("m3-new", "m3")],
  })
  const photos = await readAuditScanPhotos(
    db,
    [{ id: "a1", modelId: "m1" }, { id: "a2", modelId: "m2" }, { id: "a3", modelId: null }, { id: "a4", modelId: "m2" }],
    both,
  )
  const modelCalls = calls.filter((call) => call.where.module === "asset_model")
  assert.equal(modelCalls.length, 1)
  assert.deepEqual(modelCalls[0].where.referenceId, { in: ["m2"] }, "a1 has its own photo, a3 has no model")
  assert.deepEqual([...photos.entries()], [
    ["a1", { attachmentId: "own-a1-new", fromModel: false }],
    ["a2", { attachmentId: "m2-new", fromModel: true }],
    ["a4", { attachmentId: "m2-new", fromModel: true }],
  ])
})

test("readAuditScanPhotos chunks the own-photo read at 2,000 ids", async () => {
  const { db, calls } = fakeDb()
  const assets = Array.from({ length: 4100 }, (_, index) => ({ id: `a${index}`, modelId: null }))
  await readAuditScanPhotos(db, assets, both)
  const assetCalls = calls.filter((call) => call.where.module === "asset")
  assert.deepEqual(assetCalls.map((call) => call.where.assetId?.in.length), [2000, 2000, 100])
  assert.equal(calls.filter((call) => call.where.module === "asset_model").length, 0, "no model ids, no model read")
})

test("readAuditScanPhotos chunks the model-photo read at 2,000 ids", async () => {
  const { db, calls } = fakeDb()
  const assets = Array.from({ length: 2001 }, (_, index) => ({ id: `a${index}`, modelId: `m${index}` }))
  await readAuditScanPhotos(db, assets, { assetPhotos: false, modelPhotos: true })
  assert.deepEqual(calls.map((call) => call.where.referenceId?.in.length), [2000, 1])
})

test("readAuditScanPhotos makes no read for photos the viewer may not see", async () => {
  const modelOnly = fakeDb({ asset: [assetRow("own-a1", "a1")], model: [modelRow("m1-new", "m1")] })
  const photos = await readAuditScanPhotos(modelOnly.db, [{ id: "a1", modelId: "m1" }], { assetPhotos: false, modelPhotos: true })
  assert.equal(modelOnly.calls.filter((call) => call.where.module === "asset").length, 0)
  assert.deepEqual(modelOnly.calls.map((call) => call.where.referenceId), [{ in: ["m1"] }], "without asset photos every asset needs the model read")
  assert.deepEqual([...photos.entries()], [["a1", { attachmentId: "m1-new", fromModel: true }]])

  const assetOnly = fakeDb({ model: [modelRow("m1-new", "m1")] })
  const none = await readAuditScanPhotos(assetOnly.db, [{ id: "a1", modelId: "m1" }], { assetPhotos: true, modelPhotos: false })
  assert.equal(assetOnly.calls.filter((call) => call.where.module === "asset_model").length, 0)
  assert.equal(none.size, 0)

  const neither = fakeDb({ asset: [assetRow("own-a1", "a1")] })
  const empty = await readAuditScanPhotos(neither.db, [{ id: "a1", modelId: "m1" }], { assetPhotos: false, modelPhotos: false })
  assert.equal(neither.calls.length, 0)
  assert.equal(empty.size, 0)
})

test("readAuditScanPhotos: no assets, no read", async () => {
  const { db, calls } = fakeDb()
  assert.equal((await readAuditScanPhotos(db, [], both)).size, 0)
  assert.equal(calls.length, 0)
})
