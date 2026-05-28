import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { generateAssetTags } from "@/lib/asset-tag"
import {
  type AssetBatchCreateItem,
  assetBatchCreateAuditRecordId,
  buildAssetBatchCreateItems,
  buildAssetBatchDuplicateMessage,
  findDuplicateBatchValues,
  summarizeAssetBatchCreateResult,
} from "@/lib/asset-batch-create"
import { assetSchema } from "@/lib/validations/asset"
import { assetBatchCreateSchema } from "@/lib/validations/asset-batch"

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "create")

    const input = assetBatchCreateSchema.parse(await request.json())
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
    const duplicateMessage = buildAssetBatchDuplicateMessage({
      duplicateBatchSerials: duplicateBatchValues.serialNumbers,
      duplicateBatchAssetTags: duplicateBatchValues.assetTags,
      existingSerials: existingSerials.flatMap((asset) => (asset.serialNumber ? [asset.serialNumber] : [])),
      existingAssetTags: existingAssetTags.map((asset) => asset.assetTag),
    })

    if (duplicateMessage) {
      return NextResponse.json({ error: duplicateMessage }, { status: 400 })
    }

    if (purchaseDocuments.length !== uniquePurchaseDocumentIds.length) {
      return NextResponse.json({ error: "พบเอกสารจัดซื้อที่ไม่ถูกต้องหรือถูกปิดใช้งาน" }, { status: 400 })
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
    }).map((asset) => {
      const parsed = assetSchema.parse(asset)
      return {
        ...parsed,
        assetTag: asset.assetTag,
        currentLocationId: asset.currentLocationId,
      } satisfies AssetBatchCreateItem
    })

    const createdAssets = await prisma.$transaction(async (tx) => {
      const assets: Array<{ id: string; assetTag: string; name: string }> = []

      for (const assetInput of assetsToCreate) {
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

        for (const purchaseDocumentId of uniquePurchaseDocumentIds) {
          await tx.purchaseDocumentAsset.create({
            data: {
              assetId: asset.id,
              purchaseDocumentId,
              linkedBy: user.id,
            },
          })
        }

        await tx.systemLog.create({
          data: {
            userId: user.id,
            action: "batch_create_item",
            module: "asset",
            recordId: asset.id,
            newValue: JSON.stringify(assetInput),
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
            purchaseDocumentIds: uniquePurchaseDocumentIds,
          }),
          remark: "Asset batch created",
        },
      })

      return assets
    })

    return NextResponse.json(summarizeAssetBatchCreateResult(createdAssets), { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
