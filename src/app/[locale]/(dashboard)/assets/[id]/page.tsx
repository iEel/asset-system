import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ChevronDown, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { getTransactionOperatorLabel } from "@/lib/transaction-operator-label"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { StatStrip } from "@/components/ui/stat-strip"
import { AssetAttachments } from "@/components/assets/asset-attachments"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPanelClasses } from "@/lib/design-system"
import { getCategoryPhotoChecklist } from "@/lib/category-photo-checklist"
import { AssetDetailTabs } from "@/components/assets/asset-detail-tabs"
import { AssetPurchaseDocuments } from "@/components/assets/asset-purchase-documents"
import { AssetComponentsTab } from "@/components/assets/detail/asset-components-tab"
import { AssetDetailActions } from "@/components/assets/detail/asset-detail-actions"
import { AssetDetailFactStrip } from "@/components/assets/detail/asset-detail-fact-strip"
import { AssetDetailHeader } from "@/components/assets/detail/asset-detail-header"
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

  const evidenceCheckoutReferences = await withPerformanceTiming(
    "asset-detail.evidence-references",
    () => prisma.assetCheckout.findMany({
      where: { assetId: asset.id },
      select: { id: true, checkins: { select: { id: true } } },
    }),
    { route: "/assets/[id]", locale },
  )
  const evidenceCheckoutIds = evidenceCheckoutReferences.map((checkout) => checkout.id)
  const evidenceCheckinIds = evidenceCheckoutReferences.flatMap((checkout) => checkout.checkins.map((checkin) => checkin.id))

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

  const [photoChecklist, modelPhotos, licenseAssignedAsset] = await Promise.all([
    getCategoryPhotoChecklist(asset.categoryId),
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
  const componentLinks = [...asset.parentComponents, ...asset.installedInLinks]
  const componentLinkIds = componentLinks.map((component) => component.id)
  const purchaseDocumentIds = asset.purchaseDocumentLinks.map((link) => link.purchaseDocumentId)
  const [purchaseDocumentAttachments, componentAttachments] = await withPerformanceTiming(
    "asset-detail.evidence-data",
    () => Promise.all([
      purchaseDocumentIds.length > 0
        ? prisma.attachment.findMany({
            where: { module: "purchase_document", referenceId: { in: purchaseDocumentIds }, isActive: true },
            orderBy: { uploadedAt: "desc" },
          })
        : [],
      componentLinkIds.length > 0
        ? prisma.attachment.findMany({
            where: { module: { in: ["asset_component_install", "asset_component_remove"] }, referenceId: { in: componentLinkIds }, isActive: true },
            orderBy: { uploadedAt: "asc" },
          })
        : [],
    ]),
    {
      route: "/assets/[id]",
      locale,
      purchaseDocuments: purchaseDocumentIds.length,
      components: componentLinkIds.length,
    }
  )
  const componentAttachmentsByReference = new Map<string, typeof componentAttachments>()
  for (const attachment of componentAttachments) {
    componentAttachmentsByReference.set(attachment.referenceId, [
      ...(componentAttachmentsByReference.get(attachment.referenceId) ?? []),
      attachment,
    ])
  }
  const currentComponentsForPanel = currentComponents.map((component) => ({
    ...component,
    attachments: componentAttachmentsByReference.get(component.id) ?? [],
  }))
  const installedInLinksForPanel = asset.installedInLinks.map((component) => ({
    ...component,
    parentHref: appendReturnTo(`/${locale}/assets/${component.parentAsset.id}`, currentAssetDetailHref),
    attachments: componentAttachmentsByReference.get(component.id) ?? [],
  }))
  const componentMissingSerialCount = currentComponentsForPanel.filter((component) => !component.componentAsset.serialNumber).length
  const purchaseDocumentAttachmentsByReferenceId = new Map<string, typeof purchaseDocumentAttachments>()
  for (const attachment of purchaseDocumentAttachments) {
    purchaseDocumentAttachmentsByReferenceId.set(attachment.referenceId, [
      ...(purchaseDocumentAttachmentsByReferenceId.get(attachment.referenceId) ?? []),
      attachment,
    ])
  }
  const purchaseDocuments = asset.purchaseDocumentLinks.map((link) => ({
    id: link.purchaseDocument.id,
    documentType: link.purchaseDocument.documentType,
    documentNo: link.purchaseDocument.documentNo,
    poNumber: link.purchaseDocument.poNumber,
    invoiceNumber: link.purchaseDocument.invoiceNumber,
    documentDate: link.purchaseDocument.documentDate,
    linkedAt: link.linkedAt,
    supplierName: link.purchaseDocument.supplier ? `${link.purchaseDocument.supplier.code} - ${link.purchaseDocument.supplier.name}` : null,
    totalAmount: link.purchaseDocument.totalAmount ? Number(link.purchaseDocument.totalAmount) : null,
    currency: link.purchaseDocument.currency,
    attachments: purchaseDocumentAttachmentsByReferenceId.get(link.purchaseDocument.id) ?? [],
  }))
  const legacyPurchaseDocuments = asset.attachments.filter((attachment) => attachment.module === "asset_purchase")
  const assetAttachments = asset.attachments.filter((attachment) => attachment.module === "asset")
  const primaryAssetPhoto = assetAttachments.find((attachment) => isThumbnailable(attachment.fileType))
  const primaryModelPhoto = modelPhotos.find((attachment) => isThumbnailable(attachment.fileType))
  const checkoutIds = asset.checkouts.map((checkout) => checkout.id)
  const checkinIds = asset.checkouts.map((checkout) => checkout.checkin?.id).filter((checkinId): checkinId is string => Boolean(checkinId))
  const [operationAttachments, checkoutDepartments, checkoutLocations, checkoutParentAssets] = await withPerformanceTiming(
    "asset-detail.operation-data",
    () => Promise.all([
      evidenceCheckoutIds.length > 0 || evidenceCheckinIds.length > 0
        ? prisma.attachment.findMany({
            where: {
              isActive: true,
              OR: [
                { module: { in: ["checkout_photo_before", "checkout_receiver_signature"] }, referenceId: { in: evidenceCheckoutIds } },
                { module: { in: ["checkin_photo_after", "checkin_return_signature", "checkin_receive_signature"] }, referenceId: { in: evidenceCheckinIds } },
              ],
            },
            orderBy: { uploadedAt: "asc" },
          })
        : [],
      prisma.department.findMany({
        where: { id: { in: uniqueTruthy(asset.checkouts.map((checkout) => checkout.departmentId)) } },
        select: { id: true, code: true, name: true },
      }),
      prisma.location.findMany({
        where: { id: { in: uniqueTruthy(asset.checkouts.map((checkout) => checkout.locationId)) } },
        select: { id: true, code: true, name: true },
      }),
      prisma.asset.findMany({
        where: { id: { in: uniqueTruthy(asset.checkouts.map((checkout) => checkout.parentAssetId)) } },
        select: { id: true, assetTag: true, name: true },
      }),
    ]),
    {
      route: "/assets/[id]",
      locale,
      checkouts: checkoutIds.length,
      checkins: checkinIds.length,
    }
  )
  const operationAttachmentsByReference = new Map<string, typeof operationAttachments>()
  for (const attachment of operationAttachments) {
    operationAttachmentsByReference.set(attachment.referenceId, [
      ...(operationAttachmentsByReference.get(attachment.referenceId) ?? []),
      attachment,
    ])
  }
  const checkoutDepartmentLabels = new Map(checkoutDepartments.map((department) => [department.id, `${department.code} - ${department.name}`]))
  const checkoutLocationLabels = new Map(checkoutLocations.map((location) => [location.id, `${location.code} - ${location.name}`]))
  const checkoutParentAssetLabels = new Map(checkoutParentAssets.map((parentAsset) => [parentAsset.id, `${parentAsset.assetTag} - ${parentAsset.name}`]))
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

        {/* The files tab's purchase documents, under the anchor ข้อมูลทรัพย์สิน links, until Task 11 (R23, R31). */}
        {isAssetDetailSectionVisible(assetDetailView, "purchase-documents") ? (
          <section id="purchase-documents" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <AssetPurchaseDocuments documents={purchaseDocuments} legacyAttachments={legacyPurchaseDocuments} />
          </section>
        ) : null}

        {isAssetDetailSectionVisible(assetDetailView, "photos") ? (
          <div id="photos" className="scroll-mt-24">
            <AssetAttachments
              assetId={asset.id}
              attachments={assetAttachments}
              modelPhotos={modelPhotos}
              photoChecklist={photoChecklist}
            />
          </div>
        ) : null}

        {isAssetDetailSectionVisible(assetDetailView, "handover") ? (
          <section id="handover" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
          <SectionHeading title={t("detailSections.handover")} subtitle={t("detailSections.handoverSubtitle")} />
          {asset.checkouts.length === 0 ? (
            <EmptyNote>{tCommon("noData")}</EmptyNote>
          ) : (
            <div className="space-y-3">
              {asset.checkouts.map((checkout, index) => {
                const checkoutAttachments = operationAttachmentsByReference.get(checkout.id) ?? []
                const checkinAttachments = checkout.checkin ? operationAttachmentsByReference.get(checkout.checkin.id) ?? [] : []
                const destination = getCheckoutDestination(checkout, {
                  departments: checkoutDepartmentLabels,
                  locations: checkoutLocationLabels,
                  parentAssets: checkoutParentAssetLabels,
                })
                const returnLabel = checkout.checkin ? `${checkout.checkin.documentNo ?? checkout.checkin.id} · ${formatDate(checkout.checkin.returnDate)}` : null
                const handoverModeLabel = getAssetHandoverModeLabel(checkout.handoverMode, {
                  permanent: t("handoverPermanentAssignment"),
                  temporary: t("handoverTemporaryLoan"),
                  legacy: t("handoverModeLegacy"),
                })
                const evidenceGrid = (
                  <HandoverEvidenceGrid
                    checkoutAttachments={checkoutAttachments}
                    checkinAttachments={checkinAttachments}
                    labels={{
                      checkoutPhotoBefore: t("checkoutPhotoBefore"),
                      receiverSignature: t("receiverSignature"),
                      checkinPhotoAfter: t("checkinPhotoAfter"),
                      returnSignature: t("returnSignature"),
                      receiveSignature: t("receiveSignature"),
                      noEvidence: t("noEvidence"),
                    }}
                  />
                )

                return index === 0 ? (
                  <div key={checkout.id} className="rounded-md border border-border bg-background p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip>{t("latestTransaction")}</Chip>
                          <span className="font-semibold text-foreground">{formatDate(checkout.checkoutDate)}</span>
                          <StatusBadge label={checkout.isReturned ? t("handoverReturned") : t("handoverActive")} tone={checkout.isReturned ? "success" : "info"} />
                        </div>
                        <KeyValueList
                          className="mt-2"
                          items={[
                            { key: "documentNo", label: t("documentNo"), value: <span className="tag">{checkout.documentNo ?? checkout.id}</span> },
                            { key: "handoverMode", label: t("handoverMode"), value: handoverModeLabel },
                            { key: "handoverTo", label: t("handoverTo"), value: destination },
                            ...(checkout.handoverMode === "temporary_loan"
                              ? [{ key: "expectedReturnDate", label: t("expectedReturnDate"), value: checkout.expectedReturnDate ? formatDate(checkout.expectedReturnDate) : null }]
                              : []),
                            { key: "returnDate", label: t("returnDate"), value: returnLabel },
                            { key: "remark", label: t("remark"), value: checkout.remark },
                          ]}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/${locale}/asset-management/checkouts/${checkout.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          {t("openHandoverDocument")}
                        </Link>
                        {checkout.checkin ? (
                          <Link href={`/${locale}/asset-management/checkins/${checkout.checkin.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                            {t("openReturnDocument")}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    {evidenceGrid}
                  </div>
                ) : (
                  <details key={checkout.id} className="group rounded-md border border-border bg-background">
                    <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 marker:hidden md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground">{formatDate(checkout.checkoutDate)}</span>
                          <StatusBadge label={checkout.isReturned ? t("handoverReturned") : t("handoverActive")} tone={checkout.isReturned ? "success" : "info"} />
                        </div>
                        <KeyValueList
                          className="mt-2"
                          items={[
                            { key: "documentNo", label: t("documentNo"), value: <span className="tag">{checkout.documentNo ?? checkout.id}</span> },
                            { key: "handoverMode", label: t("handoverMode"), value: handoverModeLabel },
                            { key: "handoverTo", label: t("handoverTo"), value: destination },
                            { key: "returnDate", label: t("returnDate"), value: returnLabel },
                            { key: "remark", label: t("remark"), value: checkout.remark },
                          ]}
                        />
                      </div>
                      {/* The summary is the control: its cue reads as a text link with a turning chevron, not as a second button. */}
                      <span className={cn(linkVariants(), "inline-flex shrink-0 items-center gap-1")}>
                        {t("viewEvidence")}
                        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                      </span>
                    </summary>
                    <div className="border-t border-border px-4 pb-4 pt-3">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Link href={`/${locale}/asset-management/checkouts/${checkout.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          {t("openHandoverDocument")}
                        </Link>
                        {checkout.checkin ? (
                          <Link href={`/${locale}/asset-management/checkins/${checkout.checkin.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                            {t("openReturnDocument")}
                          </Link>
                        ) : null}
                      </div>
                      {evidenceGrid}
                    </div>
                  </details>
                )
              })}
            </div>
          )}
          </section>
        ) : null}

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

function EvidenceLinks({
  title,
  attachments,
  emptyLabel,
}: {
  title: string
  attachments: { id: string; originalName: string; fileType: string }[]
  emptyLabel: string
}) {
  // A column of the handover card, not a box of its own (no box in a box, 2D-2 R4); the files keep their link cards.
  return (
    <div className="min-w-0">
      <h3 className="text-meta font-medium text-muted-foreground">{title}</h3>
      {attachments.length === 0 ? (
        <EmptyNote className="mt-2">{emptyLabel}</EmptyNote>
      ) : (
        <div className="mt-2 grid gap-2">
          {attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={`/api/attachments/${attachment.id}?inline=1`}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-md border border-border bg-surface transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={attachment.originalName}
            >
              {attachment.fileType.startsWith("image/") ? (
                <div className="flex aspect-video w-full items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/attachments/${attachment.id}?inline=1`} alt={attachment.originalName} loading="lazy" className="max-h-full w-full object-contain bg-image-stage" />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center p-3 text-sm font-medium text-muted-foreground">
                  {attachment.fileType}
                </div>
              )}
              <div className="truncate border-t border-border px-2 py-1.5 text-meta font-medium text-foreground">
                {attachment.originalName}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function HandoverEvidenceGrid({
  checkoutAttachments,
  checkinAttachments,
  labels,
}: {
  checkoutAttachments: { id: string; originalName: string; fileType: string; module: string }[]
  checkinAttachments: { id: string; originalName: string; fileType: string; module: string }[]
  labels: {
    checkoutPhotoBefore: string
    receiverSignature: string
    checkinPhotoAfter: string
    returnSignature: string
    receiveSignature: string
    noEvidence: string
  }
}) {
  return (
    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      <EvidenceLinks title={labels.checkoutPhotoBefore} attachments={checkoutAttachments.filter((attachment) => attachment.module === "checkout_photo_before")} emptyLabel={labels.noEvidence} />
      <EvidenceLinks title={labels.receiverSignature} attachments={checkoutAttachments.filter((attachment) => attachment.module === "checkout_receiver_signature")} emptyLabel={labels.noEvidence} />
      <EvidenceLinks title={labels.checkinPhotoAfter} attachments={checkinAttachments.filter((attachment) => attachment.module === "checkin_photo_after")} emptyLabel={labels.noEvidence} />
      <EvidenceLinks title={labels.returnSignature} attachments={checkinAttachments.filter((attachment) => attachment.module === "checkin_return_signature")} emptyLabel={labels.noEvidence} />
      <EvidenceLinks title={labels.receiveSignature} attachments={checkinAttachments.filter((attachment) => attachment.module === "checkin_receive_signature")} emptyLabel={labels.noEvidence} />
    </div>
  )
}

function uniqueTruthy(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function getCheckoutDestination(
  checkout: {
    checkoutType: string
    custodian: { code: string; fullNameTh: string } | null
    departmentId: string | null
    locationId: string | null
    parentAssetId: string | null
  },
  labels: {
    departments: Map<string, string>
    locations: Map<string, string>
    parentAssets: Map<string, string>
  }
) {
  if (checkout.checkoutType === "user" && checkout.custodian) return `${checkout.custodian.code} - ${checkout.custodian.fullNameTh}`
  if (checkout.checkoutType === "department" && checkout.departmentId) return labels.departments.get(checkout.departmentId) ?? checkout.departmentId
  if (checkout.checkoutType === "location" && checkout.locationId) return labels.locations.get(checkout.locationId) ?? checkout.locationId
  if (checkout.checkoutType === "asset" && checkout.parentAssetId) return labels.parentAssets.get(checkout.parentAssetId) ?? checkout.parentAssetId
  return null
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

function getAssetHandoverModeLabel(
  handoverMode: string | null | undefined,
  labels: { permanent: string; temporary: string; legacy: string },
) {
  if (handoverMode === "permanent_assignment") return labels.permanent
  if (handoverMode === "temporary_loan") return labels.temporary
  return labels.legacy
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

