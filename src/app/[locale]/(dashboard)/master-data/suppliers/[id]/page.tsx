import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { buildSupplierDetailHrefs, buildSupplierFollowUpItems, readSupplierDetail } from "@/lib/supplier-detail"
import { getSupplierDeactivateBlockReason } from "@/lib/organization-master-query"
import { formatCount, formatMoney } from "@/lib/display-format"
import { cn, formatDate } from "@/lib/utils"
import { MasterDataRowActions } from "@/components/master-data/master-data-row-actions"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { SupplierPurchaseDocuments } from "@/components/master-data/supplier-purchase-documents"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "@/lib/maintenance-status"
import { appendMasterDataReturnTo, normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { purchaseDocumentTypes } from "@/lib/asset-form-rules"

type SupplierDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

// Board MD-Supplier (group 8 plan 3 Task 3, spec §7): the header with the code, the contact line, แก้ไข and ⋯
// (ปิดใช้งาน with the guard's reason / เปิดใช้งาน); one strip of four; the latest assets with ดูทรัพย์สินทั้งหมด; every
// purchase document with the total row; side panels สิ่งที่ควรติดตาม, ประวัติงานซ่อมกับผู้ขาย and ข้อมูลผู้ขาย. Every number
// comes from readSupplierDetail. Kept (spec §8): the empty states, the phone document cards and the back link. Skipped
// (spec §9, a migration): the description line under the name.
export default async function SupplierDetailPage({ params, searchParams }: SupplierDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const returnToHref = normalizeMasterDataReturnTo(locale, "suppliers", rawSearchParams.returnTo)
  const user = await requirePagePermission(locale, "supplier", "view")
  // Spec §3: ปิดใช้งาน needs supplier:delete, เปิดใช้งาน and แก้ไข supplier:edit; links to the register and to a repair
  // record only with asset:view and maintenance:view.
  const canEdit = hasPermission(user, "supplier", "edit")
  const canDeactivate = hasPermission(user, "supplier", "delete")
  const canViewAssets = hasPermission(user, "asset", "view")
  const canViewMaintenance = hasPermission(user, "maintenance", "view")

  const t = await getTranslations("supplier")
  const tCommon = await getTranslations("common")
  const tMaintenance = await getTranslations("maintenancePage")
  const tAsset = await getTranslations("asset")

  const supplier = await prisma.supplier.findFirst({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      address: true,
      isActive: true,
    },
  })
  if (!supplier) notFound()

  const detail = await readSupplierDetail(prisma, id)
  const { figures } = detail

  const hrefs = buildSupplierDetailHrefs({ locale, supplierId: id })
  const editHref = appendMasterDataReturnTo(hrefs.edit, returnToHref)
  const hasContact = Boolean(supplier.contactPerson || supplier.phone || supplier.email)
  const followUpItems = buildSupplierFollowUpItems({
    hasContact,
    assetsWithoutDocument: figures.assetsWithoutDocument,
    openMaintenanceTicketCount: figures.repairs.open,
  })
  const maintenanceStatusLabels = Object.fromEntries(maintenanceStatuses.map((status) => [status, tMaintenance(`statuses.${status}`)]))
  const typeLabels = Object.fromEntries(purchaseDocumentTypes.map((type) => [type, tAsset(`purchaseDocumentTypes.${type}`)]))
  // The DELETE route's guard (active assets, repairs, PM plans, purchase documents): ⋯ ปิดใช้งาน is unavailable with it,
  // and ข้อมูลผู้ขาย says it (board).
  const deactivateBlocked = supplier.isActive ? getSupplierDeactivateBlockReason(detail.deactivateCounts) : null
  const endpoint = `/api/suppliers/${supplier.id}`
  const deactivate =
    canDeactivate && supplier.isActive
      ? {
          endpoint,
          blocked: deactivateBlocked,
          labels: {
            action: t("deactivate.action"),
            hint: t("deactivate.hint"),
            confirmTitle: t("deactivate.confirmTitle", { name: supplier.name }),
            confirmBody: t("deactivate.confirmBody"),
            clearItems: (["assets", "maintenanceTickets", "maintenancePlans", "purchaseDocuments"] as const).map((key) => t(`deactivate.clear.${key}`)),
            success: t("deactivate.success"),
          },
        }
      : null
  const reactivate =
    canEdit && !supplier.isActive
      ? {
          endpoint,
          labels: {
            action: t("reactivate.action"),
            confirmTitle: t("reactivate.confirmTitle", { name: supplier.name }),
            confirmBody: t("reactivate.confirmBody"),
            success: t("reactivate.success"),
          },
        }
      : null
  const repairHistoryDescription =
    figures.repairs.total > detail.repairHistory.length
      ? t("detail.repairHistoryLatest", { shown: detail.repairHistory.length, total: figures.repairs.total })
      : t("detail.repairHistoryDescription", { total: figures.repairs.total })
  const moreOpenRepairs = figures.repairs.open - detail.openRepairs.length

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
            {supplier.isActive ? null : <StatusBadge label={tCommon("recordStatus.inactive")} tone="neutral" />}
            {supplier.contactPerson ? <span>{t("detail.contactLine", { name: supplier.contactPerson })}</span> : null}
            {supplier.phone ? <span className="num">{supplier.phone}</span> : null}
            {supplier.email ? <span>{supplier.email}</span> : null}
            {hasContact ? null : <span>{t("noContactDetail")}</span>}
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <>
            {deactivate || reactivate ? (
              <MasterDataRowActions
                code={supplier.code}
                name={supplier.name}
                menuLabel={tCommon("moreActionsFor", { code: supplier.code })}
                links={[]}
                deactivate={deactivate}
                reactivate={reactivate}
              />
            ) : null}
            {canEdit ? (
              <Link href={editHref} className={buttonVariants({ size: "md" })}>
                <Edit aria-hidden="true" />
                {tCommon("edit")}
              </Link>
            ) : null}
          </>
        }
      />

      <section aria-label={t("summaryLabel")}>
        {/* ค่าซ่อมสะสม in the 28px metric size needs about 230px (reports' money strips): one figure a row below sm, and
            two a row from lg until xl, where four beside the sidebar would leave about 170px a figure; one row from xl. */}
        <StatStrip
          className="max-sm:grid-cols-1 lg:max-xl:grid-flow-row lg:max-xl:grid-cols-2 lg:max-xl:grid-rows-none"
          items={[
            {
              key: "assets",
              label: t("list.assets"),
              value: formatCount(figures.assets),
              foot: figures.assets === 0 ? t("linkedAssetsHelp") : figures.assetsWithoutDocument === 0 ? t("detail.assetsAllLinked") : t("detail.assetsWithoutDocument", { count: figures.assetsWithoutDocument }),
              footTitle: figures.assets === 0 ? t("linkedAssetsHelp") : figures.assetsWithoutDocument === 0 ? t("detail.assetsAllLinked") : t("detail.assetsWithoutDocument", { count: figures.assetsWithoutDocument }),
              attention: figures.assetsWithoutDocument > 0,
              href: canViewAssets ? hrefs.assets : undefined,
            },
            {
              key: "purchaseDocuments",
              label: t("purchaseDocuments"),
              value: formatCount(figures.purchaseDocuments),
              foot: t("detail.purchaseAmountFoot", { amount: formatMoney(figures.purchaseAmount) }),
              footTitle: t("detail.purchaseAmountFoot", { amount: formatMoney(figures.purchaseAmount) }),
            },
            {
              key: "repairs",
              label: t("maintenanceTickets"),
              value: formatCount(figures.repairs.total),
              foot: t("detail.repairsFoot", { open: figures.repairs.open, closed: figures.repairs.closed, cancelled: figures.repairs.cancelled }),
              footTitle: t("detail.repairsFoot", { open: figures.repairs.open, closed: figures.repairs.closed, cancelled: figures.repairs.cancelled }),
              attention: figures.repairs.open > 0,
            },
            {
              key: "repairCost",
              label: t("totalMaintenanceCost"),
              value: formatMoney(figures.repairCost),
              unit: tCommon("baht"),
              foot: t("detail.repairCostFoot", { count: figures.repairsWithCost }),
              footTitle: t("detail.repairCostFoot", { count: figures.repairsWithCost }),
            },
          ]}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <ContentPanel
            divided
            flush={detail.latestAssets.length > 0}
            title={t("linkedAssetsTitle")}
            description={detail.latestAssets.length > 0 ? t("detail.latestAssets", { shown: detail.latestAssets.length, total: figures.assets }) : undefined}
            actions={
              canViewAssets && figures.assets > 0 ? (
                <Link href={hrefs.assets} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                  {t("detail.viewAllAssets", { count: figures.assets })}
                </Link>
              ) : null
            }
          >
            {detail.latestAssets.length === 0 ? (
              <ActionEmptyState title={t("noAssets")} description={t("noAssetsHelp")} />
            ) : (
              <>
              {/* From md the table (its scroll area named by the caption until the main column is wide enough); below md
                  one card per asset with the same facts, as the documents panel does. */}
              <DataTable data-supplier-assets-desktop framed={false} caption={t("detail.assetsCaption")} scrollHint={tCommon("tableScrollHint")} className="hidden md:block">
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("detail.columns.asset")}</DataTableHead>
                    <DataTableHead>{t("detail.columns.categoryLocation")}</DataTableHead>
                    <DataTableHead>{t("detail.columns.status")}</DataTableHead>
                    <DataTableHead>{t("detail.columns.document")}</DataTableHead>
                    <DataTableHead align="right">{t("detail.columns.purchasePrice")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {detail.latestAssets.map((asset) => (
                    <DataTableRow key={asset.id}>
                      <DataTableCell className="min-w-48">
                        {canViewAssets ? (
                          <Link href={`/${locale}/assets/${asset.id}`} className={cn(linkVariants(), "font-medium")}>
                            {asset.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-foreground">{asset.name}</span>
                        )}
                        <span className="mt-0.5 block text-meta text-muted-foreground"><span className="tag">{asset.assetTag}</span></span>
                      </DataTableCell>
                      <DataTableCell className="min-w-40">
                        <span className="block text-foreground">{asset.categoryName}</span>
                        <span className="block text-meta text-muted-foreground">{asset.locationName} · {asset.branchName}</span>
                      </DataTableCell>
                      <DataTableCell>
                        <StatusBadge label={locale === "en" ? asset.status.name : asset.status.nameTh} status={asset.status.name} />
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        {asset.documents.length === 0 ? (
                          <span className="text-meta text-warning">{t("detail.noDocument")}</span>
                        ) : (
                          <>
                            <span className="tag">{asset.documents[0].documentNo}</span>
                            {asset.documents.length > 1 ? <span className="ml-1 text-meta text-muted-foreground">{t("detail.moreDocuments", { count: asset.documents.length - 1 })}</span> : null}
                          </>
                        )}
                      </DataTableCell>
                      <DataTableCell numeric className="text-muted-foreground">
                        {asset.purchasePrice == null ? <Nil /> : formatMoney(asset.purchasePrice)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
              <div data-supplier-assets-mobile className="grid gap-3 p-4 md:hidden">
                {detail.latestAssets.map((asset) => (
                  <article key={asset.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      {canViewAssets ? (
                        <Link href={`/${locale}/assets/${asset.id}`} className={cn(linkVariants(), "inline-flex min-h-11 min-w-0 items-center font-medium")}>
                          {asset.name}
                        </Link>
                      ) : (
                        <span className="min-w-0 font-medium text-foreground">{asset.name}</span>
                      )}
                      <StatusBadge label={locale === "en" ? asset.status.name : asset.status.nameTh} status={asset.status.name} />
                    </div>
                    <div className="mt-0.5 text-meta text-muted-foreground"><span className="tag">{asset.assetTag}</span></div>
                    <KeyValueList
                      className="mt-3"
                      items={[
                        { key: "categoryLocation", label: t("detail.columns.categoryLocation"), value: `${asset.categoryName} · ${asset.locationName} · ${asset.branchName}` },
                        {
                          key: "document",
                          label: t("detail.columns.document"),
                          value:
                            asset.documents.length === 0 ? (
                              <span className="text-warning">{t("detail.noDocument")}</span>
                            ) : (
                              <>
                                <span className="tag">{asset.documents[0].documentNo}</span>
                                {asset.documents.length > 1 ? <span className="ml-1 text-muted-foreground">{t("detail.moreDocuments", { count: asset.documents.length - 1 })}</span> : null}
                              </>
                            ),
                        },
                        { key: "purchasePrice", label: t("detail.columns.purchasePrice"), value: asset.purchasePrice == null ? null : <span className="num">{formatMoney(asset.purchasePrice)}</span> },
                      ]}
                    />
                  </article>
                ))}
              </div>
              </>
            )}
          </ContentPanel>

          <ContentPanel
            divided
            flush={detail.documents.length > 0}
            title={t("purchaseDocumentsTitle")}
            description={detail.documents.length > 0 ? t("detail.documentsDescription", { count: detail.documentTotals.count }) : undefined}
          >
            <SupplierPurchaseDocuments
              documents={detail.documents}
              totals={detail.documentTotals}
              labels={{
                caption: t("detail.documentsCaption", { count: detail.documentTotals.count }),
                documentNo: t("documentNo"),
                documentDate: t("documentDate"),
                linkedAssets: t("linkedAssets"),
                totalAmount: tAsset("purchaseDocumentAmountBaht"),
                noPurchaseDocuments: t("noPurchaseDocuments"),
                noPurchaseDocumentsHelp: t("noPurchaseDocumentsHelp"),
                typeLabels,
                amountUnset: t("detail.amountUnset"),
                totalRow: t("detail.documentsTotal", { count: detail.documentTotals.count }),
              }}
            />
          </ContentPanel>
        </div>

        <div className="min-w-0 space-y-6">
          {/* Nothing to follow up is a clear note; what is left is one warning Notice (spec 2D D7), with no tinted rows. */}
          <ContentPanel
            divided
            title={t("followUpTitle")}
            description={followUpItems.length > 0 ? t("detail.followUpCount", { count: followUpItems.length }) : undefined}
          >
            {followUpItems.length === 0 ? (
              <EmptyNote tone="clear">{t("noFollowUp")}</EmptyNote>
            ) : (
              <Notice tone="warning">
                <ul className="list-disc space-y-1 pl-5">
                  {followUpItems.map((item) => (
                    <li key={item}>
                      {item === "missing_contact"
                        ? t("followUpMissingContact")
                        : item === "assets_without_purchase_documents"
                          ? t("followUpAssetsWithoutPurchaseDocuments", { count: figures.assetsWithoutDocument })
                          : t("followUpOpenMaintenance")}
                      {item === "open_vendor_maintenance" ? (
                        <ul className="mt-2 space-y-2">
                          {detail.openRepairs.map((repair) => (
                            <li key={repair.id} className="text-meta text-muted-foreground">
                              <span className="font-medium text-foreground">{repair.asset.name}</span> <span className="tag">{repair.asset.assetTag}</span>
                              <span className="block">
                                {t("detail.openedOn", { date: formatDate(repair.reportedDate), days: repair.daysOpen })} · {repair.problem}
                              </span>
                              {canViewMaintenance ? (
                                <Link href={`/${locale}/maintenance/${repair.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                                  {t("detail.openRepairLink", { repairNo: repair.repairNo })}
                                </Link>
                              ) : (
                                <span className="tag">{repair.repairNo}</span>
                              )}
                            </li>
                          ))}
                          {moreOpenRepairs > 0 ? <li className="text-meta text-muted-foreground">{t("detail.moreOpenRepairs", { count: moreOpenRepairs })}</li> : null}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Notice>
            )}
          </ContentPanel>

          <ContentPanel divided title={t("maintenanceHistoryTitle")} description={detail.repairHistory.length > 0 ? repairHistoryDescription : undefined}>
            {detail.repairHistory.length === 0 ? (
              <ActionEmptyState title={t("noMaintenance")} description={t("noMaintenanceHelp")} />
            ) : (
              <ul className="space-y-3">
                {detail.repairHistory.map((ticket) => {
                  const body = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 font-medium text-foreground">{ticket.asset.name}</span>
                        <StatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, maintenanceStatusLabels)} tone={getMaintenanceStatusTone(ticket.repairStatus)} />
                      </div>
                      <div className="mt-1 font-mono text-meta text-muted-foreground">{ticket.asset.assetTag} · {ticket.repairNo}</div>
                      <div className="mt-1 flex items-start justify-between gap-2 text-meta">
                        <span className="line-clamp-2 min-w-0 text-muted-foreground">{ticket.problem}</span>
                        <span className="shrink-0 num text-foreground">{ticket.repairCost == null ? <Nil /> : formatMoney(ticket.repairCost)}</span>
                      </div>
                      <div className="mt-1 text-meta text-muted-foreground">{t("reportedDate")}: {formatDate(ticket.reportedDate)}</div>
                    </>
                  )
                  return (
                    <li key={ticket.id}>
                      {/* Each record is a quiet grouping link (2D-2 R4) with the shared row hover; plain text without maintenance:view. */}
                      {canViewMaintenance ? (
                        <Link href={`/${locale}/maintenance/${ticket.id}`} className="block min-h-11 rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          {body}
                        </Link>
                      ) : (
                        <div className="rounded-md border border-border bg-background p-3">{body}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </ContentPanel>

          <ContentPanel divided title={t("profileTitle")}>
            <KeyValueList
              items={[
                { key: "code", label: t("code"), value: <span className="tag">{supplier.code}</span> },
                { key: "contactPerson", label: t("contactPerson"), value: supplier.contactPerson },
                { key: "phone", label: t("phone"), value: supplier.phone },
                { key: "email", label: t("email"), value: supplier.email },
                { key: "address", label: t("address"), value: supplier.address },
              ]}
            />
            {deactivateBlocked ? <p className="mt-4 border-t border-border-soft pt-3 text-meta text-muted-foreground">{deactivateBlocked}</p> : null}
          </ContentPanel>
        </div>
      </div>
    </div>
  )
}
