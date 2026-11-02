import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { fieldErrorResponse } from "@/lib/field-error-response"
import { generateAssetTags } from "@/lib/asset-tag"
import { buildCustodianScopeAudit } from "@/lib/asset-custodian-scope"
import { isPrismaUniqueConstraintError } from "@/lib/prisma-unique-retry"
import {
  createPurchaseDocumentRecord,
  findPurchaseDocumentDuplicates,
  purchaseDocumentDuplicateResponse,
  savePurchaseDocumentFile,
} from "@/lib/purchase-documents"
import { optionalFormFile } from "@/lib/asset-operation-evidence"
import { createUploadCleanup } from "@/lib/upload-server"
import {
  type AssetBatchCreateItem,
  assetBatchCreateAuditRecordId,
  assetBatchItemIssuePath,
  buildAssetBatchCreateItems,
  buildAssetBatchDuplicateFieldErrors,
  buildAssetBatchDuplicateMessage,
  findDuplicateBatchValues,
  summarizeAssetBatchCreateResult,
} from "@/lib/asset-batch-create"
import { assetSchema } from "@/lib/validations/asset"
import { assetBatchCreateSchema } from "@/lib/validations/asset-batch"
import { purchaseDocumentSchema, type PurchaseDocumentInput } from "@/lib/validations/purchase-document"
import { getAssetStateSelectionError } from "@/lib/asset-lifecycle-policy"

export const runtime = "nodejs"

// Up to 100 assets, each with its movement, links and log, plus one new document: more than the 5 s default
// (group 4 plan 3, P3-R8; the bulk move's options).
const batchTransactionOptions = { maxWait: 10_000, timeout: 60_000 }

// asset:create. A JSON body is the batch as before ({ common, rows, purchaseDocumentIds }). A multipart body is the same
// JSON in `payload`, plus ONE new purchase document (`newDocument` JSON and an optional `file`, spec §8, P3-R8), which
// needs asset:edit (P3-R2). Every check, the document's supplier and duplicate checks included, runs before the tags are
// generated (they only read), the file is saved and anything is written; the document is created and linked to every
// asset of the batch, with the chosen ones, inside the batch transaction. A duplicate type + number answers the P3-R3 409.
export async function POST(request: Request) {
  // Kept for the catch: a P2002 on type + number answers the duplicate body with the stored row's id (P3-R3).
  let documentInput: PurchaseDocumentInput | null = null
  // Set when the document's own create hit the unique on type + number (another request stored it in between).
  let documentRaced = false
  // A refused or rolled-back save removes the file it wrote (group 3 follow-up C).
  const uploads = createUploadCleanup()
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "create")

    const body = await readBatchRequest(request)
    if (body.newDocument !== null) requirePermission(user, "asset", "edit")
    if (body.fileCount > 1) {
      return NextResponse.json({ error: "Only one purchase document file per batch" }, { status: 400 })
    }

    const input = assetBatchCreateSchema.parse(body.payload)
    const parsedDocument = body.newDocument === null ? null : purchaseDocumentSchema.parse(body.newDocument)
    const [status, condition] = await Promise.all([
      prisma.assetStatus.findFirst({
        where: { id: input.common.statusId, isActive: true },
        select: { id: true, name: true, isActive: true },
      }),
      prisma.assetCondition.findFirst({
        where: { id: input.common.conditionId, isActive: true },
        select: { id: true, name: true, isActive: true },
      }),
    ])
    const stateError = getAssetStateSelectionError({ operation: "create", status, condition })
    if (stateError) {
      return NextResponse.json({ code: stateError, error: stateError }, { status: 400 })
    }
    const duplicateBatchValues = findDuplicateBatchValues(input.rows)
    const manualAssetTags = input.rows.map((row) => row.assetTag?.trim()).filter(Boolean) as string[]
    const serialNumbers = input.rows.map((row) => row.serialNumber?.trim()).filter(Boolean) as string[]
    const uniquePurchaseDocumentIds = [...new Set(input.purchaseDocumentIds.map((id) => id.trim()).filter(Boolean))]
    const [existingSerials, existingAssetTags, purchaseDocuments] = await Promise.all([
      serialNumbers.length
        ? prisma.asset.findMany({
            where: { isActive: true, serialNumber: { in: serialNumbers } },
            select: { serialNumber: true },
          })
        : Promise.resolve([]),
      manualAssetTags.length
        ? prisma.asset.findMany({
            where: { assetTag: { in: manualAssetTags } },
            select: { assetTag: true },
          })
        : Promise.resolve([]),
      uniquePurchaseDocumentIds.length
        ? prisma.purchaseDocument.findMany({
            where: { id: { in: uniquePurchaseDocumentIds }, isActive: true },
            select: { id: true },
          })
        : Promise.resolve([]),
    ])
    const existingSerialValues = existingSerials.flatMap((asset) => (asset.serialNumber ? [asset.serialNumber] : []))
    const existingAssetTagValues = existingAssetTags.map((asset) => asset.assetTag)
    const duplicateMessage = buildAssetBatchDuplicateMessage({
      duplicateBatchSerials: duplicateBatchValues.serialNumbers,
      duplicateBatchAssetTags: duplicateBatchValues.assetTags,
      existingSerials: existingSerialValues,
      existingAssetTags: existingAssetTagValues,
    })

    if (duplicateMessage) {
      return fieldErrorResponse({
        status: 400,
        error: duplicateMessage,
        fieldErrors: buildAssetBatchDuplicateFieldErrors(input.rows, {
          serialNumbers: [...duplicateBatchValues.serialNumbers, ...existingSerialValues],
          assetTags: [...duplicateBatchValues.assetTags, ...existingAssetTagValues],
        }),
      })
    }

    if (purchaseDocuments.length !== uniquePurchaseDocumentIds.length) {
      return NextResponse.json({ error: "พบเอกสารจัดซื้อที่ไม่ถูกต้องหรือถูกปิดใช้งาน" }, { status: 400 })
    }

    if (parsedDocument) {
      // The supplier chosen in the upload part; without one, the batch's while it is active. A chosen supplier that is
      // unknown or closed is refused under its field (never an FK error), as the asset's own upload does.
      const supplierId = parsedDocument.supplierId
        ? await activeSupplierId(parsedDocument.supplierId)
        : input.common.supplierId ? await activeSupplierId(input.common.supplierId) : null
      if (parsedDocument.supplierId && !supplierId) {
        return fieldErrorResponse({ status: 400, error: "Supplier not found or inactive", fieldErrors: { supplierId: "purchaseDocumentSupplierInactive" } })
      }
      documentInput = { ...parsedDocument, supplierId }

      const [duplicate] = await findPurchaseDocumentDuplicates(prisma, [documentInput])
      if (duplicate) return purchaseDocumentDuplicateResponse(duplicate.id)
    }

    const autoTagCount = input.rows.filter((row) => !row.assetTag?.trim()).length
    const generatedAssetTags =
      autoTagCount > 0
        ? await generateAssetTags({
            companyId: input.common.companyId,
            branchId: input.common.branchId,
            categoryId: input.common.categoryId,
            count: autoTagCount,
            reservedAssetTags: manualAssetTags,
          })
        : []
    const assetsToCreate = buildAssetBatchCreateItems({
      common: input.common,
      rows: input.rows,
      generatedAssetTags,
    }).map((asset, index) => {
      const parsed = parseAssetBatchItem(asset, index)
      return {
        ...parsed,
        assetTag: asset.assetTag,
        currentLocationId: asset.currentLocationId,
      } satisfies AssetBatchCreateItem
    })
    const custodianIds = [...new Set(assetsToCreate.flatMap((asset) => (asset.custodianId ? [asset.custodianId] : [])))]
    const custodians = custodianIds.length
      ? await prisma.employee.findMany({
          where: { id: { in: custodianIds } },
          select: {
            id: true,
            companyId: true,
            branchId: true,
            company: { select: { code: true, nameTh: true } },
            branch: { select: { code: true, name: true } },
          },
        })
      : []
    const custodianById = new Map(custodians.map((custodian) => [custodian.id, custodian]))

    // The file is saved after every check (a failed scan removes it and refuses the whole batch before any write).
    const newDocument = documentInput
    const savedFile = newDocument && body.file ? await savePurchaseDocumentFile(body.file) : null
    if (savedFile) uploads.track(savedFile.filePath)
    const created = await prisma.$transaction(async (tx) => {
      const assets: Array<{ id: string; assetTag: string; name: string }> = []
      // The new document first, so every asset links to it with the chosen ones. New assets have no links yet, so the
      // link rows are written directly (no race to retry).
      const document = newDocument
        ? await createPurchaseDocumentRecord(tx, { input: newDocument, savedFile, userId: user.id }).catch((error: unknown) => {
            documentRaced = isPrismaUniqueConstraintError(error)
            throw error
          })
        : null
      const linkedDocumentIds = document ? [...uniquePurchaseDocumentIds, document.id] : uniquePurchaseDocumentIds

      for (const assetInput of assetsToCreate) {
        const custodianScopeAudit = buildCustodianScopeAudit(
          assetInput,
          assetInput.custodianId ? custodianById.get(assetInput.custodianId) : null
        )
        const asset = await tx.asset.create({
          data: {
            ...assetInput,
            createdBy: user.id,
            updatedBy: user.id,
          },
          select: { id: true, assetTag: true, name: true, currentLocationId: true, remark: true },
        })
        assets.push({ id: asset.id, assetTag: asset.assetTag, name: asset.name })

        await tx.assetMovement.create({
          data: {
            assetId: asset.id,
            movementType: "batch_create",
            toValue: asset.currentLocationId,
            reason: "Batch asset registration",
            referenceType: "asset_batch_create",
            referenceId: asset.id,
            performedBy: user.id,
            remark: asset.remark,
          },
        })

        if (linkedDocumentIds.length > 0) {
          await tx.purchaseDocumentAsset.createMany({
            data: linkedDocumentIds.map((purchaseDocumentId) => ({
              assetId: asset.id,
              purchaseDocumentId,
              linkedBy: user.id,
            })),
          })
        }

        await tx.systemLog.create({
          data: {
            userId: user.id,
            action: "batch_create_item",
            module: "asset",
            recordId: asset.id,
            newValue: JSON.stringify({ ...assetInput, custodianScope: custodianScopeAudit }),
            remark: "Asset created from batch create",
          },
        })
      }

      await tx.systemLog.create({
        data: {
          userId: user.id,
          action: "batch_create",
          module: "asset",
          recordId: assetBatchCreateAuditRecordId,
          newValue: JSON.stringify({
            created: assets.length,
            assetIds: assets.map((asset) => asset.id),
            assetTags: assets.map((asset) => asset.assetTag),
            purchaseDocumentIds: linkedDocumentIds,
          }),
          remark: "Asset batch created",
        },
      })

      return { assets, documentId: document?.id ?? null }
    }, batchTransactionOptions)
    uploads.commit()

    if (created.documentId) await logAudit({
      userId: user.id,
      action: "create",
      module: "purchase_document",
      recordId: created.documentId,
      newValue: { ...newDocument, attachment: savedFile ? savedFile.originalName : null },
    })

    return NextResponse.json(summarizeAssetBatchCreateResult(created.assets), { status: 201 })
  } catch (error) {
    if (documentInput && documentRaced) return duplicateAfterUniqueError(documentInput)
    return errorResponse(error, 400)
  } finally {
    await uploads.discardIfUncommitted()
  }
}

type BatchRequest = { payload: unknown; newDocument: unknown | null; file: File | null; fileCount: number }

// JSON stays accepted (the batch without a new document, bulk-move.spec's request); multipart carries the same JSON in
// `payload`, the new document in `newDocument` and its file in `file`. Every file part is counted, so a second is refused.
async function readBatchRequest(request: Request): Promise<BatchRequest> {
  if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    return { payload: await request.json(), newDocument: null, file: null, fileCount: 0 }
  }
  const formData = await request.formData()
  const newDocument = formData.get("newDocument")
  return {
    payload: JSON.parse(String(formData.get("payload"))),
    newDocument: typeof newDocument === "string" ? JSON.parse(newDocument) : null,
    file: optionalFormFile(formData, "file"),
    fileCount: [...formData.values()].filter((value) => value instanceof File).length,
  }
}

async function activeSupplierId(supplierId: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, isActive: true }, select: { id: true } })
  return supplier?.id ?? null
}

// Another request stored the same type + number between the check and the create: answer the same 409, naming the row.
// Any other unique error (an asset tag raced in) keeps the batch's own answer.
async function duplicateAfterUniqueError(input: PurchaseDocumentInput) {
  const [duplicate] = await findPurchaseDocumentDuplicates(prisma, [input]).catch(() => [])
  return purchaseDocumentDuplicateResponse(duplicate?.id ?? null)
}

// The per-row parse runs the asset rules the common part skips (the license seats). Its issue paths name no row, so they
// move under their row or under the common part, the field the batch form shows them under (V track spec §6.1).
function parseAssetBatchItem(asset: AssetBatchCreateItem, index: number) {
  try {
    return assetSchema.parse(asset)
  } catch (error) {
    if (!(error instanceof ZodError)) throw error
    throw new ZodError(error.issues.map((issue) => ({ ...issue, path: assetBatchItemIssuePath(index, issue.path) })))
  }
}
