import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { getAssetFormOptions } from "@/lib/asset-form-options"
import { AssetForm } from "@/components/assets/asset-form"

type EditAssetPageProps = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditAssetPage({ params }: EditAssetPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "asset", "edit")

  const [asset, options] = await Promise.all([
    prisma.asset.findFirst({
      where: { id, isActive: true },
    }),
    getAssetFormOptions(),
  ])

  if (!asset) notFound()

  return (
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
        companyId: asset.companyId,
        branchId: asset.branchId,
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
        isActive: asset.isActive,
      }}
    />
  )
}

function formatDateInput(date: Date | null) {
  if (!date) return ""
  return date.toISOString().slice(0, 10)
}
