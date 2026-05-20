import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { generateAssetTag } from "@/lib/asset-tag"
import {
  getAssetImportReferences,
  nullableText,
  parseAssetImportWorkbook,
  parseImportDate,
  parseImportMoney,
  parseOptionalInteger,
} from "@/lib/asset-import-preview"
import { buildAssetImportBatchAuditValue, buildAssetImportRollbackPlan, createAssetImportBatchSummary } from "@/lib/asset-import-batch"
import { defaultAssetOwnershipType, normalizeAssetOwnershipType } from "@/lib/asset-ownership"

const maxImportSize = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "create")

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "กรุณาเลือกไฟล์ Excel" }, { status: 400 })
    }
    if (file.size > maxImportSize) {
      return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "รองรับเฉพาะไฟล์ .xlsx" }, { status: 400 })
    }

    const references = await getAssetImportReferences()
    const preview = await parseAssetImportWorkbook(await file.arrayBuffer(), references)
    const requestedBatchId = normalizeFormText(formData.get("batchId"))
    const batch = {
      ...createAssetImportBatchSummary({
        fileName: file.name,
        fileSize: file.size,
        preview,
      }),
      ...(requestedBatchId ? { batchId: requestedBatchId } : {}),
    }
    const readyRows = preview.rows.filter((row) => row.status === "ready")

    if (readyRows.length === 0) {
      return NextResponse.json({ error: "ไม่พบแถวที่พร้อมนำเข้า" }, { status: 400 })
    }

    let imported = 0
    const importedAssets: Array<{ id: string; assetTag: string; name: string }> = []
    for (const row of readyRows) {
      const input = {
        assetTag: nullableText(row.values.assetTag),
        name: String(row.values.name ?? "").trim(),
        categoryId: requiredResolved(row.resolved.categoryId, "categoryId"),
        brandId: nullableText(row.resolved.brandId),
        modelId: nullableText(row.resolved.modelId),
        serialNumber: nullableText(row.values.serialNumber),
        ownershipType: normalizeAssetOwnershipType(nullableText(row.values.ownershipType) ?? defaultAssetOwnershipType),
        licenseTotalSeats: parseOptionalInteger(row.values.licenseTotalSeats),
        licenseUsedSeats: parseOptionalInteger(row.values.licenseUsedSeats),
        licenseAssignedAssetId: nullableText(row.resolved.licenseAssignedAssetId),
        companyId: requiredResolved(row.resolved.companyId, "companyId"),
        branchId: requiredResolved(row.resolved.branchId, "branchId"),
        departmentId: nullableText(row.resolved.departmentId),
        custodianId: nullableText(row.resolved.custodianId),
        homeLocationId: nullableText(row.resolved.homeLocationId),
        currentLocationId: requiredResolved(row.resolved.currentLocationId, "currentLocationId"),
        statusId: requiredResolved(row.resolved.statusId, "statusId"),
        conditionId: requiredResolved(row.resolved.conditionId, "conditionId"),
        purchaseDate: parseImportDate(row.values.purchaseDate),
        purchasePrice: parseImportMoney(row.values.purchasePrice),
        supplierId: nullableText(row.resolved.supplierId),
        warrantyStartDate: parseImportDate(row.values.warrantyStartDate),
        warrantyEndDate: parseImportDate(row.values.warrantyEndDate),
        fixedAssetCode: nullableText(row.values.fixedAssetCode),
        poNumber: nullableText(row.values.poNumber),
        invoiceNumber: nullableText(row.values.invoiceNumber),
        remark: nullableText(row.values.remark),
      }
      const assetTag =
        input.assetTag ??
        (await generateAssetTag({
          companyId: input.companyId,
          branchId: input.branchId,
          categoryId: input.categoryId,
        }))

      await prisma.$transaction(async (tx) => {
        const asset = await tx.asset.create({
          data: {
            ...input,
            assetTag,
            createdBy: user.id,
            updatedBy: user.id,
          },
        })

        await tx.assetMovement.create({
          data: {
            assetId: asset.id,
            movementType: "import",
            toValue: asset.currentLocationId,
            reason: `Imported from batch ${batch.batchId} (${file.name} row ${row.rowNumber})`,
            referenceType: "asset_import",
            referenceId: asset.id,
            performedBy: user.id,
            remark: input.remark,
          },
        })

        await tx.systemLog.create({
          data: {
            userId: user.id,
            action: "import",
            module: "asset",
            recordId: asset.id,
            newValue: JSON.stringify({ ...input, assetTag, sourceRow: row.rowNumber, sourceFile: file.name, batchId: batch.batchId }),
            remark: "Asset imported from Excel",
          },
        })

        importedAssets.push({ id: asset.id, assetTag: asset.assetTag, name: asset.name })
      })

      imported += 1
    }

    const skipped = preview.summary.totalRows - imported
    await prisma.systemLog.create({
      data: {
        userId: user.id,
        action: "import_batch",
        module: "asset",
        recordId: batch.batchId,
        newValue: JSON.stringify(
          buildAssetImportBatchAuditValue({
            batch,
            imported,
            skipped,
            approvedBy: user.id,
            rollbackPlan: buildAssetImportRollbackPlan({
              batchId: batch.batchId,
              assets: importedAssets,
            }),
          })
        ),
        remark: "Asset import batch approved",
      },
    })

    return NextResponse.json({
      batchId: batch.batchId,
      imported,
      skipped,
      totalRows: preview.summary.totalRows,
      readyRows: preview.summary.readyRows,
      errorRows: preview.summary.errorRows,
    })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function requiredResolved(value: string | null | undefined, field: string) {
  if (!value) throw new Error(`Missing resolved ${field}`)
  return value
}

function normalizeFormText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}
