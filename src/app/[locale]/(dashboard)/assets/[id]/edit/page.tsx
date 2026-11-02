import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { getAssetFormOptions } from "@/lib/asset-form-options"
import type { AssetEditContext } from "@/lib/asset-form-rules"
import { buildAssetRegisterTransactionHref } from "@/lib/asset-operation-policy"
import { appendReturnTo, normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { readPurchaseDocumentChoices, searchPurchaseDocuments, type PurchaseDocumentSearchDb } from "@/lib/purchase-document-search"
import { AssetForm } from "@/components/assets/asset-form"

type EditAssetPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[]; documents?: string | string[] }>
}

const purchaseDocumentDb = prisma as unknown as PurchaseDocumentSearchDb

const codeName = { select: { code: true, name: true } } as const

export default async function EditAssetPage({ params, searchParams }: EditAssetPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "asset", "edit")
  const returnToHref = normalizeAssetReturnTo(locale, rawSearchParams.returnTo)
  // The save's failure landing (group 4 plan 3 Task 5, P3-R6): เอกสารจัดซื้อ opens with the documents to upload again.
  const documentsFailed = getSingleSearchParam(rawSearchParams.documents) === "failed"

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
        // The chips of the picker, in the order they were linked (plan 3 Task 5).
        purchaseDocumentLinks: {
          orderBy: { linkedAt: "asc" },
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
  const [options, openHandover, chosenDocuments, recentDocuments] = await Promise.all([
    getAssetFormOptions({ currentStatusId: asset.statusId, currentConditionId: asset.conditionId }),
    // An open handover makes holder, room and แผนก read-only (P2-R3): the same where as the asset page's frame and PUT.
    prisma.assetCheckout.findFirst({
      where: { assetId: asset.id, isReturned: false, transactionStatus: "active" },
      orderBy: { checkoutDate: "desc" },
      select: { id: true, documentNo: true },
    }),
    // The linked documents by id, inactive ones too (P3-R7), and the picker's empty-query list with the asset's supplier
    // first (P3-R4): the form fetches nothing on load.
    readPurchaseDocumentChoices(purchaseDocumentDb, asset.purchaseDocumentLinks.map((link) => link.purchaseDocumentId)),
    searchPurchaseDocuments(purchaseDocumentDb, { q: "", supplierId: asset.supplierId }),
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
          isActive: asset.isActive,
        }}
        chosenDocuments={chosenDocuments}
        recentDocuments={recentDocuments}
        documentsFailed={documentsFailed}
        // A save that lands here again with ?documents=failed starts a fresh form with the stored links.
        key={documentsFailed ? "documents-failed" : "form"}
        existingAssetPhotos={asset.attachments}
        editContext={editContext}
        backHref={returnToHref}
      />
    </div>
  )
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

function formatDateInput(date: Date | null) {
  if (!date) return ""
  return date.toISOString().slice(0, 10)
}
