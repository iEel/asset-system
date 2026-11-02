import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import type { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { optionalFormFile, optionalFormText, requiredFormText } from "@/lib/asset-operation-evidence"
import { isPrismaUniqueConstraintError } from "@/lib/prisma-unique-retry"
import { scanWrittenUploadFile } from "@/lib/upload-server"
import { getUploadRoot, sanitizeFileName, validateUploadFile, validateUploadFileContent } from "@/lib/uploads"
import { purchaseDocumentSchema, type PurchaseDocumentInput, type PurchaseDocumentType } from "@/lib/validations/purchase-document"

// The models the helpers touch: `prisma` or a transaction client (`tx`) both fit.
export type PurchaseDocumentDb = Pick<Prisma.TransactionClient, "purchaseDocument" | "purchaseDocumentAsset" | "attachment">

export type SavedPurchaseDocumentFile = Awaited<ReturnType<typeof savePurchaseDocumentFile>>

// The only writer of purchase-document files: validates the upload, writes it, and runs the virus scan (a failed scan
// removes the file and throws).
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

// A multipart purchase document: the schema's fields plus an optional `file`.
export async function parseMultipartPurchaseDocument(request: Request): Promise<{ input: PurchaseDocumentInput; file: File | null }> {
  const formData = await request.formData()
  return {
    input: purchaseDocumentSchema.parse({
      documentType: requiredFormText(formData, "documentType"),
      documentNo: requiredFormText(formData, "documentNo"),
      poNumber: optionalFormText(formData, "poNumber"),
      invoiceNumber: optionalFormText(formData, "invoiceNumber"),
      documentDate: optionalFormText(formData, "documentDate"),
      supplierId: optionalFormText(formData, "supplierId"),
      totalAmount: optionalFormText(formData, "totalAmount"),
      currency: optionalFormText(formData, "currency"),
      remark: optionalFormText(formData, "remark"),
    }),
    file: optionalFormFile(formData, "file"),
  }
}

// SQL Server's default collation compares documentNo without case (as the unique on documentType + documentNo does), so
// the drafts are matched to the stored rows, and to each other, the same way.
const duplicateKey = (documentType: string, documentNo: string) => `${documentType}\u0000${documentNo.trim().toLowerCase()}`

type PurchaseDocumentDuplicate = { index: number; id: string | null; reason: "exists" | "repeated" }

// The type + number rule (P3-R3): a draft is a duplicate when any stored document has its type and number, active or not,
// since the database unique covers both ("exists"), or when an earlier draft in the same list has them ("repeated").
export async function findPurchaseDocumentDuplicates(
  db: Pick<PurchaseDocumentDb, "purchaseDocument">,
  drafts: Array<{ documentType: PurchaseDocumentType; documentNo: string }>,
): Promise<PurchaseDocumentDuplicate[]> {
  if (drafts.length === 0) return []

  const stored = await db.purchaseDocument.findMany({
    where: { OR: drafts.map(({ documentType, documentNo }) => ({ documentType, documentNo: documentNo.trim() })) },
    select: { id: true, documentType: true, documentNo: true, isActive: true },
  })
  const storedIds = new Map(stored.map((document) => [duplicateKey(document.documentType, document.documentNo), document.id]))

  const seen = new Set<string>()
  const duplicates: PurchaseDocumentDuplicate[] = []
  drafts.forEach(({ documentType, documentNo }, index) => {
    const key = duplicateKey(documentType, documentNo)
    const storedId = storedIds.get(key)
    if (storedId) duplicates.push({ index, id: storedId, reason: "exists" })
    else if (seen.has(key)) duplicates.push({ index, id: null, reason: "repeated" })
    seen.add(key)
  })
  return duplicates
}

// The 409 body every create path answers for a duplicate type + number (P3-R3).
export function purchaseDocumentDuplicateBody(id: string | null) {
  return { error: "Purchase document already exists", id, code: "DUPLICATE", fieldErrors: { documentNo: "duplicate" } }
}

export function purchaseDocumentDuplicateResponse(id: string | null) {
  return NextResponse.json(purchaseDocumentDuplicateBody(id), { status: 409 })
}

// The document and, when a file was saved, its attachment row (module "purchase_document"). Run it in a transaction.
export async function createPurchaseDocumentRecord(
  tx: Pick<PurchaseDocumentDb, "purchaseDocument" | "attachment">,
  { input, savedFile, userId }: { input: PurchaseDocumentInput; savedFile: SavedPurchaseDocumentFile | null; userId: string },
) {
  const record = await tx.purchaseDocument.create({
    data: {
      ...input,
      currency: input.currency ?? "THB",
      createdBy: userId,
      updatedBy: userId,
    },
    include: {
      supplier: { select: { code: true, name: true } },
      assetLinks: { select: { assetId: true } },
    },
  })

  if (savedFile) {
    await tx.attachment.create({
      data: {
        module: "purchase_document",
        referenceId: record.id,
        fileName: savedFile.fileName,
        originalName: savedFile.originalName,
        fileType: savedFile.fileType,
        fileSize: savedFile.fileSize,
        filePath: savedFile.filePath,
        uploadedBy: userId,
      },
    })
  }

  return record
}

// Links active documents to an asset and returns the ids this call linked. Unknown or inactive ids are dropped. A link
// that already exists (read before the write, or made by another request in between: P2002) counts as linked, not an
// error, and is not in the returned ids.
export async function linkPurchaseDocumentsToAsset(
  db: Pick<PurchaseDocumentDb, "purchaseDocument" | "purchaseDocumentAsset">,
  {
    assetId,
    purchaseDocumentIds,
    userId,
  }: {
    assetId: string
    purchaseDocumentIds: string[]
    userId: string
  },
): Promise<string[]> {
  const uniqueIds = [...new Set(purchaseDocumentIds.map((id) => id.trim()).filter(Boolean))]
  if (uniqueIds.length === 0) return []

  const documents = await db.purchaseDocument.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
    select: { id: true },
  })
  const validIds = new Set(documents.map((document) => document.id))
  const existingLinks = await db.purchaseDocumentAsset.findMany({
    where: {
      assetId,
      purchaseDocumentId: { in: [...validIds] },
    },
    select: { purchaseDocumentId: true },
  })
  const existingIds = new Set(existingLinks.map((link) => link.purchaseDocumentId))
  const missingIds = [...validIds].filter((id) => !existingIds.has(id))

  if (missingIds.length === 0) return []

  const rows = missingIds.map((purchaseDocumentId) => ({ assetId, purchaseDocumentId, linkedBy: userId }))
  try {
    await db.purchaseDocumentAsset.createMany({ data: rows })
    return missingIds
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) throw error
  }

  // Another request linked one of them in between: link the rest one at a time, skipping the ones that now exist.
  const linkedIds: string[] = []
  for (const row of rows) {
    try {
      await db.purchaseDocumentAsset.create({ data: row })
      linkedIds.push(row.purchaseDocumentId)
    } catch (error) {
      if (!isPrismaUniqueConstraintError(error)) throw error
    }
  }
  return linkedIds
}
