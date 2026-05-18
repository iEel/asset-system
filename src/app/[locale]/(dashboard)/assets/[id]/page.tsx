import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  AlertTriangle,
  CheckCircle2,
  Edit,
  FileText,
  GitBranch,
  History,
  ImageIcon,
  MapPin,
  Paperclip,
  PackageCheck,
  Printer,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { AssetQrCode } from "@/components/assets/asset-qr-code"
import { AssetAttachments } from "@/components/assets/asset-attachments"
import { getCategoryPhotoChecklist } from "@/lib/category-photo-checklist"
import { AssetComponentsPanel } from "@/components/assets/asset-components-panel"
import { AssetPurchaseDocuments } from "@/components/assets/asset-purchase-documents"
import { parseModelSpecs } from "@/lib/model-specs"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AssetMovementTimeline, type AssetMovementTimelineItem } from "@/components/assets/asset-movement-timeline"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
import { ActivityDrawer } from "@/components/ui/activity-drawer"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { hasAssetResponsibility, normalizeAssetOwnershipType } from "@/lib/asset-ownership"

type AssetDetailPageProps = {
  params: Promise<{ id: string; locale: string }>
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

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { id, locale } = await params
  await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("asset")
  const tBrandModel = await getTranslations("brandModel")
  const tMaintenance = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  const asset = await prisma.asset.findFirst({
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
        take: 20,
      },
      checkouts: {
        orderBy: { checkoutDate: "desc" },
        include: {
          custodian: { select: { code: true, fullNameTh: true } },
          checkin: {
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
        take: 10,
        include: {
          reportedBy: { select: { code: true, fullNameTh: true } },
        },
      },
      auditItems: {
        orderBy: [{ lastScanAt: "desc" }, { createdAt: "desc" }],
        take: 10,
        include: {
          auditRound: { select: { id: true, auditNo: true, name: true } },
        },
      },
      auditFindings: {
        orderBy: { reportedAt: "desc" },
        take: 20,
        include: {
          auditRound: { select: { auditNo: true, name: true } },
        },
      },
      disposalRequests: {
        where: { isActive: true },
        orderBy: { requestDate: "desc" },
        take: 20,
      },
      assignedLicenses: {
        where: { isActive: true },
        orderBy: { assetTag: "asc" },
        select: {
          id: true,
          assetTag: true,
          name: true,
          licenseTotalSeats: true,
          licenseUsedSeats: true,
        },
      },
    },
  })

  if (!asset) notFound()

  const installedComponentAssetIds = await prisma.assetComponent.findMany({
    where: { status: "installed", removedAt: null },
    select: { componentAssetId: true },
  })
  const unavailableComponentIds = new Set([
    asset.id,
    ...installedComponentAssetIds.map((component) => component.componentAssetId),
  ])

  const [photoChecklist, modelPhotos, availableComponentAssets, licenseAssignedAsset] = await Promise.all([
    getCategoryPhotoChecklist(asset.categoryId),
    asset.model?.id
      ? prisma.attachment.findMany({
          where: { module: "asset_model", referenceId: asset.model.id, isActive: true },
          orderBy: { uploadedAt: "desc" },
        })
      : [],
    prisma.asset.findMany({
      where: {
        isActive: true,
        id: { notIn: [...unavailableComponentIds] },
      },
      select: { id: true, assetTag: true, name: true, serialNumber: true },
      orderBy: { assetTag: "asc" },
      take: 300,
    }),
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
  const maintenanceTicketIds = asset.maintenanceTickets.map((ticket) => ticket.id)
  const auditFindingIds = asset.auditFindings.map((finding) => finding.id)
  const disposalRequestIds = asset.disposalRequests.map((request) => request.id)
  const [purchaseDocumentAttachments, componentAttachments, componentUsers, maintenanceAttachments, auditFindingAttachments, disposalAttachments] = await Promise.all([
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
    maintenanceTicketIds.length > 0
      ? prisma.attachment.findMany({
          where: { module: "maintenance", referenceId: { in: maintenanceTicketIds }, isActive: true },
          orderBy: { uploadedAt: "desc" },
        })
      : [],
    auditFindingIds.length > 0
      ? prisma.attachment.findMany({
          where: { module: "audit_finding", referenceId: { in: auditFindingIds }, isActive: true },
          orderBy: { uploadedAt: "desc" },
        })
      : [],
    disposalRequestIds.length > 0
      ? prisma.attachment.findMany({
          where: { module: "disposal", referenceId: { in: disposalRequestIds }, isActive: true },
          orderBy: { uploadedAt: "desc" },
        })
      : [],
  ])
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
    installedByLabel: component.createdBy ? componentUserLabels.get(component.createdBy) ?? component.createdBy : null,
    removedByLabel: component.updatedBy ? componentUserLabels.get(component.updatedBy) ?? component.updatedBy : null,
    attachments: componentAttachmentsByReference.get(component.id) ?? [],
  }))
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
  const [operationAttachments, checkoutDepartments, checkoutLocations, checkoutParentAssets, movementUsers, movementEmployees] = await Promise.all([
    checkoutIds.length > 0 || checkinIds.length > 0
      ? prisma.attachment.findMany({
          where: {
            isActive: true,
            OR: [
              { module: { in: ["checkout_photo_before", "checkout_receiver_signature"] }, referenceId: { in: checkoutIds } },
              { module: { in: ["checkin_photo_after", "checkin_return_signature", "checkin_receive_signature"] }, referenceId: { in: checkinIds } },
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
  ])
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
  const unifiedTimelineItems = [
    ...movementTimelineItems,
    ...buildPurchaseTimelineItems(purchaseDocuments, legacyPurchaseDocuments, t),
    ...buildComponentTimelineItems(currentComponentsForPanel, componentHistoryForPanel, installedInLinksForPanel, locale, t),
    ...buildMaintenanceTimelineItems(asset.maintenanceTickets, locale, t),
    ...buildAuditTimelineItems(asset.auditItems, locale, t),
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
  const activeCheckout = asset.checkouts.find((checkout) => !checkout.isReturned)
  const latestCheckout = asset.checkouts[0]
  const warrantyState = getWarrantyState(asset.warrantyEndDate)
  const licenseTotalSeats = asset.licenseTotalSeats ?? null
  const licenseUsedSeats = asset.licenseUsedSeats ?? 0
  const licenseRemainingSeats = licenseTotalSeats == null ? null : Math.max(licenseTotalSeats - licenseUsedSeats, 0)
  const licenseSeatSummary = licenseTotalSeats == null
    ? null
    : t("licenseSeatSummary", {
        used: licenseUsedSeats.toLocaleString("th-TH"),
        total: licenseTotalSeats.toLocaleString("th-TH"),
        remaining: licenseRemainingSeats?.toLocaleString("th-TH") ?? "0",
      })
  const openMaintenanceCount = asset.maintenanceTickets.filter((ticket) => ticket.repairStatus !== "closed").length
  const latestMaintenanceTicket = asset.maintenanceTickets[0]
  const totalMaintenanceCost = asset.maintenanceTickets.reduce((total, ticket) => total + Number(ticket.repairCost ?? 0), 0)
  const maintenanceReplacementWarning =
    asset.maintenanceTickets.length >= 3 ||
    (asset.purchasePrice && totalMaintenanceCost >= Number(asset.purchasePrice) * 0.5)
  const latestAuditItem = asset.auditItems[0]
  const checklistMissingLabels = getMissingPhotoChecklistLabels(photoChecklist, assetAttachments)
  const hasPurchaseDocuments = purchaseDocuments.length > 0 || legacyPurchaseDocuments.length > 0
  const detailPath = `/${locale}/assets/${asset.id}`
  const encodedAssetId = encodeURIComponent(asset.id)
  const editHref = `/${locale}/assets/${asset.id}/edit`
  const dataHealthItems = ownershipType === "software_license"
    ? [
        createHealthItem(Boolean(asset.serialNumber), t("dataHealthLicenseKey"), "#overview", t("dataHealthFixIdentity"), editHref),
        createHealthItem(hasAssetResponsibility(asset), responsibilityHealthLabel, "#ownership", t("dataHealthFixResponsibility"), editHref),
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
        createHealthItem(hasAssetResponsibility(asset), responsibilityHealthLabel, "#ownership", t("dataHealthFixResponsibility"), editHref),
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
        result: latestAuditItem.auditResult ?? latestAuditItem.auditStatus,
      })
    : tCommon("noData")
  const checkoutHref = `/${locale}/asset-management/checkout?assetId=${encodedAssetId}`
  const checkinHref = activeCheckout
    ? `/${locale}/asset-management/checkin?checkoutId=${encodeURIComponent(activeCheckout.id)}`
    : "#handover"
  const transferHref = `/${locale}/asset-management/transfer?assetId=${encodedAssetId}`
  const maintenanceHref = `/${locale}/maintenance?assetId=${encodedAssetId}`
  const assignedAssetHref = licenseAssignedAsset ? `/${locale}/assets/${licenseAssignedAsset.id}` : "#overview"
  const latestDocumentHref = latestCheckout ? `/${locale}/asset-management/checkouts/${latestCheckout.id}` : "#handover"
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
    hasAssignedAsset: Boolean(licenseAssignedAsset),
    licenseSeatSummary,
    t,
  })
  const activeCheckoutDestination = activeCheckout
    ? getCheckoutDestination(activeCheckout, {
        departments: checkoutDepartmentLabels,
        locations: checkoutLocationLabels,
        parentAssets: checkoutParentAssetLabels,
      })
    : null
  const latestActivityItem: ActivitySummaryItem = {
    label: t("activityLatestEvent"),
    value: latestMovement ? `${latestMovement.title}: ${latestMovement.summary}` : tCommon("noData"),
    href: "#movement",
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
          href: "#maintenance",
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
          href: "#audit",
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
  const qrValue = `${process.env.AUTH_URL ?? ""}${detailPath}`
  const sectionLinks = [
    { id: "overview", label: t("detailSections.overview") },
    ...(asset.model && (modelSpecs.items.length > 0 || modelSpecs.notes)
      ? [{ id: "specs", label: t("detailSections.specs") }]
      : []),
    { id: "ownership", label: t("detailSections.ownership") },
    { id: "components", label: t("detailSections.components") },
    { id: "purchase", label: t("detailSections.purchase") },
    { id: "photos", label: t("detailSections.photos") },
    { id: "evidence", label: t("detailSections.evidence") },
    { id: "handover", label: t("detailSections.handover") },
    { id: "movement", label: t("detailSections.movement") },
    { id: "maintenance", label: t("detailSections.maintenance") },
    { id: "audit", label: t("detailSections.audit") },
    { id: "notes", label: t("detailSections.notes") },
  ]
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
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: `/${locale}/assets` },
                { label: asset.assetTag },
              ]}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{asset.assetTag}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{asset.name}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ActivityDrawer
            title={t("activityDrawerTitle")}
            triggerLabel={t("activityDrawerOpen")}
            emptyLabel={tCommon("noData")}
            items={activityDrawerItems}
          />
          <Link
            href={`/${locale}/assets/${asset.id}/label`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Printer className="h-4 w-4" />
            {t("printLabel")}
          </Link>
          <Link
            href={`/${locale}/assets/${asset.id}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Edit className="h-4 w-4" />
            {tCommon("edit")}
          </Link>
        </div>
      </div>
      <MobileActionBar
        actions={[
          { href: editHref, label: tCommon("edit"), icon: <Edit className="h-4 w-4" />, primary: true },
          lifecycle.mobilePrimary,
          lifecycle.mobileSecondary,
          { href: "#movement", label: t("detailSections.movement"), icon: <History className="h-4 w-4" /> },
        ]}
      />

      <nav className="sticky top-0 z-20 -mx-4 border-y border-border bg-background/95 px-4 py-2 shadow-sm backdrop-blur md:top-0" aria-label={t("detailSections.nav")}>
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {sectionLinks.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex h-9 shrink-0 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <ActivitySummaryPanel
        title={t("activitySummaryTitle")}
        subtitle={t("activitySummaryHelp")}
        latestTitle={t("activityLatest")}
        followUpTitle={t("activityFollowUp")}
        noFollowUpLabel={t("activityNoFollowUp")}
        latestItem={latestActivityItem}
        followUpItems={activityFollowUpItems}
      />

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<MapPin className="h-5 w-5 text-info" />}
            label={t("currentLocation")}
            value={currentLocationLabel}
            href="#ownership"
          />
          <SummaryCard
            icon={<PackageCheck className="h-5 w-5 text-primary" />}
            label={lifecycle.responsibilityLabel}
            value={lifecycle.responsibilityValue ?? currentCustodianLabel}
            href="#ownership"
          />
          <SummaryCard
            icon={activeCheckout ? <Truck className="h-5 w-5 text-info" /> : <CheckCircle2 className="h-5 w-5 text-success" />}
            label={lifecycle.statusLabel}
            value={lifecycle.statusValue}
            href={lifecycle.statusHref}
          />
          <SummaryCard
            icon={<ShieldCheck className={`h-5 w-5 ${getWarrantyIconClass(warrantyState.tone)}`} />}
            label={t("warrantyStatus")}
            value={getWarrantyStatusLabel(warrantyState, t)}
            href="#purchase"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t("quickActions")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{lifecycle.help}</p>
            </div>
          </div>
          <div className="mb-3 rounded-md border border-info/30 bg-info/10 px-3 py-2">
            <div className="text-sm font-semibold text-foreground">{lifecycle.title}</div>
            <p className="mt-1 text-xs text-muted-foreground">{lifecycle.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {lifecycle.actions.map((action) => (
              <QuickAction key={action.label} {...action} />
            ))}
          </div>
        </div>

        <div className={`rounded-lg border p-4 shadow-sm ${getHealthPanelClass(dataHealthTone)}`}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t("dataHealthTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("dataHealthProgress", { done: dataHealthDone, total: dataHealthItems.length })}
              </p>
            </div>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getHealthBadgeClass(dataHealthTone)}`}>
              {dataHealthDone === dataHealthItems.length ? t("dataHealthComplete") : t("dataHealthNeedsReview")}
            </span>
          </div>
          <div className="grid gap-2">
            {dataHealthItems.map((item) => (
              <a
                key={item.label}
                href={item.done ? item.href : item.fixHref}
                className="flex items-center gap-2 rounded-md bg-surface/80 px-2 py-1.5 text-sm transition-colors hover:bg-background"
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                )}
                <span className={item.done ? "text-muted-foreground" : "font-medium text-foreground"}>{item.label}</span>
                {!item.done ? (
                  <span className="ml-auto shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    {item.actionLabel}
                  </span>
                ) : null}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <section id="overview" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("detailSections.overview")} subtitle={t("detailSections.overviewSubtitle")} />
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <StatusPill label={asset.status.nameTh} color={asset.status.colorCode} />
              <StatusPill label={asset.condition.nameTh} color={asset.condition.colorCode} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("category")} value={`${asset.category.code} - ${asset.category.name}`} />
              <Info label={t("brand")} value={asset.brand?.name} />
              <Info label={t("model")} value={asset.model?.name} />
              <Info label={ownershipType === "software_license" ? t("licenseKey") : t("serialNumber")} value={ownershipType === "software_license" ? maskLicenseKey(asset.serialNumber) : asset.serialNumber} />
              {ownershipType === "software_license" ? (
                <>
                  <Info label={t("licenseSeatUsage")} value={licenseSeatSummary} />
                  <Info label={t("licenseAssignedAsset")} value={licenseAssignedAsset ? `${licenseAssignedAsset.assetTag} - ${licenseAssignedAsset.name}` : null} />
                </>
              ) : null}
              <Info label={t("fixedAssetCode")} value={asset.fixedAssetCode} />
              <Info label={t("purchasePrice")} value={formatCurrency(asset.purchasePrice ? Number(asset.purchasePrice) : null)} />
            </div>
          </section>

          {asset.model && (modelSpecs.items.length > 0 || modelSpecs.notes) ? (
            <section id="specs" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
              <SectionHeading title={tBrandModel("structuredSpecs")} subtitle={t("detailSections.specsSubtitle")} />
              {modelSpecs.items.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {modelSpecs.items.map((item) => (
                    <Info key={item.id} label={item.label} value={item.value} />
                  ))}
                </div>
              ) : null}
              {modelSpecs.notes ? (
                <p className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  {modelSpecs.notes}
                </p>
              ) : null}
            </section>
          ) : null}

          <section id="ownership" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("ownership")} subtitle={t("detailSections.ownershipSubtitle")} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("company")} value={`${asset.company.code} - ${asset.company.nameTh}`} />
              <Info label={t("branch")} value={`${asset.branch.code} - ${asset.branch.name}`} />
              <Info label={t("ownershipType")} value={t(`ownershipType_${ownershipType}`)} />
              <Info label={t("department")} value={asset.department ? `${asset.department.code} - ${asset.department.name}` : null} />
              <Info label={t("custodian")} value={asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null} />
              <Info label={t("homeLocation")} value={asset.homeLocation ? `${asset.homeLocation.code} - ${asset.homeLocation.name}` : null} />
              <Info label={t("currentLocation")} value={`${asset.currentLocation.code} - ${asset.currentLocation.name}`} />
            </div>
          </section>

          <div id="components" className="scroll-mt-24 space-y-4">
            <AssetRelationshipMap
              title={t("relationshipMap")}
              subtitle={t("relationshipMapHelp")}
              parentTitle={t("relationshipParent")}
              currentTitle={t("relationshipCurrent")}
              componentsTitle={t("relationshipComponents")}
              licenseAssignedTitle={t("relationshipLicenseAssignedAsset")}
              assignedLicensesTitle={t("relationshipAssignedLicenses")}
              assetTag={asset.assetTag}
              assetName={asset.name}
              parentLinks={installedInLinksForPanel.map((link) => ({
                id: link.id,
                href: `/${locale}/assets/${link.parentAsset.id}`,
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
            />
            <AssetComponentsPanel
              assetId={asset.id}
              currentComponents={currentComponentsForPanel}
              componentHistory={componentHistoryForPanel}
              installedInLinks={installedInLinksForPanel}
              availableAssets={availableComponentAssets}
            />
          </div>

          <section id="purchase" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("purchaseWarranty")} subtitle={t("detailSections.purchaseSubtitle")} />
            <div className={`mb-4 rounded-md border px-4 py-3 ${getWarrantyPanelClass(warrantyState.tone)}`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">{t("warrantyStatus")}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{getWarrantyStatusLabel(warrantyState, t)}</div>
                </div>
                <ShieldCheck className={`h-5 w-5 ${getWarrantyIconClass(warrantyState.tone)}`} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("supplier")} value={asset.supplier ? `${asset.supplier.code} - ${asset.supplier.name}` : null} />
              <Info label={t("purchaseDate")} value={formatDate(asset.purchaseDate)} />
              <Info label={t("warrantyStart")} value={formatDate(asset.warrantyStartDate)} />
              <Info label={t("warrantyEnd")} value={formatDate(asset.warrantyEndDate)} />
              <Info label={t("poNumber")} value={asset.poNumber} />
              <Info label={t("invoiceNumber")} value={asset.invoiceNumber} />
            </div>
            <AssetPurchaseDocuments documents={purchaseDocuments} legacyAttachments={legacyPurchaseDocuments} />
          </section>

          <div id="photos" className="scroll-mt-24">
            <AssetAttachments
              assetId={asset.id}
              attachments={assetAttachments}
              modelPhotos={modelPhotos}
              photoChecklist={photoChecklist}
            />
          </div>

          <section id="evidence" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("evidenceCenter")} subtitle={t("detailSections.evidenceSubtitle")} icon={<Paperclip className="h-5 w-5 text-primary" />} />
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <SummaryPill label={t("evidenceTotal")} value={String(allEvidenceItems.length)} />
              <SummaryPill label={t("evidenceImages")} value={String(allEvidenceItems.filter((item) => item.fileType.startsWith("image/")).length)} />
              <SummaryPill label={t("evidenceDocuments")} value={String(allEvidenceItems.filter((item) => !item.fileType.startsWith("image/")).length)} />
            </div>
            {allEvidenceItems.length === 0 ? (
              <ActionEmptyState
                icon={<Paperclip className="h-6 w-6" />}
                title={t("noEvidence")}
                description={t("noEvidenceHelp")}
                actionHref="#photos"
                actionLabel={t("detailSections.photos")}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {allEvidenceItems.map((item) => (
                  <a
                    key={`${item.group}-${item.id}`}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {item.fileType.startsWith("image/") ? (
                      <div className="flex aspect-video w-full items-center justify-center bg-muted/40 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${item.href}?inline=1`}
                          alt={item.title}
                          loading="lazy"
                          className="max-h-full w-full object-contain transition-transform group-hover:scale-[1.01]"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-muted/40 p-3 text-sm font-medium text-muted-foreground">
                        {item.fileType}
                      </div>
                    )}
                    <div className="border-t border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{item.group}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(item.uploadedAt)}</span>
                      </div>
                      <div className="mt-2 truncate text-sm font-medium text-foreground">{item.title}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section id="handover" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("detailSections.handover")} subtitle={t("detailSections.handoverSubtitle")} icon={<FileText className="h-5 w-5 text-primary" />} />
            {asset.checkouts.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {tCommon("noData")}
              </div>
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
                  const returnLabel = checkout.checkin ? `${checkout.checkin.documentNo ?? checkout.checkin.id} · ${formatDate(checkout.checkin.returnDate)}` : "-"
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
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{t("latestTransaction")}</span>
                            <span className="font-semibold text-foreground">{formatDate(checkout.checkoutDate)}</span>
                            <StatusPill label={checkout.isReturned ? t("handoverReturned") : t("handoverActive")} color={checkout.isReturned ? "#16A34A" : "#2563EB"} />
                          </div>
                          <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                            <Info label={t("documentNo")} value={checkout.documentNo ?? checkout.id} compact />
                            <Info label={t("handoverTo")} value={destination} compact />
                            <Info label={t("expectedReturnDate")} value={formatDate(checkout.expectedReturnDate)} compact />
                            <Info label={t("returnDate")} value={returnLabel} compact />
                            <Info label={t("remark")} value={checkout.remark} compact />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/${locale}/asset-management/checkouts/${checkout.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent">
                            {t("openHandoverDocument")}
                          </Link>
                          {checkout.checkin ? (
                            <Link href={`/${locale}/asset-management/checkins/${checkout.checkin.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent">
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
                            <StatusPill label={checkout.isReturned ? t("handoverReturned") : t("handoverActive")} color={checkout.isReturned ? "#16A34A" : "#2563EB"} />
                          </div>
                          <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                            <Info label={t("documentNo")} value={checkout.documentNo ?? checkout.id} compact />
                            <Info label={t("handoverTo")} value={destination} compact />
                            <Info label={t("returnDate")} value={returnLabel} compact />
                            <Info label={t("remark")} value={checkout.remark} compact />
                          </div>
                        </div>
                        <span className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors group-open:bg-accent">
                          {t("viewEvidence")}
                        </span>
                      </summary>
                      <div className="border-t border-border px-4 pb-4 pt-3">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Link href={`/${locale}/asset-management/checkouts/${checkout.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent">
                            {t("openHandoverDocument")}
                          </Link>
                          {checkout.checkin ? (
                            <Link href={`/${locale}/asset-management/checkins/${checkout.checkin.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent">
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

          <section id="movement" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("movementHistory")} subtitle={t("detailSections.movementSubtitle")} icon={<History className="h-5 w-5 text-primary" />} />
            <div className="mb-5 rounded-md border border-border bg-background p-4">
              <div className="mb-3 text-sm font-semibold text-foreground">{t("movementSnapshot")}</div>
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <Info label={t("currentLocation")} value={currentLocationLabel} compact />
                <Info label={t("custodian")} value={currentCustodianLabel} compact />
                <Info label={t("status")} value={asset.status?.nameTh ?? asset.status?.name} compact />
                <Info label={t("latestMovement")} value={latestMovement ? `${latestMovement.title} · ${formatDateTime(latestMovement.performedAt)}` : null} compact />
              </div>
              {latestMovement ? (
                <div className="mt-3 rounded-md bg-surface/80 px-3 py-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{t("movementSummary")}: </span>
                  {latestMovement.summary}
                </div>
              ) : null}
            </div>
            <AssetMovementTimeline
              items={movementTimelineItemsForClient}
              labels={{
                all: t("movementFilters.all"),
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

          <section id="maintenance" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={tMaintenance("maintenanceHistory")} subtitle={t("detailSections.maintenanceSubtitle")} icon={<History className="h-5 w-5 text-primary" />} />
            <SummaryStrip
              items={[
                { label: t("openMaintenance"), value: String(openMaintenanceCount), tone: openMaintenanceCount > 0 ? "warning" : "success" },
                { label: t("latestMaintenance"), value: maintenanceSummary },
                { label: t("totalMaintenance"), value: String(asset.maintenanceTickets.length) },
                { label: t("maintenanceTotalCost"), value: formatCurrency(totalMaintenanceCost) },
              ]}
            />
            {maintenanceReplacementWarning ? (
              <div className="mb-4 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                {t("maintenanceReplacementWarning")}
              </div>
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{tMaintenance("repairNo")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{tMaintenance("problem")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{tMaintenance("reportedBy")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{tCommon("status")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{tMaintenance("reportedDate")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {asset.maintenanceTickets.map((ticket) => (
                      <ClickableTableRow
                        key={ticket.id}
                        href={`/${locale}/maintenance/${ticket.id}`}
                        label={`${tCommon("view")}: ${ticket.repairNo}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <Link href={`/${locale}/maintenance/${ticket.id}`} className="font-medium text-primary hover:underline">
                            {ticket.repairNo}
                          </Link>
                        </td>
                        <td className="min-w-72 px-4 py-3 text-muted-foreground">{ticket.problem}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {ticket.reportedBy.code} - {ticket.reportedBy.fullNameTh}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {ticket.repairStatus === "open" ? tMaintenance("statuses.open") : ticket.repairStatus === "closed" ? tMaintenance("statuses.closed") : ticket.repairStatus}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(ticket.reportedDate)}</td>
                      </ClickableTableRow>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="audit" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("auditHistory")} subtitle={t("detailSections.auditSubtitle")} icon={<History className="h-5 w-5 text-primary" />} />
            <SummaryStrip
              items={[
                { label: t("latestAudit"), value: auditSummary },
                { label: t("scanCount"), value: latestAuditItem ? String(latestAuditItem.scanCount) : "0" },
                { label: t("auditFindingRequired"), value: latestAuditItem?.findingRequired ? tCommon("yes") : tCommon("no"), tone: latestAuditItem?.findingRequired ? "warning" : "success" },
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("auditRound")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("status")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("result")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("lastAuditDate")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("scanCount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {asset.auditItems.map((item) => (
                      <ClickableTableRow
                        key={item.id}
                        href={`/${locale}/audit/rounds/${item.auditRound.id}`}
                        label={`${tCommon("view")}: ${item.auditRound.auditNo}`}
                      >
                        <td className="min-w-64 px-4 py-3">
                          <div className="font-medium text-foreground">{item.auditRound.auditNo}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{item.auditRound.name}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{item.auditStatus}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{item.auditResult ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(item.lastScanAt ?? item.scannedAt)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{item.scanCount}</td>
                      </ClickableTableRow>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="notes" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("remark")} subtitle={t("detailSections.notesSubtitle")} />
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{asset.remark || "-"}</p>
          </section>
        </div>

        <aside className="space-y-6">
          <section id="qr" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 text-center shadow-sm">
            <h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-semibold text-foreground">
              <QrCode className="h-5 w-5 text-primary" />
              {t("qrCode")}
            </h2>
            <AssetQrCode value={qrValue} label={asset.assetTag} />
          </section>
          <SidebarPhotoCard
            title={t("modelPhoto")}
            caption={asset.model?.name ?? t("modelPhoto")}
            attachment={primaryModelPhoto}
            emptyLabel={tCommon("noData")}
          />
          <SidebarPhotoCard
            title={t("assetPhotos")}
            caption={t("primaryAssetPhoto")}
            attachment={primaryAssetPhoto}
            emptyLabel={tCommon("noData")}
          />
        </aside>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
  href: string
}) {
  return (
    <a href={href} className="rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</span>
      </div>
      <div className="line-clamp-2 text-sm font-semibold text-foreground">{value || "-"}</div>
    </a>
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
    const renewAction = { href: "#purchase", icon: <ShieldCheck className="h-4 w-4" />, label: t("quickRenewLicense") }
    const auditAction = { href: "#audit", icon: <ScanLine className="h-4 w-4" />, label: t("quickAuditLicense") }

    return {
      title: t("lifecycleSoftwareTitle"),
      description: t("lifecycleSoftwareDescription"),
      help: t("quickActionsSoftwareHelp"),
      responsibilityLabel: t("licenseAssignee"),
      responsibilityValue: null,
      statusLabel: t("licenseSeatUsage"),
      statusValue: licenseSeatSummary ?? t("licensePool"),
      statusHref: "#overview",
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
      statusHref: "#handover",
      mobilePrimary: issueAction,
      mobileSecondary: relocateAction,
      actions: [issueAction, relocateAction, { href: `#audit`, icon: <ScanLine className="h-4 w-4" />, label: t("quickAudit") }, { href: maintenanceHref, icon: <Wrench className="h-4 w-4" />, label: t("quickMaintenance") }, latestDocumentAction],
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
      statusHref: "#ownership",
      mobilePrimary: relocateAction,
      mobileSecondary: checkoutAction,
      actions: [relocateAction, checkoutAction, { href: maintenanceHref, icon: <Wrench className="h-4 w-4" />, label: t("quickMaintenance") }, { href: "#audit", icon: <ScanLine className="h-4 w-4" />, label: t("quickAudit") }, latestDocumentAction],
    }
  }

  if (ownershipType === "component") {
    const componentAction = { href: "#components", icon: <GitBranch className="h-4 w-4" />, label: t("quickManageComponent") }
    const transferAction = { href: transferHref, icon: <Truck className="h-4 w-4" />, label: t("quickMoveComponent"), disabled: activeCheckout }

    return {
      title: t("lifecycleComponentTitle"),
      description: t("lifecycleComponentDescription"),
      help: t("quickActionsComponentHelp"),
      responsibilityLabel: t("parentAsset"),
      responsibilityValue: null,
      statusLabel: t("componentStatus"),
      statusValue: t("componentInstalled"),
      statusHref: "#components",
      mobilePrimary: componentAction,
      mobileSecondary: transferAction,
      actions: [componentAction, transferAction, { href: maintenanceHref, icon: <Wrench className="h-4 w-4" />, label: t("quickMaintenance") }, { href: "#audit", icon: <ScanLine className="h-4 w-4" />, label: t("quickAudit") }],
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
    statusHref: "#handover",
    mobilePrimary: checkoutAction,
    mobileSecondary: checkinAction,
    actions: [
      checkoutAction,
      checkinAction,
      { href: transferHref, icon: <GitBranch className="h-4 w-4" />, label: t("quickTransfer"), disabled: activeCheckout },
      { href: maintenanceHref, icon: <Wrench className="h-4 w-4" />, label: t("quickMaintenance") },
      { href: "#audit", icon: <ScanLine className="h-4 w-4" />, label: t("quickAudit") },
      latestDocumentAction,
    ],
  }
}

function ActivitySummaryPanel({
  title,
  subtitle,
  latestTitle,
  followUpTitle,
  noFollowUpLabel,
  latestItem,
  followUpItems,
}: {
  title: string
  subtitle: string
  latestTitle: string
  followUpTitle: string
  noFollowUpLabel: string
  latestItem: ActivitySummaryItem
  followUpItems: ActivitySummaryItem[]
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">{latestTitle}</div>
          <ActivitySummaryLink item={latestItem} spacious />
        </div>
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">{followUpTitle}</div>
          {followUpItems.length === 0 ? (
            <div className="rounded-md border border-success/20 bg-success/5 px-3 py-2 text-sm font-medium text-success">
              {noFollowUpLabel}
            </div>
          ) : (
            <div className="grid gap-2">
              {followUpItems.map((item) => (
                <ActivitySummaryLink key={item.label} item={item} showAction />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ActivitySummaryLink({
  item,
  showAction,
  spacious,
}: {
  item: ActivitySummaryItem
  showAction?: boolean
  spacious?: boolean
}) {
  return (
    <Link
      href={item.href}
      className={`block rounded-md border px-3 transition-colors hover:border-primary/40 hover:bg-primary/5 ${spacious ? "py-4" : "py-2"} ${getActivityToneClass(item.tone)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{item.label}</div>
          <div className={`mt-1 text-sm font-semibold text-foreground ${spacious ? "line-clamp-3" : "line-clamp-2"}`}>{item.value || "-"}</div>
        </div>
        {showAction && item.actionLabel ? (
          <span className="shrink-0 rounded-full bg-surface/80 px-2 py-1 text-xs font-medium text-primary">
            {item.actionLabel}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

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
      <span className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-border bg-muted/50 px-3 text-sm font-medium text-muted-foreground opacity-70">
        {icon}
        {label}
      </span>
    )
  }

  return (
    <Link href={href} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
      {icon}
      {label}
    </Link>
  )
}

function SummaryStrip({
  items,
}: {
  items: { label: string; value: string; tone?: "success" | "warning" | "danger" | "neutral" }[]
}) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className={`rounded-md border px-3 py-2 ${getSummaryToneClass(item.tone ?? "neutral")}`}>
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{item.label}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{item.value || "-"}</div>
        </div>
      ))}
    </div>
  )
}

function AssetRelationshipMap({
  title,
  subtitle,
  parentTitle,
  currentTitle,
  componentsTitle,
  licenseAssignedTitle,
  assignedLicensesTitle,
  assetTag,
  assetName,
  parentLinks,
  childLinks,
  licenseAssignedLinks,
  assignedLicenseLinks,
  emptyLabel,
}: {
  title: string
  subtitle: string
  parentTitle: string
  currentTitle: string
  componentsTitle: string
  licenseAssignedTitle: string
  assignedLicensesTitle: string
  assetTag: string
  assetName: string
  parentLinks: RelationshipLink[]
  childLinks: RelationshipLink[]
  licenseAssignedLinks: RelationshipLink[]
  assignedLicenseLinks: RelationshipLink[]
  emptyLabel: string
}) {
  const hasLinks = parentLinks.length > 0 || childLinks.length > 0 || licenseAssignedLinks.length > 0 || assignedLicenseLinks.length > 0

  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <SectionHeading title={title} subtitle={subtitle} icon={<GitBranch className="h-5 w-5 text-primary" />} />
      {!hasLinks ? (
        <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <RelationshipColumn title={parentTitle} links={parentLinks} emptyLabel={emptyLabel} />
          <div className="flex items-center justify-center">
            <div className="w-full rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-center lg:w-56">
              <div className="text-xs font-medium uppercase tracking-normal text-primary">{currentTitle}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{assetTag}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{assetName}</div>
            </div>
          </div>
          <RelationshipColumn title={componentsTitle} links={childLinks} emptyLabel={emptyLabel} />
          {(licenseAssignedLinks.length > 0 || assignedLicenseLinks.length > 0) ? (
            <div className="grid gap-3 lg:col-span-3 lg:grid-cols-2">
              <RelationshipColumn title={licenseAssignedTitle} links={licenseAssignedLinks} emptyLabel={emptyLabel} />
              <RelationshipColumn title={assignedLicensesTitle} links={assignedLicenseLinks} emptyLabel={emptyLabel} />
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function RelationshipColumn({
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
      <div className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">{title}</div>
      {links.length === 0 ? (
        <div className="text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <Link key={link.id} href={link.href} className="block rounded-md border border-border bg-surface px-3 py-2 transition-colors hover:border-primary/40 hover:bg-primary/5">
              <div className="text-sm font-medium text-primary">{link.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{link.role}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarPhotoCard({
  title,
  caption,
  attachment,
  emptyLabel,
}: {
  title: string
  caption: string
  attachment?: { id: string; originalName: string } | null
  emptyLabel: string
}) {
  return (
    <section className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-semibold text-foreground">
        <ImageIcon className="h-5 w-5 text-primary" />
        {title}
      </h2>
      {attachment ? (
        <a
          href="#photos"
          className="group block overflow-hidden rounded-lg border border-border bg-background transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted/40 p-2">
            {/* Authenticated attachment URLs render more reliably as browser-native images. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/attachments/${attachment.id}?inline=1`}
              alt={attachment.originalName}
              width={320}
              height={240}
              loading="eager"
              fetchPriority="high"
              className="max-h-full w-full object-contain transition-transform group-hover:scale-[1.01]"
            />
          </div>
          <div className="border-t border-border p-3 text-left">
            <div className="text-sm font-medium text-foreground">{caption}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{attachment.originalName}</div>
          </div>
        </a>
      ) : (
        <a
          href="#photos"
          className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {emptyLabel}
        </a>
      )}
    </section>
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
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{title}</div>
      {attachments.length === 0 ? (
        <div className="mt-2 text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="mt-2 grid gap-2">
          {attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={`/api/attachments/${attachment.id}?inline=1`}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
              title={attachment.originalName}
            >
              {attachment.fileType.startsWith("image/") ? (
                <div className="flex aspect-video w-full items-center justify-center bg-muted/40 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/attachments/${attachment.id}?inline=1`}
                    alt={attachment.originalName}
                    loading="lazy"
                    className="max-h-full w-full object-contain transition-transform group-hover:scale-[1.01]"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-muted/40 p-3 text-sm font-medium text-muted-foreground">
                  {attachment.fileType}
                </div>
              )}
              <div className="truncate border-t border-border px-2 py-1.5 text-xs font-medium text-foreground">
                {attachment.originalName}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
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
  return "-"
}

function SectionHeading({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  )
}

function Info({
  label,
  value,
  compact,
}: {
  label: string
  value?: string | number | null
  compact?: boolean
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className={compact ? "mt-0.5 text-sm text-foreground" : "mt-1 text-sm font-medium text-foreground"}>
        {value || "-"}
      </div>
    </div>
  )
}

function StatusPill({ label, color }: { label: string; color?: string | null }) {
  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
      style={color ? { backgroundColor: `${color}1A`, color } : undefined}
    >
      {label}
    </span>
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
  t: (key: string, values?: Record<string, string | number | Date>) => string
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
      { label: t("purchasePrice"), value: document.totalAmount == null ? null : `${formatCurrency(document.totalAmount)} ${document.currency ?? ""}`.trim() },
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
    reportedDate: Date
    reportedBy: { code: string; fullNameTh: string }
  }[],
  locale: string,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): MovementTimelineItem[] {
  return tickets.map((ticket) => ({
    id: `maintenance-${ticket.id}`,
    title: t("timelineMaintenanceTicket"),
    summary: `${ticket.repairNo}: ${ticket.problem}`,
    category: "maintenance",
    tone: (ticket.repairStatus === "closed" ? "success" : "warning") as MovementTone,
    performedAt: ticket.reportedDate,
    from: null,
    to: null,
    reason: null,
    details: compactMovementDetails([
      { label: t("repairNo"), value: ticket.repairNo, href: `/${locale}/maintenance/${ticket.id}` },
      { label: t("reportedBy"), value: `${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}` },
      { label: t("repairStatus"), value: ticket.repairStatus },
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
  t: (key: string, values?: Record<string, string | number | Date>) => string
): MovementTimelineItem[] {
  return auditItems.map((item) => ({
    id: `audit-${item.id}`,
    title: t("timelineAuditRound"),
    summary: `${item.auditRound.auditNo}: ${item.auditResult ?? item.auditStatus}`,
    category: "audit",
    tone: (item.findingRequired ? "warning" : "success") as MovementTone,
    performedAt: item.lastScanAt ?? item.createdAt,
    from: null,
    to: null,
    reason: null,
    details: compactMovementDetails([
      { label: t("auditRound"), value: `${item.auditRound.auditNo} - ${item.auditRound.name}`, href: `/${locale}/audit/rounds/${item.auditRound.id}` },
      { label: t("result"), value: item.auditResult ?? item.auditStatus },
      { label: t("scanCount"), value: String(item.scanCount) },
      { label: t("auditFindingRequired"), value: item.findingRequired ? t("timelineYes") : t("timelineNo") },
    ]),
  }))
}

function createHealthItem(done: boolean, label: string, href: string, actionLabel: string, fixHref: string) {
  return { done, label, href, actionLabel, fixHref }
}

function maskLicenseKey(value?: string | null) {
  if (!value) return null
  const compact = value.replace(/\s+/g, "")
  if (compact.length <= 8) return "••••"
  return `${compact.slice(0, 4)}••••${compact.slice(-4)}`
}

function formatLicenseRelationshipRole(usedSeats: number | null, totalSeats: number | null, t: (key: string, values?: Record<string, string | number>) => string) {
  if (totalSeats == null) return t("relationshipLicenseRole")
  return t("relationshipLicenseSeatRole", {
    used: usedSeats ?? 0,
    total: totalSeats,
  })
}

function getWarrantyState(warrantyEndDate: Date | null) {
  if (!warrantyEndDate) return { tone: "neutral" as const, daysLeft: null }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const warrantyEnd = new Date(warrantyEndDate)
  warrantyEnd.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((warrantyEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return { tone: "danger" as const, daysLeft }
  if (daysLeft <= 30) return { tone: "warning" as const, daysLeft }
  return { tone: "success" as const, daysLeft }
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

function getMissingPhotoChecklistLabels(
  photoChecklist: string[],
  attachments: { id: string; originalName: string; fileType: string }[]
) {
  const imageAttachments = attachments.filter((attachment) => attachment.fileType.startsWith("image/"))
  const legacyLabelCounts = photoChecklist.reduce<Record<string, number>>((counts, item) => {
    const legacyLabel = legacySanitizedPhotoLabel(item)
    counts[legacyLabel] = (counts[legacyLabel] ?? 0) + 1
    return counts
  }, {})

  return photoChecklist.filter(
    (item) => !imageAttachments.some((attachment) => attachmentMatchesPhotoLabel(attachment, item, legacyLabelCounts))
  )
}

function attachmentMatchesPhotoLabel(
  attachment: { originalName: string },
  label: string,
  legacyLabelCounts: Record<string, number>
) {
  const normalizedLabel = normalizePhotoLabel(label)
  const legacyLabel = legacySanitizedPhotoLabel(label)
  const legacyLabelIsSafeFallback = Boolean(legacyLabel) && legacyLabelCounts[legacyLabel] === 1

  return [label, normalizedLabel, legacyLabelIsSafeFallback ? legacyLabel : ""]
    .filter(Boolean)
    .some((candidate) => attachment.originalName.startsWith(`${candidate} - `))
}

function normalizePhotoLabel(label: string) {
  return label.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim()
}

function legacySanitizedPhotoLabel(label: string) {
  const normalized = label.normalize("NFKD")
  return normalized.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim()
}

function getWarrantyIconClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "text-success"
  if (tone === "warning") return "text-warning"
  if (tone === "danger") return "text-danger"
  return "text-muted-foreground"
}

function getWarrantyPanelClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "border-success/20 bg-success/5"
  if (tone === "warning") return "border-warning/30 bg-warning/10"
  if (tone === "danger") return "border-danger/30 bg-danger/10"
  return "border-border bg-background"
}

function getHealthPanelClass(tone: "success" | "warning" | "danger") {
  if (tone === "success") return "border-success/20 bg-success/5"
  if (tone === "warning") return "border-warning/30 bg-warning/10"
  return "border-danger/30 bg-danger/10"
}

function getHealthBadgeClass(tone: "success" | "warning" | "danger") {
  if (tone === "success") return "bg-success/10 text-success"
  if (tone === "warning") return "bg-warning/10 text-warning"
  return "bg-danger/10 text-danger"
}

function getActivityToneClass(tone: MovementTone) {
  if (tone === "success") return "border-success/20 bg-success/5"
  if (tone === "info") return "border-info/20 bg-info/5"
  if (tone === "warning") return "border-warning/30 bg-warning/10"
  if (tone === "danger") return "border-danger/30 bg-danger/10"
  return "border-border bg-background"
}

function getSummaryToneClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "border-success/20 bg-success/5"
  if (tone === "warning") return "border-warning/30 bg-warning/10"
  if (tone === "danger") return "border-danger/30 bg-danger/10"
  return "border-border bg-background"
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

function formatMovementType(movementType: string) {
  return movementType
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function compactMovementDetails(details: MovementCustodyDetail[]) {
  const seen = new Set<string>()

  return details.filter((detail) => {
    const value = detail.value?.trim()
    if (!value) return false

    const key = `${detail.label}:${value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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
  "audit_correction",
])
