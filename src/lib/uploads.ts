import path from "path"

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
])

export function getUploadRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR ?? "./uploads")
}

export function assertSafeUploadPath(filePath: string) {
  const uploadRoot = getUploadRoot()
  const resolved = path.resolve(filePath)
  if (resolved !== uploadRoot && !resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error("Invalid attachment path")
  }
  return resolved
}

export function sanitizeFileName(fileName: string) {
  const normalized = fileName.normalize("NFKD")
  const sanitized = normalized.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim()
  return sanitized || "attachment"
}

export function validateUploadFile(file: File) {
  if (file.size <= 0) {
    throw new Error("File is empty")
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File size exceeds 10 MB")
  }

  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("File type is not allowed")
  }
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
