import { readdir, stat } from "node:fs/promises"
import path from "node:path"

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
