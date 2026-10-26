import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { getTransactionOperatorLabel } from "@/lib/transaction-operator-label"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { cn, formatDateTime } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { Notice } from "@/components/ui/notice"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPanelClasses } from "@/lib/design-system"
import { getCategoryPhotoChecklist } from "@/lib/category-photo-checklist"
import { AssetDetailTabs } from "@/components/assets/asset-detail-tabs"
import { AssetComponentsTab } from "@/components/assets/detail/asset-components-tab"
import { AssetDetailActions } from "@/components/assets/detail/asset-detail-actions"
import { AssetDetailFactStrip } from "@/components/assets/detail/asset-detail-fact-strip"
import { AssetDetailHeader } from "@/components/assets/detail/asset-detail-header"
import { AssetFilesTab } from "@/components/assets/detail/asset-files-tab"
import { AssetHistoryTab } from "@/components/assets/detail/asset-history-tab"
import { AssetOverview } from "@/components/assets/detail/asset-overview"
import { parseModelSpecs } from "@/lib/model-specs"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { actionBarPagePadding } from "@/components/ui/action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { getAssetActions, getAssetRecordRepairAction, type AssetActionInput } from "@/lib/asset-actions"
import {
  buildAssetDetailMoreGroups,
  describeAssetAudit,
  describeAssetHolder,
  describeAssetWarranty,
  getDisposalRequestOffer,
  listAssetDataGaps,
  type AssetDataGap,
} from "@/lib/asset-detail-frame-rules"
import { getAssetDetailFrame } from "@/lib/asset-detail-frame"
import { getAssetComponentHistory } from "@/lib/asset-component-history"
import { getAssetFilesTabData } from "@/lib/asset-files-data"
import { getAssetHistory, getLatestAssetHistory } from "@/lib/asset-history"
import { assetDocumentAccess, parseAssetHistoryType } from "@/lib/asset-history-view"
import { getAssetNeighbours } from "@/lib/asset-neighbours"
import { buildRegisterCrumbLabel, parseRegisterReturnTo } from "@/lib/asset-neighbours-rules"
import { isThumbnailable } from "@/lib/attachment-thumbnail"
import { hasAssetResponsibility, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { canCorrectAssetStatus } from "@/lib/asset-lifecycle-exception-policy"
import { appendReturnTo, normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { buildAssetDetailSectionHref, buildAssetDetailViewHref, isAssetDetailSectionVisible, resolveAssetDetailView, type AssetDetailSectionId } from "@/lib/asset-detail-view"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { getAssetDetailLoadPolicy } from "@/lib/asset-detail-data"
import { getAssetDetailCounts } from "@/lib/asset-detail-counts"
import { buildReferenceLabelMap, labelOrDash } from "@/lib/asset-operation-document"
import { parseAssetTransactionSnapshot } from "@/lib/asset-transaction-snapshot"
import { getRepairRecordStatusTone, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { getMissingPhotoChecklistLabels } from "@/lib/asset-detail-format"

type AssetDetailPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[]; view?: string | string[]; type?: string | string[] }>
}

export default async function AssetDetailPage({ params, searchParams }: AssetDetailPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "asset", "view")
  const canEditAsset = hasPermission(user, "asset", "edit")
  const canCreateAsset = hasPermission(user, "asset", "create")
  const canCreateMaintenance = hasPermission(user, "maintenance", "create")
  const canViewMaintenance = hasPermission(user, "maintenance", "view")
  const canCreateDisposal = hasPermission(user, "disposal", "create")
  const canViewDisposal = hasPermission(user, "disposal", "view")
  const canViewEmployee = hasPermission(user, "employee", "view")
  const canViewAudit = hasPermission(user, "audit", "view")
  // The one document access record of the overview and the tabs (R12): each document page's own permission.
  const documentAccess = assetDocumentAccess((module, action) => hasPermission(user, module, action))
  const returnToHref = normalizeAssetReturnTo(locale, rawSearchParams.returnTo)
  const { view: assetDetailView, historyType } = resolveAssetDetailView(rawSearchParams.view)
  // The history's first chip: an explicit ?type= wins over the old view=audit (R17).
  const initialHistoryType = parseAssetHistoryType(rawSearchParams.type) ?? historyType
  // The raw returnTo tells "opened directly" from "the plain register" (spec §7.2).
  const registerParams = parseRegisterReturnTo(rawSearchParams.returnTo, locale)
  const loadPolicy = getAssetDetailLoadPolicy(assetDetailView)
  const scanReturnHref = `/${locale}/asset-management/scan`
  const isAssetScanReturn = returnToHref === scanReturnHref
  const now = new Date()

  const t = await getTranslations("asset")
  const tMaintenance = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  const tCancellation = await getTranslations("transactionCancellation")
  const tDetail = await getTranslations("assetDetail")
  const tDisposal = await getTranslations("disposalPage")
  // The shared action rule's and the history's full message keys (R2).
  const tAll = await getTranslations()
  const [rawAsset, readyStatus, detailCounts] = await withPerformanceTiming(
    "asset-detail.initial-data",
    () => Promise.all([
      prisma.asset.findFirst({
        where: { id, isActive: true },
        include: {
          category: { select: { code: true, name: true } },
          brand: { select: { name: true } },
          model: { select: { id: true, name: true, specs: true } },
          company: { select: { code: true, nameTh: true } },
          branch: { select: { code: true, name: true } },
          department: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true, email: true, department: { select: { code: true, name: true } } } },
          homeLocation: { select: { code: true, name: true } },
          currentLocation: { select: { id: true, code: true, name: true, branch: { select: { name: true } }, parent: { select: { name: true } } } },
          status: { select: { name: true, nameTh: true, colorCode: true } },
          condition: { select: { name: true, nameTh: true, colorCode: true } },
          supplier: { select: { code: true, name: true } },
          checkouts: {
            orderBy: { checkoutDate: "desc" },
            take: loadPolicy.checkoutLimit,
            include: {
              custodian: { select: { code: true, fullNameTh: true } },
              checkins: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: {
                  returnByEmployee: { select: { code: true, fullNameTh: true } },
                  receiveByEmployee: { select: { code: true, fullNameTh: true } },
                },
              },
            },
          },
          attachments: {
            where: { isActive: true },
            orderBy: { uploadedAt: "desc" },
            take: 20,
          },
          purchaseDocumentLinks: {
            orderBy: { linkedAt: "desc" },
            include: {
              purchaseDocument: {
                include: {
                  supplier: { select: { code: true, name: true } },
                },
              },
            },
          },
          parentComponents: {
            orderBy: { installedAt: "desc" },
            include: {
              componentAsset: {
                select: { id: true, assetTag: true, name: true, serialNumber: true },
              },
            },
          },
          installedInLinks: {
            where: { status: "installed", removedAt: null },
            orderBy: { installedAt: "desc" },
            include: {
              parentAsset: {
                select: { id: true, assetTag: true, name: true, serialNumber: true },
              },
              componentAsset: {
                select: { id: true, assetTag: true, name: true, serialNumber: true },
              },
            },
          },
          maintenanceTickets: {
            where: { isActive: true },
            orderBy: { reportedDate: "desc" },
            take: loadPolicy.maintenanceLimit,
            include: {
              reportedBy: { select: { code: true, fullNameTh: true } },
            },
          },
          assignedLicenses: {
            where: { isActive: true },
            orderBy: { assetTag: "asc" },
            take: loadPolicy.assignedLicenseLimit,
            select: {
              id: true,
              assetTag: true,
              name: true,
              licenseTotalSeats: true,
              licenseUsedSeats: true,
            },
          },
        },
      }),
      prisma.assetStatus.findFirst({
        where: { isActive: true, OR: [{ name: "Ready" }, { nameTh: "พร้อมใช้งาน" }] },
        select: { id: true },
      }),
      getAssetDetailCounts(id),
    ]),
    { route: "/assets/[id]", locale }
  )

  const asset = rawAsset
    ? {
        ...rawAsset,
        checkouts: rawAsset.checkouts.map((checkout) => ({
          ...checkout,
          checkin: checkout.checkins[0] ?? null,
        })),
      }
    : null

  if (!asset) notFound()

  // The frame: the open records the action rule and the strip need, the neighbours in the register's list and, on the
  // overview only, the latest three events (spec §5 Performance, §7; R50).
  const [frame, neighbours, recentHistory] = await withPerformanceTiming(
    "asset-detail.frame-data",
    () => Promise.all([
      getAssetDetailFrame(asset.id),
      registerParams ? getAssetNeighbours(registerParams, asset.id) : Promise.resolve(null),
      assetDetailView === "overview" ? getLatestAssetHistory(asset.id, locale, 3) : Promise.resolve(null),
    ]),
    { route: "/assets/[id]", locale },
  )
  // The history tab's own loader (R24): every event, newest first, at most 500, only on its tab.
  const history = assetDetailView === "history"
    ? await withPerformanceTiming("asset-detail.history-tab", () => getAssetHistory(asset.id, locale), { route: "/assets/[id]", locale })
    : null
  // The components tab's install/remove history (R24): both sides of every link, only on its tab.
  const componentHistory = assetDetailView === "components"
    ? await withPerformanceTiming("asset-detail.components-tab", () => getAssetComponentHistory(asset.id), { route: "/assets/[id]", locale })
    : null
  // The files tab's own loader (R24): the asset's files, its purchase documents and the evidence, only on its tab.
  const filesData = assetDetailView === "files"
    ? await withPerformanceTiming(
        "asset-detail.files-tab",
        () =>
          getAssetFilesTabData(
            { id: asset.id, categoryId: asset.categoryId },
            {
              locale,
              componentsHref: buildAssetDetailViewHref(locale, asset.id, "components", returnToHref),
              can: { maintenanceView: canViewMaintenance, auditView: canViewAudit, disposalView: canViewDisposal },
            },
          ),
        { route: "/assets/[id]", locale },
      )
    : null

  const latestTransactionSelect = {
    id: true,
    createdAt: true,
    updatedAt: true,
    transactionStatus: true,
    beforeSnapshotJson: true,
    afterSnapshotJson: true,
  } as const
  const [latestCancellationCheckout, latestCancellationCheckin, latestCancellationTransfer] = canEditAsset
    ? await Promise.all([
        prisma.assetCheckout.findFirst({
          where: { assetId: asset.id },
          orderBy: { createdAt: "desc" },
          select: { ...latestTransactionSelect, checkedOutBy: true },
        }),
        prisma.assetCheckin.findFirst({
          where: { assetId: asset.id },
          orderBy: { createdAt: "desc" },
          select: { ...latestTransactionSelect, receiveBy: true },
        }),
        prisma.assetTransfer.findFirst({
          where: { assetId: asset.id },
          orderBy: { createdAt: "desc" },
          select: { ...latestTransactionSelect, createdBy: true },
        }),
      ])
    : [null, null, null]
  const latestAssetTransaction = [
    latestCancellationCheckout ? { ...latestCancellationCheckout, type: "checkout" as const, operator: latestCancellationCheckout.checkedOutBy } : null,
    latestCancellationCheckin ? { ...latestCancellationCheckin, type: "checkin" as const, operator: latestCancellationCheckin.receiveBy } : null,
    latestCancellationTransfer ? { ...latestCancellationTransfer, type: "transfer" as const, operator: latestCancellationTransfer.createdBy } : null,
  ].filter((transaction): transaction is NonNullable<typeof transaction> => transaction !== null)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null
  // The cancel dialog names who made it: a handover and a transfer store the user's id, a return the receiver's name.
  const latestTransactionOperator = latestAssetTransaction && latestAssetTransaction.type !== "checkin"
    ? await getTransactionOperatorLabel(latestAssetTransaction.operator)
    : latestAssetTransaction?.operator ?? ""
  const cancellationBeforeSnapshot = latestAssetTransaction
    ? parseAssetTransactionSnapshot(latestAssetTransaction.beforeSnapshotJson)
    : null
  const cancellationAfterSnapshot = latestAssetTransaction
    ? parseAssetTransactionSnapshot(latestAssetTransaction.afterSnapshotJson)
    : null
  const cancellationReferenceLabels = await buildReferenceLabelMap([
    cancellationBeforeSnapshot?.statusId,
    cancellationBeforeSnapshot?.currentLocationId,
    cancellationAfterSnapshot?.statusId,
    cancellationAfterSnapshot?.currentLocationId,
  ])

  const currentAssetDetailHref = buildAssetDetailViewHref(locale, asset.id, assetDetailView, returnToHref)

  const assetStatusHelp = {
    title: t("statusHelpTitle"),
    description: t("statusHelpDescription"),
    items: [
      t("statusHelpReady"),
      t("statusHelpPendingRepair"),
      t("statusHelpUnderMaintenance"),
      t("statusHelpPendingDisposal"),
      t("statusHelpLostMissing"),
      t("statusHelpUnderInspection"),
    ],
  }
  const assetConditionHelp = {
    title: t("conditionHelpTitle"),
    description: t("conditionHelpDescription"),
    items: [
      t("conditionHelpGood"),
      t("conditionHelpDamaged"),
      t("conditionHelpNeedsReview"),
      t("conditionHelpMissing"),
    ],
  }

  // R59: the checklist only for the overview's ข้อมูลยังไม่ครบ line; the files tab reads its own through its loader.
  const [photoChecklist, modelPhotos, licenseAssignedAsset] = await Promise.all([
    canEditAsset && assetDetailView === "overview" ? getCategoryPhotoChecklist(asset.categoryId) : Promise.resolve([]),
    asset.model?.id
      ? prisma.attachment.findMany({
          where: { module: "asset_model", referenceId: asset.model.id, isActive: true },
          orderBy: { uploadedAt: "desc" },
        })
      : [],
    asset.licenseAssignedAssetId
      ? prisma.asset.findFirst({
          where: { id: asset.licenseAssignedAssetId, isActive: true },
          select: { id: true, assetTag: true, name: true, serialNumber: true },
        })
      : null,
  ])
  const currentComponents = asset.parentComponents.filter((component) => component.status === "installed" && !component.removedAt)
  const currentComponentsForPanel = currentComponents
  const installedInLinksForPanel = asset.installedInLinks.map((component) => ({
    ...component,
    parentHref: appendReturnTo(`/${locale}/assets/${component.parentAsset.id}`, currentAssetDetailHref),
  }))
  const componentMissingSerialCount = currentComponentsForPanel.filter((component) => !component.componentAsset.serialNumber).length
  // The overview's เอกสารจัดซื้อ row (R31); the files tab's loader builds the full documents with their files.
  const purchaseDocuments = asset.purchaseDocumentLinks.map((link) => ({ id: link.purchaseDocument.id, documentNo: link.purchaseDocument.documentNo }))
  const legacyPurchaseDocuments = asset.attachments.filter((attachment) => attachment.module === "asset_purchase")
  const assetAttachments = asset.attachments.filter((attachment) => attachment.module === "asset")
  const primaryAssetPhoto = assetAttachments.find((attachment) => isThumbnailable(attachment.fileType))
  const primaryModelPhoto = modelPhotos.find((attachment) => isThumbnailable(attachment.fileType))
  const ownershipType = normalizeAssetOwnershipType(asset.ownershipType)
  const modelSpecs = parseModelSpecs(asset.model?.specs)
  const openMaintenanceCount = asset.maintenanceTickets.filter((ticket) => !["closed", "cancelled"].includes(ticket.repairStatus)).length
  const latestMaintenanceTicket = asset.maintenanceTickets[0]
  const totalMaintenanceCost = asset.maintenanceTickets.reduce((total, ticket) => total + Number(ticket.repairCost ?? 0), 0)
  const maintenanceReplacementWarning =
    asset.maintenanceTickets.length >= 3 ||
    (asset.purchasePrice && totalMaintenanceCost >= Number(asset.purchasePrice) * 0.5)
  const encodedAssetId = encodeURIComponent(asset.id)
  const editHref = appendReturnTo(`/${locale}/assets/${asset.id}/edit`, returnToHref)
  // The edit form's purchase section (asset-form.tsx): the strip's "บันทึกข้อมูลการซื้อ" and the overview's "เพิ่มข้อมูล".
  const purchaseEditHref = `${editHref}#purchase`
  const printLabelHref = `/${locale}/assets/${asset.id}/label`
  const cloneHref = appendReturnTo(`/${locale}/assets/new?cloneFrom=${encodedAssetId}`, returnToHref)
  const componentsManagerHref = appendReturnTo(`/${locale}/assets/${asset.id}/components`, buildAssetDetailViewHref(locale, asset.id, "components", returnToHref))
  // A link to a section of another view opens that view (wiki open question 43).
  const sectionHref = (sectionId: AssetDetailSectionId) => buildAssetDetailSectionHref(locale, asset.id, assetDetailView, sectionId, returnToHref)
  const photosHref = sectionHref("photos")
  const maintenanceSummary = openMaintenanceCount > 0
    ? t("openMaintenanceCount", { count: openMaintenanceCount })
    : latestMaintenanceTicket
      ? t("latestMaintenanceSummary", { repairNo: latestMaintenanceTicket.repairNo })
      : tCommon("noData")
  const maintenanceHref = `/${locale}/maintenance/new?assetId=${encodedAssetId}`

  // The shared action rule of the register's rows and this page (group 1 spec §7.1; R1-R4): the same primary and the
  // same transaction items in both places.
  const actionInput: AssetActionInput = {
    locale,
    assetId: asset.id,
    statusName: asset.status.name,
    ownership: ownershipType,
    custodianId: asset.custodianId,
    openCheckoutId: frame.openCheckout?.id ?? null,
    openCheckoutHandoverMode: frame.openCheckout?.handoverMode ?? null,
    openRepairId: frame.openRepairId,
    openDisposalId: frame.openDisposalId,
    returnTo: currentAssetDetailHref,
    can: { assetEdit: canEditAsset, maintenanceCreate: canCreateMaintenance, maintenanceView: canViewMaintenance, disposalView: canViewDisposal },
  }
  const assetActions = getAssetActions(actionInput)
  const recordRepairAction = assetActions.primary?.key === "recordRepair" ? null : getAssetRecordRepairAction(actionInput)
  const primary = assetActions.primary ? { key: assetActions.primary.key, label: tAll(assetActions.primary.labelKey), href: assetActions.primary.href } : null
  const recordRepair = recordRepairAction ? { key: "recordRepair", label: tAll(recordRepairAction.labelKey), href: recordRepairAction.href } : null

  // ข้อมูลยังไม่ครบ (R59): today's data-health checks as one line for a person who may fix them.
  const dataGaps = canEditAsset
    ? listAssetDataGaps({
        ownership: ownershipType,
        hasSerial: Boolean(asset.serialNumber),
        hasResponsibility: hasAssetResponsibility(asset),
        hasPrimaryPhoto: Boolean(primaryAssetPhoto),
        missingChecklistCount: getMissingPhotoChecklistLabels(photoChecklist, assetAttachments).length,
        hasPurchaseDocument: purchaseDocuments.length > 0 || legacyPurchaseDocuments.length > 0,
        hasWarrantyEnd: Boolean(asset.warrantyEndDate),
        hasLicenseSeats: asset.licenseTotalSeats != null,
      })
    : []
  // The hash goes after editHref's query, as purchaseEditHref's does.
  const dataGapHref = (gap: AssetDataGap) =>
    gap.target === "files" ? photosHref : gap.target === "purchaseDocuments" ? sectionHref("purchase-documents") : `${editHref}${gap.anchor ? `#${gap.anchor}` : ""}`

  const disposalOffer = getDisposalRequestOffer({ canCreate: canCreateDisposal, status: asset.status, openDisposalId: frame.openDisposalId, blockers: frame.disposalBlockers })
  const cancelTransaction =
    canEditAsset && latestAssetTransaction?.transactionStatus === "active"
      ? {
          type: latestAssetTransaction.type,
          transactionId: latestAssetTransaction.id,
          expectedUpdatedAt: latestAssetTransaction.updatedAt.toISOString(),
          originalOperator: latestTransactionOperator,
          currentState: formatCancellationSnapshot(cancellationAfterSnapshot, cancellationReferenceLabels),
          restoreState: formatCancellationSnapshot(cancellationBeforeSnapshot, cancellationReferenceLabels),
          componentCount: cancellationBeforeSnapshot?.components.length ?? 0,
          labels: buildCancellationLabels(tCancellation),
        }
      : undefined
  const statusCorrection =
    canEditAsset && readyStatus && canCorrectAssetStatus(asset.status)
      ? {
          assetId: asset.id,
          readyStatusId: readyStatus.id,
          labels: {
            button: t("statusCorrectionButton"),
            title: t("statusCorrectionTitle"),
            description: t("statusCorrectionDescription"),
            reason: t("statusCorrectionReason"),
            reasonPlaceholder: t("statusCorrectionReasonPlaceholder"),
            cancel: tCommon("cancel"),
            submit: t("statusCorrectionSubmit"),
            errorFallback: t("statusCorrectionError"),
          },
        }
      : null
  // อื่น ๆ and the phone sheet (spec §7.1, §7.8; R3, R5, R21, R57).
  const moreGroups = buildAssetDetailMoreGroups({
    primaryKey: assetActions.primary?.key ?? null,
    transactions: assetActions.transactions.map((action) => ({
      key: action.key,
      label: tAll(action.labelKey),
      href: action.href,
      enabled: action.enabled,
      reason: action.reasonKey ? tAll(action.reasonKey) : null,
    })),
    recordRepair: isAssetScanReturn && recordRepair ? { label: recordRepair.label, href: recordRepair.href } : null,
    disposal: disposalOffer
      ? {
          label: tDetail("requestDisposal"),
          href: `/${locale}/disposal/new?assetId=${encodedAssetId}`,
          reason: disposalOffer.blocker ? tDisposal(`readinessBlockers.${disposalOffer.blocker}`) : null,
        }
      : null,
    correctStatus: statusCorrection ? t("statusCorrectionButton") : null,
    cancelLatest: cancelTransaction ? tDetail("cancelLatest") : null,
    manageComponents: canEditAsset ? { label: t("manageComponents"), href: componentsManagerHref } : null,
    clone: canCreateAsset ? { label: t("cloneAsset"), href: cloneHref } : null,
    edit: canEditAsset ? { label: tCommon("edit"), href: editHref } : null,
    printLabel: { label: t("printLabel"), href: printLabelHref },
  })

  // The trail's middle crumb and previous / next in the register's list (spec §7.2; R8, R10).
  const crumb = registerParams ? buildRegisterCrumbLabel(registerParams) : null
  const neighbourNav = neighbours
    ? {
        position: neighbours.index,
        total: neighbours.total,
        previousHref: neighbours.previousId ? appendReturnTo(`/${locale}/assets/${encodeURIComponent(neighbours.previousId)}`, returnToHref) : null,
        nextHref: neighbours.nextId ? appendReturnTo(`/${locale}/assets/${encodeURIComponent(neighbours.nextId)}`, returnToHref) : null,
      }
    : null

  const componentsTabHref = buildAssetDetailViewHref(locale, asset.id, "components", returnToHref)
  const recent = recentHistory
    ? { events: recentHistory, total: detailCounts.history, historyHref: buildAssetDetailViewHref(locale, asset.id, "history", returnToHref) }
    : null

  return (
    <div className={`space-y-6 ${actionBarPagePadding.single}`}>
      <AssetDetailHeader
        asset={{
          assetTag: asset.assetTag,
          name: asset.name,
          // No licence key in the meta row (R35).
          serialNumber: ownershipType === "software_license" ? null : asset.serialNumber,
          status: asset.status,
        }}
        returnToHref={returnToHref}
        backLabel={isAssetScanReturn ? t("backToScan") : registerParams ? tDetail("backToResults") : tCommon("back")}
        crumbLabel={crumb ? (crumb.kind === "search" ? t("registerCrumbSearch", { search: crumb.text }) : t("registerCrumbFilters")) : null}
        neighbours={neighbourNav}
        statusHelp={assetStatusHelp}
        actions={
          <AssetDetailActions
            asset={{ assetTag: asset.assetTag, name: asset.name }}
            primary={primary}
            printLabel={{ key: "printLabel", label: t("printLabel"), href: printLabelHref }}
            recordRepair={recordRepair}
            scanNext={isAssetScanReturn ? { key: "scanNext", label: t("scanNext"), href: scanReturnHref } : null}
            groups={moreGroups}
            cancelTransaction={cancelTransaction}
            statusCorrection={statusCorrection}
          />
        }
      />

      <AssetDetailTabs
        locale={locale}
        assetId={asset.id}
        view={assetDetailView}
        returnTo={returnToHref}
        label={t("detailViews.label")}
        labels={{
          overview: t("detailViews.overview"),
          history: t("detailViews.history"),
          components: t("detailViews.components"),
          files: t("detailViews.files"),
          maintenance: t("detailViews.maintenance"),
        }}
        indicators={{
          history: { count: detailCounts.history },
          components: { count: detailCounts.components, hasWarning: componentMissingSerialCount > 0 },
          files: { count: detailCounts.files },
          maintenance: { count: detailCounts.repairs },
        }}
        warningLabel={t("componentMissingSerial")}
      />

      <AssetDetailFactStrip
        locale={locale}
        holder={describeAssetHolder({
          ownership: ownershipType,
          custodian: asset.custodian
            ? {
                id: asset.custodianId ?? "",
                code: asset.custodian.code,
                fullNameTh: asset.custodian.fullNameTh,
                department: asset.custodian.department ? `${asset.custodian.department.code} - ${asset.custodian.department.name}` : null,
              }
            : null,
          department: asset.department ? `${asset.department.code} - ${asset.department.name}` : null,
          parent: installedInLinksForPanel[0]?.parentAsset ?? null,
          seats: { used: asset.licenseUsedSeats, total: asset.licenseTotalSeats },
          openCheckoutDate: frame.openCheckout?.checkoutDate ?? null,
          now,
        })}
        location={{
          id: asset.currentLocation.id,
          name: asset.currentLocation.name,
          branchName: asset.currentLocation.branch?.name ?? null,
          parentName: asset.currentLocation.parent?.name ?? null,
        }}
        audit={describeAssetAudit(frame.latestAuditResult, frame.pendingAudit)}
        warranty={describeAssetWarranty(asset.warrantyEndDate, now)}
        parentHref={installedInLinksForPanel[0]?.parentHref ?? null}
        canViewEmployee={canViewEmployee}
        canViewAudit={canViewAudit}
        purchaseEditHref={canEditAsset ? purchaseEditHref : null}
        className={assetDetailView === "overview" ? undefined : "max-md:hidden"}
      />

      {assetDetailView === "overview" ? (
        <AssetOverview
          locale={locale}
          canEdit={canEditAsset}
          editHref={editHref}
          purchaseEditHref={purchaseEditHref}
          details={{
            category: asset.category,
            company: asset.company,
            branch: asset.branch,
            brandModel: [asset.brand?.name, asset.model?.name].filter(Boolean).join(" / ") || null,
            serial: { isLicenseKey: ownershipType === "software_license", value: asset.serialNumber },
            condition: asset.condition,
            ownershipType,
            department: asset.department,
            homeLocation: asset.homeLocation,
            licenseDevice: licenseAssignedAsset
              ? { assetTag: licenseAssignedAsset.assetTag, name: licenseAssignedAsset.name, href: `/${locale}/assets/${encodeURIComponent(licenseAssignedAsset.id)}` }
              : null,
            registeredAt: asset.createdAt,
            latestHandover: frame.latestHandover
              ? { code: frame.latestHandover.documentNo ?? frame.latestHandover.id, href: `/${locale}/asset-management/checkouts/${frame.latestHandover.id}` }
              : null,
            remark: asset.remark,
            specs: { items: modelSpecs.items, notes: modelSpecs.notes || null },
            purchase: {
              price: asset.purchasePrice == null ? null : Number(asset.purchasePrice),
              date: asset.purchaseDate,
              supplier: asset.supplier,
              warrantyStart: asset.warrantyStartDate,
              warrantyEnd: asset.warrantyEndDate,
              poNumber: asset.poNumber,
              invoiceNumber: asset.invoiceNumber,
              fixedAssetCode: asset.fixedAssetCode,
              documents: purchaseDocuments.map((document) => ({ id: document.id, documentNo: document.documentNo ?? document.id })),
              documentsHref: sectionHref("purchase-documents"),
            },
          }}
          conditionHelp={assetConditionHelp}
          photo={{
            attachmentId: primaryAssetPhoto?.id ?? primaryModelPhoto?.id ?? null,
            isModelPhoto: !primaryAssetPhoto && Boolean(primaryModelPhoto),
            alt: asset.name,
            uploadHref: photosHref,
          }}
          recent={recent}
          documentAccess={documentAccess}
          components={{
            children: currentComponentsForPanel.map((component) => ({
              id: component.id,
              assetTag: component.componentAsset.assetTag,
              name: component.componentAsset.name,
              href: `/${locale}/assets/${encodeURIComponent(component.componentAsset.id)}`,
            })),
            parent: installedInLinksForPanel[0]
              ? { assetTag: installedInLinksForPanel[0].parentAsset.assetTag, name: installedInLinksForPanel[0].parentAsset.name, href: installedInLinksForPanel[0].parentHref }
              : null,
            manageHref: canEditAsset ? componentsTabHref : null,
            allHref: componentsTabHref,
          }}
          dataGaps={dataGaps.map((gap) => ({
            key: gap.key,
            label: tAll(gap.labelKey, gap.count === undefined ? undefined : { count: formatCount(gap.count) }),
            href: dataGapHref(gap),
          }))}
        />
      ) : null}

      {history ? (
        <AssetHistoryTab assetId={asset.id} locale={locale} history={history} initialType={initialHistoryType} documentAccess={documentAccess} />
      ) : null}

      <div className="space-y-6">
        {isAssetDetailSectionVisible(assetDetailView, "components") && componentHistory ? (
          <AssetComponentsTab
            locale={locale}
            asset={{ id: asset.id, assetTag: asset.assetTag, name: asset.name, custodianName: asset.custodian?.fullNameTh ?? null }}
            parents={installedInLinksForPanel.map((link) => ({
              id: link.id,
              href: link.parentHref,
              assetTag: link.parentAsset.assetTag,
              name: link.parentAsset.name,
              role: link.componentRole,
              slotNo: link.slotNo,
            }))}
            components={currentComponentsForPanel.map((component) => ({
              id: component.id,
              href: `/${locale}/assets/${component.componentAsset.id}`,
              assetTag: component.componentAsset.assetTag,
              name: component.componentAsset.name,
              role: component.componentRole,
              slotNo: component.slotNo,
            }))}
            licenseDevice={licenseAssignedAsset}
            assignedLicenses={asset.assignedLicenses}
            manageHref={canEditAsset ? componentsManagerHref : null}
            history={componentHistory}
            documentAccess={documentAccess}
          />
        ) : null}

        {filesData ? <AssetFilesTab locale={locale} assetId={asset.id} data={filesData} canEdit={canEditAsset} /> : null}

        {isAssetDetailSectionVisible(assetDetailView, "maintenance") ? (
          <section id="maintenance" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
          <SectionHeading title={tMaintenance("maintenanceHistory")} subtitle={t("detailSections.maintenanceSubtitle")} />
          <StatStrip
            className="mb-4"
            items={[
              {
                key: "open",
                label: t("openMaintenance"),
                value: formatCount(openMaintenanceCount),
                ...(openMaintenanceCount > 0 ? { foot: maintenanceSummary, attention: true } : {}),
              },
              {
                key: "total",
                label: t("totalMaintenance"),
                value: formatCount(asset.maintenanceTickets.length),
                foot: latestMaintenanceTicket ? t("latestMaintenanceSummary", { repairNo: latestMaintenanceTicket.repairNo }) : undefined,
              },
              { key: "cost", label: t("maintenanceTotalCost"), value: formatMoney(totalMaintenanceCost), unit: tCommon("baht") },
            ]}
          />
          {maintenanceReplacementWarning ? (
            <Notice tone="warning" className="mb-4">
              {t("maintenanceReplacementWarning")}
            </Notice>
          ) : null}
          {asset.maintenanceTickets.length === 0 ? (
            <ActionEmptyState
              icon={<Wrench className="h-6 w-6" />}
              title={t("noMaintenanceTitle")}
              description={t("noMaintenanceHelp")}
              actionHref={maintenanceHref}
              actionLabel={t("quickMaintenance")}
            />
          ) : (
            <DataTable framed={false} caption={tMaintenance("maintenanceHistory")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{tMaintenance("repairNo")}</DataTableHead>
                  <DataTableHead>{tMaintenance("problem")}</DataTableHead>
                  <DataTableHead>{tMaintenance("reportedBy")}</DataTableHead>
                  <DataTableHead>{tCommon("status")}</DataTableHead>
                  <DataTableHead>{tMaintenance("reportedDate")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {asset.maintenanceTickets.map((ticket) => (
                  <ClickableTableRow
                    key={ticket.id}
                    href={`/${locale}/maintenance/${ticket.id}`}
                    label={`${tCommon("view")}: ${ticket.repairNo}`}
                  >
                    <DataTableCell className="whitespace-nowrap">
                      <Link href={`/${locale}/maintenance/${ticket.id}`} className={linkVariants({ size: "inherit" })}>
                        <span className="tag">{ticket.repairNo}</span>
                      </Link>
                    </DataTableCell>
                    <DataTableCell className="min-w-72 text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-2">
                        {Boolean(ticket.maintenancePlanId) ? <Chip>{t("maintenancePmBadge")}</Chip> : null}
                        <span>{ticket.problem}</span>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      <span className="tag">{ticket.reportedBy.code}</span> - {ticket.reportedBy.fullNameTh}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <StatusBadge label={tMaintenance(`statuses.${toRepairRecordStatus(ticket.repairStatus)}`)} tone={getRepairRecordStatusTone(ticket.repairStatus)} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(ticket.reportedDate)}</DataTableCell>
                  </ClickableTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
          </section>
        ) : null}

      </div>
    </div>
  )
}

// The head of a section that needs an id (it cannot be ContentPanel): the same 16px title and line as ContentPanel's.
function SectionHeading({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-4">
      <h2 className="break-words text-base font-semibold text-foreground">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  )
}

function formatCancellationSnapshot(
  snapshot: ReturnType<typeof parseAssetTransactionSnapshot>,
  labels: Map<string, string>,
) {
  if (!snapshot) return null
  return `${labelOrDash(labels, snapshot.statusId)} · ${labelOrDash(labels, snapshot.currentLocationId)}`
}

function buildCancellationLabels(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    action: t("action"), title: t("title"), description: t("description"), reasonLabel: t("reasonLabel"),
    reasonPlaceholder: t("reasonPlaceholder"), confirm: t("confirm"), cancel: t("cancel"), loading: t("loading"),
    blockedTitle: t("blockedTitle"), blockedDescription: t("blockedDescription"), success: t("success"), error: t("error"),
    reasonTooShort: t("reasonTooShort"), operator: t("operator"), currentState: t("currentState"), restoreState: t("restoreState"),
    components: t("components"), blockers: {
      unsupported_snapshot: t("blockers.unsupported_snapshot"), not_active: t("blockers.not_active"), not_latest: t("blockers.not_latest"),
      asset_changed: t("blockers.asset_changed"), components_changed: t("blockers.components_changed"), downstream_work: t("blockers.downstream_work"),
    },
  }
}

