import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { mkdtemp, mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  archiveOrphanUploadFile,
  assertStorageRelativePath,
  buildStorageGovernanceDryRun,
  getStoragePathVariants,
  scanUploadDirectory,
  summarizeStorageGovernance,
} from "../src/lib/storage-governance.ts"

test("summarizes active attachment storage by module and flags governance risks", () => {
  const summary = summarizeStorageGovernance(
    [
      { module: "asset", filePath: "uploads/a.jpg", fileSize: 2_000, isActive: true },
      { module: "asset", filePath: "uploads/b.jpg", fileSize: 12_000, isActive: true },
      { module: "maintenance", filePath: "uploads/a.jpg", fileSize: 3_000, isActive: true },
      { module: "audit_finding", filePath: "", fileSize: 1_000, isActive: true },
      { module: "asset", filePath: "uploads/old.jpg", fileSize: 50_000, isActive: false },
    ],
    { largeFileThresholdBytes: 10_000 }
  )

  assert.equal(summary.activeFiles, 4)
  assert.equal(summary.totalBytes, 18_000)
  assert.equal(summary.largeFileCount, 1)
  assert.equal(summary.missingPathCount, 1)
  assert.equal(summary.duplicatePathCount, 2)
  assert.deepEqual(summary.byModule, [
    { module: "asset", count: 2, totalBytes: 14_000 },
    { module: "maintenance", count: 1, totalBytes: 3_000 },
    { module: "audit_finding", count: 1, totalBytes: 1_000 },
  ])
})

test("builds dry-run storage governance actions from database and filesystem differences", () => {
  const dryRun = buildStorageGovernanceDryRun({
    attachments: [
      { module: "asset", filePath: "uploads/a.jpg", fileSize: 2_000, isActive: true },
      { module: "maintenance", filePath: "uploads/missing.pdf", fileSize: 5_000, isActive: true },
      { module: "asset", filePath: "uploads/inactive.jpg", fileSize: 1_000, isActive: false },
    ],
    files: [
      { relativePath: "uploads/a.jpg", sizeBytes: 2_000 },
      { relativePath: "uploads/orphan.tmp", sizeBytes: 99 },
      { relativePath: "uploads/inactive.jpg", sizeBytes: 1_000 },
    ],
  })

  assert.equal(dryRun.matchedFiles.length, 1)
  assert.deepEqual(dryRun.missingFiles.map((item) => item.filePath), ["uploads/missing.pdf"])
  assert.deepEqual(dryRun.orphanFiles.map((item) => item.relativePath), ["uploads/orphan.tmp", "uploads/inactive.jpg"])
  assert.deepEqual(dryRun.actions.map((item) => item.action), ["review_missing_db_file", "archive_orphan_file", "archive_orphan_file"])
})

test("matches active absolute attachment paths under the upload root to scanned relative files", () => {
  const uploadRoot = path.join(os.tmpdir(), "asset-storage-root")
  const dryRun = buildStorageGovernanceDryRun({
    attachments: [
      {
        module: "asset",
        filePath: path.join(uploadRoot, "asset", "2026", "05", "active.jpg"),
        fileSize: 2_000,
        isActive: true,
      },
    ],
    files: [
      {
        relativePath: "asset/2026/05/active.jpg",
        sizeBytes: 2_000,
      },
    ],
    uploadRoot,
  })

  assert.deepEqual(dryRun.matchedFiles.map((file) => file.relativePath), ["asset/2026/05/active.jpg"])
  assert.deepEqual(dryRun.missingFiles, [])
  assert.deepEqual(dryRun.orphanFiles, [])
  assert.deepEqual(dryRun.actions, [])
})

test("assertStorageRelativePath normalizes safe relative paths", () => {
  assert.equal(assertStorageRelativePath("assets\\photo.jpg"), "assets/photo.jpg")
  assert.equal(assertStorageRelativePath("assets/photo.jpg"), "assets/photo.jpg")
})

test("assertStorageRelativePath rejects unsafe archive inputs", () => {
  assert.throws(() => assertStorageRelativePath(""))
  assert.throws(() => assertStorageRelativePath("."))
  assert.throws(() => assertStorageRelativePath("../secret.txt"))
  assert.throws(() => assertStorageRelativePath("/etc/passwd"))
  assert.throws(() => assertStorageRelativePath("C:\\temp\\file.jpg"))
  assert.throws(() => assertStorageRelativePath("C:file.jpg"))
  assert.throws(() => assertStorageRelativePath(".archive/2026-05-28/file.jpg"))
  assert.throws(() => assertStorageRelativePath("assets/.archive/file.jpg"))
  assert.throws(() => assertStorageRelativePath("assets/.ARCHIVE/file.jpg"))
})

test("getStoragePathVariants returns deduped posix and Windows variants", () => {
  assert.deepEqual(getStoragePathVariants("assets/photo.jpg"), ["assets/photo.jpg", "assets\\photo.jpg"])
  assert.deepEqual(getStoragePathVariants("photo.jpg"), ["photo.jpg"])
})

test("getStoragePathVariants includes upload-root absolute variants", () => {
  const relativePath = "asset/2026/05/file.jpg"
  const uploadRoot = path.join(os.tmpdir(), "asset-storage-root")
  const absoluteNativePath = path.resolve(uploadRoot, relativePath)
  const variants = getStoragePathVariants(relativePath, uploadRoot)

  assert.ok(variants.includes(relativePath))
  assert.ok(variants.includes("asset\\2026\\05\\file.jpg"))
  assert.ok(variants.includes(absoluteNativePath))
  assert.ok(variants.includes(absoluteNativePath.replace(/\\/g, "/")))
  assert.ok(variants.includes(absoluteNativePath.replace(/\//g, "\\")))
  assert.equal(new Set(variants).size, variants.length)
})

test("scanUploadDirectory excludes archive files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "asset-storage-"))
  await mkdir(path.join(root, "assets"), { recursive: true })
  await mkdir(path.join(root, ".archive", "2026-05-28", "assets"), { recursive: true })
  await writeFile(path.join(root, "assets", "active.jpg"), "active")
  await writeFile(path.join(root, ".archive", "2026-05-28", "assets", "old.jpg"), "old")

  const files = await scanUploadDirectory(root)

  assert.deepEqual(files.map((file) => file.relativePath), ["assets/active.jpg"])
})

test("archiveOrphanUploadFile moves a file into the dated archive", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "asset-storage-"))
  await mkdir(path.join(root, "assets"), { recursive: true })
  await writeFile(path.join(root, "assets", "orphan.jpg"), "orphan")

  const result = await archiveOrphanUploadFile({
    uploadDir: root,
    relativePath: "assets/orphan.jpg",
    archivedAt: new Date("2026-05-28T01:02:03.000Z"),
  })

  assert.equal(result.sourceRelativePath, "assets/orphan.jpg")
  assert.equal(result.archiveRelativePath, ".archive/2026-05-28/assets/orphan.jpg")
  assert.equal(existsSync(path.join(root, "assets", "orphan.jpg")), false)
  assert.equal(await readFile(path.join(root, ".archive", "2026-05-28", "assets", "orphan.jpg"), "utf8"), "orphan")
})

test("archiveOrphanUploadFile avoids overwriting archived files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "asset-storage-"))
  await mkdir(path.join(root, "assets"), { recursive: true })
  await mkdir(path.join(root, ".archive", "2026-05-28", "assets"), { recursive: true })
  await writeFile(path.join(root, "assets", "orphan.jpg"), "new")
  await writeFile(path.join(root, ".archive", "2026-05-28", "assets", "orphan.jpg"), "old")

  const result = await archiveOrphanUploadFile({
    uploadDir: root,
    relativePath: "assets/orphan.jpg",
    archivedAt: new Date("2026-05-28T01:02:03.000Z"),
  })

  assert.equal(result.archiveRelativePath, ".archive/2026-05-28/assets/orphan-1.jpg")
  assert.equal(await readFile(path.join(root, ".archive", "2026-05-28", "assets", "orphan.jpg"), "utf8"), "old")
  assert.equal(await readFile(path.join(root, ".archive", "2026-05-28", "assets", "orphan-1.jpg"), "utf8"), "new")
})

test("archiveOrphanUploadFile rejects directory targets without moving them", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "asset-storage-"))
  const sourceDirectory = path.join(root, "assets", "nested")
  await mkdir(sourceDirectory, { recursive: true })
  await writeFile(path.join(sourceDirectory, "child.txt"), "child")

  let rejectedError: Error | null = null
  try {
    await archiveOrphanUploadFile({
      uploadDir: root,
      relativePath: "assets/nested",
      archivedAt: new Date("2026-05-28T01:02:03.000Z"),
    })
  } catch (error) {
    rejectedError = error as Error
  }

  assert.equal(existsSync(sourceDirectory), true)
  assert.equal(await readFile(path.join(sourceDirectory, "child.txt"), "utf8"), "child")
  assert.equal(existsSync(path.join(root, ".archive", ".tmp")), false)
  assert.ok(rejectedError)
  assert.match(rejectedError.message, /Storage archive target must be a file/)
})

test("archiveOrphanUploadFile does not overwrite a recreated source when restore fails", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "asset-storage-"))
  const sourcePath = path.join(root, "assets", "orphan.jpg")
  const archiveDateDirectory = path.join(root, ".archive", "2026-05-28")
  await mkdir(path.dirname(sourcePath), { recursive: true })
  await writeFile(sourcePath, "original")

  let rejectedError: Error | null = null
  try {
    await archiveOrphanUploadFile({
      uploadDir: root,
      relativePath: "assets/orphan.jpg",
      archivedAt: new Date("2026-05-28T01:02:03.000Z"),
      beforeArchivePlacementForTest: async () => {
        await writeFile(sourcePath, "recreated")
        await mkdir(archiveDateDirectory, { recursive: true })
        await writeFile(path.join(archiveDateDirectory, "assets"), "not a directory")
      },
    })
  } catch (error) {
    rejectedError = error as Error
  }

  assert.ok(rejectedError)
  assert.match(rejectedError.message, /\.archive\/\.tmp\//)
  assert.match(rejectedError.message, /assets\/orphan\.jpg/)
  assert.equal(await readFile(sourcePath, "utf8"), "recreated")

  const temporaryArchiveDirectory = path.join(root, ".archive", ".tmp")
  const temporaryArchiveFiles = await readdir(temporaryArchiveDirectory)
  assert.equal(temporaryArchiveFiles.length, 1)
  assert.equal(await readFile(path.join(temporaryArchiveDirectory, temporaryArchiveFiles[0]), "utf8"), "original")
})
