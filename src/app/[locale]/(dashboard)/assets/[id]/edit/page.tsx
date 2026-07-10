import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { getAssetFormOptions } from "@/lib/asset-form-options"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { AssetForm } from "@/components/assets/asset-form"

type EditAssetPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EditAssetPage({ params, searchParams }: EditAssetPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "asset", "edit")
  const returnToHref = normalizeAssetReturnTo(locale, rawSearchParams.returnTo)

  const [asset, options] = await Promise.all([
    prisma.asset.findFirst({
      where: { id, isActive: true },
      include: {
        attachments: {
          where: {
            isActive: true,
            fileType: { startsWith: "image/" },
            module: { not: "asset_purchase" },
          },
          orderBy: { uploadedAt: "desc" },
          select: { id: true, originalName: true, fileType: true, fileSize: true },
        },
        purchaseDocumentLinks: {
          select: { purchaseDocumentId: true },
        },
      },
    }),
    getAssetFormOptions(),
  ])

  if (!asset) notFound()

  return (
    <div className="space-y-6">
      <AssetForm
        {...options}
        asset={{
          id: asset.id,
          assetTag: asset.assetTag,
          name: asset.name,
          categoryId: asset.categoryId,
          brandId: asset.brandId,
          modelId: asset.modelId,
          serialNumber: asset.serialNumber,
          licenseTotalSeats: asset.licenseTotalSeats?.toString() ?? "",
          licenseUsedSeats: asset.licenseUsedSeats?.toString() ?? "",
          licenseAssignedAssetId: asset.licenseAssignedAssetId,
          companyId: asset.companyId,
          branchId: asset.branchId,
          ownershipType: asset.ownershipType,
          departmentId: asset.departmentId,
          custodianId: asset.custodianId,
          homeLocationId: asset.homeLocationId,
          currentLocationId: asset.currentLocationId,
          statusId: asset.statusId,
          conditionId: asset.conditionId,
          purchaseDate: formatDateInput(asset.purchaseDate),
          purchasePrice: asset.purchasePrice?.toString() ?? "",
          supplierId: asset.supplierId,
          warrantyStartDate: formatDateInput(asset.warrantyStartDate),
          warrantyEndDate: formatDateInput(asset.warrantyEndDate),
          fixedAssetCode: asset.fixedAssetCode,
          poNumber: asset.poNumber,
          invoiceNumber: asset.invoiceNumber,
          remark: asset.remark,
          customFieldsJson: asset.customFieldsJson,
          purchaseDocumentIds: asset.purchaseDocumentLinks.map((link) => link.purchaseDocumentId),
          isActive: asset.isActive,
        }}
        existingAssetPhotos={asset.attachments}
        backHref={returnToHref}
      />
    </div>
  )
}

function formatDateInput(date: Date | null) {
  if (!date) return ""
  return date.toISOString().slice(0, 10)
}
