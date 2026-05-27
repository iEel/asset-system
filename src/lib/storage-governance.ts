import { randomUUID } from "node:crypto"
import { constants } from "node:fs"
import { access, copyFile, link, mkdir, readdir, rename, stat, unlink } from "node:fs/promises"
import path from "node:path"

const ARCHIVE_DIRECTORY_NAME = ".archive"

export type StorageGovernanceAttachmentInput = {
  module: string
  filePath: string | null
  fileSize: number
  isActive: boolean
}

export type StorageGovernanceFileInput = {
  relativePath: string
  sizeBytes: number
  modifiedAt?: Date | string | null
}

export type StorageGovernanceDryRunAction =
  | {
      action: "archive_orphan_file"
      relativePath: string
      sizeBytes: number
    }
  | {
      action: "review_missing_db_file"
      filePath: string
      module: string
      expectedSizeBytes: number
    }

export type StorageGovernanceOptions = {
  largeFileThresholdBytes?: number
}

export function summarizeStorageGovernance(
  attachments: StorageGovernanceAttachmentInput[],
  options: StorageGovernanceOptions = {}
) {
  const largeFileThresholdBytes = options.largeFileThresholdBytes ?? 10 * 1024 * 1024
  const activeAttachments = attachments.filter((attachment) => attachment.isActive)
  const moduleTotals = new Map<string, { module: string; count: number; totalBytes: number }>()
  const pathCounts = new Map<string, number>()

  for (const attachment of activeAttachments) {
    const moduleTotal = moduleTotals.get(attachment.module) ?? {
      module: attachment.module,
      count: 0,
      totalBytes: 0,
    }
    moduleTotal.count += 1
    moduleTotal.totalBytes += attachment.fileSize
    moduleTotals.set(attachment.module, moduleTotal)

    const path = normalizeStoragePath(attachment.filePath)
    if (path) pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1)
  }

  const duplicatePaths = [...pathCounts.values()].filter((count) => count > 1)

  return {
    activeFiles: activeAttachments.length,
    inactiveFiles: attachments.length - activeAttachments.length,
    totalBytes: activeAttachments.reduce((sum, attachment) => sum + attachment.fileSize, 0),
    largeFileCount: activeAttachments.filter((attachment) => attachment.fileSize >= largeFileThresholdBytes).length,
    missingPathCount: activeAttachments.filter((attachment) => !normalizeStoragePath(attachment.filePath)).length,
    duplicatePathCount: duplicatePaths.reduce((sum, count) => sum + count, 0),
    byModule: [...moduleTotals.values()].sort((left, right) => right.totalBytes - left.totalBytes || right.count - left.count),
  }
}

export function buildStorageGovernanceDryRun({
  attachments,
  files,
}: {
  attachments: StorageGovernanceAttachmentInput[]
  files: StorageGovernanceFileInput[]
}) {
  const activeAttachmentByPath = new Map(
    attachments
      .filter((attachment) => attachment.isActive)
      .map((attachment) => [normalizeStoragePath(attachment.filePath), attachment] as const)
      .filter(([normalizedPath]) => Boolean(normalizedPath))
  )
  const fileByPath = new Map(files.map((file) => [normalizeStoragePath(file.relativePath), file] as const))

  const matchedFiles = files.filter((file) => activeAttachmentByPath.has(normalizeStoragePath(file.relativePath)))
  const missingFiles = attachments
    .filter((attachment) => attachment.isActive)
    .filter((attachment) => {
      const normalizedPath = normalizeStoragePath(attachment.filePath)
      return normalizedPath ? !fileByPath.has(normalizedPath) : false
    })
  const orphanFiles = files.filter((file) => !activeAttachmentByPath.has(normalizeStoragePath(file.relativePath)))
  const actions: StorageGovernanceDryRunAction[] = [
    ...missingFiles.map((attachment) => ({
      action: "review_missing_db_file" as const,
      filePath: attachment.filePath ?? "",
      module: attachment.module,
      expectedSizeBytes: attachment.fileSize,
    })),
    ...orphanFiles.map((file) => ({
      action: "archive_orphan_file" as const,
      relativePath: file.relativePath,
      sizeBytes: file.sizeBytes,
    })),
  ]

  return {
    matchedFiles,
    missingFiles,
    orphanFiles,
    actions,
  }
}

export async function scanUploadDirectory(uploadDir: string): Promise<StorageGovernanceFileInput[]> {
  const root = path.resolve(uploadDir)
  const files: StorageGovernanceFileInput[] = []
  await walkUploadDirectory(root, root, files)
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
}

export function assertStorageRelativePath(relativePath: string): string {
  const trimmedPath = relativePath.trim()
  if (!trimmedPath) throw new Error("Storage relative path is required")

  const slashNormalizedPath = trimmedPath.replace(/\\/g, "/")
  if (
    path.posix.isAbsolute(slashNormalizedPath) ||
    path.win32.isAbsolute(slashNormalizedPath) ||
    /^[a-zA-Z]:/.test(slashNormalizedPath)
  ) {
    throw new Error("Storage path must be relative")
  }

  const segments = slashNormalizedPath.split("/")
  if (segments.includes("..")) throw new Error("Storage path cannot contain traversal")
  if (segments.some((segment) => segment.toLowerCase() === ARCHIVE_DIRECTORY_NAME)) {
    throw new Error("Storage path cannot point inside the archive")
  }

  const normalizedPath = path.posix.normalize(slashNormalizedPath)
  if (normalizedPath === ".") throw new Error("Storage relative path is required")

  return normalizedPath
}

export function getStoragePathVariants(relativePath: string, uploadRoot?: string): string[] {
  const normalizedPath = assertStorageRelativePath(relativePath)
  const variants = [normalizedPath, normalizedPath.replace(/\//g, "\\")]

  if (uploadRoot) {
    const root = path.resolve(uploadRoot)
    const absolutePath = path.resolve(root, normalizedPath)
    variants.push(absolutePath, absolutePath.replace(/\\/g, "/"), absolutePath.replace(/\//g, "\\"))
  }

  return [...new Set(variants)]
}

export async function archiveOrphanUploadFile({
  uploadDir,
  relativePath,
  archivedAt = new Date(),
  beforeArchivePlacementForTest,
}: {
  uploadDir: string
  relativePath: string
  archivedAt?: Date
  beforeArchivePlacementForTest?: () => Promise<void> | void
}): Promise<{ sourceRelativePath: string; archiveRelativePath: string }> {
  const root = path.resolve(uploadDir)
  const sourceRelativePath = assertStorageRelativePath(relativePath)
  const sourceAbsolutePath = path.resolve(root, sourceRelativePath)

  if (!isPathInsideRoot(root, sourceAbsolutePath)) {
    throw new Error("Source path must stay inside the upload directory")
  }

  const archiveDate = archivedAt.toISOString().slice(0, 10)
  const parsedSourcePath = path.posix.parse(sourceRelativePath)
  const temporaryArchiveDirectory = path.resolve(root, ARCHIVE_DIRECTORY_NAME, ".tmp")
  const temporaryArchivePath = path.join(temporaryArchiveDirectory, `${Date.now()}-${randomUUID()}.tmp`)
  const temporaryArchiveRelativePath = path.relative(root, temporaryArchivePath).replace(/\\/g, "/")
  let archiveRelativePath = ""
  let archiveAbsolutePath = ""
  let archived = false

  if (!isPathInsideRoot(root, temporaryArchivePath)) {
    throw new Error("Archive path must stay inside the upload directory")
  }

  await mkdir(temporaryArchiveDirectory, { recursive: true })
  await rename(sourceAbsolutePath, temporaryArchivePath)

  try {
    await beforeArchivePlacementForTest?.()

    for (let attempt = 0; ; attempt += 1) {
      const suffix = attempt === 0 ? "" : `-${attempt}`
      const archiveFileName = `${parsedSourcePath.name}${suffix}${parsedSourcePath.ext}`
      archiveRelativePath = path.posix.join(ARCHIVE_DIRECTORY_NAME, archiveDate, parsedSourcePath.dir, archiveFileName)
      archiveAbsolutePath = path.resolve(root, archiveRelativePath)

      if (!isPathInsideRoot(root, archiveAbsolutePath)) {
        throw new Error("Archive path must stay inside the upload directory")
      }
      if (await fileExists(archiveAbsolutePath)) continue

      await mkdir(path.dirname(archiveAbsolutePath), { recursive: true })
      try {
        await placeArchiveFileWithoutOverwriting(temporaryArchivePath, archiveAbsolutePath)
        archived = true
        break
      } catch (error) {
        if (isAlreadyExistsError(error)) continue
        throw error
      }
    }
  } catch (error) {
    await restoreTemporaryArchiveFile({
      temporaryArchivePath,
      temporaryArchiveRelativePath,
      sourceAbsolutePath,
      sourceRelativePath,
    })
    throw error
  } finally {
    if (archived) await removeArchiveTemporaryFile(temporaryArchivePath)
  }

  return {
    sourceRelativePath,
    archiveRelativePath,
  }
}

export function formatStorageSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function normalizeStoragePath(path: string | null) {
  const normalized = path?.trim().replace(/\\/g, "/").toLowerCase()
  return normalized && normalized.length > 0 ? normalized : null
}

async function walkUploadDirectory(root: string, currentDirectory: string, files: StorageGovernanceFileInput[]) {
  let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>
  try {
    entries = await readdir(currentDirectory, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const absolutePath = path.join(currentDirectory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() === ARCHIVE_DIRECTORY_NAME) continue
      await walkUploadDirectory(root, absolutePath, files)
      continue
    }
    if (!entry.isFile()) continue

    const info = await stat(absolutePath).catch(() => null)
    if (!info) continue
    files.push({
      relativePath: path.relative(root, absolutePath).replace(/\\/g, "/"),
      sizeBytes: info.size,
      modifiedAt: info.mtime,
    })
  }
}

function isPathInsideRoot(root: string, targetPath: string) {
  const relativePath = path.relative(root, targetPath)
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
}

async function fileExists(absolutePath: string) {
  try {
    await access(absolutePath, constants.F_OK)
    return true
  } catch (error) {
    if (isNotFoundError(error)) return false
    throw error
  }
}

async function placeArchiveFileWithoutOverwriting(sourceAbsolutePath: string, archiveAbsolutePath: string) {
  try {
    await link(sourceAbsolutePath, archiveAbsolutePath)
  } catch (error) {
    if (isAlreadyExistsError(error)) throw error
    if (!canFallbackToExclusiveCopy(error)) throw error
    await copyFile(sourceAbsolutePath, archiveAbsolutePath, constants.COPYFILE_EXCL)
  }
}

async function restoreTemporaryArchiveFile({
  temporaryArchivePath,
  temporaryArchiveRelativePath,
  sourceAbsolutePath,
  sourceRelativePath,
}: {
  temporaryArchivePath: string
  temporaryArchiveRelativePath: string
  sourceAbsolutePath: string
  sourceRelativePath: string
}) {
  try {
    await mkdir(path.dirname(sourceAbsolutePath), { recursive: true })
    await placeArchiveFileWithoutOverwriting(temporaryArchivePath, sourceAbsolutePath)
    await unlink(temporaryArchivePath)
  } catch (error) {
    if (isNotFoundError(error)) return
    if (isAlreadyExistsError(error)) {
      throw new Error(
        `Unable to restore archived file because the source path was recreated. Temporary archive remains at ${temporaryArchiveRelativePath}; source path is ${sourceRelativePath}.`
      )
    }
    throw error
  }
}

async function removeArchiveTemporaryFile(temporaryArchivePath: string) {
  try {
    await unlink(temporaryArchivePath)
  } catch (error) {
    if (!isNotFoundError(error)) throw error
  }
}

function isNotFoundError(error: unknown) {
  return hasErrorCode(error, "ENOENT")
}

function isAlreadyExistsError(error: unknown) {
  return hasErrorCode(error, "EEXIST")
}

function canFallbackToExclusiveCopy(error: unknown) {
  return (
    hasErrorCode(error, "EXDEV") ||
    hasErrorCode(error, "EPERM") ||
    hasErrorCode(error, "ENOSYS") ||
    hasErrorCode(error, "ENOTSUP")
  )
}

function hasErrorCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code
}
