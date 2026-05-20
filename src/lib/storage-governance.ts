export type StorageGovernanceAttachmentInput = {
  module: string
  filePath: string | null
  fileSize: number
  isActive: boolean
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
