import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getAssetFormOptions } from "@/lib/asset-form-options"
import { buildAssetCloneFormState } from "@/lib/asset-clone"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { readPurchaseDocumentChoices, searchPurchaseDocuments, type PurchaseDocumentSearchDb } from "@/lib/purchase-document-search"
import type { PurchaseDocumentSearchAnswer } from "@/lib/purchase-document-search-rules"
import { AssetCreateWorkspace } from "@/components/assets/asset-create-workspace"

const purchaseDocumentDb = prisma as unknown as PurchaseDocumentSearchDb
// The picker's list for a person who may not link documents: nothing is read, nothing is shown.
const noDocuments: PurchaseDocumentSearchAnswer = { total: 0, activeTotal: 0, rows: [] }

type NewAssetPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ cloneFrom?: string | string[]; returnTo?: string | string[] }>
}

export default async function NewAssetPage({ params, searchParams }: NewAssetPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "asset", "create")
  // Creating and linking a purchase document needs asset:edit (P3-R2): without it เอกสารจัดซื้อ shows a note only and
  // the save sends no document step (group 4 plan 3 Task 5 fix 1).
  const canLinkPurchaseDocuments = hasPermission(user, "asset", "edit")

  const options = await getAssetFormOptions()
  const cloneFrom = getSingleSearchParam(rawSearchParams.cloneFrom)
  const returnToHref = normalizeAssetReturnTo(locale, rawSearchParams.returnTo)

  if (!cloneFrom) {
    // The purchase-document picker's empty-query list (group 4 plan 3 Task 5, P3-R4): the form fetches nothing on load.
    const recentDocuments = canLinkPurchaseDocuments ? await searchPurchaseDocuments(purchaseDocumentDb, { q: "", supplierId: null }) : noDocuments
    return <AssetCreateWorkspace {...options} recentDocuments={recentDocuments} canLinkPurchaseDocuments={canLinkPurchaseDocuments} backHref={returnToHref} />
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
  // The source's documents as chips, the active ones only (the link takes no inactive document), and the empty-query
  // list with the source's supplier first. Without asset:edit the clone carries no documents.
  const [cloneDocuments, recentDocuments] = canLinkPurchaseDocuments
    ? await Promise.all([
        readPurchaseDocumentChoices(purchaseDocumentDb, cloneState.asset.purchaseDocumentIds),
        searchPurchaseDocuments(purchaseDocumentDb, { q: "", supplierId: cloneState.asset.supplierId }),
      ])
    : [[], noDocuments]
  const chosenDocuments = cloneDocuments.filter((document) => document.isActive)

  return (
    <AssetCreateWorkspace
      {...options}
      asset={cloneState.asset}
      cloneSource={cloneState.cloneSource}
      chosenDocuments={chosenDocuments}
      recentDocuments={recentDocuments}
      canLinkPurchaseDocuments={canLinkPurchaseDocuments}
      backHref={returnToHref}
    />
  )
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}
