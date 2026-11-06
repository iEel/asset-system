import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus, Users } from "lucide-react"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RecordStatusSegmented } from "@/components/ui/record-status-segmented"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { MasterDataReactivateButton, MasterDataRowActions, type MasterDataReactivate } from "@/components/master-data/master-data-row-actions"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { formatDeactivatedAt, readDeactivatedAt, readRecordStatusCounts, recordStatusCountWheres } from "@/lib/master-data-list-ui"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  branchFooterTotalWheres,
  branchSorts,
  buildBranchDrilldownHrefs,
  buildBranchOrderBy,
  buildBranchQueryString,
  buildBranchSummary,
  buildBranchWhere,
  getBranchDeleteBlockReason,
  getReactivateBlockedByCompanyReason,
  parseBranchListParams,
  type BranchListParams,
  type BranchListState,
  type BranchSort,
} from "@/lib/organization-master-query"

type BranchesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<BranchListParams>
}

// Board MD-Branches (group 8 plan 1 Task 3, spec §3, §5): the shared list pattern of the companies list. Name first with
// code · company under it, the record-status segmented control with counts, the status column only under ทั้งหมด, the
// counts link to the lists filtered by the branch, the footer totals over the filtered set, the row opens the edit page
// and ⋯ holds แก้ไข, เพิ่มที่ตั้งในสาขานี้, ดูพนักงานในสาขานี้ and ปิดใช้งาน / เปิดใช้งาน.
export default async function BranchesPage({ params, searchParams }: BranchesPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "branch", "view")
  // Spec §3: ปิดใช้งาน needs branch:delete (DELETE only deactivates), เปิดใช้งาน branch:edit (PATCH isActive true).
  const canDeactivate = hasPermission(user, "branch", "delete")
  // Final review: without branch:edit no แก้ไข in ⋯ and the row is a plain row (it opens nothing); no เพิ่มสาขา without
  // branch:create; a count links to its list only with that module's view permission, else a plain number.
  const canEdit = hasPermission(user, "branch", "edit")
  const canCreate = hasPermission(user, "branch", "create")
  const canViewLocations = hasPermission(user, "location", "view")
  const canViewAssets = hasPermission(user, "asset", "view")
  // เพิ่มที่ตั้งในสาขานี้ opens the location form (location:create); the employee list needs employee:view.
  const canCreateLocation = hasPermission(user, "location", "create")
  const canViewEmployees = hasPermission(user, "employee", "view")

  const t = await getTranslations("branch")
  const tCommon = await getTranslations("common")
  const listState = parseBranchListParams(rawSearchParams)
  const where = buildBranchWhere(listState)
  const footerWheres = branchFooterTotalWheres(where)

  const [branches, total, summaryBranches, companies, recordStatusCounts, footerLocations, footerEmployees, footerAssets] = await Promise.all([
    prisma.branch.findMany({
      where,
      include: {
        company: {
          select: {
            code: true,
            nameTh: true,
            // An inactive company makes เปิดใช้งาน unavailable (getReactivateBlockedByCompanyReason).
            isActive: true,
          },
        },
        // The counts the DELETE route reads, for the ปิดใช้งาน reason (getBranchDeleteBlockReason).
        _count: {
          select: {
            locations: { where: { isActive: true } },
            employees: { where: { isActive: true } },
            assets: { where: { isActive: true } },
            auditRounds: { where: { isActive: true } },
          },
        },
      },
      orderBy: buildBranchOrderBy(listState),
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.branch.count({ where }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: {
        company: { select: { id: true, nameTh: true } },
        _count: {
          select: {
            locations: { where: { isActive: true } },
            assets: { where: { isActive: true } },
          },
        },
      },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true },
      orderBy: { nameTh: "asc" },
    }),
    // ใช้งาน {n} / ไม่ใช้งาน {n} / ทั้งหมด {n}, the list's other filters kept.
    readRecordStatusCounts(prisma.branch, recordStatusCountWheres(listState, buildBranchWhere)),
    prisma.location.count({ where: footerWheres.locations }),
    prisma.employee.count({ where: footerWheres.employees }),
    prisma.asset.count({ where: footerWheres.assets }),
  ])
  // "· ปิดใช้งานเมื่อ {date}" on the inactive rows (G8P1-R2).
  const deactivatedAt = await readDeactivatedAt(
    prisma,
    "branch",
    branches.filter((branch) => !branch.isActive).map((branch) => branch.id)
  )
  const footerTotals = { locations: footerLocations, employees: footerEmployees, assets: footerAssets }
  const basePath = `/${locale}/master-data/branches`
  const branchReturnHref = `${basePath}?${buildBranchQueryString(listState, {})}`
  const summary = buildBranchSummary(summaryBranches)
  const listHref = (next: Partial<BranchListState>) => `${basePath}?${buildBranchQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (branches.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  // The record status is the segmented control now, not a form field; the clear link still resets it. The sort is not a
  // filter (as on the companies list).
  const hasActiveFilters = listState.status !== "active" || Boolean(listState.search || listState.companyId || listState.assetUsage !== "all" || listState.locationUsage !== "all")
  // Spec §3: the status column shows only under ทั้งหมด.
  const showRecordStatus = listState.status === "all"
  const columnCount = showRecordStatus ? 7 : 6
  const sortBy = (field: BranchSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })
  const sortLabel = (sort: BranchSort) => {
    if (sort === "createdAt") return t("list.sortCreatedAt")
    return t(sort)
  }
  const deactivateClearItems = (["locations", "employees", "assets", "auditRounds"] as const).map((key) => t(`deactivate.clear.${key}`))
  const companyBreakdown = summary.byCompany.map((item) => t("summaryCompanyCount", { name: item.name, count: item.count })).join(" · ")

  const rows = branches.map((branch) => {
    const drilldown = buildBranchDrilldownHrefs({ locale, branchId: branch.id })
    const editHref = appendMasterDataReturnTo(`/${locale}/master-data/branches/${branch.id}/edit`, branchReturnHref)
    // The location form offers active branches only.
    const addLocationHref =
      canCreateLocation && branch.isActive
        ? appendMasterDataReturnTo(`/${locale}/master-data/locations/new?branchId=${encodeURIComponent(branch.id)}`, branchReturnHref)
        : null
    const endpoint = `/api/branches/${branch.id}`
    const at = branch.isActive ? null : deactivatedAt.get(branch.id)
    // PATCH /api/branches/[id] with { isActive: true } only (final review: no snapshot of the record goes back); refused
    // while the company is inactive, so ⋯ shows it unavailable with the server's reason.
    const reactivate: MasterDataReactivate | null =
      canEdit && !branch.isActive
        ? {
            endpoint,
            blocked: getReactivateBlockedByCompanyReason("branch", branch.company),
            labels: {
              action: t("reactivate.action"),
              confirmTitle: t("reactivate.confirmTitle", { name: branch.name }),
              confirmBody: t("reactivate.confirmBody"),
              success: t("reactivate.success"),
            },
          }
        : null
    return {
      branch,
      drilldown,
      editHref,
      addLocationHref,
      reactivate,
      deactivatedLine: branch.isActive ? null : tCommon("recordStatus.deactivatedAt", { date: at ? formatDeactivatedAt(at, locale) : "–" }),
      links: [
        ...(canEdit ? [{ key: "edit", label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }] : []),
        ...(addLocationHref ? [{ key: "add-location", label: t("list.addLocation"), href: addLocationHref, icon: <Plus aria-hidden="true" /> }] : []),
        ...(canViewEmployees
          ? [{ key: "employees", label: t("list.viewEmployees", { count: branch._count.employees }), href: drilldown.employees, icon: <Users aria-hidden="true" /> }]
          : []),
      ],
      deactivate:
        canDeactivate && branch.isActive
          ? {
              endpoint,
              blocked: getBranchDeleteBlockReason(branch._count),
              labels: {
                action: t("deactivate.action"),
                hint: t("deactivate.hint"),
                confirmTitle: t("deactivate.confirmTitle", { name: branch.name }),
                confirmBody: t("deactivate.confirmBody"),
                clearItems: deactivateClearItems,
                success: t("deactivate.success"),
              },
            }
          : null,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canCreate ? (
            <Link href={appendMasterDataReturnTo(`/${locale}/master-data/branches/new`, branchReturnHref)} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("createTitle")}
            </Link>
          ) : undefined
        }
      />

      <StatStrip
        items={[
          {
            key: "total",
            label: t("summaryTotal"),
            value: formatCount(summary.total),
            foot: companyBreakdown,
            footTitle: companyBreakdown,
            href: basePath,
          },
          {
            key: "withAssets",
            label: t("summaryWithAssets"),
            value: formatCount(summary.withAssets),
            foot: t("summaryWithAssetsHelp"),
            footTitle: t("summaryWithAssetsHelp"),
            href: listHref({ assetUsage: "withAssets", page: 1 }),
            current: listState.assetUsage === "withAssets",
          },
          {
            key: "withoutAssets",
            label: t("summaryWithoutAssets"),
            value: formatCount(summary.withoutAssets),
            foot: t("summaryWithoutAssetsFoot", { withAssets: summary.withAssets, withoutAssets: summary.withoutAssets, total: summary.total }),
            footTitle: t("summaryWithoutAssetsFoot", { withAssets: summary.withAssets, withoutAssets: summary.withoutAssets, total: summary.total }),
            href: listHref({ assetUsage: "withoutAssets", page: 1 }),
            current: listState.assetUsage === "withoutAssets",
            attention: summary.withoutAssets > 0,
          },
          {
            key: "withoutLocations",
            label: t("summaryWithoutLocations"),
            value: formatCount(summary.withoutLocations),
            foot: t("summaryWithoutLocationsHelp"),
            footTitle: t("summaryWithoutLocationsHelp"),
            href: listHref({ locationUsage: "withoutLocations", page: 1 }),
            current: listState.locationUsage === "withoutLocations",
            attention: summary.withoutLocations > 0,
          },
        ]}
      />

      <FilterPanel>
        {/* Search, three filters, the sort and its order: every sort stays reachable here (code, company and date added
            too, which no header carries any more), on phones as well. */}
        {/* Keyed on the list's query: a header sort, a card or the segmented control changes the URL without this form, and
            the uncontrolled selects would otherwise send the old sort and filters with the next search (final review). */}
        <form key={branchReturnHref} role="search" action={basePath} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          {/* The record status is the segmented control below (spec §3); a search keeps it. */}
          {listState.status !== "active" ? <input type="hidden" name="status" value={listState.status} /> : null}
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={listState.search} placeholder={t("searchPlaceholder")} />
          </Field>
          <FilterSelect
            label={t("company")}
            name="companyId"
            defaultValue={listState.companyId}
            options={[
              { value: "", label: tCommon("all") },
              // Spec §3: reference filters show names only.
              ...companies.map((company) => ({ value: company.id, label: company.nameTh })),
            ]}
          />
          <FilterSelect
            label={t("assetUsageFilter")}
            name="assetUsage"
            defaultValue={listState.assetUsage}
            options={[
              { value: "all", label: tCommon("all") },
              { value: "withAssets", label: t("withAssets") },
              { value: "withoutAssets", label: t("withoutAssets") },
            ]}
          />
          <FilterSelect
            label={t("locationUsageFilter")}
            name="locationUsage"
            defaultValue={listState.locationUsage}
            options={[
              { value: "all", label: tCommon("all") },
              { value: "withLocations", label: t("withLocations") },
              { value: "withoutLocations", label: t("withoutLocations") },
            ]}
          />
          <FilterSelect
            label={t("list.sortLabel")}
            name="sort"
            defaultValue={listState.sort}
            options={branchSorts.map((sort) => ({ value: sort, label: sortLabel(sort) }))}
          />
          <FilterSelect
            label={t("list.sortDirection")}
            name="direction"
            defaultValue={listState.direction}
            options={[
              { value: "asc", label: t("list.sortAsc") },
              { value: "desc", label: t("list.sortDesc") },
            ]}
          />
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <RecordStatusSegmented value={listState.status} counts={recordStatusCounts} hrefFor={(status) => listHref({ status, page: 1 })} />

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <div className="space-y-2">
              <p>{t("list.countsNote")}</p>
              <Pagination
                page={listState.page}
                totalPages={totalPages}
                previousHref={listHref({ page: listState.page - 1 })}
                nextHref={listHref({ page: listState.page + 1 })}
                pageSize={listState.pageSize}
                pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
                labels={{
                  navigation: tCommon("pagination"),
                  previous: tCommon("previous"),
                  next: tCommon("next"),
                  pageOf: tCommon("pageOf", { page: listState.page, total: totalPages }),
                  range: `${tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) })} · ${t("list.footerTotals", { locations: footerTotals.locations, employees: footerTotals.employees, assets: footerTotals.assets })}`,
                  pageSizeGroup: tCommon("pageSizeLabel"),
                  rowsPerPage: tCommon("rowsPerPage"),
                }}
              />
            </div>
          ) : undefined
        }
      >
        <DataTableHeader>
          <tr>
            <DataTableHead sort={sortBy("name")}>{t("name")}</DataTableHead>
            <DataTableHead>{t("contactPerson")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("locations")}>{t("locations")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("employees")}>{t("employees")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{t("assets")}</DataTableHead>
            {showRecordStatus ? <DataTableHead>{tCommon("status")}</DataTableHead> : null}
            <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {rows.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={columnCount} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={columnCount}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            rows.map(({ branch, drilldown, editHref, addLocationHref, reactivate, deactivatedLine, links, deactivate }) => {
              const cells = (
                <>
                <DataTableCell className="min-w-56">
                  <div className={cn("font-semibold", branch.isActive ? "text-foreground" : "text-muted-foreground")}>{branch.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="tag">{branch.code}</span>
                    {" · "}
                    {branch.company.nameTh}
                    {deactivatedLine ? ` · ${deactivatedLine}` : null}
                  </div>
                </DataTableCell>
                <DataTableCell className="min-w-40 text-muted-foreground">{orNil(branch.contactPerson)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {canViewLocations && branch._count.locations > 0 ? (
                    <Link
                      href={drilldown.locations}
                      className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                    >
                      {formatCount(branch._count.locations)}
                    </Link>
                  ) : branch._count.locations === 0 && branch.isActive ? (
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge label={t("withoutLocations")} tone="warning" />
                      {addLocationHref ? (
                        <Link href={addLocationHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                          <span className="text-xs">{t("list.addLocation")}</span>
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    formatCount(branch._count.locations)
                  )}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {canViewEmployees && branch._count.employees > 0 ? (
                    <Link
                      href={drilldown.employees}
                      className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                    >
                      {formatCount(branch._count.employees)}
                    </Link>
                  ) : (
                    formatCount(branch._count.employees)
                  )}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {canViewAssets && branch._count.assets > 0 ? (
                    <Link
                      href={drilldown.assets}
                      className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                    >
                      {formatCount(branch._count.assets)}
                    </Link>
                  ) : (
                    formatCount(branch._count.assets)
                  )}
                </DataTableCell>
                {showRecordStatus ? (
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={branch.isActive ? tCommon("active") : tCommon("inactive")} tone={branch.isActive ? "success" : "muted"} />
                    {reactivate ? <MasterDataReactivateButton reactivate={reactivate} /> : null}
                  </DataTableCell>
                ) : null}
                <DataTableCell align="right" sticky="right">
                  <MasterDataRowActions
                    code={branch.code}
                    name={branch.name}
                    menuLabel={tCommon("moreActionsFor", { code: branch.code })}
                    links={links}
                    deactivate={deactivate}
                    reactivate={reactivate}
                  />
                </DataTableCell>
                </>
              )
              // Without branch:edit the row is plain: it opens nothing (⋯ has no แก้ไข either).
              return canEdit ? (
                <ClickableTableRow key={branch.id} href={editHref} label={`${tCommon("edit")}: ${branch.code}`}>
                  {cells}
                </ClickableTableRow>
              ) : (
                <DataTableRow key={branch.id}>{cells}</DataTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
