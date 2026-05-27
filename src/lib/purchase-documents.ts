import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/db"
import { scanWrittenUploadFile } from "@/lib/upload-server"
import { getUploadRoot, sanitizeFileName, validateUploadFile, validateUploadFileContent } from "@/lib/uploads"

export async function savePurchaseDocumentFile(file: File) {
  validateUploadFile(file)
  await validateUploadFileContent(file)

  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const safeOriginalName = sanitizeFileName(file.name)
  const extension = path.extname(safeOriginalName)
  const fileName = `${randomUUID()}${extension}`
  const uploadDir = path.join(getUploadRoot(), "purchase-documents", year, month)
  const filePath = path.join(uploadDir, fileName)
  const bytes = Buffer.from(await file.arrayBuffer())

  await mkdir(uploadDir, { recursive: true })
  await writeFile(filePath, bytes)
  await scanWrittenUploadFile(filePath)

  return {
    fileName,
    originalName: safeOriginalName,
    fileType: file.type,
    fileSize: file.size,
    filePath,
  }
}

export async function linkPurchaseDocumentsToAsset({
  assetId,
  purchaseDocumentIds,
  userId,
}: {
  assetId: string
  purchaseDocumentIds: string[]
  userId: string
}) {
  const uniqueIds = [...new Set(purchaseDocumentIds.map((id) => id.trim()).filter(Boolean))]
  if (uniqueIds.length === 0) return []

  const documents = await prisma.purchaseDocument.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
    select: { id: true },
  })
  const validIds = new Set(documents.map((document) => document.id))
  const existingLinks = await prisma.purchaseDocumentAsset.findMany({
    where: {
      assetId,
      purchaseDocumentId: { in: [...validIds] },
    },
    select: { purchaseDocumentId: true },
  })
  const existingIds = new Set(existingLinks.map((link) => link.purchaseDocumentId))
  const missingIds = [...validIds].filter((id) => !existingIds.has(id))

  if (missingIds.length === 0) return []

  await prisma.purchaseDocumentAsset.createMany({
    data: missingIds.map((purchaseDocumentId) => ({
      assetId,
      purchaseDocumentId,
      linkedBy: userId,
    })),
  })

  return missingIds
}
