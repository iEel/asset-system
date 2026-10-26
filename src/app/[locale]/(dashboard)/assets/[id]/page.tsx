import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Info as InfoIcon,
  PackageCheck,
  Puzzle,
  ScanLine,
  Wrench,
} from "lucide-react"
import { prisma } from "@/lib/db"
import { getTransactionOperatorLabel } from "@/lib/transaction-operator-label"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { StatStrip } from "@/components/ui/stat-strip"
import { AssetAttachments } from "@/components/assets/asset-attachments"
import { StatusBadge } from "@/components/ui/status-badge"
import { getPanelClasses } from "@/lib/design-system"
import { getCategoryPhotoChecklist } from "@/lib/category-photo-checklist"
import { AssetComponentsSummary } from "@/components/assets/asset-components-summary"
import { AssetDetailTabs } from "@/components/assets/asset-detail-tabs"
import { AssetPurchaseDocuments } from "@/components/assets/asset-purchase-documents"
import { AssetDetailActions } from "@/components/assets/detail/asset-detail-actions"
import { AssetDetailFactStrip } from "@/components/assets/detail/asset-detail-fact-strip"
import { AssetDetailHeader } from "@/components/assets/detail/asset-detail-header"
import { AssetOverview } from "@/components/assets/detail/asset-overview"
import { parseModelSpecs } from "@/lib/model-specs"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AssetMovementTimeline, type AssetMovementTimelineItem } from "@/components/assets/asset-movement-timeline"
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
import { getLatestAssetHistory } from "@/lib/asset-history"
import { ASSET_MOVEMENT_DOCUMENT_PERMISSION, type AssetMovementDocumentKind } from "@/lib/asset-movement-labels"
import { getAssetNeighbours } from "@/lib/asset-neighbours"
import { buildRegisterCrumbLabel, parseRegisterReturnTo } from "@/lib/asset-neighbours-rules"
import { isThumbnailable } from "@/lib/attachment-thumbnail"
import { hasAssetResponsibility, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { canCorrectAssetStatus } from "@/lib/asset-lifecycle-exception-policy"
import { appendReturnTo, normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { buildAssetDetailSectionHref, buildAssetDetailViewHref, isAssetDetailSectionVisible, resolveAssetDetailView, type AssetDetailSectionId } from "@/lib/asset-detail-view"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { splitRelationshipPreview } from "@/lib/asset-relationship-preview"
import { getAuditRoundItemResultLabelKey, getAuditRoundItemStatusLabelKey } from "@/lib/audit-round-result-filters"
import { getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"
import { getAssetDetailLoadPolicy } from "@/lib/asset-detail-data"
import { getAssetDetailCounts } from "@/lib/asset-detail-counts"
import { buildReferenceLabelMap, labelOrDash } from "@/lib/asset-operation-document"
import { parseAssetTransactionSnapshot } from "@/lib/asset-transaction-snapshot"
import { getRepairRecordStatusTone, toRepairRecordStatus } from "@/lib/repair-record-policy"
import {
  compactMovementDetails,
  formatMovementType,
  getMissingPhotoChecklistLabels,
} from "@/lib/asset-detail-format"

type AssetDetailPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[]; view?: string | string[] }>
}

type MovementCustodyDetail = {
  label: string
  value?: string | null
  href?: string
}

type MovementTimelineItem = {
  id: string
  title: string
  summary: string
  category: string
  tone: MovementTone
  performedAt: Date
  from: string | null | undefined
  to: string | null | undefined
  reason: string | null
  details: MovementCustodyDetail[]
}

type MovementTone = "neutral" | "success" | "info" | "warning" | "danger"

type RelationshipLink = { id: string; href: string; label: string; role: string }

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
  const returnToHref = normalizeAssetReturnTo(locale, rawSearchParams.returnTo)
  const { view: assetDetailView } = resolveAssetDetailView(rawSearchParams.view)
  // The raw returnTo tells "opened directly" from "the plain register" (spec §7.2).
  const registerParams = parseRegisterReturnTo(rawSearchParams.returnTo, locale)
  const loadPolicy = getAssetDetailLoadPolicy(assetDetailView)
  const scanReturnHref = `/${locale}/asset-management/scan`
  const isAssetScanReturn = returnToHref === scanReturnHref
  const now = new Date()

  const t = await getTranslations("asset")
  const tMaintenance = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  const tAudit = await getTranslations("auditRound")
  const tFinding = await getTranslations("auditFinding")
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
          movements: {
            orderBy: { performedAt: "desc" },
            take: loadPolicy.movementLimit,
          },
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
          auditItems: {
            orderBy: [{ lastScanAt: "desc" }, { createdAt: "desc" }],
            take: loadPolicy.auditItemLimit,
            include: {
              auditRound: { select: { id: true, auditNo: true, name: true } },
            },
          },
          auditFindings: {
            orderBy: { reportedAt: "desc" },
            take: loadPolicy.auditFindingLimit,
            include: {
              auditRound: { select: { auditNo: true, name: true } },
            },
          },
          disposalRequests: {
            where: { isActive: true },
            orderBy: { requestDate: "desc" },
            take: loadPolicy.disposalLimit,
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
  const componentHistory = asset.parentComponents.filter((component) => component.status !== "installed" || component.removedAt)
  const componentLinks = [...asset.parentComponents, ...asset.installedInLinks]
  const componentLinkIds = componentLinks.map((component) => component.id)
  const componentUserIds = uniqueTruthy(componentLinks.flatMap((component) => [component.createdBy, component.updatedBy]))
  const purchaseDocumentIds = asset.purchaseDocumentLinks.map((link) => link.purchaseDocumentId)
  const [purchaseDocumentAttachments, componentAttachments, componentUsers] = await withPerformanceTiming(
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
      componentUserIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: componentUserIds } },
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              employee: { select: { code: true, fullNameTh: true } },
            },
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
  const componentUserLabels = new Map(componentUsers.map((user) => [user.id, formatUserLabel(user)]))
  const componentAttachmentsByReference = new Map<string, typeof componentAttachments>()
  for (const attachment of componentAttachments) {
    componentAttachmentsByReference.set(attachment.referenceId, [
      ...(componentAttachmentsByReference.get(attachment.referenceId) ?? []),
      attachment,
    ])
  }
  const currentComponentsForPanel = currentComponents.map((component) => ({
    ...component,
    installedByLabel: component.createdBy ? componentUserLabels.get(component.createdBy) ?? component.createdBy : null,
    removedByLabel: component.updatedBy ? componentUserLabels.get(component.updatedBy) ?? component.updatedBy : null,
    attachments: componentAttachmentsByReference.get(component.id) ?? [],
  }))
  const componentHistoryForPanel = componentHistory.map((component) => ({
    ...component,
    installedByLabel: component.createdBy ? componentUserLabels.get(component.createdBy) ?? component.createdBy : null,
    removedByLabel: component.updatedBy ? componentUserLabels.get(component.updatedBy) ?? component.updatedBy : null,
    attachments: componentAttachmentsByReference.get(component.id) ?? [],
  }))
  const installedInLinksForPanel = asset.installedInLinks.map((component) => ({
    ...component,
    parentHref: appendReturnTo(`/${locale}/assets/${component.parentAsset.id}`, currentAssetDetailHref),
    installedByLabel: component.createdBy ? componentUserLabels.get(component.createdBy) ?? component.createdBy : null,
    removedByLabel: component.updatedBy ? componentUserLabels.get(component.updatedBy) ?? component.updatedBy : null,
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
  const movementActorIds = uniqueTruthy([
    ...asset.movements.map((movement) => movement.performedBy),
    ...asset.checkouts.map((checkout) => checkout.checkedOutBy),
  ])
  const movementEmployeeIds = uniqueTruthy([
    ...asset.checkouts.map((checkout) => checkout.checkin?.returnByEmployeeId),
    ...asset.checkouts.map((checkout) => checkout.checkin?.receiveByEmployeeId),
  ])
  const [operationAttachments, checkoutDepartments, checkoutLocations, checkoutParentAssets, movementUsers, movementEmployees] = await withPerformanceTiming(
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
      movementActorIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: movementActorIds } },
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              employee: { select: { code: true, fullNameTh: true } },
            },
          })
        : [],
      movementEmployeeIds.length > 0
        ? prisma.employee.findMany({
            where: { id: { in: movementEmployeeIds } },
            select: { id: true, code: true, fullNameTh: true },
          })
        : [],
    ]),
    {
      route: "/assets/[id]",
      locale,
      checkouts: checkoutIds.length,
      checkins: checkinIds.length,
      movementActors: movementActorIds.length,
      movementEmployees: movementEmployeeIds.length,
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
  const movementUserLabels = new Map(movementUsers.map((user) => [user.id, formatUserLabel(user)]))
  const movementEmployeeLabels = new Map(movementEmployees.map((employee) => [employee.id, formatEmployeeLabel(employee)]))
  const checkoutsById = new Map(asset.checkouts.map((checkout) => [checkout.id, checkout]))
  const checkinsById = new Map(asset.checkouts.flatMap((checkout) => checkout.checkin ? [[checkout.checkin.id, { ...checkout.checkin, checkout }]] : []))
  // The transfers' TR- documents, so each transfer in the history links its paper as a handover and a return do (the
  // E2E suite's TX-A4: nothing linked the TR- document before).
  const transferIds = [...new Set(asset.movements.flatMap((movement) => (movement.referenceType === "transfer" && movement.referenceId ? [movement.referenceId] : [])))]
  const transfersById = new Map(
    (transferIds.length > 0 ? await prisma.assetTransfer.findMany({ where: { id: { in: transferIds } }, select: { id: true, documentNo: true } }) : []).map((transfer) => [transfer.id, transfer]),
  )
  const movementLabels = await getMovementDisplayLabels(asset.movements)
  const movementTimelineItems: MovementTimelineItem[] = asset.movements.map((movement) => {
    const details: MovementCustodyDetail[] = []
    let summary: string | null = null

    if (movement.referenceType === "checkout" && movement.referenceId) {
      const checkout = checkoutsById.get(movement.referenceId)
      const destination = checkout
        ? getCheckoutDestination(checkout, {
            departments: checkoutDepartmentLabels,
            locations: checkoutLocationLabels,
            parentAssets: checkoutParentAssetLabels,
          })
        : null
      if (checkout) {
        const handoverBy = movementUserLabels.get(checkout.checkedOutBy) ?? checkout.checkedOutBy
        summary = destination ? `${t("movementTypes.checkout")}: ${destination}` : t("movementTypes.checkout")
        details.push(
          { label: t("documentNo"), value: checkout.documentNo ?? checkout.id, href: `/${locale}/asset-management/checkouts/${checkout.id}` },
          { label: t("handoverMode"), value: getAssetHandoverModeLabel(checkout.handoverMode, {
            permanent: t("handoverPermanentAssignment"), temporary: t("handoverTemporaryLoan"), legacy: t("handoverModeLegacy"),
          }) },
          { label: t("handoverTo"), value: destination },
          { label: t("handoverBy"), value: handoverBy }
        )
      }
    }

    if (movement.referenceType === "checkin" && movement.referenceId) {
      const checkin = checkinsById.get(movement.referenceId)
      if (checkin) {
        const returnedFrom = getCheckoutDestination(checkin.checkout, {
          departments: checkoutDepartmentLabels,
          locations: checkoutLocationLabels,
          parentAssets: checkoutParentAssetLabels,
        })
        const returnBy = checkin.returnByEmployeeId
          ? movementEmployeeLabels.get(checkin.returnByEmployeeId) ?? checkin.returnBy
          : checkin.returnBy
        const receiveBy = checkin.receiveByEmployeeId
          ? movementEmployeeLabels.get(checkin.receiveByEmployeeId) ?? checkin.receiveBy
          : checkin.receiveBy
        summary = `${t("movementTypes.checkin")}: ${returnBy}`
        details.push(
          { label: t("documentNo"), value: checkin.documentNo ?? checkin.id, href: `/${locale}/asset-management/checkins/${checkin.id}` },
          { label: t("handoverMode"), value: getAssetHandoverModeLabel(checkin.checkout.handoverMode, {
            permanent: t("handoverPermanentAssignment"), temporary: t("handoverTemporaryLoan"), legacy: t("handoverModeLegacy"),
          }) },
          { label: t("returnedFrom"), value: returnedFrom },
          { label: t("returnBy"), value: returnBy },
          { label: t("receiveBy"), value: receiveBy }
        )
      }
    }

    if (movement.referenceType === "transfer" && movement.referenceId) {
      const transfer = transfersById.get(movement.referenceId)
      if (transfer) {
        details.push({ label: t("documentNo"), value: transfer.documentNo, href: `/${locale}/asset-management/transfers/${movement.referenceId}` })
      }
    }

    details.push({ label: t("performedBy"), value: movementUserLabels.get(movement.performedBy) ?? movement.performedBy })
    const from = movementLabels.get(movement.id)?.from
    const to = movementLabels.get(movement.id)?.to
    return {
      id: movement.id,
      title: getMovementTitle(movement.movementType, t),
      summary: summary ?? getMovementSummary(movement.movementType, from, to, t),
      category: getMovementCategory(movement.movementType),
      tone: getMovementTone(movement.movementType),
      performedAt: movement.performedAt,
      from,
      to,
      reason: movement.reason,
      details: compactMovementDetails(details),
    }
  })
  const formatAuditState = (status: string, result?: string | null) => {
    const resultLabelKey = getAuditRoundItemResultLabelKey(result)
    if (resultLabelKey) return tAudit(resultLabelKey)
    const statusLabelKey = getAuditRoundItemStatusLabelKey(status)
    if (statusLabelKey) return tAudit(statusLabelKey)
    if (result) return result
    const itemStatusLabelKey = getAuditItemStatusLabelKey(status)
    return itemStatusLabelKey ? tFinding(itemStatusLabelKey) : status
  }
  const unifiedTimelineItems = [
    ...movementTimelineItems,
    ...buildPurchaseTimelineItems(purchaseDocuments, legacyPurchaseDocuments, t, tCommon("baht")),
    ...buildComponentTimelineItems(currentComponentsForPanel, componentHistoryForPanel, installedInLinksForPanel, locale, t),
    ...buildMaintenanceTimelineItems(asset.maintenanceTickets, locale, t, (status) => tMaintenance(`statuses.${toRepairRecordStatus(status)}`)),
    ...buildAuditTimelineItems(asset.auditItems, locale, t, formatAuditState),
  ].sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
  const latestMovement = unifiedTimelineItems[0]
  const currentLocationLabel = asset.currentLocation ? `${asset.currentLocation.code} - ${asset.currentLocation.name}` : null
  const currentCustodianLabel = asset.custodian ? formatEmployeeLabel(asset.custodian) : null
  const ownershipType = normalizeAssetOwnershipType(asset.ownershipType)
  const modelSpecs = parseModelSpecs(asset.model?.specs)
  const openMaintenanceCount = asset.maintenanceTickets.filter((ticket) => !["closed", "cancelled"].includes(ticket.repairStatus)).length
  const latestMaintenanceTicket = asset.maintenanceTickets[0]
  const totalMaintenanceCost = asset.maintenanceTickets.reduce((total, ticket) => total + Number(ticket.repairCost ?? 0), 0)
  const maintenanceReplacementWarning =
    asset.maintenanceTickets.length >= 3 ||
    (asset.purchasePrice && totalMaintenanceCost >= Number(asset.purchasePrice) * 0.5)
  const latestAuditItem = asset.auditItems[0]
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
  const auditSummary = latestAuditItem
    ? t("latestAuditSummary", {
        auditNo: latestAuditItem.auditRound.auditNo,
        result: formatAuditState(latestAuditItem.auditStatus, latestAuditItem.auditResult),
      })
    : tCommon("noData")
  const maintenanceHref = `/${locale}/maintenance/new?assetId=${encodedAssetId}`
  const movementTimelineItemsForClient: AssetMovementTimelineItem[] = unifiedTimelineItems.map((movement) => ({
    ...movement,
    performedAt: movement.performedAt.toISOString(),
    from: movement.from ?? null,
    to: movement.to ?? null,
  }))

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

  // A document shows, linked, only to a person whose permission opens it (R12).
  const canOpenDocument = (kind: AssetMovementDocumentKind) => hasPermission(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION[kind].module, "view")
  const documentAccess: Record<AssetMovementDocumentKind, boolean> = {
    checkout: canOpenDocument("checkout"),
    checkin: canOpenDocument("checkin"),
    transfer: canOpenDocument("transfer"),
    repair: canOpenDocument("repair"),
    disposal: canOpenDocument("disposal"),
    auditRound: canOpenDocument("auditRound"),
  }
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

      <div className="space-y-6">
        {isAssetDetailSectionVisible(assetDetailView, "components") ? (
          <div id="components" className="scroll-mt-24 space-y-4">
            <AssetComponentsSummary
              locale={locale}
              currentComponents={currentComponentsForPanel}
              installedInLinks={installedInLinksForPanel}
              canManage={canEditAsset}
              manageHref={componentsManagerHref}
              labels={{
                title: t("assetComponents"),
                help: t("componentSummaryHelp"),
                installedIn: t("installedInParent"),
                roleLabel: t("componentRole"),
                slotLabel: t("slotNo"),
                current: t("currentComponents"),
                noCurrent: t("noCurrentComponents"),
                missingSerial: t("componentMissingSerial"),
                manage: t("manageComponents"),
              }}
            />
            {currentComponentsForPanel.length > 0 || installedInLinksForPanel.length > 0 ? (
              <AssetRelationshipMap
            title={t("relationshipMap")}
            subtitle={t("relationshipMapHelp")}
            parentLaneTitle={t("relationshipParentLane")}
            currentTitle={t("relationshipCurrentViewing")}
            componentsTitle={t("relationshipComponentsLane")}
            componentsCountLabel={t("relationshipComponentsCount", { count: currentComponentsForPanel.length })}
            moreItemsLabel={t("relationshipMoreItems", { count: Math.max(currentComponentsForPanel.length - 5, 0) })}
            licenseAssignedTitle={t("relationshipLicenseAssignedAsset")}
            assignedLicensesTitle={t("relationshipAssignedLicenses")}
            assetTag={asset.assetTag}
            assetName={asset.name}
            currentMetaLabel={t("category")}
            currentMetaValue={`${asset.category.code} - ${asset.category.name}`}
            parentLinks={installedInLinksForPanel.map((link) => ({
              id: link.id,
              href: link.parentHref,
              label: `${link.parentAsset.assetTag} - ${link.parentAsset.name}`,
              role: link.componentRole,
            }))}
            childLinks={currentComponentsForPanel.map((component) => ({
              id: component.id,
              href: `/${locale}/assets/${component.componentAsset.id}`,
              label: `${component.componentAsset.assetTag} - ${component.componentAsset.name}`,
              role: component.componentRole,
            }))}
            licenseAssignedLinks={licenseAssignedAsset ? [{
              id: licenseAssignedAsset.id,
              href: `/${locale}/assets/${licenseAssignedAsset.id}`,
              label: `${licenseAssignedAsset.assetTag} - ${licenseAssignedAsset.name}`,
              role: t("relationshipLicenseDeviceRole"),
            }] : []}
            assignedLicenseLinks={asset.assignedLicenses.map((license) => ({
              id: license.id,
              href: `/${locale}/assets/${license.id}`,
              label: `${license.assetTag} - ${license.name}`,
              role: formatLicenseRelationshipRole(license.licenseUsedSeats, license.licenseTotalSeats, t),
            }))}
            emptyLabel={t("relationshipMapEmpty")}
            summaryParent={t("relationshipSummaryParent", { count: currentComponentsForPanel.length })}
            summaryComponent={t("relationshipSummaryComponent", { parent: installedInLinksForPanel[0]?.parentAsset.assetTag ?? "-" })}
            summaryParentAndComponent={t("relationshipSummaryParentAndComponent", {
              parent: installedInLinksForPanel[0]?.parentAsset.assetTag ?? "-",
              count: currentComponentsForPanel.length,
            })}
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
            ) : null}
          </div>
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

        {isAssetDetailSectionVisible(assetDetailView, "movement") ? (
          <section id="movement" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
          <SectionHeading title={t("movementHistory")} subtitle={t("detailSections.movementSubtitle")} />
          <div className="mb-5 rounded-md border border-border bg-background p-4">
            <div className="mb-3 text-sm font-semibold text-foreground">{t("movementSnapshot")}</div>
            <KeyValueList
              items={[
                { key: "currentLocation", label: t("currentLocation"), value: currentLocationLabel },
                { key: "custodian", label: t("custodian"), value: currentCustodianLabel, nilLabel: t("noCustodian") },
                { key: "status", label: t("status"), value: asset.status?.nameTh ?? asset.status?.name },
                { key: "latestMovement", label: t("latestMovement"), value: latestMovement ? `${latestMovement.title} · ${formatDateTime(latestMovement.performedAt)}` : null },
              ]}
            />
            {latestMovement ? (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("movementSummary")}: </span>
                {latestMovement.summary}
              </p>
            ) : null}
          </div>
          <AssetMovementTimeline
            items={movementTimelineItemsForClient}
            labels={{
              all: t("movementFilters.all"),
              filterLabel: tCommon("filter"),
              fromValue: t("fromValue"),
              toValue: t("toValue"),
              noData: tCommon("noData"),
              filters: {
                handover: t("movementFilters.handover"),
                transfer: t("movementFilters.transfer"),
                purchase: t("movementFilters.purchase"),
                maintenance: t("movementFilters.maintenance"),
                audit: t("movementFilters.audit"),
                component: t("movementFilters.component"),
                disposal: t("movementFilters.disposal"),
                other: t("movementFilters.other"),
              },
            }}
          />
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

        {isAssetDetailSectionVisible(assetDetailView, "audit") ? (
          <section id="audit" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
          <SectionHeading title={t("auditHistory")} subtitle={t("detailSections.auditSubtitle")} />
          <StatStrip
            className="mb-4"
            items={[
              { key: "scanCount", label: t("scanCount"), value: formatCount(latestAuditItem?.scanCount ?? 0), foot: auditSummary, footTitle: auditSummary },
              {
                key: "findingRequired",
                label: t("auditFindingRequired"),
                value: latestAuditItem?.findingRequired ? tCommon("yes") : tCommon("no"),
                ...(latestAuditItem?.findingRequired ? { foot: t("activityAuditFinding"), attention: true } : {}),
              },
            ]}
          />
          {asset.auditItems.length === 0 ? (
            <ActionEmptyState
              icon={<ScanLine className="h-6 w-6" />}
              title={t("noAuditTitle")}
              description={t("noAuditHelp")}
              actionHref={`/${locale}/audit/rounds`}
              actionLabel={t("auditRound")}
            />
          ) : (
            <DataTable framed={false} caption={t("auditHistory")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("auditRound")}</DataTableHead>
                  <DataTableHead>{t("status")}</DataTableHead>
                  <DataTableHead>{t("result")}</DataTableHead>
                  <DataTableHead>{t("lastAuditDate")}</DataTableHead>
                  <DataTableHead align="right">{t("scanCount")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {asset.auditItems.map((item) => (
                  <ClickableTableRow
                    key={item.id}
                    href={`/${locale}/audit/rounds/${item.auditRound.id}`}
                    label={`${tCommon("view")}: ${item.auditRound.auditNo}`}
                  >
                    <DataTableCell className="min-w-64">
                      <div className="font-medium text-foreground"><span className="tag font-medium">{item.auditRound.auditNo}</span></div>
                      <div className="mt-1 text-meta text-muted-foreground">{item.auditRound.name}</div>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatAuditState(item.auditStatus)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{item.auditResult ? formatAuditState(item.auditStatus, item.auditResult) : <Nil />}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(item.lastScanAt ?? item.scannedAt)}</DataTableCell>
                    <DataTableCell numeric className="text-muted-foreground">{formatCount(item.scanCount)}</DataTableCell>
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

function AssetRelationshipMap({
  title,
  subtitle,
  parentLaneTitle,
  currentTitle,
  componentsTitle,
  componentsCountLabel,
  moreItemsLabel,
  licenseAssignedTitle,
  assignedLicensesTitle,
  assetTag,
  assetName,
  currentMetaLabel,
  currentMetaValue,
  parentLinks,
  childLinks,
  licenseAssignedLinks,
  assignedLicenseLinks,
  emptyLabel,
  summaryParent,
  summaryComponent,
  summaryParentAndComponent,
  summaryStandalone,
  roleParentLabel,
  roleComponentLabel,
  roleParentAndComponentLabel,
  roleStandaloneLabel,
  parentEmptyTitle,
  parentEmptyHelp,
  componentsEmptyTitle,
  componentsEmptyHelp,
  noteLabel,
}: {
  title: string
  subtitle: string
  parentLaneTitle: string
  currentTitle: string
  componentsTitle: string
  componentsCountLabel: string
  moreItemsLabel: string
  licenseAssignedTitle: string
  assignedLicensesTitle: string
  assetTag: string
  assetName: string
  currentMetaLabel: string
  currentMetaValue: string
  parentLinks: RelationshipLink[]
  childLinks: RelationshipLink[]
  licenseAssignedLinks: RelationshipLink[]
  assignedLicenseLinks: RelationshipLink[]
  emptyLabel: string
  summaryParent: string
  summaryComponent: string
  summaryParentAndComponent: string
  summaryStandalone: string
  roleParentLabel: string
  roleComponentLabel: string
  roleParentAndComponentLabel: string
  roleStandaloneLabel: string
  parentEmptyTitle: string
  parentEmptyHelp: string
  componentsEmptyTitle: string
  componentsEmptyHelp: string
  noteLabel: string
}) {
  const relationshipState = getRelationshipState(parentLinks.length, childLinks.length)
  const summaryLabel = getRelationshipSummaryLabel(relationshipState, {
    parent: summaryParent,
    component: summaryComponent,
    parentAndComponent: summaryParentAndComponent,
    standalone: summaryStandalone,
  })
  const currentRoleLabel = getRelationshipRoleLabel(relationshipState, {
    parent: roleParentLabel,
    component: roleComponentLabel,
    parentAndComponent: roleParentAndComponentLabel,
    standalone: roleStandaloneLabel,
  })
  const childPreview = splitRelationshipPreview(childLinks)

  return (
    <ContentPanel title={title} description={subtitle}>
      <div className="mb-5 flex flex-col gap-3 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-meta text-muted-foreground">{currentTitle}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{currentRoleLabel}</div>
        </div>
        <RelationshipSummaryBadge label={summaryLabel} state={relationshipState} />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)_auto_minmax(0,1fr)] md:items-center">
        <RelationshipLane title={parentLaneTitle} icon={<Building2 className="h-4 w-4" />}>
          {parentLinks.length === 0 ? (
            <RelationshipEmptyState title={parentEmptyTitle} help={parentEmptyHelp} icon={<Building2 />} />
          ) : (
            <div className="space-y-2">
              {parentLinks.map((link) => (
                <RelationshipAssetCard key={link.id} link={link} variant="parent" />
              ))}
            </div>
          )}
        </RelationshipLane>

        <RelationshipConnector direction="left" />

        <div>
          <div className="mb-2 text-meta font-medium text-muted-foreground">{currentTitle}</div>
          <RelationshipAssetCard
            assetTag={assetTag}
            assetName={assetName}
            role={currentRoleLabel}
            metaLabel={currentMetaLabel}
            metaValue={currentMetaValue}
            variant={relationshipState === "component" || relationshipState === "parentAndComponent" ? "component" : relationshipState}
            current
          />
        </div>

        <RelationshipConnector direction="right" />

        <RelationshipLane title={componentsTitle} icon={<Puzzle className="h-4 w-4" />} countLabel={componentsCountLabel}>
          {childLinks.length === 0 ? (
            <RelationshipEmptyState title={componentsEmptyTitle} help={componentsEmptyHelp} icon={<Puzzle />} />
          ) : (
            <div className="space-y-2">
              {childPreview.visible.map((link) => (
                <RelationshipAssetCard key={link.id} link={link} variant="child" />
              ))}
              {childPreview.remaining.length > 0 ? (
                <details className="rounded-md border border-border bg-surface">
                  <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {moreItemsLabel}
                  </summary>
                  <div className="space-y-2 border-t border-border p-2">
                    {childPreview.remaining.map((link) => (
                      <RelationshipAssetCard key={link.id} link={link} variant="child" />
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </RelationshipLane>
      </div>

      {(licenseAssignedLinks.length > 0 || assignedLicenseLinks.length > 0) ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <RelationshipLinkList title={licenseAssignedTitle} links={licenseAssignedLinks} emptyLabel={emptyLabel} />
          <RelationshipLinkList title={assignedLicensesTitle} links={assignedLicenseLinks} emptyLabel={emptyLabel} />
        </div>
      ) : null}

      <Notice tone="neutral" className="mt-4">{noteLabel}</Notice>
    </ContentPanel>
  )
}

function RelationshipLane({
  title,
  icon,
  countLabel,
  children,
}: {
  title: string
  icon: React.ReactNode
  countLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-full rounded-md border border-border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-meta font-medium text-muted-foreground">
          {icon}
          <span className="truncate">{title}</span>
        </div>
        {/* A count is plain text (2D-2 R2). */}
        {countLabel ? <span className="shrink-0 text-meta text-muted-foreground">{countLabel}</span> : null}
      </div>
      {children}
    </div>
  )
}

// The lines between the lanes are solid border lines: a dashed border is kept for drop zones and the signature pad
// (spec 2D §5.4 guard 2), and the arrows are decoration, so they take no color.
function RelationshipConnector({ direction }: { direction: "left" | "right" }) {
  const Icon = direction === "left" ? ArrowLeft : ArrowRight

  return (
    <div className="flex items-center justify-center md:block">
      <div aria-hidden="true" className="flex flex-col items-center text-muted-foreground md:hidden">
        <span className="h-3 border-l border-border" />
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-surface">
          <ArrowDown className="h-4 w-4" />
        </span>
        <span className="h-3 border-l border-border" />
      </div>
      <div aria-hidden="true" className="hidden items-center gap-1 text-muted-foreground md:flex">
        <span className="h-px w-5 border-t border-border" />
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-surface">
          <Icon className="h-4 w-4" />
        </span>
        <span className="h-px w-5 border-t border-border" />
      </div>
    </div>
  )
}

// The summary is a sentence that may be long, so it is plain text with its icon, not a badge (StatusBadge is nowrap).
function RelationshipSummaryBadge({
  label,
  state,
}: {
  label: string
  state: RelationshipState
}) {
  const Icon = state === "standalone" ? InfoIcon : CheckCircle2

  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{label}</span>
    </p>
  )
}

// Kept as a wrapper so the lanes read the same; the empty state itself is the shared one (spec 2D M21).
function RelationshipEmptyState({
  title,
  help,
  icon,
}: {
  title: string
  help: string
  icon: React.ReactNode
}) {
  return <ActionEmptyState icon={icon} title={title} description={help} />
}

function RelationshipAssetCard({
  link,
  assetTag,
  assetName,
  role,
  metaLabel,
  metaValue,
  variant,
  current,
}: {
  link?: RelationshipLink
  assetTag?: string
  assetName?: string
  role?: string
  metaLabel?: string
  metaValue?: string
  variant: RelationshipCardVariant
  current?: boolean
}) {
  const relationshipLabel = link ? splitRelationshipLabel(link.label) : { assetTag: assetTag ?? null, name: assetName ?? null }
  const relationshipAsset = { assetTag: relationshipLabel.assetTag ?? <Nil />, name: relationshipLabel.name ?? <Nil /> }
  const roleLabel = role ?? link?.role
  const iconBoxClassName = current ? "h-10 w-10" : "h-9 w-9"
  const iconClassName = current ? "h-5 w-5" : "h-4 w-4"
  // Spec 2D: no raw palette colors. The role is a name (the shared Chip, 2D-2 R2); the card in view has the primary
  // border, the others the row hover. The tag keeps font-mono because it must wrap in a narrow lane (2D-2 R3), at 500.
  const content = (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ${iconBoxClassName}`}>
          {variant === "child" || variant === "component" ? <Cpu className={iconClassName} /> : <PackageCheck className={iconClassName} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-medium leading-5 text-foreground [overflow-wrap:anywhere]">{relationshipAsset.assetTag}</div>
          <div className="mt-1 line-clamp-3 text-sm leading-5 text-foreground [overflow-wrap:anywhere]">{relationshipAsset.name}</div>
        </div>
      </div>

      {roleLabel || (metaLabel && metaValue) ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
          {roleLabel ? <Chip>{roleLabel}</Chip> : null}
          {metaLabel && metaValue ? (
            <span className="text-meta text-muted-foreground">
              <span className="font-medium text-foreground">{metaLabel}</span>
              <span className="mx-1">:</span>
              <span>{metaValue}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
  const className = `block rounded-md border px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${current ? "min-h-36" : ""} ${getRelationshipCardClass(Boolean(current))}`

  if (link) {
    return (
      <Link href={link.href} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}

function RelationshipLinkList({
  title,
  links,
  emptyLabel,
}: {
  title: string
  links: RelationshipLink[]
  emptyLabel: string
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <h3 className="mb-2 text-meta font-medium text-muted-foreground">{title}</h3>
      {links.length === 0 ? (
        <EmptyNote>{emptyLabel}</EmptyNote>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <Link key={link.id} href={link.href} className="block rounded-md border border-border bg-surface px-3 py-2 transition-colors hover:bg-row-hover">
              <div className="text-sm font-medium text-primary">{link.label}</div>
              <div className="mt-1 text-meta text-muted-foreground">{link.role}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

type RelationshipState = "parent" | "component" | "parentAndComponent" | "standalone"
type RelationshipCardVariant = RelationshipState | "child"

function getRelationshipState(parentCount: number, childCount: number): RelationshipState {
  if (parentCount > 0 && childCount > 0) return "parentAndComponent"
  if (parentCount > 0) return "component"
  if (childCount > 0) return "parent"
  return "standalone"
}

function getRelationshipSummaryLabel(
  state: RelationshipState,
  labels: { parent: string; component: string; parentAndComponent: string; standalone: string }
) {
  if (state === "parentAndComponent") return labels.parentAndComponent
  if (state === "component") return labels.component
  if (state === "parent") return labels.parent
  return labels.standalone
}

function getRelationshipRoleLabel(
  state: RelationshipState,
  labels: { parent: string; component: string; parentAndComponent: string; standalone: string }
) {
  if (state === "parentAndComponent") return labels.parentAndComponent
  if (state === "component") return labels.component
  if (state === "parent") return labels.parent
  return labels.standalone
}

function splitRelationshipLabel(label: string) {
  const separator = " - "
  const separatorIndex = label.indexOf(separator)
  if (separatorIndex === -1) return { assetTag: label, name: null }

  return {
    assetTag: label.slice(0, separatorIndex),
    name: label.slice(separatorIndex + separator.length),
  }
}

function getRelationshipCardClass(current: boolean) {
  return current ? "border-primary-border bg-surface" : "border-border bg-surface hover:bg-row-hover"
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

function getMovementTitle(movementType: string, t: (key: string) => string) {
  if (knownMovementTypeKeys.has(movementType)) return t(`movementTypes.${movementType}`)
  return formatMovementType(movementType)
}

function getMovementSummary(movementType: string, from: string | null | undefined, to: string | null | undefined, t: (key: string) => string) {
  const title = getMovementTitle(movementType, t)
  if (from || to) return `${title}: ${t("fromValue")} ${from ?? "-"} ${t("toValue")} ${to ?? "-"}`
  return title
}

function getMovementTone(movementType: string): MovementTone {
  if (movementType === "checkin") return "success"
  if (movementType === "checkout" || movementType === "transfer") return "info"
  if (movementType.includes("audit") || movementType.includes("maintenance")) return "warning"
  if (movementType.includes("remove") || movementType.includes("disposal")) return "danger"
  return "neutral"
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

function getMovementCategory(movementType: string) {
  if (movementType === "checkout" || movementType === "checkin") return "handover"
  if (movementType === "transfer" || movementType.includes("location") || movementType.includes("custodian")) return "transfer"
  if (movementType.includes("maintenance")) return "maintenance"
  if (movementType.includes("audit")) return "audit"
  if (movementType.includes("component")) return "component"
  if (movementType.includes("disposal")) return "disposal"
  return "other"
}

function buildPurchaseTimelineItems(
  documents: {
    id: string
    documentType: string
    documentNo: string | null
    poNumber: string | null
    invoiceNumber: string | null
    documentDate: Date | null
    linkedAt: Date
    supplierName: string | null
    totalAmount: number | null
    currency: string | null
  }[],
  legacyAttachments: { id: string; originalName: string; uploadedAt: Date }[],
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  bahtLabel: string,
): MovementTimelineItem[] {
  const documentItems = documents.map((document) => ({
    id: `purchase-${document.id}`,
    title: t("timelinePurchaseDocument"),
    summary: document.documentNo || document.poNumber || document.invoiceNumber || document.documentType,
    category: "purchase",
    tone: "neutral" as const,
    performedAt: document.documentDate ?? document.linkedAt,
    from: null,
    to: null,
    reason: null,
    details: compactMovementDetails([
      { label: t("documentType"), value: document.documentType },
      { label: t("documentNo"), value: document.documentNo },
      { label: t("poNumber"), value: document.poNumber },
      { label: t("invoiceNumber"), value: document.invoiceNumber },
      { label: t("supplier"), value: document.supplierName },
      { label: t("purchasePrice"), value: document.totalAmount == null ? null : formatMoney(document.totalAmount, { unit: document.currency ?? bahtLabel }) },
    ]),
  }))

  const legacyItems = legacyAttachments.map((attachment) => ({
    id: `purchase-legacy-${attachment.id}`,
    title: t("timelinePurchaseAttachment"),
    summary: attachment.originalName,
    category: "purchase",
    tone: "neutral" as const,
    performedAt: attachment.uploadedAt,
    from: null,
    to: null,
    reason: null,
    details: [{ label: t("documentNo"), value: attachment.originalName, href: `/api/attachments/${attachment.id}` }],
  }))

  return [...documentItems, ...legacyItems]
}

function buildComponentTimelineItems(
  currentComponents: {
    id: string
    componentRole: string
    slotNo: string | null
    installedAt: Date
    removedAt: Date | null
    componentAsset: { id: string; assetTag: string; name: string }
    installedByLabel?: string | null
    removedByLabel?: string | null
  }[],
  componentHistory: {
    id: string
    componentRole: string
    slotNo: string | null
    installedAt: Date
    removedAt: Date | null
    componentAsset: { id: string; assetTag: string; name: string }
    installedByLabel?: string | null
    removedByLabel?: string | null
  }[],
  installedInLinks: {
    id: string
    componentRole: string
    slotNo: string | null
    installedAt: Date
    removedAt: Date | null
    parentAsset: { id: string; assetTag: string; name: string }
    installedByLabel?: string | null
    removedByLabel?: string | null
  }[],
  locale: string,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): MovementTimelineItem[] {
  const childInstallItems = [...currentComponents, ...componentHistory].map((component) => ({
    id: `component-install-${component.id}`,
    title: t("timelineComponentInstalled"),
    summary: `${component.componentAsset.assetTag} - ${component.componentAsset.name}`,
    category: "component",
    tone: "info" as const,
    performedAt: component.installedAt,
    from: null,
    to: t("relationshipCurrent"),
    reason: null,
    details: compactMovementDetails([
      { label: t("componentAsset"), value: `${component.componentAsset.assetTag} - ${component.componentAsset.name}`, href: `/${locale}/assets/${component.componentAsset.id}` },
      { label: t("componentRole"), value: component.componentRole },
      { label: t("slotNo"), value: component.slotNo },
      { label: t("installedBy"), value: component.installedByLabel },
    ]),
  }))

  const childRemoveItems = componentHistory
    .filter((component) => component.removedAt)
    .map((component) => ({
      id: `component-remove-${component.id}`,
      title: t("timelineComponentRemoved"),
      summary: `${component.componentAsset.assetTag} - ${component.componentAsset.name}`,
      category: "component",
      tone: "danger" as const,
      performedAt: component.removedAt as Date,
      from: t("relationshipCurrent"),
      to: null,
      reason: null,
      details: compactMovementDetails([
        { label: t("componentAsset"), value: `${component.componentAsset.assetTag} - ${component.componentAsset.name}`, href: `/${locale}/assets/${component.componentAsset.id}` },
        { label: t("componentRole"), value: component.componentRole },
        { label: t("slotNo"), value: component.slotNo },
        { label: t("removedBy"), value: component.removedByLabel },
      ]),
    }))

  const parentInstallItems = installedInLinks.map((link) => ({
    id: `installed-in-parent-${link.id}`,
    title: t("timelineInstalledInParent"),
    summary: `${link.parentAsset.assetTag} - ${link.parentAsset.name}`,
    category: "component",
    tone: "info" as const,
    performedAt: link.installedAt,
    from: null,
    to: `${link.parentAsset.assetTag} - ${link.parentAsset.name}`,
    reason: null,
    details: compactMovementDetails([
      { label: t("relationshipParent"), value: `${link.parentAsset.assetTag} - ${link.parentAsset.name}`, href: `/${locale}/assets/${link.parentAsset.id}` },
      { label: t("componentRole"), value: link.componentRole },
      { label: t("slotNo"), value: link.slotNo },
      { label: t("installedBy"), value: link.installedByLabel },
    ]),
  }))

  return [...childInstallItems, ...childRemoveItems, ...parentInstallItems]
}

function buildMaintenanceTimelineItems(
  tickets: {
    id: string
    repairNo: string
    problem: string
    repairStatus: string
    maintenancePlanId: string | null
    reportedDate: Date
    reportedBy: { code: string; fullNameTh: string }
  }[],
  locale: string,
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  statusLabel: (status: string) => string
): MovementTimelineItem[] {
  return tickets.map((ticket) => ({
    id: `maintenance-${ticket.id}`,
    title: ticket.maintenancePlanId ? t("timelinePmTicket") : t("timelineMaintenanceTicket"),
    summary: `${ticket.repairNo}: ${ticket.problem}`,
    category: "maintenance",
    tone: (ticket.repairStatus === "closed" ? "success" : ticket.repairStatus === "cancelled" ? "info" : "warning") as MovementTone,
    performedAt: ticket.reportedDate,
    from: null,
    to: null,
    reason: null,
    details: compactMovementDetails([
      { label: t("repairNo"), value: ticket.repairNo, href: `/${locale}/maintenance/${ticket.id}` },
      { label: t("reportedBy"), value: `${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}` },
      { label: t("repairStatus"), value: statusLabel(ticket.repairStatus) },
    ]),
  }))
}

function buildAuditTimelineItems(
  auditItems: {
    id: string
    auditStatus: string
    auditResult: string | null
    findingRequired: boolean
    lastScanAt: Date | null
    scanCount: number
    createdAt: Date
    auditRound: { id: string; auditNo: string; name: string }
  }[],
  locale: string,
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  formatAuditState: (status: string, result?: string | null) => string,
): MovementTimelineItem[] {
  return auditItems.map((item) => ({
    id: `audit-${item.id}`,
    title: t("timelineAuditRound"),
    summary: `${item.auditRound.auditNo} · ${formatAuditState(item.auditStatus, item.auditResult)}`,
    category: "audit",
    tone: (item.findingRequired ? "warning" : "success") as MovementTone,
    performedAt: item.lastScanAt ?? item.createdAt,
    from: null,
    to: null,
    reason: null,
    details: compactMovementDetails([
      { label: t("auditRound"), value: `${item.auditRound.auditNo} - ${item.auditRound.name}`, href: `/${locale}/audit/rounds/${item.auditRound.id}` },
      { label: t("result"), value: formatAuditState(item.auditStatus, item.auditResult) },
      { label: t("scanCount"), value: String(item.scanCount) },
      { label: t("auditFindingRequired"), value: item.findingRequired ? t("timelineYes") : t("timelineNo") },
    ]),
  }))
}

function formatLicenseRelationshipRole(usedSeats: number | null, totalSeats: number | null, t: (key: string, values?: Record<string, string | number>) => string) {
  if (totalSeats == null) return t("relationshipLicenseRole")
  return t("relationshipLicenseSeatRole", {
    used: usedSeats ?? 0,
    total: totalSeats,
  })
}

function formatUserLabel(user: {
  username: string
  displayName: string
  email: string | null
  employee: { code: string; fullNameTh: string } | null
}) {
  if (user.employee) return `${user.employee.code} - ${user.employee.fullNameTh}`
  if (user.displayName) return `${user.displayName} (${user.username})`
  return user.email ?? user.username
}

function formatEmployeeLabel(employee: { code: string; fullNameTh: string }) {
  return `${employee.code} - ${employee.fullNameTh}`
}

const knownMovementTypeKeys = new Set([
  "create",
  "import",
  "checkout",
  "checkin",
  "transfer",
  "location_change",
  "custodian_change",
  "status_change",
  "condition_change",
  "department_change",
  "ownership_type_change",
  "license_total_seats_change",
  "license_used_seats_change",
  "license_assigned_asset_change",
  "bulk_location_move",
  "bulk_location_update",
  "bulk_custodian_update",
  "component_install",
  "component_remove",
  "installed_in_parent",
  "removed_from_parent",
  "maintenance_create",
  "maintenance_pm_create",
  "audit_correction",
  // The cancels of the latest transaction (asset-transaction-cancellation-service.ts; the E2E suite's TX-A5).
  "checkout_cancel",
  "checkin_cancel",
  "transfer_cancel",
])
