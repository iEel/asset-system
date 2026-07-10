import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { normalizeAssetComponentManagerReturnTo } from "@/lib/asset-return-navigation"
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
  const [t, tCommon] = await Promise.all([getTranslations("asset"), getTranslations("common")])

  const asset = await prisma.asset.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      assetTag: true,
      name: true,
      serialNumber: true,
      parentComponents: {
        orderBy: { installedAt: "desc" },
        select: {
          id: true,
          componentRole: true,
          slotNo: true,
          installedAt: true,
          removedAt: true,
          status: true,
          reason: true,
          createdBy: true,
          updatedBy: true,
          componentAsset: {
            select: { id: true, assetTag: true, name: true, serialNumber: true },
          },
        },
      },
    },
  })

  if (!asset) notFound()

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
  }))
  const currentComponents = records.filter((component) => component.status === "installed" && !component.removedAt)
  const componentHistory = records.filter((component) => component.status !== "installed" || component.removedAt)

  return (
    <AssetComponentManager
      locale={locale}
      assetId={asset.id}
      parentAsset={asset}
      currentComponents={currentComponents}
      componentHistory={componentHistory}
      canEdit={canEdit}
      returnToHref={returnToHref}
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
        installing: t("componentInstalling"),
        installSuccess: t("componentInstallSuccess"),
        addAnother: t("componentAddAnother"),
        remove: t("removeComponent"),
        removeTitle: t("componentRemoveTitle"),
        removeEvidence: t("componentRemoveEvidence"),
        removeReason: t("componentRemoveReason"),
        confirmRemove: t("componentConfirmRemove"),
        removing: t("componentRemoving"),
        removeSuccess: t("componentRemoveSuccess"),
        cancel: tCommon("cancel"),
        close: tCommon("close"),
        error: tCommon("error"),
        status: t("componentStatus"),
        serial: t("serialNumber"),
        evidence: t("viewEvidence"),
        scanner: {
          start: t("scannerStart"),
          stop: t("scannerStop"),
          title: t("scannerTitle"),
          help: t("scannerHelp"),
          cameraUnsupported: t("cameraUnsupported"),
          cameraNotFound: t("cameraNotFound"),
          cameraError: t("cameraError"),
          cameraDevice: t("cameraDevice"),
          cameraDeviceFallback: t("cameraDeviceFallback"),
          cameraRear: t("cameraRear"),
          scanning: t("scannerStop"),
          scanned: t("serialScanned"),
          cameraOpening: t("scannerStart"),
          torchOn: t("torchOn"),
          torchOff: t("torchOff"),
          torchUnsupported: t("torchUnsupported"),
          zoomCamera: t("zoomCamera", { level: "{level}" }),
          zoomUnsupported: t("zoomUnsupported"),
        },
      }}
    />
  )
}
