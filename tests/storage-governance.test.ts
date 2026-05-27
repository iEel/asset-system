import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises"
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
