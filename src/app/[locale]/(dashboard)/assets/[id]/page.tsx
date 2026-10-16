import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Edit,
  FileText,
  GitBranch,
  Info as InfoIcon,
  MapPin,
  PackageCheck,
  Puzzle,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { AssetQrCode } from "@/components/assets/asset-qr-code"
import { AssetAttachments } from "@/components/assets/asset-attachments"
import { AssetStatusCorrectionButton } from "@/components/assets/asset-status-correction-button"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone, getPanelClasses } from "@/lib/design-system"
import { getCategoryPhotoChecklist } from "@/lib/category-photo-checklist"
import { AssetComponentContextBanner } from "@/components/assets/asset-component-context-banner"
import { AssetComponentsSummary } from "@/components/assets/asset-components-summary"
import { AssetDetailActionMenu } from "@/components/assets/asset-detail-action-menu"
import { AssetDetailTabs } from "@/components/assets/asset-detail-tabs"
import { AssetPurchaseDocuments } from "@/components/assets/asset-purchase-documents"
import { parseModelSpecs } from "@/lib/model-specs"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AssetMovementTimeline, type AssetMovementTimelineItem } from "@/components/assets/asset-movement-timeline"
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { hasAssetResponsibility, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { canCorrectAssetStatus } from "@/lib/asset-lifecycle-exception-policy"
import { assetQrPublicBaseUrlKey, buildAssetQrValue } from "@/lib/asset-qr"
import { appendReturnTo, normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { buildAssetDetailSectionHref, buildAssetDetailViewHref, isAssetDetailSectionVisible, parseAssetDetailView, type AssetDetailSectionId } from "@/lib/asset-detail-view"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { splitRelationshipPreview } from "@/lib/asset-relationship-preview"
import { getAuditRoundItemResultLabelKey, getAuditRoundItemStatusLabelKey } from "@/lib/audit-round-result-filters"
import { getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"
import { getAssetDetailLoadPolicy } from "@/lib/asset-detail-data"
import { buildReferenceLabelMap, labelOrDash } from "@/lib/asset-operation-document"
import { parseAssetTransactionSnapshot } from "@/lib/asset-transaction-snapshot"
import { getRepairRecordStatusTone, toRepairRecordStatus } from "@/lib/repair-record-policy"
import {
  compactMovementDetails,
  createHealthItem,
  formatMovementType,
  getMissingPhotoChecklistLabels,
  getWarrantyState,
  maskLicenseKey,
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

type ActivitySummaryItem = {
  label: string
  value: string
  href: string
  tone: MovementTone
  actionLabel?: string
}

type RelationshipLink = { id: string; href: string; label: string; role: string }

export default async function AssetDetailPage({ params, searchParams }: AssetDetailPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "asset", "view")
  const canEditAsset = hasPermission(user, "asset", "edit")
  const canCreateAsset = hasPermission(user, "asset", "create")
  const returnToHref = normalizeAssetReturnTo(locale, rawSearchParams.returnTo)
  const assetDetailView = parseAssetDetailView(rawSearchParams.view)
  const loadPolicy = getAssetDetailLoadPolicy(assetDetailView)
  const scanReturnHref = `/${locale}/asset-management/scan`
  const isAssetScanReturn = returnToHref === scanReturnHref

  const t = await getTranslations("asset")
  const tBrandModel = await getTranslations("brandModel")
  const tMaintenance = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  const tAudit = await getTranslations("auditRound")
  const tFinding = await getTranslations("auditFinding")
  const tCancellation = await getTranslations("transactionCancellation")
  const [rawAsset, qrBaseUrlSetting, readyStatus] = await withPerformanceTiming(
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
          custodian: { select: { code: true, fullNameTh: true, email: true } },
          homeLocation: { select: { code: true, name: true } },
          currentLocation: { select: { code: true, name: true } },
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
      prisma.systemSetting.findUnique({
        where: { key: assetQrPublicBaseUrlKey },
        select: { value: true },
      }),
      prisma.assetStatus.findFirst({
        where: { isActive: true, OR: [{ name: "Ready" }, { nameTh: "พร้อมใช้งาน" }] },
        select: { id: true },
      }),
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

  const [evidenceCheckoutReferences, evidenceMaintenanceReferences, evidenceAuditFindingReferences, evidenceDisposalReferences] = await withPerformanceTiming(
    "asset-detail.evidence-references",
    () => Promise.all([
      prisma.assetCheckout.findMany({
        where: { assetId: asset.id },
        select: { id: true, checkins: { select: { id: true } } },
      }),
      prisma.maintenanceTicket.findMany({
        where: { assetId: asset.id, isActive: true },
        select: { id: true },
      }),
      prisma.auditFinding.findMany({
        where: { assetId: asset.id },
        select: { id: true },
      }),
      prisma.disposalRequest.findMany({
        where: { assetId: asset.id, isActive: true },
        select: { id: true },
      }),
    ]),
    { route: "/assets/[id]", locale },
  )
  const evidenceCheckoutIds = evidenceCheckoutReferences.map((checkout) => checkout.id)
  const evidenceCheckinIds = evidenceCheckoutReferences.flatMap((checkout) => checkout.checkins.map((checkin) => checkin.id))
  const evidenceMaintenanceTicketIds = evidenceMaintenanceReferences.map((ticket) => ticket.id)
  const evidenceAuditFindingIds = evidenceAuditFindingReferences.map((finding) => finding.id)
  const evidenceDisposalRequestIds = evidenceDisposalReferences.map((request) => request.id)

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
  const [purchaseDocumentAttachments, componentAttachments, componentUsers, maintenanceAttachments, auditFindingAttachments, disposalAttachments] = await withPerformanceTiming(
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
      evidenceMaintenanceTicketIds.length > 0
        ? prisma.attachment.findMany({
            where: { module: "maintenance", referenceId: { in: evidenceMaintenanceTicketIds }, isActive: true },
            orderBy: { uploadedAt: "desc" },
          })
        : [],
      evidenceAuditFindingIds.length > 0
        ? prisma.attachment.findMany({
            where: { module: "audit_finding", referenceId: { in: evidenceAuditFindingIds }, isActive: true },
            orderBy: { uploadedAt: "desc" },
          })
        : [],
      evidenceDisposalRequestIds.length > 0
        ? prisma.attachment.findMany({
            where: { module: "disposal", referenceId: { in: evidenceDisposalRequestIds }, isActive: true },
            orderBy: { uploadedAt: "desc" },
          })
        : [],
    ]),
    {
      route: "/assets/[id]",
      locale,
      purchaseDocuments: purchaseDocumentIds.length,
      components: componentLinkIds.length,
      maintenanceTickets: evidenceMaintenanceTicketIds.length,
      auditFindings: evidenceAuditFindingIds.length,
      disposalRequests: evidenceDisposalRequestIds.length,
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
  const componentRelationshipCount = currentComponentsForPanel.length + installedInLinksForPanel.length
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
  const primaryAssetPhoto = assetAttachments.find((attachment) => isPreviewableImage(attachment.fileType))
  const primaryModelPhoto = modelPhotos.find((attachment) => isPreviewableImage(attachment.fileType))
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
  const responsibilityHealthLabel =
    ownershipType === "personal"
      ? t("dataHealthResponsiblePerson")
      : ownershipType === "component"
        ? t("dataHealthInstalledParent")
        : ownershipType === "software_license"
          ? t("dataHealthLicenseResponsibility")
          : t("dataHealthResponsibleDepartment")
  const modelSpecs = parseModelSpecs(asset.model?.specs)
  const activeCheckout = asset.checkouts.find((checkout) => checkout.transactionStatus === "active" && !checkout.isReturned)
  const latestCheckout = asset.checkouts[0]
  const warrantyState = getWarrantyState(asset.warrantyEndDate)
  const licenseTotalSeats = asset.licenseTotalSeats ?? null
  const licenseUsedSeats = asset.licenseUsedSeats ?? 0
  const licenseRemainingSeats = licenseTotalSeats == null ? null : Math.max(licenseTotalSeats - licenseUsedSeats, 0)
  const licenseSeatSummary = licenseTotalSeats == null
    ? null
    : t("licenseSeatSummary", {
        used: formatCount(licenseUsedSeats),
        total: formatCount(licenseTotalSeats),
        remaining: formatCount(licenseRemainingSeats ?? 0),
      })
  const openMaintenanceCount = asset.maintenanceTickets.filter((ticket) => !["closed", "cancelled"].includes(ticket.repairStatus)).length
  const latestMaintenanceTicket = asset.maintenanceTickets[0]
  const totalMaintenanceCost = asset.maintenanceTickets.reduce((total, ticket) => total + Number(ticket.repairCost ?? 0), 0)
  const maintenanceReplacementWarning =
    asset.maintenanceTickets.length >= 3 ||
    (asset.purchasePrice && totalMaintenanceCost >= Number(asset.purchasePrice) * 0.5)
  const latestAuditItem = asset.auditItems[0]
  const checklistMissingLabels = getMissingPhotoChecklistLabels(photoChecklist, assetAttachments)
  const hasPurchaseDocuments = purchaseDocuments.length > 0 || legacyPurchaseDocuments.length > 0
  const encodedAssetId = encodeURIComponent(asset.id)
  const editHref = appendReturnTo(`/${locale}/assets/${asset.id}/edit`, returnToHref)
  const cloneHref = appendReturnTo(`/${locale}/assets/new?cloneFrom=${encodedAssetId}`, returnToHref)
  const componentsManagerHref = appendReturnTo(
    `/${locale}/assets/${asset.id}/components`,
    `/${locale}/assets/${asset.id}?view=custody`,
  )
  // A link to a section of another view opens that view (wiki open question 43).
  const sectionHref = (sectionId: AssetDetailSectionId) => buildAssetDetailSectionHref(locale, asset.id, assetDetailView, sectionId, returnToHref)
  const dataHealthItems = ownershipType === "software_license"
    ? [
        createHealthItem(Boolean(asset.serialNumber), t("dataHealthLicenseKey"), "#overview", t("dataHealthFixIdentity"), editHref),
        createHealthItem(hasAssetResponsibility(asset), responsibilityHealthLabel, sectionHref("ownership"), t("dataHealthFixResponsibility"), editHref),
        createHealthItem(asset.licenseTotalSeats != null, t("dataHealthLicenseSeats"), "#overview", t("dataHealthFixLicenseSeats"), editHref),
        createHealthItem(hasPurchaseDocuments, t("dataHealthPurchaseDocument"), "#purchase", t("dataHealthFixPurchaseDocument"), "#purchase"),
        createHealthItem(Boolean(asset.warrantyEndDate), t("dataHealthLicenseExpiry"), "#purchase", t("dataHealthFixExpiry"), editHref),
      ]
    : [
        createHealthItem(Boolean(asset.serialNumber), t("dataHealthSerial"), "#overview", t("dataHealthFixIdentity"), editHref),
        createHealthItem(Boolean(primaryAssetPhoto), t("dataHealthAssetPhoto"), "#photos", t("dataHealthFixPhoto"), "#photos"),
        createHealthItem(
          checklistMissingLabels.length === 0,
          checklistMissingLabels.length === 0
            ? t("dataHealthChecklistComplete")
            : t("dataHealthChecklistMissing", { count: checklistMissingLabels.length }),
          "#photos",
          t("dataHealthFixPhoto"),
          "#photos"
        ),
        createHealthItem(hasPurchaseDocuments, t("dataHealthPurchaseDocument"), "#purchase", t("dataHealthFixPurchaseDocument"), "#purchase"),
        createHealthItem(hasAssetResponsibility(asset), responsibilityHealthLabel, sectionHref("ownership"), t("dataHealthFixResponsibility"), editHref),
        createHealthItem(Boolean(asset.warrantyEndDate), t("dataHealthWarranty"), "#purchase", t("dataHealthFixExpiry"), editHref),
      ]
  const dataHealthDone = dataHealthItems.filter((item) => item.done).length
  const dataHealthTone = dataHealthDone === dataHealthItems.length ? "success" : dataHealthDone >= dataHealthItems.length - 2 ? "warning" : "danger"
  const firstMissingHealthItem = dataHealthItems.find((item) => !item.done)
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
  const checkoutHref = `/${locale}/asset-management/checkout?assetId=${encodedAssetId}`
  const checkinHref = activeCheckout
    ? `/${locale}/asset-management/checkin?checkoutId=${encodeURIComponent(activeCheckout.id)}`
    : sectionHref("handover")
  const transferHref = `/${locale}/asset-management/transfer?assetId=${encodedAssetId}`
  const maintenanceHref = `/${locale}/maintenance/new?assetId=${encodedAssetId}`
  const assignedAssetHref = licenseAssignedAsset ? `/${locale}/assets/${licenseAssignedAsset.id}` : "#overview"
  const latestDocumentHref = latestCheckout ? `/${locale}/asset-management/checkouts/${latestCheckout.id}` : sectionHref("handover")
  const lifecycle = getOwnershipLifecycle({
    ownershipType,
    activeCheckout: Boolean(activeCheckout),
    latestCheckout: Boolean(latestCheckout),
    checkoutHref,
    checkinHref,
    transferHref,
    maintenanceHref,
    editHref,
    assignedAssetHref,
    latestDocumentHref,
    purchaseHref: sectionHref("purchase"),
    auditHref: sectionHref("audit"),
    componentsHref: sectionHref("components"),
    hasAssignedAsset: Boolean(licenseAssignedAsset),
    licenseSeatSummary,
    t,
  })
  const mobileActionCandidates = canEditAsset
    ? [
        isAssetScanReturn
          ? { href: scanReturnHref, label: t("scanNext"), icon: <ScanLine className="h-4 w-4" />, primary: true }
          : lifecycle.mobilePrimary,
        lifecycle.mobileSecondary,
      ]
    : []
  const mobileActions = mobileActionCandidates.slice(0, 3)
  const activeCheckoutDestination = activeCheckout
    ? getCheckoutDestination(activeCheckout, {
        departments: checkoutDepartmentLabels,
        locations: checkoutLocationLabels,
        parentAssets: checkoutParentAssetLabels,
      })
    : null
  const latestActivityItem: ActivitySummaryItem = {
    label: t("activityLatestEvent"),
    value: latestMovement
      ? latestMovement.summary.startsWith(latestMovement.title)
        ? latestMovement.summary
        : `${latestMovement.title} · ${latestMovement.summary}`
      : tCommon("noData"),
    href: sectionHref("movement"),
    tone: latestMovement ? latestMovement.tone : "neutral" as const,
  }
  const activityFollowUpCandidates: (ActivitySummaryItem | null)[] = [
    activeCheckout
      ? {
          label: t("activityOpenHandover"),
          value: activeCheckoutDestination ?? t("handoverActive"),
          href: checkinHref,
          actionLabel: t("quickCheckin"),
          tone: "warning" as const,
        }
      : null,
    openMaintenanceCount > 0
      ? {
          label: t("activityOpenMaintenance"),
          value: maintenanceSummary,
          href: sectionHref("maintenance"),
          actionLabel: t("quickMaintenance"),
          tone: "warning" as const,
        }
      : null,
    warrantyState.tone === "danger" || warrantyState.tone === "warning"
      ? {
          label: t("activityWarranty"),
          value: getWarrantyStatusLabel(warrantyState, t),
          href: "#purchase",
          actionLabel: t("detailSections.purchase"),
          tone: warrantyState.tone,
        }
      : null,
    dataHealthDone < dataHealthItems.length
      ? {
          label: t("activityDataHealth"),
          value: t("dataHealthProgress", { done: dataHealthDone, total: dataHealthItems.length }),
          href: firstMissingHealthItem?.fixHref ?? firstMissingHealthItem?.href ?? "#overview",
          actionLabel: firstMissingHealthItem?.actionLabel ?? t("dataHealthNeedsReview"),
          tone: dataHealthTone === "danger" ? "danger" as const : "warning" as const,
        }
      : null,
    latestAuditItem?.findingRequired
      ? {
          label: t("activityAuditFinding"),
          value: auditSummary,
          href: sectionHref("audit"),
          actionLabel: t("detailSections.audit"),
          tone: "warning" as const,
        }
      : null,
  ]
  const activityFollowUpItems = activityFollowUpCandidates.filter((item): item is ActivitySummaryItem => item !== null)
  const movementTimelineItemsForClient: AssetMovementTimelineItem[] = unifiedTimelineItems.map((movement) => ({
    ...movement,
    performedAt: movement.performedAt.toISOString(),
    from: movement.from ?? null,
    to: movement.to ?? null,
  }))
  const qrValue = buildAssetQrValue({
    assetId: asset.id,
    publicBaseUrl: qrBaseUrlSetting?.value,
    fallbackBaseUrl: process.env.AUTH_URL,
  })
  const allEvidenceItems = [
    ...buildEvidenceItems(assetAttachments, t("evidenceGroupAsset"), asset.assetTag),
    ...buildEvidenceItems(modelPhotos, t("evidenceGroupModel"), asset.model?.name ?? asset.name),
    ...buildEvidenceItems(purchaseDocumentAttachments, t("evidenceGroupPurchase"), t("detailSections.purchase")),
    ...buildEvidenceItems(legacyPurchaseDocuments, t("evidenceGroupPurchase"), t("detailSections.purchase")),
    ...buildEvidenceItems(componentAttachments, t("evidenceGroupComponent"), t("detailSections.components")),
    ...buildEvidenceItems(operationAttachments, t("evidenceGroupHandover"), t("detailSections.handover")),
    ...buildEvidenceItems(maintenanceAttachments, t("evidenceGroupMaintenance"), t("detailSections.maintenance")),
    ...buildEvidenceItems(auditFindingAttachments, t("evidenceGroupAudit"), t("detailSections.audit")),
    ...buildEvidenceItems(disposalAttachments, t("evidenceGroupDisposal"), t("movementFilters.disposal")),
  ].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
  const evidenceDrawerItems = allEvidenceItems.map((item) => ({
    ...item,
    uploadedAt: item.uploadedAt.toISOString(),
    displayDate: formatDate(item.uploadedAt),
  }))
  const activityDrawerItems = [
    latestActivityItem,
    ...activityFollowUpItems,
    ...unifiedTimelineItems.slice(0, 8).map((movement) => ({
      label: movement.title,
      value: movement.summary,
      meta: formatDateTime(movement.performedAt),
      tone: movement.tone,
    })),
  ]

  return (
    <div className={`space-y-6 ${actionBarPagePadding.single}`}>
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: asset.assetTag, code: true },
        ]}
        title={asset.name}
        meta={
          <>
            <span className="tag">{asset.assetTag}</span>
            <span data-testid="asset-identity-summary" className="contents">
              <span className="inline-flex items-center gap-1.5">
                <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} />
                <AssetStateHelpPopover {...assetStatusHelp} />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} />
                <AssetStateHelpPopover {...assetConditionHelp} />
              </span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-faint-foreground" aria-hidden="true" />
              <span className="truncate">{orNil(currentLocationLabel)}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <PackageCheck className="h-4 w-4 shrink-0 text-faint-foreground" aria-hidden="true" />
              <span className="truncate">{orNil(lifecycle.responsibilityValue ?? currentCustodianLabel)}</span>
            </span>
          </>
        }
        back={<PageBackLink href={returnToHref} label={isAssetScanReturn ? t("backToScan") : tCommon("back")} />}
        actions={
          <>
            <AssetDetailActionMenu
              label={t("detailMoreActions")}
              cancelTransaction={
                canEditAsset && latestAssetTransaction?.transactionStatus === "active"
                  ? {
                      type: latestAssetTransaction.type,
                      transactionId: latestAssetTransaction.id,
                      expectedUpdatedAt: latestAssetTransaction.updatedAt.toISOString(),
                      originalOperator: latestAssetTransaction.operator,
                      currentState: formatCancellationSnapshot(cancellationAfterSnapshot, cancellationReferenceLabels),
                      restoreState: formatCancellationSnapshot(cancellationBeforeSnapshot, cancellationReferenceLabels),
                      componentCount: cancellationBeforeSnapshot?.components.length ?? 0,
                      labels: buildCancellationLabels(tCancellation),
                    }
                  : undefined
              }
              activity={{
                title: t("activityDrawerTitle"),
                triggerLabel: t("activityDrawerOpen"),
                emptyLabel: tCommon("noData"),
                items: activityDrawerItems,
              }}
              evidence={{
                items: evidenceDrawerItems,
                labels: {
                  title: t("evidenceCenter"),
                  triggerLabel: t("detailSections.evidence"),
                  emptyLabel: t("noEvidenceHelp"),
                  total: t("evidenceTotal"),
                  images: t("evidenceImages"),
                  documents: t("evidenceDocuments"),
                  all: t("movementFilters.all"),
                  filterLabel: tCommon("filter"),
                  openFile: t("openEvidenceFile"),
                },
              }}
              links={[
                { key: "print", href: `/${locale}/assets/${asset.id}/label`, label: t("printLabel") },
                ...(canEditAsset ? [{ key: "components" as const, href: componentsManagerHref, label: t("manageComponents") }] : []),
                ...(canCreateAsset ? [{ key: "clone" as const, href: cloneHref, label: t("cloneAsset") }] : []),
                ...(canEditAsset ? [{ key: "edit" as const, href: editHref, label: tCommon("edit"), mobileOnly: true }] : []),
              ]}
            />
            {canEditAsset ? (
              <Link href={editHref} className={cn(buttonVariants({ size: "md" }), "hidden md:inline-flex")}>
                <Edit aria-hidden="true" />
                {tCommon("edit")}
              </Link>
            ) : null}
          </>
        }
      />
      <AssetComponentContextBanner
        installedInLinks={installedInLinksForPanel}
        labels={{
          title: t("componentContextTitle"),
          openParent: t("componentContextOpenParent"),
          roleLabel: t("componentRole"),
          slotLabel: t("slotNo"),
        }}
      />
      {mobileActions.length > 0 ? <ActionBar label={tCommon("actions")} actions={mobileActions} /> : null}

      <AssetDetailTabs
        locale={locale}
        assetId={asset.id}
        view={assetDetailView}
        returnTo={returnToHref}
        label={t("detailViews.label")}
        labels={{
          overview: t("detailViews.overview"),
          custody: t("detailViews.custody"),
          operations: t("detailViews.operations"),
          audit: t("detailViews.audit"),
        }}
        indicators={{ custody: { count: componentRelationshipCount, hasWarning: componentMissingSerialCount > 0 } }}
        warningLabel={t("componentMissingSerial")}
      />

      {assetDetailView === "overview" && activityFollowUpItems.length > 0 ? (
        <ActivitySummaryPanel
          title={t("activitySummaryTitle")}
          subtitle={t("activitySummaryHelp")}
          followUpTitle={t("activityFollowUp")}
          followUpItems={activityFollowUpItems}
          details={dataHealthDone < dataHealthItems.length ? (
            <details data-testid="asset-data-health-details" className="rounded-md border border-border bg-background">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <span>{t("dataHealthTitle")}</span>
                <StatusBadge label={t("dataHealthProgress", { done: dataHealthDone, total: dataHealthItems.length })} tone={dataHealthTone} />
              </summary>
              <div className="grid gap-2 border-t border-border p-2 sm:grid-cols-2">
                {dataHealthItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.done ? item.href : item.fixHref}
                    className="flex min-h-11 items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-sm transition-colors hover:bg-row-hover"
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                    )}
                    <span className={item.done ? "text-muted-foreground" : "font-medium text-foreground"}>{item.label}</span>
                    {!item.done ? <span className="ml-auto text-meta font-medium text-primary">{item.actionLabel}</span> : null}
                  </a>
                ))}
              </div>
            </details>
          ) : null}
        />
      ) : null}

      {assetDetailView === "overview" && canEditAsset ? (
        // Spec 2D D9, D7: a ContentPanel; how this ownership type works is information, an inline info Notice.
        <ContentPanel title={t("quickActions")} description={lifecycle.help}>
          <Notice tone="info" title={lifecycle.title} className="mb-3">
            {lifecycle.description}
          </Notice>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {lifecycle.actions.map((action) => (
              <QuickAction key={action.label} {...action} />
            ))}
          </div>
          {readyStatus && canCorrectAssetStatus(asset.status) ? (
            <div className="mt-3">
              <AssetStatusCorrectionButton
                assetId={asset.id}
                readyStatusId={readyStatus.id}
                labels={{
                  button: t("statusCorrectionButton"),
                  title: t("statusCorrectionTitle"),
                  description: t("statusCorrectionDescription"),
                  reason: t("statusCorrectionReason"),
                  reasonPlaceholder: t("statusCorrectionReasonPlaceholder"),
                  cancel: tCommon("cancel"),
                  submit: t("statusCorrectionSubmit"),
                  errorFallback: t("statusCorrectionError"),
                }}
              />
            </div>
          ) : null}
        </ContentPanel>
      ) : null}

      <div className={`grid grid-cols-1 gap-6 ${assetDetailView === "overview" ? "xl:grid-cols-[1fr_280px]" : ""}`}>
        <div className="space-y-6">
          {isAssetDetailSectionVisible(assetDetailView, "overview") ? (
            <section id="overview" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <SectionHeading title={t("detailSections.overview")} subtitle={t("detailSections.overviewSubtitle")} />
            <KeyValueList
              items={[
                { key: "category", label: t("category"), value: <><span className="tag">{asset.category.code}</span> - {asset.category.name}</> },
                { key: "brand", label: t("brand"), value: asset.brand?.name },
                { key: "model", label: t("model"), value: asset.model?.name },
                {
                  key: "serialNumber",
                  label: ownershipType === "software_license" ? t("licenseKey") : t("serialNumber"),
                  value: ownershipType === "software_license" ? maskLicenseKey(asset.serialNumber) : asset.serialNumber,
                },
                ...(ownershipType === "software_license"
                  ? [
                      { key: "licenseSeatUsage", label: t("licenseSeatUsage"), value: licenseSeatSummary },
                      {
                        key: "licenseAssignedAsset",
                        label: t("licenseAssignedAsset"),
                        value: licenseAssignedAsset ? <><span className="tag">{licenseAssignedAsset.assetTag}</span> - {licenseAssignedAsset.name}</> : null,
                      },
                    ]
                  : []),
                { key: "fixedAssetCode", label: t("fixedAssetCode"), value: asset.fixedAssetCode },
                {
                  key: "purchasePrice",
                  label: t("purchasePrice"),
                  value: asset.purchasePrice == null ? null : <span className="num">{formatMoney(Number(asset.purchasePrice), { unit: tCommon("baht") })}</span>,
                },
              ]}
            />
            </section>
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "specs") && asset.model && (modelSpecs.items.length > 0 || modelSpecs.notes) ? (
            <section id="specs" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
              <SectionHeading title={tBrandModel("structuredSpecs")} subtitle={t("detailSections.specsSubtitle")} />
              {modelSpecs.items.length > 0 ? (
                <KeyValueList items={modelSpecs.items.map((item) => ({ key: item.id, label: item.label, value: item.value }))} />
              ) : null}
              {modelSpecs.notes ? (
                <p className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  {modelSpecs.notes}
                </p>
              ) : null}
            </section>
          ) : null}

          {isAssetDetailSectionVisible(assetDetailView, "ownership") ? (
            <section id="ownership" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <SectionHeading title={t("ownership")} subtitle={t("detailSections.ownershipSubtitle")} />
            <KeyValueList
              items={[
                { key: "company", label: t("company"), value: <><span className="tag">{asset.company.code}</span> - {asset.company.nameTh}</> },
                { key: "branch", label: t("branch"), value: <><span className="tag">{asset.branch.code}</span> - {asset.branch.name}</> },
                { key: "ownershipType", label: t("ownershipType"), value: t(`ownershipType_${ownershipType}`) },
                { key: "department", label: t("department"), value: asset.department ? <><span className="tag">{asset.department.code}</span> - {asset.department.name}</> : null },
                {
                  key: "custodian",
                  label: t("custodian"),
                  value: asset.custodian ? <><span className="tag">{asset.custodian.code}</span> - {asset.custodian.fullNameTh}</> : null,
                  nilLabel: t("noCustodian"),
                },
                { key: "homeLocation", label: t("homeLocation"), value: asset.homeLocation ? <><span className="tag">{asset.homeLocation.code}</span> - {asset.homeLocation.name}</> : null },
                { key: "currentLocation", label: t("currentLocation"), value: <><span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}</> },
              ]}
            />
            </section>
          ) : null}

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

          {isAssetDetailSectionVisible(assetDetailView, "purchase") ? (
            <section id="purchase" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
            <SectionHeading title={t("purchaseWarranty")} subtitle={t("detailSections.purchaseSubtitle")} />
            {/* The warranty state is a state, so it is the first fact as a StatusBadge, not a tinted box (spec 2D M22). */}
            <KeyValueList
              items={[
                { key: "warrantyStatus", label: t("warrantyStatus"), value: <StatusBadge label={getWarrantyStatusLabel(warrantyState, t)} tone={warrantyState.tone} /> },
                { key: "supplier", label: t("supplier"), value: asset.supplier ? <><span className="tag">{asset.supplier.code}</span> - {asset.supplier.name}</> : null },
                { key: "purchaseDate", label: t("purchaseDate"), value: asset.purchaseDate ? formatDate(asset.purchaseDate) : null },
                { key: "warrantyStart", label: t("warrantyStart"), value: asset.warrantyStartDate ? formatDate(asset.warrantyStartDate) : null },
                { key: "warrantyEnd", label: t("warrantyEnd"), value: asset.warrantyEndDate ? formatDate(asset.warrantyEndDate) : null },
                { key: "poNumber", label: t("poNumber"), value: asset.poNumber },
                { key: "invoiceNumber", label: t("invoiceNumber"), value: asset.invoiceNumber },
              ]}
            />
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

          {isAssetDetailSectionVisible(assetDetailView, "notes") ? (
            <section id="notes" className={cn(getPanelClasses(), "scroll-mt-24 p-4 sm:p-5")}>
              <SectionHeading title={t("remark")} subtitle={t("detailSections.notesSubtitle")} />
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{orNil(asset.remark)}</p>
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
                actionLabel={t("quickAudit")}
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

        {assetDetailView === "overview" ? (
          <aside className="space-y-6">
          <ContentPanel title={t("qrCode")}>
            <div className="flex justify-center">
              <AssetQrCode value={qrValue} label={asset.assetTag} />
            </div>
          </ContentPanel>
          <SidebarPhotoCard
            title={t("modelPhoto")}
            caption={asset.model?.name ?? t("modelPhoto")}
            attachment={primaryModelPhoto}
            emptyLabel={tCommon("noData")}
            viewLabel={t("viewPhotoGallery")}
          />
          <SidebarPhotoCard
            title={t("assetPhotos")}
            caption={t("primaryAssetPhoto")}
            attachment={primaryAssetPhoto}
            emptyLabel={tCommon("noData")}
            viewLabel={t("viewPhotoGallery")}
          />
          </aside>
        ) : null}
      </div>
    </div>
  )
}

type LifecycleAction = {
  href: string
  icon: React.ReactNode
  label: string
  disabled?: boolean
}

function getOwnershipLifecycle({
  ownershipType,
  activeCheckout,
  latestCheckout,
  checkoutHref,
  checkinHref,
  transferHref,
  maintenanceHref,
  editHref,
  assignedAssetHref,
  latestDocumentHref,
  purchaseHref,
  auditHref,
  componentsHref,
  hasAssignedAsset,
  licenseSeatSummary,
  t,
}: {
  ownershipType: string
  activeCheckout: boolean
  latestCheckout: boolean
  checkoutHref: string
  checkinHref: string
  transferHref: string
  maintenanceHref: string
  editHref: string
  assignedAssetHref: string
  latestDocumentHref: string
  purchaseHref: string
  auditHref: string
  componentsHref: string
  hasAssignedAsset: boolean
  licenseSeatSummary: string | null
  t: (key: string) => string
}) {
  const latestDocumentAction: LifecycleAction = {
    href: latestDocumentHref,
    icon: <FileText className="h-4 w-4" />,
    label: t("quickLatestDocument"),
    disabled: !latestCheckout,
  }

  if (ownershipType === "software_license") {
    const assignAction = { href: editHref, icon: <Edit className="h-4 w-4" />, label: t("quickAssignLicense") }
    const deviceAction = {
      href: assignedAssetHref,
      icon: <PackageCheck className="h-4 w-4" />,
      label: t("quickAssignedDevice"),
      disabled: !hasAssignedAsset,
    }
    const renewAction = { href: purchaseHref, icon: <ShieldCheck className="h-4 w-4" />, label: t("quickRenewLicense") }
    const auditAction = { href: auditHref, icon: <ScanLine className="h-4 w-4" />, label: t("quickAuditLicense") }

    return {
      title: t("lifecycleSoftwareTitle"),
      description: t("lifecycleSoftwareDescription"),
      help: t("quickActionsSoftwareHelp"),
      responsibilityLabel: t("licenseAssignee"),
      responsibilityValue: null,
      statusLabel: t("licenseSeatUsage"),
      statusValue: licenseSeatSummary ?? t("licensePool"),
      mobilePrimary: assignAction,
      mobileSecondary: renewAction,
      actions: [assignAction, deviceAction, renewAction, auditAction, { href: maintenanceHref, icon: <Wrench className="h-4 w-4" />, label: t("quickLicenseIssue") }],
    }
  }

  if (ownershipType === "stock") {
    const issueAction = { href: checkoutHref, icon: <Truck className="h-4 w-4" />, label: t("quickIssueFromStock"), disabled: activeCheckout }
    const relocateAction = { href: transferHref, icon: <GitBranch className="h-4 w-4" />, label: t("quickMoveStock"), disabled: activeCheckout }

    return {
      title: t("lifecycleStockTitle"),
      description: t("lifecycleStockDescription"),
      help: t("quickActionsStockHelp"),
      responsibilityLabel: t("department"),
      responsibilityValue: null,
      statusLabel: t("stockStatus"),
      statusValue: activeCheckout ? t("handoverActive") : t("stockAvailable"),
      mobilePrimary: issueAction,
      mobileSecondary: relocateAction,
      actions: [issueAction, relocateAction, { href: auditHref, icon: <ScanLine className="h-4 w-4" />, label: t("quickAudit") }, { href: maintenanceHref, icon: <Wrench className="h-4 w-4" />, label: t("quickMaintenance") }, latestDocumentAction],
    }
  }

  if (ownershipType === "shared") {
    const relocateAction = { href: transferHref, icon: <GitBranch className="h-4 w-4" />, label: t("quickRelocateShared"), disabled: activeCheckout }
    const checkoutAction = { href: checkoutHref, icon: <Truck className="h-4 w-4" />, label: t("quickTemporaryHandover"), disabled: activeCheckout }

    return {
      title: t("lifecycleSharedTitle"),
      description: t("lifecycleSharedDescription"),
      help: t("quickActionsSharedHelp"),
      responsibilityLabel: t("department"),
      responsibilityValue: null,
      statusLabel: t("sharedStatus"),
      statusValue: activeCheckout ? t("handoverActive") : t("sharedInstalled"),
      mobilePrimary: relocateAction,
      mobileSecondary: checkoutAction,
      actions: [relocateAction, checkoutAction, { href: maintenanceHref, icon: <Wrench className="h-4 w-4" />, label: t("quickMaintenance") }, { href: auditHref, icon: <ScanLine className="h-4 w-4" />, label: t("quickAudit") }, latestDocumentAction],
    }
  }

  if (ownershipType === "component") {
    const componentAction = { href: componentsHref, icon: <GitBranch className="h-4 w-4" />, label: t("quickManageComponent") }
    const transferAction = { href: transferHref, icon: <Truck className="h-4 w-4" />, label: t("quickMoveComponent"), disabled: activeCheckout }

    return {
      title: t("lifecycleComponentTitle"),
      description: t("lifecycleComponentDescription"),
      help: t("quickActionsComponentHelp"),
      responsibilityLabel: t("parentAsset"),
      responsibilityValue: null,
      statusLabel: t("componentStatus"),
      statusValue: t("componentInstalled"),
      mobilePrimary: componentAction,
      mobileSecondary: transferAction,
      actions: [componentAction, transferAction, { href: maintenanceHref, icon: <Wrench className="h-4 w-4" />, label: t("quickMaintenance") }, { href: auditHref, icon: <ScanLine className="h-4 w-4" />, label: t("quickAudit") }],
    }
  }

  const checkoutAction = { href: checkoutHref, icon: <Truck className="h-4 w-4" />, label: t("quickCheckout"), disabled: activeCheckout }
  const checkinAction = { href: checkinHref, icon: <RotateCcw className="h-4 w-4" />, label: t("quickCheckin"), disabled: !activeCheckout }

  return {
    title: t("lifecyclePersonalTitle"),
    description: t("lifecyclePersonalDescription"),
    help: t("quickActionsHelp"),
    responsibilityLabel: t("custodian"),
    responsibilityValue: null,
    statusLabel: t("handoverStatus"),
    statusValue: activeCheckout ? t("handoverActive") : t("assetAvailable"),
    mobilePrimary: checkoutAction,
    mobileSecondary: checkinAction,
    actions: [
      checkoutAction,
      checkinAction,
      { href: transferHref, icon: <GitBranch className="h-4 w-4" />, label: t("quickTransfer"), disabled: activeCheckout },
      { href: maintenanceHref, icon: <Wrench className="h-4 w-4" />, label: t("quickMaintenance") },
      { href: auditHref, icon: <ScanLine className="h-4 w-4" />, label: t("quickAudit") },
      latestDocumentAction,
    ],
  }
}

function ActivitySummaryPanel({
  title,
  subtitle,
  followUpTitle,
  followUpItems,
  details,
}: {
  title: string
  subtitle: string
  followUpTitle: string
  followUpItems: ActivitySummaryItem[]
  details?: React.ReactNode
}) {
  return (
    <ContentPanel title={title} description={subtitle}>
      <h3 className="mb-2 text-meta font-medium text-muted-foreground">{followUpTitle}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {followUpItems.map((item) => (
          <ActivitySummaryLink key={item.label} item={item} showAction />
        ))}
      </div>
      {details ? <div className="mt-3">{details}</div> : null}
    </ContentPanel>
  )
}

// The work center's follow-up row (plan 2D-2): no tone fill; the tone is a status shape and the label says the rest.
function ActivitySummaryLink({
  item,
  showAction,
}: {
  item: ActivitySummaryItem
  showAction?: boolean
}) {
  return (
    <Link href={item.href} className="block rounded-md border border-border bg-background px-3 py-2 transition-colors hover:bg-row-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: item.tone }), "mt-1.5")} />
          <div className="min-w-0">
            <div className="text-meta text-muted-foreground">{item.label}</div>
            <div className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{orNil(item.value)}</div>
          </div>
        </div>
        {showAction && item.actionLabel ? <span className="shrink-0 text-meta font-medium text-primary">{item.actionLabel}</span> : null}
      </div>
    </Link>
  )
}

// Spec 2D M12: a step that cannot run now is a real disabled button, so a screen reader says it is unavailable. A long
// Thai label may wrap in the 2/3/6-column grid, so the button grows instead of clipping (the settings presets' rule).
const quickActionClasses = "h-auto w-full whitespace-normal py-2 text-center md:h-auto md:min-h-9"

function QuickAction({
  href,
  icon,
  label,
  disabled,
}: {
  href: string
  icon: React.ReactNode
  label: string
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <Button variant="outline" disabled className={quickActionClasses}>
        {icon}
        {label}
      </Button>
    )
  }

  return (
    <Link href={href} className={cn(buttonVariants({ variant: "outline" }), quickActionClasses)}>
      {icon}
      {label}
    </Link>
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

function SidebarPhotoCard({
  title,
  caption,
  attachment,
  emptyLabel,
  viewLabel,
}: {
  title: string
  caption: string
  attachment?: { id: string; originalName: string } | null
  emptyLabel: string
  viewLabel: string
}) {
  return (
    <ContentPanel title={title}>
      {attachment ? (
        <a
          href="#photos"
          className="group block overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-32 w-full items-center justify-center bg-background p-2">
            {/* Authenticated attachment URLs render more reliably as browser-native images. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/attachments/${attachment.id}?inline=1`}
              alt={attachment.originalName}
              width={320}
              height={240}
              loading="eager"
              fetchPriority="high"
              className="max-h-full w-full object-contain"
            />
          </div>
          <div className="border-t border-border p-3 text-left">
            <div className="line-clamp-2 text-sm font-medium text-foreground">{caption}</div>
            <div className="mt-1 truncate text-meta text-muted-foreground">{attachment.originalName}</div>
            <div className="mt-2 text-meta font-medium text-primary">{viewLabel}</div>
          </div>
        </a>
      ) : (
        // No dashed box (spec 2D M21): one empty line, and the gallery link as a text link.
        <div className="flex h-32 flex-col items-center justify-center gap-1">
          <EmptyNote>{emptyLabel}</EmptyNote>
          <a href="#photos" className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
            {viewLabel}
          </a>
        </div>
      )}
    </ContentPanel>
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
                  <img src={`/api/attachments/${attachment.id}?inline=1`} alt={attachment.originalName} loading="lazy" className="max-h-full w-full object-contain" />
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

function buildEvidenceItems(
  attachments: Array<{ id: string; originalName: string; fileType: string; uploadedAt: Date }>,
  group: string,
  detail: string
) {
  return attachments.map((attachment) => ({
    id: attachment.id,
    title: attachment.originalName,
    group,
    detail,
    uploadedAt: attachment.uploadedAt,
    fileType: attachment.fileType,
    href: `/api/attachments/${attachment.id}`,
  }))
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

function isPreviewableImage(fileType: string) {
  return fileType.startsWith("image/")
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

function getWarrantyStatusLabel(
  warrantyState: ReturnType<typeof getWarrantyState>,
  t: (key: string, values?: Record<string, string | number | Date>) => string
) {
  if (warrantyState.tone === "neutral") return t("warrantyUnknown")
  if (warrantyState.tone === "danger") return t("warrantyExpired", { days: Math.abs(warrantyState.daysLeft ?? 0) })
  if (warrantyState.tone === "warning") return t("warrantyExpiringSoon", { days: warrantyState.daysLeft ?? 0 })
  return t("warrantyActive", { days: warrantyState.daysLeft ?? 0 })
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
])
