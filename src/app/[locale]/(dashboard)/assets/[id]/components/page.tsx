import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { normalizeAssetComponentManagerReturnTo } from "@/lib/asset-return-navigation"
import { formatOutstandingComponentLine, installedOrOutstandingLinkWhere, isOutstandingLink } from "@/lib/asset-component-outstanding"
import { loadComponentManagerRows } from "@/lib/asset-component-manager-data"
import { componentRoleLabelKey } from "@/lib/asset-component-roles"
import { normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { getRegisterHolderLine } from "@/lib/asset-register-row-rules"
import { AssetComponentManager } from "@/components/assets/asset-component-manager"
import { AssetRelationshipMap, type RelationshipLink } from "@/components/assets/detail/asset-relationship-map"

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
      ownershipType: true,
      // The header's holder and room (group 4 plan 4 Task 2): the parent's own, name first. The code is for the
      // outstanding line of this asset's own parent link (code-first holder, group 3 spec §8.5).
      custodian: { select: { code: true, fullNameTh: true, department: { select: { name: true } } } },
      currentLocation: { select: { name: true } },
      // The map's parent lane, as the asset page reads it: the links this asset is installed or outstanding in.
      installedInLinks: {
        where: installedOrOutstandingLinkWhere,
        orderBy: { installedAt: "desc" },
        select: {
          id: true,
          componentRole: true,
          slotNo: true,
          status: true,
          removedAt: true,
          referenceType: true,
          referenceId: true,
          parentAsset: { select: { id: true, assetTag: true, name: true } },
        },
      },
    },
  })

  if (!asset) notFound()
  const outstandingWords = { outstanding: t("componentOutstanding"), withHolder: (holder: string) => t("componentOutstandingWith", { holder }) }
  // The RT- numbers of this asset's own outstanding links: one bounded read, of the ids the links name only.
  const ownCheckinIds = [...new Set(asset.installedInLinks
    .filter((link) => isOutstandingLink(link) && link.referenceType === "checkin" && link.referenceId)
    .map((link) => link.referenceId as string))]
  // The one links table's rows (group 4 plan 4 Task 2): every link of this parent, the only read of them on this page.
  const [componentRows, ownCheckins] = await Promise.all([
    loadComponentManagerRows(prisma, { parentAssetId: asset.id, locale, can: (module, action) => hasPermission(user, module, action) }),
    ownCheckinIds.length > 0
      ? prisma.assetCheckin.findMany({ where: { id: { in: ownCheckinIds } }, select: { id: true, documentNo: true } })
      : Promise.resolve([]),
  ])
  const ownCheckinDocumentNos = new Map(ownCheckins.map((checkin) => [checkin.id, checkin.documentNo]))
  const header = {
    name: asset.name,
    assetTag: asset.assetTag,
    holder: getRegisterHolderLine({
      ownership: normalizeAssetOwnershipType(asset.ownershipType),
      custodian: asset.custodian ? { name: asset.custodian.fullNameTh, departmentName: asset.custodian.department.name } : null,
    }),
    room: asset.currentLocation.name,
  }

  // The relationship map as the asset page draws it (P4-R3: unchanged, no menu); a stored role shows its label (P4-R4).
  const roleText = (stored: string) => {
    const key = componentRoleLabelKey(stored)
    return key ? t(key) : stored
  }
  const roleWithSlot = (role: string, slotNo: string | null) => (slotNo ? t("componentsTab.roleWithSlot", { role: roleText(role), slot: slotNo }) : roleText(role))
  const parentLinks: RelationshipLink[] = asset.installedInLinks.map((link) => ({
    id: link.id,
    href: `/${locale}/assets/${link.parentAsset.id}`,
    label: `${link.parentAsset.assetTag} - ${link.parentAsset.name}`,
    role: roleWithSlot(link.componentRole, link.slotNo),
    note: isOutstandingLink(link)
      ? formatOutstandingComponentLine({
          holder: asset.custodian ? { code: asset.custodian.code, fullNameTh: asset.custodian.fullNameTh } : null,
          documentNo: link.referenceType === "checkin" && link.referenceId ? ownCheckinDocumentNos.get(link.referenceId) ?? null : null,
        }, outstandingWords)
      : null,
  }))
  const currentLinkCount = componentRows.installedCount + componentRows.outstandingCount
  const parentTag = parentLinks.length > 0 ? asset.installedInLinks[0].parentAsset.assetTag : ""
  const holderValue = header.holder.kind === "holder" ? header.holder.name : header.holder.kind === "shared" ? t("holderSharedShort") : t("noCustodian")
  const relationshipMap = (
    <AssetRelationshipMap
      title={t("relationshipMap")}
      subtitle={t("relationshipMapHelp")}
      parentLaneTitle={t("relationshipParentLane")}
      currentTitle={t("relationshipCurrentViewing")}
      componentsTitle={t("relationshipComponentsLane")}
      componentsCountLabel={t("relationshipComponentsCount", { count: componentRows.installedCount })}
      moreItemsLabel={t("relationshipMoreItems", { count: Math.max(currentLinkCount - 5, 0) })}
      licenseAssignedTitle={t("relationshipLicenseAssignedAsset")}
      assignedLicensesTitle={t("relationshipAssignedLicenses")}
      assetTag={asset.assetTag}
      assetName={asset.name}
      currentMetaLabel={t("custodian")}
      currentMetaValue={holderValue}
      parentLinks={parentLinks}
      childLinks={componentRows.rows.filter((row) => row.state !== "removed").map((row) => ({
        id: row.id,
        href: `/${locale}/assets/${row.componentAsset.id}`,
        label: `${row.componentAsset.assetTag} - ${row.componentAsset.name}`,
        role: roleWithSlot(row.role, row.slotNo),
        note: row.outstandingLine,
      }))}
      licenseAssignedLinks={[]}
      assignedLicenseLinks={[]}
      emptyLabel={t("relationshipMapEmpty")}
      summaryParent={t("relationshipSummaryParent", { count: componentRows.installedCount })}
      summaryComponent={t("relationshipSummaryComponent", { parent: parentTag })}
      summaryParentAndComponent={t("relationshipSummaryParentAndComponent", { parent: parentTag, count: componentRows.installedCount })}
      summaryStandalone={t("relationshipSummaryStandalone")}
      roleParentLabel={t("relationshipRoleParent")}
      roleComponentLabel={t("relationshipRoleComponent")}
      roleParentAndComponentLabel={t("relationshipRoleParentAndComponent")}
      roleStandaloneLabel={t("relationshipRoleStandalone")}
      parentEmptyTitle={t("relationshipNoParent")}
      parentEmptyHelp={t("relationshipNoParentHelp")}
      componentsEmptyTitle={t("relationshipNoComponents")}
      componentsEmptyHelp={t("relationshipNoComponentsHelp")}
      noteLabel={t("relationshipNote")}
    />
  )

  return (
    <AssetComponentManager
      locale={locale}
      assetId={asset.id}
      header={header}
      linkRows={componentRows}
      relationshipMap={relationshipMap}
      canEdit={canEdit}
      returnToHref={returnToHref}
      labels={{
        title: t("manageComponents"),
        back: tCommon("back"),
        history: t("componentHistory"),
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
        installedState: t("componentInstalled"),
        outstandingState: t("componentOutstanding"),
        serial: t("serialNumber"),
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
