import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { locationTypes } from "@/lib/validations/location"
import {
  buildLocationDrilldownHrefs,
  buildLocationOrderBy,
  buildLocationPathMap,
  buildLocationQueryString,
  buildLocationSummary,
  buildLocationWhere,
  parseLocationListParams,
  type LocationListParams,
  type LocationListState,
  type LocationSort,
} from "@/lib/location-list-query"

type LocationsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<LocationListParams>
}

export default async function LocationsPage({ params, searchParams }: LocationsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "location", "view")

  const t = await getTranslations("location")
  const tCommon = await getTranslations("common")
  const listState = parseLocationListParams(rawSearchParams)
  const searchText = listState.search
  const where = buildLocationWhere(listState)

  const [locations, total, summaryLocations, branches, pathLocations] = await Promise.all([
    prisma.location.findMany({
      where,
      include: {
        branch: {
          select: {
            code: true,
            name: true,
            company: {
              select: {
                code: true,
                nameTh: true,
              },
            },
          },
        },
        parent: {
          select: {
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            currentAssets: { where: { isActive: true } },
            homeAssets: { where: { isActive: true } },
            children: { where: { isActive: true } },
            auditRounds: true,
          },
        },
      },
      orderBy: buildLocationOrderBy(listState),
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.location.count({ where }),
    prisma.location.findMany({
      where: { isActive: true },
      select: {
        parentId: true,
        locationType: true,
        _count: {
          select: {
            currentAssets: { where: { isActive: true } },
            children: { where: { isActive: true } },
          },
        },
      },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        company: {
          select: {
            code: true,
          },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        parentId: true,
      },
      orderBy: { code: "asc" },
    }),
  ])
  const basePath = `/${locale}/master-data/locations`
  const locationReturnHref = `${basePath}?${buildLocationQueryString(listState, {})}`
  const summary = buildLocationSummary(summaryLocations)
  const locationPaths = buildLocationPathMap(pathLocations)
  const listHref = (next: Partial<LocationListState>) => `${basePath}?${buildLocationQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (locations.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = Boolean(listState.search || listState.branchId || listState.locationType || listState.assetUsage !== "all" || listState.hierarchy !== "all")
  const sortBy = (field: LocationSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/locations/new`, locationReturnHref)} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
      />

      <StatStrip
        items={[
          {
            key: "total",
            label: t("summaryTotal"),
            value: formatCount(summary.total),
            foot: t("summaryRoot", { count: summary.rootLocations }),
            footTitle: t("summaryRoot", { count: summary.rootLocations }),
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
            foot: t("summaryWithoutAssetsHelp"),
            footTitle: t("summaryWithoutAssetsHelp"),
            href: listHref({ assetUsage: "withoutAssets", page: 1 }),
            current: listState.assetUsage === "withoutAssets",
            attention: summary.withoutAssets > 0,
          },
          {
            key: "leaf",
            label: t("summaryLeaf"),
            value: formatCount(summary.leafLocations),
            foot: t("summaryLeafHelp"),
            footTitle: t("summaryLeafHelp"),
            href: listHref({ hierarchy: "leaf", page: 1 }),
            current: listState.hierarchy === "leaf",
          },
          {
            key: "root",
            label: t("summaryRootCard"),
            value: formatCount(summary.rootLocations),
            foot: t("summaryRootHelp"),
            footTitle: t("summaryRootHelp"),
            href: listHref({ hierarchy: "root", page: 1 }),
            current: listState.hierarchy === "root",
          },
        ]}
      />

      <FilterPanel>
        <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(150px,1fr))_auto]">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={searchText} placeholder={t("searchPlaceholder")} />
          </Field>
          <FilterSelect
            label={t("branch")}
            name="branchId"
            defaultValue={listState.branchId}
            options={[
              { value: "", label: tCommon("all") },
              ...branches.map((branch) => ({
                value: branch.id,
                label: `${branch.company.code} / ${branch.code} - ${branch.name}`,
              })),
            ]}
          />
          <FilterSelect
            label={t("locationType")}
            name="locationType"
            defaultValue={listState.locationType}
            options={[
              { value: "", label: tCommon("all") },
              ...locationTypes.map((type) => ({ value: type, label: type })),
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
            label={t("hierarchyFilter")}
            name="hierarchy"
            defaultValue={listState.hierarchy}
            options={[
              { value: "all", label: tCommon("all") },
              { value: "root", label: t("rootLocations") },
              { value: "child", label: t("childLocations") },
              { value: "leaf", label: t("leafLocations") },
            ]}
          />
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
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
                range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          ) : undefined
        }
      >
        <DataTableHeader>
          <tr>
            <DataTableHead sort={sortBy("code")}>{t("code")}</DataTableHead>
            <DataTableHead sort={sortBy("name")}>{t("name")}</DataTableHead>
            <DataTableHead>{t("fullPath")}</DataTableHead>
            <DataTableHead sort={sortBy("branch")}>{t("branch")}</DataTableHead>
            <DataTableHead sort={sortBy("locationType")}>{t("locationType")}</DataTableHead>
            <DataTableHead sort={sortBy("parent")}>{t("parentLocation")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("currentAssets")}>{t("currentAssets")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("children")}>{t("childCount")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {locations.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={10} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={10}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            locations.map((location) => {
              const drilldown = buildLocationDrilldownHrefs({ locale, locationCode: location.code })
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/locations/${location.id}/edit`, locationReturnHref)
              return (
                <ClickableTableRow
                  key={location.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${location.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{location.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-48 text-foreground">{location.name}</DataTableCell>
                  <DataTableCell className="min-w-64 text-muted-foreground">
                    {locationPaths.get(location.id) ?? location.code}
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    <span className="tag">{location.branch.company.code}</span> / <span className="tag">{location.branch.code}</span> - {location.branch.name}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">{location.locationType}</DataTableCell>
                  <DataTableCell className="min-w-44 text-muted-foreground">
                    {location.parent ? (
                      <>
                        <span className="tag">{location.parent.code}</span> - {location.parent.name}
                      </>
                    ) : (
                      <Nil />
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {location._count.currentAssets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(location._count.currentAssets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(location._count.children)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      code={location.code}
                      name={location.name}
                      menuLabel={tCommon("moreActionsFor", { code: location.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[]}
                      deleteAction={{ endpoint: `/api/locations/${location.id}` }}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
