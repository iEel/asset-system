import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { Eye, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditMarkNotFoundButton } from "@/components/audit/audit-mark-not-found-button"
import { AuditPendingRowActions } from "@/components/audit/audit-pending-row-actions"
import { cn, formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { getDesktopTableOnlyClasses, getMobileCardListClasses, getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo, normalizeAuditRoundDetailReturnTo, normalizeAuditRoundWorkflowReturnTo } from "@/lib/operational-return-navigation"
import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"

type AuditPendingPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; search?: string | string[]; locationId?: string | string[]; page?: string | string[]; pageSize?: string | string[] }>
}

type AuditPendingItem = {
  id: string
  asset: {
    id: string
    assetTag: string
    name: string
    currentLocation: { code: string; name: string }
    custodian: { code: string; fullNameTh: string } | null
    movements: Array<{ performedAt: Date }>
  }
}

export default async function AuditPendingPage({ params, searchParams }: AuditPendingPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const { search = "" } = rawSearchParams
  await requirePagePermission(locale, "audit", "view")
  const t = await getTranslations("auditPending")
  const tCommon = await getTranslations("common")
  const searchText = resolveFirstSearchParam(search).trim()
  const locationFilter = resolveFirstSearchParam(rawSearchParams.locationId ?? "").trim()
  const listPage = parseListPage({ page: rawSearchParams.page, pageSize: rawSearchParams.pageSize })

  const round = await prisma.auditRound.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      auditNo: true,
      name: true,
      status: true,
    },
  })
  if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()

  // Real pages (spec 2B B4, §5.9.2 row 4): the pending items load on their own once the round passed the read-only
  // check, with the whole count in the same Promise.all, so the box above the list counts every pending item.
  const where: Prisma.AuditItemWhereInput = {
    auditRoundId: round.id,
    auditStatus: "pending",
    ...(locationFilter ? { expectedLocationId: locationFilter } : {}),
    ...(searchText
      ? {
          asset: {
            OR: [
              { assetTag: { contains: searchText } },
              { name: { contains: searchText } },
              {
                currentLocation: {
                  OR: [
                    { code: { contains: searchText } },
                    { name: { contains: searchText } },
                  ],
                },
              },
              {
                custodian: {
                  OR: [
                    { code: { contains: searchText } },
                    { fullNameTh: { contains: searchText } },
                  ],
                },
              },
            ],
          },
        }
      : {}),
  }
  const { skip, take } = listPageWindow(listPage)
  const [items, total] = await Promise.all([
    prisma.auditItem.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            currentLocation: { select: { code: true, name: true } },
            custodian: { select: { code: true, fullNameTh: true } },
            movements: {
              where: { movementType: { contains: "audit" } },
              orderBy: { performedAt: "desc" },
              take: 1,
              select: { performedAt: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.auditItem.count({ where }),
  ])
  const returnToHref = normalizeAuditRoundWorkflowReturnTo(locale, round.id, rawSearchParams.returnTo)
  const scanReturnToHref = resolveAuditPendingScanReturnTo(locale, round.id, returnToHref)
  const pendingHref = `/${locale}/audit/rounds/${round.id}/pending`
  // The list URL keeps the search, the room, the page size and the page's own returnTo (spec 2B §5.9.2 row 4).
  const listHref = (next: { search?: string; locationId?: string; page?: number; pageSize?: number }) =>
    buildAuditPendingListHref({
      pendingHref,
      returnTo: returnToHref,
      search: next.search ?? searchText,
      locationId: next.locationId ?? locationFilter,
      page: next.page,
      pageSize: next.pageSize ?? listPage.pageSize,
    })
  // A page past the last one (the last item of the last page marked not found, or an old link) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (items.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  // A search or a room change goes back to page 1 and keeps the page size.
  const clearSearchHref = listHref({ search: "" })
  const clearRoomFilterHref = listHref({ locationId: "" })
  const pageSizeInput = Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize }))
  const filterLocation = locationFilter
    ? await prisma.location.findFirst({ where: { id: locationFilter }, select: { code: true, name: true } })
    : null
  const locationFilterLabel = filterLocation ? `${filterLocation.code} - ${filterLocation.name}` : locationFilter
  const emptyTitle = searchText ? t("emptySearchTitle") : t("emptyTitle")
  const emptyHelp = searchText ? t("emptySearchHelp") : t("emptyHelp")
  const emptyActionHref = searchText ? clearSearchHref : returnToHref
  const emptyActionLabel = searchText ? t("clearSearch") : tCommon("back")

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle", { round: `${round.auditNo} - ${round.name}` })}
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
      />

      <ContentPanel>
        <div className="text-sm text-muted-foreground">
          {t("pendingCount", { count: formatCount(total) })}
          {locationFilter ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-3">
              <span>{t("roomFilter", { location: locationFilterLabel })}</span>
              <Link href={clearRoomFilterHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
                {t("roomFilterClear")}
              </Link>
            </div>
          ) : null}
        </div>
      </ContentPanel>

      <MasterDataSearch
        action={`/${locale}/audit/rounds/${round.id}/pending`}
        defaultValue={searchText}
        placeholder={t("searchPlaceholder")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ returnTo: returnToHref, ...(locationFilter ? { locationId: locationFilter } : {}), ...pageSizeInput }}
      />

      <div className={cn(getPanelClasses(), "overflow-hidden")}>
        <div className={`${getMobileCardListClasses()} p-3`}>
          {items.length === 0 ? (
            <ActionEmptyState
              icon={<ScanLine className="h-6 w-6" />}
              title={emptyTitle}
              description={emptyHelp}
              actionHref={emptyActionHref}
              actionLabel={emptyActionLabel}
              actionVariant="secondary"
            />
          ) : (
            items.map((item) => (
              <AuditPendingMobileCard
                key={item.id}
                item={item}
                locale={locale}
                roundId={round.id}
                scanReturnToHref={scanReturnToHref}
                labels={{
                  expectedLocation: t("expectedLocation"),
                  expectedCustodian: t("expectedCustodian"),
                  lastAuditDate: t("lastAuditDate"),
                  scanPendingAsset: t("scanPendingAsset"),
                  viewAsset: t("viewAsset"),
                }}
              />
            ))
          )}
        </div>
        <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("assetTag")}</DataTableHead>
              <DataTableHead>{t("assetName")}</DataTableHead>
              <DataTableHead>{t("expectedLocation")}</DataTableHead>
              <DataTableHead>{t("expectedCustodian")}</DataTableHead>
              <DataTableHead>{t("lastAuditDate")}</DataTableHead>
              <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {items.length === 0 ? (
              <TableEmptyRow
                colSpan={6}
                emptyState={{
                  icon: <ScanLine className="h-6 w-6" />,
                  title: emptyTitle,
                  description: emptyHelp,
                  actionHref: emptyActionHref,
                  actionLabel: emptyActionLabel,
                  actionVariant: "secondary",
                }}
              />
            ) : (
              items.map((item) => (
                <ClickableTableRow
                  key={item.id}
                  href={`/${locale}/assets/${item.asset.id}`}
                  label={`${tCommon("view")}: ${item.asset.assetTag}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{item.asset.assetTag}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-foreground">{item.asset.name}</DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    {formatAuditPendingLocation(item.asset.currentLocation)}
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    {formatAuditPendingCustodian(item.asset.custodian) ?? <Nil />}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    {formatAuditPendingLastAudit(item.asset.movements) ?? <Nil />}
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <AuditPendingRowActions
                      itemId={item.id}
                      assetTag={item.asset.assetTag}
                      assetName={item.asset.name}
                      scanHref={buildAuditPendingScanHref({ locale, roundId: round.id, assetId: item.asset.id, returnTo: scanReturnToHref })}
                      assetHref={`/${locale}/assets/${item.asset.id}`}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
        {total > 0 ? (
          <DataTableFoot>
            <Pagination
              page={listPage.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listPage.page - 1 })}
              nextHref={listHref({ page: listPage.page + 1 })}
              pageSize={listPage.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listPage.page, total: totalPages }),
                range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          </DataTableFoot>
        ) : null}
      </div>
    </div>
  )
}

function AuditPendingMobileCard({
  item,
  locale,
  roundId,
  scanReturnToHref,
  labels,
}: {
  item: AuditPendingItem
  locale: string
  roundId: string
  scanReturnToHref: string
  labels: {
    expectedLocation: string
    expectedCustodian: string
    lastAuditDate: string
    scanPendingAsset: string
    viewAsset: string
  }
}) {
  const scanHref = buildAuditPendingScanHref({ locale, roundId, assetId: item.asset.id, returnTo: scanReturnToHref })

  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-4">
      <div className="min-w-0">
        <div className="break-words text-sm font-semibold text-foreground">
          <span className="tag font-medium">{item.asset.assetTag}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.asset.name}</p>
      </div>
      <KeyValueList
        className="mt-3"
        items={[
          { key: "location", label: labels.expectedLocation, value: formatAuditPendingLocation(item.asset.currentLocation) },
          { key: "custodian", label: labels.expectedCustodian, value: formatAuditPendingCustodian(item.asset.custodian) },
          { key: "lastAudit", label: labels.lastAuditDate, value: formatAuditPendingLastAudit(item.asset.movements) },
        ]}
      />
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link href={scanHref} className={buttonVariants()}>
          <ScanLine aria-hidden="true" />
          {labels.scanPendingAsset}
        </Link>
        <Link href={`/${locale}/assets/${item.asset.id}`} className={buttonVariants({ variant: "outline" })}>
          <Eye aria-hidden="true" />
          {labels.viewAsset}
        </Link>
        <AuditMarkNotFoundButton itemId={item.id} variant="button" />
      </div>
    </article>
  )
}

function formatAuditPendingLocation(location: { code: string; name: string }) {
  return (
    <>
      <span className="tag">{location.code}</span> - {location.name}
    </>
  )
}

// null when nobody holds the asset: the page shows Nil, not a typed dash.
function formatAuditPendingCustodian(custodian: { code: string; fullNameTh: string } | null) {
  return custodian ? (
    <>
      <span className="tag">{custodian.code}</span> - {custodian.fullNameTh}
    </>
  ) : null
}

// null before the first audit of the asset (formatDateTime would print a dash).
function formatAuditPendingLastAudit(movements: Array<{ performedAt: Date }>) {
  return movements[0] ? formatDateTime(movements[0].performedAt) : null
}

function resolveAuditPendingScanReturnTo(locale: string, roundId: string, returnToHref: string) {
  try {
    const url = new URL(returnToHref, "http://asset.local")
    const scanPath = `/${locale}/audit/rounds/${roundId}/scan`
    if (url.pathname !== scanPath) return returnToHref
    return normalizeAuditRoundDetailReturnTo(locale, roundId, url.searchParams.get("returnTo") ?? undefined)
  } catch {
    return normalizeAuditRoundDetailReturnTo(locale, roundId, undefined)
  }
}

function buildAuditPendingScanHref({ locale, roundId, assetId, returnTo }: { locale: string; roundId: string; assetId: string; returnTo: string }) {
  const params = new URLSearchParams({ assetId, returnTo })
  return `/${locale}/audit/rounds/${roundId}/scan?${params.toString()}`
}

// appendListPage writes page only above 1 and pageSize only when it is not 25, so the default links stay as they were.
function buildAuditPendingListHref({
  pendingHref,
  returnTo,
  search,
  locationId,
  page,
  pageSize,
}: {
  pendingHref: string
  returnTo: string
  search: string
  locationId: string
  page?: number
  pageSize?: number
}) {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (locationId) params.set("locationId", locationId)
  const query = appendListPage(params, { page, pageSize }).toString()
  return appendOperationalReturnTo(query ? `${pendingHref}?${query}` : pendingHref, returnTo)
}

function resolveFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}