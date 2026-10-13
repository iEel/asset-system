import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildSupplierDetailHrefs,
  buildSupplierDetailSummary,
  buildSupplierFollowUpItems,
  type SupplierFollowUpKey,
} from "@/lib/supplier-detail"
import { formatCount, formatMoney } from "@/lib/display-format"
import { formatDate } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { SupplierPurchaseDocuments } from "@/components/master-data/supplier-purchase-documents"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "@/lib/maintenance-status"
import { appendMasterDataReturnTo, normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"

type SupplierDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function SupplierDetailPage({ params, searchParams }: SupplierDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "suppliers", rawSearchParams.returnTo)
  await requirePagePermission(locale, "supplier", "view")

  const t = await getTranslations("supplier")
  const tCommon = await getTranslations("common")
  const tMaintenance = await getTranslations("maintenancePage")
  const tAsset = await getTranslations("asset")

  const supplier = await prisma.supplier.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      address: true,
    },
  })
  if (!supplier) notFound()

  const [
    assetCount,
    assets,
    purchaseDocumentCount,
    purchaseDocuments,
    purchaseAmount,
    maintenanceTicketCount,
    openMaintenanceTicketCount,
    maintenanceTickets,
    maintenanceCost,
  ] = await Promise.all([
    prisma.asset.count({ where: { supplierId: id, isActive: true } }),
    prisma.asset.findMany({
      where: { supplierId: id, isActive: true },
      select: {
        id: true,
        assetTag: true,
        name: true,
        purchaseDate: true,
        purchasePrice: true,
        category: { select: { code: true, name: true } },
        currentLocation: { select: { code: true, name: true } },
        status: { select: { nameTh: true, name: true, colorCode: true } },
      },
      orderBy: [{ purchaseDate: "desc" }, { assetTag: "asc" }],
      take: 10,
    }),
    prisma.purchaseDocument.count({ where: { supplierId: id, isActive: true } }),
    prisma.purchaseDocument.findMany({
      where: { supplierId: id, isActive: true },
      select: {
        id: true,
        documentType: true,
        documentNo: true,
        poNumber: true,
        invoiceNumber: true,
        documentDate: true,
        totalAmount: true,
        currency: true,
        _count: { select: { assetLinks: true } },
      },
      orderBy: [{ documentDate: "desc" }, { updatedAt: "desc" }],
      take: 10,
    }),
    prisma.purchaseDocument.aggregate({
      where: { supplierId: id, isActive: true },
      _sum: { totalAmount: true },
    }),
    prisma.maintenanceTicket.count({ where: { vendorId: id, isActive: true } }),
    prisma.maintenanceTicket.count({ where: { vendorId: id, isActive: true, repairStatus: { notIn: ["closed", "cancelled"] } } }),
    prisma.maintenanceTicket.findMany({
      where: { vendorId: id, isActive: true },
      select: {
        id: true,
        repairNo: true,
        repairStatus: true,
        reportedDate: true,
        repairCost: true,
        problem: true,
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: [{ reportedDate: "desc" }, { repairNo: "asc" }],
      take: 10,
    }),
    prisma.maintenanceTicket.aggregate({
      where: { vendorId: id, isActive: true },
      _sum: { repairCost: true },
    }),
  ])

  const hrefs = buildSupplierDetailHrefs({ locale, supplierId: id })
  const editHref = appendMasterDataReturnTo(hrefs.edit, returnToHref)
  const summary = buildSupplierDetailSummary({
    assetCount,
    purchaseDocumentCount,
    maintenanceTicketCount,
    openMaintenanceTicketCount,
    purchaseAmount: Number(purchaseAmount._sum.totalAmount ?? 0),
    maintenanceCost: Number(maintenanceCost._sum.repairCost ?? 0),
  })
  const followUpItems = buildSupplierFollowUpItems({
    hasContact: Boolean(supplier.contactPerson || supplier.phone || supplier.email),
    assetCount,
    purchaseDocumentCount,
    openMaintenanceTicketCount,
  })
  const maintenanceStatusLabels = Object.fromEntries(maintenanceStatuses.map((status) => [status, tMaintenance(`statuses.${status}`)]))

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: supplier.code, code: true },
        ]}
        title={supplier.name}
        meta={
          <>
            <span className="tag">{supplier.code}</span>
            {supplier.contactPerson ? <span>{supplier.contactPerson}</span> : null}
            {supplier.phone ? <span>{supplier.phone}</span> : null}
            {supplier.email ? <span>{supplier.email}</span> : null}
            {supplier.contactPerson || supplier.phone || supplier.email ? null : <span>{t("noContactDetail")}</span>}
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <Link href={editHref} className={buttonVariants({ size: "md" })}>
            <Edit aria-hidden="true" />
            {tCommon("edit")}
          </Link>
        }
      />

      {/* Counts in one strip; the two money totals in their own strip, one per row below lg, so an amount in the
          28px metric size is never cut (a five-cell strip leaves about 104px a cell at 1024px). */}
      <div className="space-y-3">
        <StatStrip
          items={[
            { key: "assets", label: t("assets"), value: formatCount(summary.assetCount), foot: t("linkedAssetsHelp"), footTitle: t("linkedAssetsHelp"), href: hrefs.assets },
            { key: "purchaseDocuments", label: t("purchaseDocuments"), value: formatCount(summary.purchaseDocumentCount), foot: t("purchaseDocumentsHelp"), footTitle: t("purchaseDocumentsHelp") },
            {
              key: "maintenanceTickets",
              label: t("maintenanceTickets"),
              value: formatCount(summary.maintenanceTicketCount),
              foot: t("openMaintenanceCount", { count: summary.openMaintenanceTicketCount }),
              footTitle: t("openMaintenanceCount", { count: summary.openMaintenanceTicketCount }),
              attention: summary.openMaintenanceTicketCount > 0,
            },
          ]}
        />
        <StatStrip
          className="max-lg:grid-cols-1"
          items={[
            { key: "purchaseAmount", label: t("totalPurchaseAmount"), value: formatMoney(summary.purchaseAmount), unit: tCommon("baht"), foot: t("fromPurchaseDocuments"), footTitle: t("fromPurchaseDocuments") },
            { key: "maintenanceCost", label: t("totalMaintenanceCost"), value: formatMoney(summary.maintenanceCost), unit: tCommon("baht"), foot: t("fromMaintenanceTickets"), footTitle: t("fromMaintenanceTickets") },
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-5">
            <SectionTitle title={t("profileTitle")} />
            <KeyValueList
              className="mt-4"
              items={[
                { key: "contactPerson", label: t("contactPerson"), value: supplier.contactPerson },
                { key: "phone", label: t("phone"), value: supplier.phone },
                { key: "email", label: t("email"), value: supplier.email },
                { key: "address", label: t("address"), value: supplier.address },
              ]}
            />
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <SectionTitle title={t("followUpTitle")} />
            {followUpItems.length === 0 ? (
              <div className="mt-4 rounded-md border border-success-border bg-success-soft p-3 text-sm text-success">
                {t("noFollowUp")}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {followUpItems.map((item) => (
                  <div key={item} className="flex gap-2 rounded-md border border-warning-border bg-warning-soft p-3 text-sm text-warning">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{followUpText(item, t)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-5">
            <SectionTitle title={t("linkedAssetsTitle")} actionHref={hrefs.assets} actionLabel={t("viewAllAssets")} />
            {assets.length === 0 ? (
              <ActionEmptyState title={t("noAssets")} description={t("noAssetsHelp")} />
            ) : (
              <div className="mt-4 divide-y divide-border">
                {assets.map((asset) => (
                  <Link key={asset.id} href={`/${locale}/assets/${asset.id}`} className="flex min-h-11 flex-col gap-2 py-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">
                      <span className="block font-medium text-primary"><span className="tag">{asset.assetTag}</span> - {asset.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        <span className="tag">{asset.category.code}</span> - {asset.category.name} / <span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                      <StatusBadge label={locale === "en" ? asset.status.name : asset.status.nameTh} status={asset.status.name} />
                      {asset.purchasePrice == null ? <Nil /> : <span className="num">{formatMoney(Number(asset.purchasePrice), { unit: tCommon("baht") })}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <SectionTitle title={t("purchaseDocumentsTitle")} />
            <SupplierPurchaseDocuments
              documents={purchaseDocuments.map((document) => ({
                id: document.id,
                documentType: document.documentType,
                documentNo: document.documentNo,
                poNumber: document.poNumber,
                invoiceNumber: document.invoiceNumber,
                documentDate: document.documentDate,
                totalAmount: Number(document.totalAmount ?? 0),
                currency: document.currency,
                linkedAssets: document._count.assetLinks,
              }))}
              labels={{
                documentNo: t("documentNo"),
                documentDate: t("documentDate"),
                linkedAssets: t("linkedAssets"),
                totalAmount: tAsset("purchaseDocumentAmountBaht"),
                noPurchaseDocuments: t("noPurchaseDocuments"),
                noPurchaseDocumentsHelp: t("noPurchaseDocumentsHelp"),
              }}
            />
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <SectionTitle title={t("maintenanceHistoryTitle")} />
            {maintenanceTickets.length === 0 ? (
              <ActionEmptyState title={t("noMaintenance")} description={t("noMaintenanceHelp")} />
            ) : (
              <div className="mt-4 space-y-3">
                {maintenanceTickets.map((ticket) => (
                  <Link key={ticket.id} href={`/${locale}/maintenance/${ticket.id}`} className="block min-h-11 rounded-md border border-border bg-background p-3 transition-colors hover:border-primary-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-primary"><span className="tag">{ticket.repairNo}</span> - <span className="tag">{ticket.asset.assetTag}</span></div>
                        <div className="mt-1 text-sm text-foreground">{ticket.asset.name}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.problem}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                        <StatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, maintenanceStatusLabels)} tone={getMaintenanceStatusTone(ticket.repairStatus)} />
                        <span className="text-xs text-muted-foreground num">{ticket.repairCost == null ? <Nil /> : formatMoney(Number(ticket.repairCost), { unit: tCommon("baht") })}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{t("reportedDate")}: {formatDate(ticket.reportedDate)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-primary hover:bg-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

function followUpText(item: SupplierFollowUpKey, t: (key: string) => string) {
  if (item === "missing_contact") return t("followUpMissingContact")
  if (item === "assets_without_purchase_documents") return t("followUpAssetsWithoutPurchaseDocuments")
  return t("followUpOpenMaintenance")
}
