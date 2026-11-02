import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { fieldErrorResponse } from "@/lib/field-error-response"
import { isPrismaUniqueConstraintError } from "@/lib/prisma-unique-retry"
import {
  createPurchaseDocumentRecord,
  findPurchaseDocumentDuplicates,
  linkPurchaseDocumentsToAsset,
  parseMultipartPurchaseDocument,
  purchaseDocumentDuplicateResponse,
  savePurchaseDocumentFile,
} from "@/lib/purchase-documents"
import { readPurchaseDocumentChoices, type PurchaseDocumentSearchDb } from "@/lib/purchase-document-search"
import { purchaseDocumentLinkSchema, type PurchaseDocumentInput } from "@/lib/validations/purchase-document"
import { createUploadCleanup } from "@/lib/upload-server"

export const runtime = "nodejs"

type AssetPurchaseDocumentsRouteContext = {
  params: Promise<{ id: string }>
}

// asset:edit (P3-R2). A JSON body links chosen documents ({ purchaseDocumentIds }, additive, answers { linkedIds }). A
// multipart body is one new document (group 4 plan 3, spec §9.3): the document, its file and the link to this asset are
// written in one transaction, so no document is left unlinked; the answer is 201 { document, linkedIds: [id] }, the
// document as the picker shows it. A duplicate type + number answers the P3-R3 409 before the file is saved.
export async function POST(request: NextRequest, context: AssetPurchaseDocumentsRouteContext) {
  // Kept for the catch: a P2002 on type + number answers the duplicate body with the stored row's id (P3-R3).
  let input: PurchaseDocumentInput | null = null
  // A refused or rolled-back save removes the file it wrote (group 3 follow-up C).
  const uploads = createUploadCleanup()
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      select: { id: true, supplierId: true },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      return linkChosenDocuments(request, asset.id, user.id)
    }

    const parsed = await parseMultipartPurchaseDocument(request)
    // The supplier chosen in the upload part; without one, the asset's while it is active. A chosen supplier that is
    // unknown or closed is refused under its field (never an FK error), before anything is written.
    const supplierId = parsed.input.supplierId
      ? await activeSupplierId(parsed.input.supplierId)
      : asset.supplierId ? await activeSupplierId(asset.supplierId) : null
    if (parsed.input.supplierId && !supplierId) {
      return fieldErrorResponse({ status: 400, error: "Supplier not found or inactive", fieldErrors: { supplierId: "purchaseDocumentSupplierInactive" } })
    }
    const documentInput: PurchaseDocumentInput = { ...parsed.input, supplierId }
    input = documentInput

    const [duplicate] = await findPurchaseDocumentDuplicates(prisma, [documentInput])
    if (duplicate) return purchaseDocumentDuplicateResponse(duplicate.id)

    const savedFile = parsed.file ? await savePurchaseDocumentFile(parsed.file) : null
    if (savedFile) uploads.track(savedFile.filePath)
    const document = await prisma.$transaction(async (tx) => {
      const record = await createPurchaseDocumentRecord(tx, { input: documentInput, savedFile, userId: user.id })
      await tx.purchaseDocumentAsset.create({ data: { assetId: asset.id, purchaseDocumentId: record.id, linkedBy: user.id } })
      const [row] = await readPurchaseDocumentChoices(tx as unknown as PurchaseDocumentSearchDb, [record.id])
      return row
    })
    uploads.commit()

    await logAudit({
      userId: user.id,
      action: "create",
      module: "purchase_document",
      recordId: document.id,
      newValue: { ...documentInput, attachment: savedFile ? savedFile.originalName : null },
    })
    await logAudit({
      userId: user.id,
      action: "link_purchase_documents",
      module: "asset",
      recordId: asset.id,
      newValue: { purchaseDocumentIds: [document.id] },
    })

    return NextResponse.json({ document, linkedIds: [document.id] }, { status: 201 })
  } catch (error) {
    if (input && isPrismaUniqueConstraintError(error)) return duplicateAfterUniqueError(input)
    return errorResponse(error, 400)
  } finally {
    await uploads.discardIfUncommitted()
  }
}

async function activeSupplierId(supplierId: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, isActive: true }, select: { id: true } })
  return supplier?.id ?? null
}

// The JSON branch: the chosen documents linked to the asset, additive; only the links this request made are audited.
async function linkChosenDocuments(request: NextRequest, assetId: string, userId: string) {
  const input = purchaseDocumentLinkSchema.parse(await request.json())
  const linkedIds = await linkPurchaseDocumentsToAsset(prisma, {
    assetId,
    purchaseDocumentIds: input.purchaseDocumentIds,
    userId,
  })

  if (linkedIds.length > 0) {
    await logAudit({
      userId,
      action: "link_purchase_documents",
      module: "asset",
      recordId: assetId,
      newValue: { purchaseDocumentIds: linkedIds },
    })
  }

  return NextResponse.json({ linkedIds })
}

// Another request stored the same type + number between the check and the create: answer the same 409, naming the row.
async function duplicateAfterUniqueError(input: PurchaseDocumentInput) {
  const [duplicate] = await findPurchaseDocumentDuplicates(prisma, [input]).catch(() => [])
  return purchaseDocumentDuplicateResponse(duplicate?.id ?? null)
}
