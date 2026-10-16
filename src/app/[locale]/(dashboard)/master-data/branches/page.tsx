import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  buildBranchDrilldownHrefs,
  buildBranchOrderBy,
  buildBranchQueryString,
  buildBranchSummary,
  buildBranchWhere,
  parseBranchListParams,
  type BranchListParams,
  type BranchListState,
  type BranchSort,
} from "@/lib/organization-master-query"

type BranchesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<BranchListParams>
}

export default async function BranchesPage({ params, searchParams }: BranchesPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "branch", "view")

  const t = await getTranslations("branch")
  const tCommon = await getTranslations("common")
  const listState = parseBranchListParams(rawSearchParams)
  const where = buildBranchWhere(listState)

  const [branches, total, summaryBranches, companies] = await Promise.all([
    prisma.branch.findMany({
      where,
      include: {
        company: {
          select: {
            code: true,
            nameTh: true,
          },
        },
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
      orderBy: { code: "asc" },
    }),
  ])
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
  const hasActiveFilters = Boolean(listState.search || listState.companyId || listState.assetUsage !== "all" || listState.locationUsage !== "all")
  const sortBy = (field: BranchSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/branches/new`, branchReturnHref)} className={buttonVariants({ size: "md" })}>
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
            foot: t("summaryWithLocations", { count: summary.withLocations }),
            footTitle: t("summaryWithLocations", { count: summary.withLocations }),
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
        <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={listState.search} placeholder={t("searchPlaceholder")} />
          </Field>
          <FilterSelect
            label={t("company")}
            name="companyId"
            defaultValue={listState.companyId}
            options={[
              { value: "", label: tCommon("all") },
              ...companies.map((company) => ({
                value: company.id,
                label: `${company.code} - ${company.nameTh}`,
              })),
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
            <DataTableHead sort={sortBy("company")}>{t("company")}</DataTableHead>
            <DataTableHead>{t("contactPerson")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("locations")}>{t("locations")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("employees")}>{t("employees")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{t("assets")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {branches.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={9} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={9}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            branches.map((branch) => {
              const drilldown = buildBranchDrilldownHrefs({ locale, branchId: branch.id })
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/branches/${branch.id}/edit`, branchReturnHref)
              return (
                <ClickableTableRow
                  key={branch.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${branch.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{branch.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-48 text-foreground">{branch.name}</DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    <span className="tag">{branch.company.code}</span> - {branch.company.nameTh}
                  </DataTableCell>
                  <DataTableCell className="min-w-40 text-muted-foreground">{orNil(branch.contactPerson)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {branch._count.locations > 0 ? (
                      <Link
                        href={drilldown.locations}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                      >
                        {formatCount(branch._count.locations)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(branch._count.employees)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {branch._count.assets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                      >
                        {formatCount(branch._count.assets)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={tCommon("active")} tone="success" />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
                      code={branch.code}
                      name={branch.name}
                      menuLabel={tCommon("moreActionsFor", { code: branch.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[]}
                      deleteAction={{ endpoint: `/api/branches/${branch.id}` }}
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
