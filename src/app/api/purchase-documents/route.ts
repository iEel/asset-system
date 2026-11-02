import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { isPrismaUniqueConstraintError } from "@/lib/prisma-unique-retry"
import { purchaseDocumentSchema, type PurchaseDocumentInput } from "@/lib/validations/purchase-document"
import {
  createPurchaseDocumentRecord,
  findPurchaseDocumentDuplicates,
  parseMultipartPurchaseDocument,
  purchaseDocumentDuplicateResponse,
  savePurchaseDocumentFile,
} from "@/lib/purchase-documents"
import { createUploadCleanup } from "@/lib/upload-server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  // Kept for the catch: a P2002 on type + number answers the duplicate body with the stored row's id (P3-R3).
  let input: PurchaseDocumentInput | null = null
  // A refused or rolled-back save removes the file it wrote (group 3 follow-up C).
  const uploads = createUploadCleanup()
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const contentType = request.headers.get("content-type") ?? ""
    const parsed = contentType.includes("multipart/form-data")
      ? await parseMultipartPurchaseDocument(request)
      : { input: purchaseDocumentSchema.parse(await request.json()), file: null }
    input = parsed.input

    const [duplicate] = await findPurchaseDocumentDuplicates(prisma, [parsed.input])
    if (duplicate) return purchaseDocumentDuplicateResponse(duplicate.id)

    const savedFile = parsed.file ? await savePurchaseDocumentFile(parsed.file) : null
    if (savedFile) uploads.track(savedFile.filePath)
    const document = await prisma.$transaction(async (tx) => {
      return createPurchaseDocumentRecord(tx, { input: parsed.input, savedFile, userId: user.id })
    })
    uploads.commit()

    await logAudit({
      userId: user.id,
      action: "create",
      module: "purchase_document",
      recordId: document.id,
      newValue: { ...parsed.input, attachment: savedFile ? savedFile.originalName : null },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    if (input && isPrismaUniqueConstraintError(error)) return duplicateAfterUniqueError(input)
    return errorResponse(error, 400)
  } finally {
    await uploads.discardIfUncommitted()
  }
}

// Another request stored the same type + number between the check and the create: answer the same 409, naming the row.
async function duplicateAfterUniqueError(input: PurchaseDocumentInput) {
  const [duplicate] = await findPurchaseDocumentDuplicates(prisma, [input]).catch(() => [])
  return purchaseDocumentDuplicateResponse(duplicate?.id ?? null)
}
