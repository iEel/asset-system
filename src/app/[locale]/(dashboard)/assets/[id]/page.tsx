import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, Edit, FileText, History, ImageIcon, Printer, QrCode } from "lucide-react"
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

type AssetDetailPageProps = {
  params: Promise<{ id: string; locale: string }>
}

type MovementCustodyDetail = {
  label: string
  value?: string | null
}

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
          checkin: true,
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

  const [photoChecklist, modelPhotos, availableComponentAssets] = await Promise.all([
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
  ])
  const currentComponents = asset.parentComponents.filter((component) => component.status === "installed" && !component.removedAt)
  const componentHistory = asset.parentComponents.filter((component) => component.status !== "installed" || component.removedAt)
  const purchaseDocumentIds = asset.purchaseDocumentLinks.map((link) => link.purchaseDocumentId)
  const purchaseDocumentAttachments = purchaseDocumentIds.length > 0
    ? await prisma.attachment.findMany({
        where: { module: "purchase_document", referenceId: { in: purchaseDocumentIds }, isActive: true },
        orderBy: { uploadedAt: "desc" },
      })
    : []
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
  const [operationAttachments, checkoutDepartments, checkoutLocations, checkoutParentAssets, movementUsers] = await Promise.all([
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
  const checkoutsById = new Map(asset.checkouts.map((checkout) => [checkout.id, checkout]))
  const checkinsById = new Map(asset.checkouts.flatMap((checkout) => checkout.checkin ? [[checkout.checkin.id, { ...checkout.checkin, checkout }]] : []))
  const movementCustodyDetails = new Map<string, MovementCustodyDetail[]>()
  for (const movement of asset.movements) {
    const details: MovementCustodyDetail[] = []

    if (movement.referenceType === "checkout" && movement.referenceId) {
      const checkout = checkoutsById.get(movement.referenceId)
      if (checkout) {
        details.push(
          { label: t("documentNo"), value: checkout.documentNo ?? checkout.id },
          {
            label: t("handoverTo"),
            value: getCheckoutDestination(checkout, {
              departments: checkoutDepartmentLabels,
              locations: checkoutLocationLabels,
              parentAssets: checkoutParentAssetLabels,
            }),
          },
          { label: t("handoverBy"), value: movementUserLabels.get(checkout.checkedOutBy) ?? checkout.checkedOutBy }
        )
      }
    }

    if (movement.referenceType === "checkin" && movement.referenceId) {
      const checkin = checkinsById.get(movement.referenceId)
      if (checkin) {
        details.push(
          { label: t("documentNo"), value: checkin.documentNo ?? checkin.id },
          {
            label: t("returnedFrom"),
            value: getCheckoutDestination(checkin.checkout, {
              departments: checkoutDepartmentLabels,
              locations: checkoutLocationLabels,
              parentAssets: checkoutParentAssetLabels,
            }),
          },
          { label: t("returnBy"), value: checkin.returnBy },
          { label: t("receiveBy"), value: checkin.receiveBy }
        )
      }
    }

    details.push({ label: t("performedBy"), value: movementUserLabels.get(movement.performedBy) ?? movement.performedBy })
    movementCustodyDetails.set(movement.id, compactMovementDetails(details))
  }
  const modelSpecs = parseModelSpecs(asset.model?.specs)
  const movementLabels = await getMovementDisplayLabels(asset.movements)

  const detailPath = `/${locale}/assets/${asset.id}`
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
    { id: "handover", label: t("detailSections.handover") },
    { id: "movement", label: t("detailSections.movement") },
    { id: "maintenance", label: t("detailSections.maintenance") },
    { id: "audit", label: t("detailSections.audit") },
    { id: "notes", label: t("detailSections.notes") },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/${locale}/assets`} className="inline-flex items-center gap-1 hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              {tCommon("back")}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{asset.assetTag}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{asset.name}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
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
              <Info label={t("serialNumber")} value={asset.serialNumber} />
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
              <Info label={t("department")} value={asset.department ? `${asset.department.code} - ${asset.department.name}` : null} />
              <Info label={t("custodian")} value={asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null} />
              <Info label={t("homeLocation")} value={asset.homeLocation ? `${asset.homeLocation.code} - ${asset.homeLocation.name}` : null} />
              <Info label={t("currentLocation")} value={`${asset.currentLocation.code} - ${asset.currentLocation.name}`} />
            </div>
          </section>

          <div id="components" className="scroll-mt-24">
            <AssetComponentsPanel
              assetId={asset.id}
              currentComponents={currentComponents}
              componentHistory={componentHistory}
              availableAssets={availableComponentAssets}
            />
          </div>

          <section id="purchase" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("purchaseWarranty")} subtitle={t("detailSections.purchaseSubtitle")} />
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

          <section id="handover" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("detailSections.handover")} subtitle={t("detailSections.handoverSubtitle")} icon={<FileText className="h-5 w-5 text-primary" />} />
            {asset.checkouts.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {tCommon("noData")}
              </div>
            ) : (
              <div className="space-y-3">
                {asset.checkouts.map((checkout) => {
                  const checkoutAttachments = operationAttachmentsByReference.get(checkout.id) ?? []
                  const checkinAttachments = checkout.checkin ? operationAttachmentsByReference.get(checkout.checkin.id) ?? [] : []

                  return (
                    <div key={checkout.id} className="rounded-md border border-border bg-background p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{formatDate(checkout.checkoutDate)}</span>
                            <StatusPill label={checkout.isReturned ? t("handoverReturned") : t("handoverActive")} color={checkout.isReturned ? "#16A34A" : "#2563EB"} />
                          </div>
                          <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                            <Info label={t("documentNo")} value={checkout.documentNo ?? checkout.id} compact />
                            <Info label={t("handoverTo")} value={getCheckoutDestination(checkout, {
                              departments: checkoutDepartmentLabels,
                              locations: checkoutLocationLabels,
                              parentAssets: checkoutParentAssetLabels,
                            })} compact />
                            <Info label={t("expectedReturnDate")} value={formatDate(checkout.expectedReturnDate)} compact />
                            {checkout.checkin ? <Info label={t("returnDate")} value={`${checkout.checkin.documentNo ?? checkout.checkin.id} · ${formatDate(checkout.checkin.returnDate)}`} compact /> : <Info label={t("returnDate")} value="-" compact />}
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
                      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        <EvidenceLinks title={t("checkoutPhotoBefore")} attachments={checkoutAttachments.filter((attachment) => attachment.module === "checkout_photo_before")} emptyLabel={t("noEvidence")} />
                        <EvidenceLinks title={t("receiverSignature")} attachments={checkoutAttachments.filter((attachment) => attachment.module === "checkout_receiver_signature")} emptyLabel={t("noEvidence")} />
                        <EvidenceLinks title={t("checkinPhotoAfter")} attachments={checkinAttachments.filter((attachment) => attachment.module === "checkin_photo_after")} emptyLabel={t("noEvidence")} />
                        <EvidenceLinks title={t("returnSignature")} attachments={checkinAttachments.filter((attachment) => attachment.module === "checkin_return_signature")} emptyLabel={t("noEvidence")} />
                        <EvidenceLinks title={t("receiveSignature")} attachments={checkinAttachments.filter((attachment) => attachment.module === "checkin_receive_signature")} emptyLabel={t("noEvidence")} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section id="movement" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={t("movementHistory")} subtitle={t("detailSections.movementSubtitle")} icon={<History className="h-5 w-5 text-primary" />} />
            {asset.movements.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {tCommon("noData")}
              </div>
            ) : (
              <ol className="space-y-4">
                {asset.movements.map((movement) => (
                  <li key={movement.id} className="relative border-l border-border pl-4">
                    <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
                    <div className="rounded-md bg-background p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="font-medium text-foreground">{movement.movementType.replaceAll("_", " ")}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(movement.performedAt)}</div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <Info label={t("fromValue")} value={movementLabels.get(movement.id)?.from} compact />
                        <Info label={t("toValue")} value={movementLabels.get(movement.id)?.to} compact />
                      </div>
                      {movementCustodyDetails.get(movement.id)?.length ? (
                        <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-border bg-surface/70 p-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
                          {movementCustodyDetails.get(movement.id)?.map((detail) => (
                            <Info key={`${movement.id}-${detail.label}`} label={detail.label} value={detail.value} compact />
                          ))}
                        </div>
                      ) : null}
                      {movement.reason && <p className="mt-2 text-sm text-muted-foreground">{movement.reason}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section id="maintenance" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6 shadow-sm">
            <SectionHeading title={tMaintenance("maintenanceHistory")} subtitle={t("detailSections.maintenanceSubtitle")} icon={<History className="h-5 w-5 text-primary" />} />
            {asset.maintenanceTickets.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {tCommon("noData")}
              </div>
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
            {asset.auditItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {tCommon("noData")}
              </div>
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
