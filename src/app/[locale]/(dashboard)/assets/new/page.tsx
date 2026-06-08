import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { getAssetFormOptions } from "@/lib/asset-form-options"
import { buildAssetCloneFormState } from "@/lib/asset-clone"
import { AssetCreateWorkspace } from "@/components/assets/asset-create-workspace"

type NewAssetPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ cloneFrom?: string | string[] }>
}

export default async function NewAssetPage({ params, searchParams }: NewAssetPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "asset", "create")

  const options = await getAssetFormOptions()
  const cloneFrom = getSingleSearchParam(rawSearchParams.cloneFrom)

  if (!cloneFrom) {
    return <AssetCreateWorkspace {...options} />
  }

  await requirePagePermission(locale, "asset", "view")

  const [sourceAsset, readyStatus] = await Promise.all([
    prisma.asset.findFirst({
      where: { id: cloneFrom, isActive: true },
      select: {
        id: true,
        assetTag: true,
        name: true,
        categoryId: true,
        brandId: true,
        modelId: true,
        serialNumber: true,
        licenseTotalSeats: true,
        licenseUsedSeats: true,
        licenseAssignedAssetId: true,
        companyId: true,
        branchId: true,
        ownershipType: true,
        departmentId: true,
        custodianId: true,
        homeLocationId: true,
        currentLocationId: true,
        statusId: true,
        conditionId: true,
        purchaseDate: true,
        purchasePrice: true,
        supplierId: true,
        warrantyStartDate: true,
        warrantyEndDate: true,
        fixedAssetCode: true,
        poNumber: true,
        invoiceNumber: true,
        remark: true,
        customFieldsJson: true,
        isActive: true,
        purchaseDocumentLinks: {
          select: { purchaseDocumentId: true },
        },
      },
    }),
    prisma.assetStatus.findFirst({
      where: { isActive: true, OR: [{ name: "Ready" }, { nameTh: "พร้อมใช้งาน" }] },
      select: { id: true },
    }),
  ])

  if (!sourceAsset) notFound()

  const cloneState = buildAssetCloneFormState(sourceAsset, { readyStatusId: readyStatus?.id })

  return <AssetCreateWorkspace {...options} asset={cloneState.asset} cloneSource={cloneState.cloneSource} />
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}
