import type React from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  ClipboardList,
  Edit,
  FileText,
  Mail,
  Phone,
  Wrench,
} from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildSupplierDetailHrefs,
  buildSupplierDetailSummary,
  buildSupplierFollowUpItems,
  type SupplierFollowUpKey,
} from "@/lib/supplier-detail"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
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
    prisma.maintenanceTicket.count({ where: { vendorId: id, isActive: true, repairStatus: { not: "closed" } } }),
    prisma.maintenanceTicket.findMany({
      where: { vendorId: id, isActive: true },
      select: {
        id: true,
        repairNo: true,
        repairStatus: true,
        reportedDate: true,
        dueDate: true,
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
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: returnToHref },
                { label: supplier.code },
              ]}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{supplier.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {supplier.code} / {[supplier.contactPerson, supplier.phone, supplier.email].filter(Boolean).join(" / ") || t("noContactDetail")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={returnToHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {tCommon("back")}
          </Link>
          <Link
            href={editHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Edit aria-hidden="true" className="h-4 w-4" />
            {tCommon("edit")}
          </Link>
        </div>
      </div>

      <div className="grid auto-cols-[minmax(230px,85%)] grid-flow-col gap-3 overflow-x-auto pb-2 md:grid-flow-row md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-5">
        <MetricCard label={t("assets")} value={summary.assetCount} detail={t("linkedAssetsHelp")} href={hrefs.assets} icon={<Boxes aria-hidden="true" className="h-5 w-5 text-primary" />} />
        <MetricCard label={t("purchaseDocuments")} value={summary.purchaseDocumentCount} detail={t("purchaseDocumentsHelp")} icon={<FileText aria-hidden="true" className="h-5 w-5 text-primary" />} />
        <MetricCard label={t("maintenanceTickets")} value={summary.maintenanceTicketCount} detail={t("openMaintenanceCount", { count: summary.openMaintenanceTicketCount })} icon={<Wrench aria-hidden="true" className="h-5 w-5 text-primary" />} tone={summary.openMaintenanceTicketCount > 0 ? "warning" : "neutral"} />
        <MetricCard label={t("totalPurchaseAmount")} value={formatCurrency(summary.purchaseAmount)} detail={t("fromPurchaseDocuments")} icon={<ClipboardList aria-hidden="true" className="h-5 w-5 text-primary" />} />
        <MetricCard label={t("totalMaintenanceCost")} value={formatCurrency(summary.maintenanceCost)} detail={t("fromMaintenanceTickets")} icon={<Wrench aria-hidden="true" className="h-5 w-5 text-primary" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <SectionTitle title={t("profileTitle")} />
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label={t("contactPerson")} value={supplier.contactPerson} icon={<Mail aria-hidden="true" className="h-4 w-4" />} />
              <InfoRow label={t("phone")} value={supplier.phone} icon={<Phone aria-hidden="true" className="h-4 w-4" />} />
              <InfoRow label={t("email")} value={supplier.email} icon={<Mail aria-hidden="true" className="h-4 w-4" />} />
              <InfoRow label={t("address")} value={supplier.address} />
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <SectionTitle title={t("followUpTitle")} />
            {followUpItems.length === 0 ? (
              <div className="mt-4 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
                {t("noFollowUp")}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {followUpItems.map((item) => (
                  <div key={item} className="flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{followUpText(item, t)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <SectionTitle title={t("linkedAssetsTitle")} actionHref={hrefs.assets} actionLabel={t("viewAllAssets")} />
            {assets.length === 0 ? (
              <ActionEmptyState title={t("noAssets")} description={t("noAssetsHelp")} />
            ) : (
              <div className="mt-4 divide-y divide-border">
                {assets.map((asset) => (
                  <Link key={asset.id} href={`/${locale}/assets/${asset.id}`} className="flex min-h-11 flex-col gap-2 py-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">
                      <span className="block font-medium text-primary">{asset.assetTag} - {asset.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {asset.category.code} - {asset.category.name} / {asset.currentLocation.code} - {asset.currentLocation.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                      <StatusBadge label={locale === "en" ? asset.status.name : asset.status.nameTh} status={asset.status.name} />
                      {formatCurrency(Number(asset.purchasePrice ?? 0))}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
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
                totalAmount: t("totalAmount"),
                noPurchaseDocuments: t("noPurchaseDocuments"),
                noPurchaseDocumentsHelp: t("noPurchaseDocumentsHelp"),
              }}
            />
          </section>

          <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <SectionTitle title={t("maintenanceHistoryTitle")} />
            {maintenanceTickets.length === 0 ? (
              <ActionEmptyState title={t("noMaintenance")} description={t("noMaintenanceHelp")} />
            ) : (
              <div className="mt-4 space-y-3">
                {maintenanceTickets.map((ticket) => (
                  <Link key={ticket.id} href={`/${locale}/maintenance/${ticket.id}`} className="block min-h-11 rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-primary">{ticket.repairNo} - {ticket.asset.assetTag}</div>
                        <div className="mt-1 text-sm text-foreground">{ticket.asset.name}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.problem}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                        <StatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, maintenanceStatusLabels)} tone={getMaintenanceStatusTone(ticket.repairStatus)} />
                        <span className="text-xs text-muted-foreground">{formatCurrency(Number(ticket.repairCost ?? 0))}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{t("reportedDate")}: {formatDate(ticket.reportedDate)}</span>
                      <span>{t("dueDate")}: {formatDate(ticket.dueDate)}</span>
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

function MetricCard({
  label,
  value,
  detail,
  icon,
  href,
  tone = "neutral",
}: {
  label: string
  value: number | string
  detail: string
  icon: React.ReactNode
  href?: string
  tone?: "neutral" | "warning"
}) {
  const content = (
    <div className={[
      "rounded-lg border bg-surface p-4 shadow-sm transition-colors",
      tone === "warning" ? "border-warning/40 bg-warning/5" : "border-border",
      href ? "hover:border-primary/40 hover:bg-accent/60" : "",
    ].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
        </div>
        <div className="rounded-md bg-primary/10 p-2">{icon}</div>
      </div>
    </div>
  )

  return href ? (
    <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
      {content}
    </Link>
  ) : content
}

function SectionTitle({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-primary hover:bg-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      {icon ? <span className="mt-0.5 text-muted-foreground">{icon}</span> : null}
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-foreground">{value || "-"}</dd>
      </div>
    </div>
  )
}

function followUpText(item: SupplierFollowUpKey, t: (key: string) => string) {
  if (item === "missing_contact") return t("followUpMissingContact")
  if (item === "assets_without_purchase_documents") return t("followUpAssetsWithoutPurchaseDocuments")
  return t("followUpOpenMaintenance")
}
