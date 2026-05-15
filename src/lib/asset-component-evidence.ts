import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { getUploadRoot, sanitizeFileName, validateUploadFile } from "@/lib/uploads"

export type SavedComponentEvidence = {
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  filePath: string
}

export async function saveComponentEvidenceFile(file: File) {
  validateUploadFile(file)

  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const safeOriginalName = sanitizeFileName(file.name)
  const extension = path.extname(safeOriginalName)
  const fileName = `${randomUUID()}${extension}`
  const uploadDir = path.join(getUploadRoot(), "asset-components", year, month)
  const filePath = path.join(uploadDir, fileName)
  const bytes = Buffer.from(await file.arrayBuffer())

  await mkdir(uploadDir, { recursive: true })
  await writeFile(filePath, bytes)

  return {
    fileName,
    originalName: safeOriginalName,
    fileType: file.type,
    fileSize: file.size,
    filePath,
  } satisfies SavedComponentEvidence
}

export function optionalFormFile(formData: FormData, name: string) {
  const value = formData.get(name)
  if (!(value instanceof File)) return null
  if (value.size === 0 || value.name.trim().length === 0) return null
  return value
}

export function optionalFormText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
