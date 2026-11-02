import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { getAssetFormOptions } from "@/lib/asset-form-options"
import type { AssetEditContext } from "@/lib/asset-form-rules"
import { buildAssetRegisterTransactionHref } from "@/lib/asset-operation-policy"
import { appendReturnTo, normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { AssetForm } from "@/components/assets/asset-form"

type EditAssetPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

const codeName = { select: { code: true, name: true } } as const

export default async function EditAssetPage({ params, searchParams }: EditAssetPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "asset", "edit")
  const returnToHref = normalizeAssetReturnTo(locale, rawSearchParams.returnTo)

  const asset = await prisma.asset.findFirst({
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
        // The header's facts and the stored label of every reference field (group 4 plan 2 Task 7), read with the
        // asset so an inactive record still has its name.
        status: { select: { name: true, nameTh: true } },
        condition: { select: { nameTh: true } },
        category: codeName,
        brand: { select: { name: true } },
        model: { select: { name: true } },
        company: { select: { code: true, nameTh: true } },
        branch: codeName,
        department: codeName,
        custodian: { select: { code: true, fullNameTh: true, departmentId: true, department: { select: { name: true } } } },
        homeLocation: codeName,
        currentLocation: { select: { code: true, name: true, branch: { select: { name: true } } } },
        supplier: codeName,
      },
    })

  if (!asset) notFound()
  const [options, openHandover] = await Promise.all([
    getAssetFormOptions({ currentStatusId: asset.statusId, currentConditionId: asset.conditionId }),
    // An open handover makes holder, room and แผนก read-only (P2-R3): the same where as the asset page's frame and PUT.
    prisma.assetCheckout.findFirst({
      where: { assetId: asset.id, isReturned: false, transactionStatus: "active" },
      orderBy: { checkoutDate: "desc" },
      select: { id: true, documentNo: true },
    }),
  ])

  const viewHref = appendReturnTo(`/${locale}/assets/${asset.id}`, returnToHref)
  const label = (value: { code: string; name: string } | null) => (value ? `${value.code} - ${value.name}` : undefined)
  const editContext: AssetEditContext = {
    statusName: asset.status.name,
    statusNameTh: asset.status.nameTh,
    holder: asset.custodian ? { name: asset.custodian.fullNameTh, departmentName: asset.custodian.department.name } : null,
    locationLine: [asset.currentLocation.name, asset.currentLocation.branch.name].filter(Boolean).join(" · ") || null,
    viewHref,
    transferHref: buildAssetRegisterTransactionHref(locale, asset.id, "transfer", viewHref),
    openHandover: openHandover
      ? { id: openHandover.id, documentNo: openHandover.documentNo, href: `/${locale}/asset-management/checkouts/${openHandover.id}` }
      : null,
    holderDepartmentId: asset.custodian?.departmentId ?? null,
    // "code - name", as the pickers read (spec §5, call 1); brand, model, status and condition by name, as theirs.
    // Task 8 reads these for "เดิม:".
    originalLabels: {
      categoryId: label(asset.category),
      brandId: asset.brand?.name,
      modelId: asset.model?.name,
      companyId: `${asset.company.code} - ${asset.company.nameTh}`,
      branchId: label(asset.branch),
      departmentId: label(asset.department),
      custodianId: asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : undefined,
      homeLocationId: label(asset.homeLocation),
      currentLocationId: label(asset.currentLocation),
      supplierId: label(asset.supplier),
      statusId: asset.status.nameTh,
      conditionId: asset.condition.nameTh,
    },
  }

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
        editContext={editContext}
        backHref={returnToHref}
      />
    </div>
  )
}

function formatDateInput(date: Date | null) {
  if (!date) return ""
  return date.toISOString().slice(0, 10)
}
