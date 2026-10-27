import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Eye, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { hasPermission } from "@/lib/auth-utils"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditMarkNotFoundButton, type AuditNotFoundAsset } from "@/components/audit/audit-mark-not-found-button"
import { cn, formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { getDesktopTableOnlyClasses, getMobileCardListClasses, getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo, normalizeAuditRoundDetailReturnTo, normalizeAuditRoundWorkflowReturnTo } from "@/lib/operational-return-navigation"
import { auditRoundStatusLabelKey, effectiveAuditRoundStatus, isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import { buildAuditRoundDueLine } from "@/lib/audit-rounds-list-rules"
import { startOfBangkokDay } from "@/lib/waiting-work-rules"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { getAuditPendingListData, type AuditPendingListItem } from "@/lib/audit-pending-list-data"
import {
  buildAuditPendingContinueScanHref,
  describeAuditPendingCustodian,
  describeAuditPendingPlace,
  labelAuditPendingRoomChips,
  type AuditPendingCustodian,
  type AuditPendingPlace,
  type AuditPendingRoomChipLabel,
} from "@/lib/audit-pending-list-rules"

type AuditPendingPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; search?: string | string[]; locationId?: string | string[]; page?: string | string[]; pageSize?: string | string[] }>
}

export default async function AuditPendingPage({ params, searchParams }: AuditPendingPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const { search = "" } = rawSearchParams
  const user = await requirePagePermission(locale, "audit", "view")
  // audit:edit scans and records not found (group 2 spec §5, bug 14): a viewer gets no scan link, no not-found button
  // and no "เดินตรวจต่อ"; the asset's name still opens the asset.
  const canScan = hasPermission(user, "audit", "edit")
  const t = await getTranslations("auditPending")
  const tRound = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")
  const searchText = resolveFirstSearchParam(search).trim()
  const locationFilter = resolveFirstSearchParam(rawSearchParams.locationId ?? "").trim()
  const listPage = parseListPage({ page: rawSearchParams.page, pageSize: rawSearchParams.pageSize })

  const round = await prisma.auditRound.findFirst({
    where: { id, isActive: true },
    select: { id: true, auditNo: true, name: true, status: true, endDate: true },
  })
  if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()

  // One load after the read-only check (spec §9): the round-wide counts, the room chips within the search, one page of
  // rows and the names of their expected rooms and custodians.
  const data = await withPerformanceTiming("audit-pending.page-data", () =>
    getAuditPendingListData({ roundId: round.id, searchText, locationFilter, listPage }),
  )
  const { items, total } = data
  const returnToHref = normalizeAuditRoundWorkflowReturnTo(locale, round.id, rawSearchParams.returnTo)
  // Always the round page, with its own returnTo: the scan links' back target and the trail's AUD-… link.
  const scanReturnToHref = resolveAuditPendingScanReturnTo(locale, round.id, returnToHref)
  const continueScanHref = buildAuditPendingContinueScanHref({ locale, roundId: round.id, returnToHref, scanReturnToHref })
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
  const dueLine = buildAuditRoundDueLine(round.status, round.endDate, startOfBangkokDay(new Date()))
  const roomLabels = labelAuditPendingRoomChips(data.roomChips.chips, data.places)
  const roomTabs = data.roomChips.chips.map((chip) => ({
    key: chip.key,
    label: chip.kind === "all" ? t("roomAll") : chip.kind === "other" ? t("roomOther") : formatAuditPendingRoomChip(roomLabels.get(chip.key), t("roomUnknown")),
    count: formatCount(chip.count),
    href: listHref({ locationId: chip.kind === "all" ? "" : chip.key }),
  }))
  // A search with no rows offers "ล้างคำค้น"; a room with no rows "ดูทุกห้อง"; a round with nothing left the way back.
  const empty = searchText
    ? { title: t("emptySearchTitle"), help: t("emptySearchHelp"), href: clearSearchHref, label: t("clearSearch") }
    : locationFilter
      ? { title: t("roomEmptyTitle"), help: t("roomEmptyHelp"), href: clearRoomFilterHref, label: t("roomFilterClear") }
      : { title: t("emptyTitle"), help: t("emptyHelp"), href: returnToHref, label: tCommon("back") }
  const describe = (item: AuditPendingListItem) => describeAuditPendingItem(item, data.places, data.people, data.lastAuditAt)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: tRound("title"), href: `/${locale}/audit/rounds` },
          { label: round.auditNo, href: scanReturnToHref, code: true },
          { label: t("title") },
        ]}
        title={t("titleWithCount", { count: formatCount(data.counts.pending) })}
        meta={
          <>
            <span className="tag">{round.auditNo}</span>
            <StatusBadge label={tRound(auditRoundStatusLabelKey(round.status) ?? "statusOpen")} status={effectiveAuditRoundStatus(round.status)} />
            <span>{t("checkedOfTotal", { checked: formatCount(data.counts.checked), total: formatCount(data.counts.total) })}</span>
            {dueLine ? <span>{dueLine.kind === "left" ? tRound("daysLeft", { days: formatCount(dueLine.days) }) : tRound("daysOverdue", { days: formatCount(dueLine.days) })}</span> : null}
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          canScan && data.counts.pending > 0 ? (
            <Link href={continueScanHref} className={buttonVariants({ size: "md" })}>
              <ScanLine aria-hidden="true" />
              {tRound("nextStepContinueScan", { count: formatCount(data.counts.pending) })}
            </Link>
          ) : undefined
        }
      />

      {/* The room chips, counted by the expected room within the search (spec §5, §9); the search at their right from lg. */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
        <TabNav aria-label={t("roomChips")} items={roomTabs} current={data.roomChips.current} scroll={false} className="mb-4 min-w-0 lg:flex-1" />
        <div className="min-w-0 lg:w-104 lg:shrink-0">
          <MasterDataSearch
            action={`/${locale}/audit/rounds/${round.id}/pending`}
            defaultValue={searchText}
            placeholder={t("searchPlaceholder")}
            submitLabel={tCommon("search")}
            hiddenInputs={{ returnTo: returnToHref, ...(locationFilter ? { locationId: locationFilter } : {}), ...pageSizeInput }}
          />
        </div>
      </div>

      <div className={cn(getPanelClasses(), "overflow-hidden")}>
        <div className={`${getMobileCardListClasses()} p-3`}>
          {items.length === 0 ? (
            <ActionEmptyState
              icon={<ScanLine className="h-6 w-6" />}
              title={empty.title}
              description={empty.help}
              actionHref={empty.href}
              actionLabel={empty.label}
              actionVariant="secondary"
            />
          ) : (
            items.map((item) => (
              <AuditPendingMobileCard
                key={item.id}
                item={item}
                facts={describe(item)}
                locale={locale}
                roundId={round.id}
                scanReturnToHref={scanReturnToHref}
                canScan={canScan}
                labels={{
                  expectedLocation: t("expectedLocation"),
                  expectedCustodian: t("expectedCustodian"),
                  lastAuditDate: t("lastAuditDate"),
                  lastAuditNever: t("lastAuditNever"),
                  noCustodian: t("noCustodian"),
                  roomUnknown: t("roomUnknown"),
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
              <DataTableHead>{t("asset")}</DataTableHead>
              <DataTableHead>{t("expectedLocation")}</DataTableHead>
              <DataTableHead>{t("lastAuditDate")}</DataTableHead>
              {canScan ? (
                <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
              ) : null}
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {items.length === 0 ? (
              <TableEmptyRow
                colSpan={canScan ? 4 : 3}
                emptyState={{ icon: <ScanLine className="h-6 w-6" />, title: empty.title, description: empty.help, actionHref: empty.href, actionLabel: empty.label, actionVariant: "secondary" }}
              />
            ) : (
              items.map((item) => {
                const facts = describe(item)
                const assetHref = `/${locale}/assets/${item.asset.id}`
                const scanHref = buildAuditPendingScanHref({ locale, roundId: round.id, assetId: item.asset.id, returnTo: scanReturnToHref })
                // The whole row opens the asset (Appendix A §9, P2-R28); its links and buttons are ignored by the row,
                // and the not-found dialog's events stop in its "row" wrapper.
                return (
                  <ClickableTableRow key={item.id} href={assetHref} label={`${tCommon("view")}: ${item.asset.assetTag}`}>
                    <DataTableCell className="min-w-64">
                      <Link href={assetHref} className={cn(linkVariants({ size: "inherit" }), "font-semibold")}>{item.asset.name}</Link>
                      <div className="mt-0.5 text-meta">
                        <span className="tag">{item.asset.assetTag}</span>
                      </div>
                      <div className="mt-0.5 text-meta text-muted-foreground">{formatAuditPendingCustodian(facts.custodian, t("noCustodian")) ?? <Nil />}</div>
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-muted-foreground">{formatAuditPendingLocation(facts.location, t("roomUnknown"))}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatAuditPendingLastAudit(facts.lastAuditAt) ?? t("lastAuditNever")}</DataTableCell>
                    {canScan ? (
                      <DataTableCell align="right" sticky="right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={scanHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                            <ScanLine aria-hidden="true" />
                            {t("scanPendingAsset")}
                          </Link>
                          <AuditMarkNotFoundButton itemId={item.id} variant="row" asset={facts.notFound} />
                        </div>
                      </DataTableCell>
                    ) : null}
                  </ClickableTableRow>
                )
              })
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
  facts,
  locale,
  roundId,
  scanReturnToHref,
  canScan,
  labels,
}: {
  item: AuditPendingListItem
  facts: AuditPendingItemFacts
  locale: string
  roundId: string
  scanReturnToHref: string
  canScan: boolean
  labels: {
    expectedLocation: string
    expectedCustodian: string
    lastAuditDate: string
    lastAuditNever: string
    noCustodian: string
    roomUnknown: string
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
          { key: "location", label: labels.expectedLocation, value: formatAuditPendingLocation(facts.location, labels.roomUnknown) },
          { key: "custodian", label: labels.expectedCustodian, value: formatAuditPendingCustodian(facts.custodian, labels.noCustodian) },
          { key: "lastAudit", label: labels.lastAuditDate, value: formatAuditPendingLastAudit(facts.lastAuditAt) ?? labels.lastAuditNever },
        ]}
      />
      <div className={cn("mt-4 grid gap-2", canScan && "sm:grid-cols-3")}>
        {canScan ? (
          <Link href={scanHref} className={buttonVariants()}>
            <ScanLine aria-hidden="true" />
            {labels.scanPendingAsset}
          </Link>
        ) : null}
        <Link href={`/${locale}/assets/${item.asset.id}`} className={buttonVariants({ variant: "outline" })}>
          <Eye aria-hidden="true" />
          {labels.viewAsset}
        </Link>
        {canScan ? <AuditMarkNotFoundButton itemId={item.id} variant="button" asset={facts.notFound} /> : null}
      </div>
    </article>
  )
}

type AuditPendingItemFacts = { location: AuditPendingPlace | null; custodian: AuditPendingCustodian; lastAuditAt: Date | null; notFound: AuditNotFoundAsset }

// The item's expected room and custodian (bug 13), named by id; the not-found dialog names the same facts (bug 15).
// ตรวจล่าสุด is the asset's latest audit result (P2-R32), null when it has none.
function describeAuditPendingItem(item: AuditPendingListItem, places: ReadonlyMap<string, AuditPendingPlace>, people: ReadonlyMap<string, AuditPendingPlace>, lastAuditAt: ReadonlyMap<string, Date>): AuditPendingItemFacts {
  const location = describeAuditPendingPlace(item.expectedLocationId, places)
  const custodian = describeAuditPendingCustodian(item.expectedCustodianId, people)
  return { location, custodian, lastAuditAt: lastAuditAt.get(item.asset.id) ?? null, notFound: { name: item.asset.name, tag: item.asset.assetTag, location, custodian } }
}

// null when the asset has no audit result yet (formatDateTime would print a dash); date and time (P2-R13).
function formatAuditPendingLastAudit(at: Date | null) {
  return at ? formatDateTime(at) : null
}

// "ไม่ทราบห้อง" for a room the lookup cannot name (bug 16), never its id.
function formatAuditPendingLocation(location: AuditPendingPlace | null, unknownLabel: string) {
  return location ? <><span className="tag">{location.code}</span> - {location.name}</> : unknownLabel
}

// "ไม่มีผู้ถือครอง" when nobody holds the asset; null (the page shows Nil) for an id the lookup cannot name.
function formatAuditPendingCustodian(custodian: AuditPendingCustodian, noneLabel: string) {
  if (custodian.kind === "none") return noneLabel
  return custodian.kind === "person" ? <><span className="tag">{custodian.code}</span> - {custodian.name}</> : null
}

// A room chip: its name, with its code when two chips share a name; "ไม่ทราบห้อง" for an unknown id (bug 16).
function formatAuditPendingRoomChip(label: AuditPendingRoomChipLabel | undefined, unknownLabel: string) {
  if (!label?.place) return unknownLabel
  return label.showCode ? <>{label.place.name} <span className="tag">{label.place.code}</span></> : label.place.name
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
