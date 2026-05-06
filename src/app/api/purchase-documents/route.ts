import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { optionalFormFile, optionalFormText, requiredFormText } from "@/lib/asset-operation-evidence"
import { purchaseDocumentSchema } from "@/lib/validations/purchase-document"
import { savePurchaseDocumentFile } from "@/lib/purchase-documents"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const q = request.nextUrl.searchParams.get("q")?.trim()
    const documents = await prisma.purchaseDocument.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { documentNo: { contains: q } },
                { poNumber: { contains: q } },
                { invoiceNumber: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        supplier: { select: { code: true, name: true } },
        assetLinks: { select: { assetId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    })

    return NextResponse.json(documents)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const contentType = request.headers.get("content-type") ?? ""
    const parsed = contentType.includes("multipart/form-data")
      ? await parseMultipartPurchaseDocument(request)
      : { input: purchaseDocumentSchema.parse(await request.json()), file: null }

    const existing = await prisma.purchaseDocument.findFirst({
      where: {
        isActive: true,
        documentType: parsed.input.documentType,
        documentNo: parsed.input.documentNo,
      },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: "Purchase document already exists", id: existing.id }, { status: 409 })
    }

    const savedFile = parsed.file ? await savePurchaseDocumentFile(parsed.file) : null
    const document = await prisma.$transaction(async (tx) => {
      const record = await tx.purchaseDocument.create({
        data: {
          ...parsed.input,
          currency: parsed.input.currency ?? "THB",
          createdBy: user.id,
          updatedBy: user.id,
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
            uploadedBy: user.id,
          },
        })
      }

      return record
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "purchase_document",
      recordId: document.id,
      newValue: { ...parsed.input, attachment: savedFile ? savedFile.originalName : null },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function parseMultipartPurchaseDocument(request: NextRequest) {
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
