import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { normalizeAssetComponentManagerReturnTo } from "@/lib/asset-return-navigation"
import { formatOutstandingComponentLine, isOutstandingLink } from "@/lib/asset-component-outstanding"
import { loadComponentManagerRows } from "@/lib/asset-component-manager-data"
import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { getRegisterHolderLine } from "@/lib/asset-register-row-rules"
import { AssetComponentManager } from "@/components/assets/asset-component-manager"

type ComponentManagerPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function AssetComponentManagerPage({ params, searchParams }: ComponentManagerPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "asset", "view")
  const canEdit = hasPermission(user, "asset", "edit")
  const returnToHref = normalizeAssetComponentManagerReturnTo(locale, id, rawSearchParams.returnTo)
  const [t, tCommon, tAssetTools] = await Promise.all([
    getTranslations("asset"),
    getTranslations("common"),
    getTranslations("assetTools"),
  ])

  const asset = await prisma.asset.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      assetTag: true,
      name: true,
      serialNumber: true,
      ownershipType: true,
      // The header's holder and room (group 4 plan 4 Task 2): the parent's own, name first.
      custodian: { select: { fullNameTh: true, department: { select: { name: true } } } },
      currentLocation: { select: { name: true } },
      parentComponents: {
        orderBy: { installedAt: "desc" },
        take: 100,
        select: {
          id: true,
          componentRole: true,
          slotNo: true,
          installedAt: true,
          removedAt: true,
          status: true,
          reason: true,
          referenceType: true,
          referenceId: true,
          createdBy: true,
          updatedBy: true,
          componentAsset: {
            select: { id: true, assetTag: true, name: true, serialNumber: true, custodian: { select: { code: true, fullNameTh: true } } },
          },
        },
      },
    },
  })

  if (!asset) notFound()
  const outstandingWords = { outstanding: t("componentOutstanding"), withHolder: (holder: string) => t("componentOutstandingWith", { holder }) }

  // An outstanding link (group 3 spec §8.5) stays among the current components, so ถอดออก reaches it.
  const isCurrentLink = (component: { status: string; removedAt: Date | null }) => !component.removedAt && (component.status === "installed" || isOutstandingLink(component))
  const outstandingCheckinIds = [...new Set(asset.parentComponents
    .filter((component) => isOutstandingLink(component) && component.referenceType === "checkin" && component.referenceId)
    .map((component) => component.referenceId as string))]
  const outstandingCheckins = outstandingCheckinIds.length > 0
    ? await prisma.assetCheckin.findMany({ where: { id: { in: outstandingCheckinIds } }, select: { id: true, documentNo: true } })
    : []
  const checkinDocumentNos = new Map(outstandingCheckins.map((checkin) => [checkin.id, checkin.documentNo]))
  const outstandingLineOf = (component: (typeof asset.parentComponents)[number]) => {
    if (!isOutstandingLink(component)) return null
    const documentNo = component.referenceType === "checkin" && component.referenceId ? checkinDocumentNos.get(component.referenceId) ?? null : null
    return formatOutstandingComponentLine({ holder: component.componentAsset.custodian, documentNo }, outstandingWords)
  }

  const componentIds = asset.parentComponents.map((component) => component.id)
  const evidence = componentIds.length > 0
    ? await prisma.attachment.findMany({
        where: {
          isActive: true,
          module: { in: ["asset_component_install", "asset_component_remove"] },
          referenceId: { in: componentIds },
        },
        select: { referenceId: true },
      })
    : []
  const evidenceCounts = new Map<string, number>()
  for (const attachment of evidence) {
    evidenceCounts.set(attachment.referenceId, (evidenceCounts.get(attachment.referenceId) ?? 0) + 1)
  }
  const records = asset.parentComponents.map((component) => ({
    ...component,
    installedAt: component.installedAt.toISOString(),
    removedAt: component.removedAt?.toISOString() ?? null,
    installedByLabel: component.createdBy,
    removedByLabel: component.updatedBy,
    evidenceCount: evidenceCounts.get(component.id) ?? 0,
    current: isCurrentLink(component),
    outstandingLine: outstandingLineOf(component),
  }))
  const currentComponents = records.filter((component) => component.current)
  const componentHistory = records.filter((component) => !component.current)
  // The one links table's rows and the header's facts (group 4 plan 4 Task 2); the manager renders them from Task 3.
  const componentRows = await loadComponentManagerRows(prisma, { parentAssetId: asset.id, locale, can: (module, action) => hasPermission(user, module, action) })
  const header = {
    name: asset.name,
    assetTag: asset.assetTag,
    holder: getRegisterHolderLine({
      ownership: normalizeAssetOwnershipType(asset.ownershipType),
      custodian: asset.custodian ? { name: asset.custodian.fullNameTh, departmentName: asset.custodian.department.name } : null,
    }),
    room: asset.currentLocation.name,
  }

  return (
    <AssetComponentManager
      locale={locale}
      assetId={asset.id}
      parentAsset={asset}
      currentComponents={currentComponents}
      componentHistory={componentHistory}
      canEdit={canEdit}
      returnToHref={returnToHref}
      header={header}
      linkRows={componentRows}
      labels={{
        title: t("manageComponents"),
        subtitle: t("componentSummaryHelp"),
        back: tCommon("back"),
        current: t("currentComponents"),
        history: t("componentHistory"),
        noCurrent: t("noCurrentComponents"),
        noHistory: t("noComponentHistory"),
        scanOrSearch: t("componentSearchPlaceholder"),
        candidateHelp: t("componentSearchHelp"),
        searching: t("searchingAssets"),
        noCandidates: t("noComponentSearchResults"),
        selected: t("componentSelected"),
        componentRole: t("componentRole"),
        slot: t("slotNo"),
        installedAt: t("installedAt"),
        reason: t("reason"),
        installEvidence: t("componentInstallEvidence"),
        evidenceHint: t("componentEvidenceSelected"),
        browseEvidence: t("componentEvidenceHelp"),
        continueReview: t("componentContinueReview"),
        reviewTitle: t("componentReviewTitle"),
        reviewHelp: t("componentReviewHelp"),
        confirmInstall: t("componentConfirmInstall"),
        installSuccess: t("componentInstallSuccess"),
        addAnother: t("componentAddAnother"),
        remove: t("removeComponent"),
        removeTitle: t("componentRemoveTitle"),
        removeEvidence: t("componentRemoveEvidence"),
        removeReason: t("componentRemoveReason"),
        confirmRemove: t("componentConfirmRemove"),
        removeSuccess: t("componentRemoveSuccess"),
        cancel: tCommon("cancel"),
        close: tCommon("close"),
        error: tCommon("error"),
        status: t("componentStatus"),
        serial: t("serialNumber"),
        evidence: t("viewEvidence"),
        loadMore: t("componentLoadMore"),
        scanner: {
          start: tAssetTools("scannerStart"),
          stop: tAssetTools("scannerStop"),
          title: tAssetTools("scannerTitle"),
          help: tAssetTools("scannerHelp"),
          cameraUnsupported: tAssetTools("cameraUnsupported"),
          cameraNotFound: tAssetTools("cameraNotFound"),
          cameraError: tAssetTools("cameraError"),
          cameraDevice: tAssetTools("cameraDevice"),
          cameraDeviceFallback: tAssetTools("cameraDeviceFallback"),
          cameraRear: tAssetTools("cameraRear"),
          scanning: tAssetTools("scanning"),
          scanned: tAssetTools("scanned"),
          cameraOpening: tAssetTools("cameraOpening"),
          torchOn: tAssetTools("torchOn"),
          torchOff: tAssetTools("torchOff"),
          torchUnsupported: tAssetTools("torchUnsupported"),
          zoomCamera: tAssetTools.raw("zoomCamera"),
          zoomUnsupported: tAssetTools("zoomUnsupported"),
        },
        steps: {
          label: t("componentInstallSteps"),
          identify: t("componentStepIdentify"),
          details: t("componentStepDetails"),
          review: t("componentStepReview"),
        },
      }}
    />
  )
}
