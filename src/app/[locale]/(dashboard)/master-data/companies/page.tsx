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
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  buildCompanyDrilldownHrefs,
  buildCompanyOrderBy,
  buildCompanyQueryString,
  buildCompanySummary,
  buildCompanyWhere,
  parseCompanyListParams,
  type CompanyListParams,
  type CompanyListState,
  type CompanySort,
} from "@/lib/organization-master-query"

type CompaniesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<CompanyListParams>
}

export default async function CompaniesPage({ params, searchParams }: CompaniesPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "company", "view")

  const t = await getTranslations("company")
  const tCommon = await getTranslations("common")
  const listState = parseCompanyListParams(rawSearchParams)
  const where = buildCompanyWhere(listState)

  const [companies, total, summaryCompanies] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            branches: { where: { isActive: true } },
            departments: { where: { isActive: true } },
            employees: { where: { isActive: true } },
            assets: { where: { isActive: true } },
            auditRounds: { where: { isActive: true } },
          },
        },
      },
      orderBy: buildCompanyOrderBy(listState),
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.company.count({ where }),
    prisma.company.findMany({
      where: { isActive: true },
      select: {
        _count: {
          select: {
            branches: { where: { isActive: true } },
            assets: { where: { isActive: true } },
          },
        },
      },
    }),
  ])
  const basePath = `/${locale}/master-data/companies`
  const companyReturnHref = `${basePath}?${buildCompanyQueryString(listState, {})}`
  const summary = buildCompanySummary(summaryCompanies)
  const listHref = (next: Partial<CompanyListState>) => `${basePath}?${buildCompanyQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (companies.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = Boolean(listState.search || listState.assetUsage !== "all" || listState.branchUsage !== "all")
  const sortBy = (field: CompanySort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/companies/new`, companyReturnHref)} className={buttonVariants({ size: "md" })}>
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
            foot: t("summaryWithBranches", { count: summary.withBranches }),
            footTitle: t("summaryWithBranches", { count: summary.withBranches }),
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
            key: "withoutBranches",
            label: t("summaryWithoutBranches"),
            value: formatCount(summary.withoutBranches),
            foot: t("summaryWithoutBranchesHelp"),
            footTitle: t("summaryWithoutBranchesHelp"),
            href: listHref({ branchUsage: "withoutBranches", page: 1 }),
            current: listState.branchUsage === "withoutBranches",
            attention: summary.withoutBranches > 0,
          },
        ]}
      />

      <FilterPanel>
        <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,1fr))_auto]">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={listState.search} placeholder={t("searchPlaceholder")} />
          </Field>
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
            label={t("branchUsageFilter")}
            name="branchUsage"
            defaultValue={listState.branchUsage}
            options={[
              { value: "all", label: tCommon("all") },
              { value: "withBranches", label: t("withBranches") },
              { value: "withoutBranches", label: t("withoutBranches") },
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
            <DataTableHead sort={sortBy("assetTagCode")}>{t("assetTagCode")}</DataTableHead>
            <DataTableHead sort={sortBy("nameTh")}>{t("nameTh")}</DataTableHead>
            <DataTableHead>{t("nameEn")}</DataTableHead>
            <DataTableHead>{t("taxId")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("branches")}>{t("branches")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("employees")}>{t("employees")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{t("assets")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {companies.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={10} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={10}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            companies.map((company) => {
              const drilldown = buildCompanyDrilldownHrefs({ locale, companyId: company.id })
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/companies/${company.id}/edit`, companyReturnHref)
              return (
                <ClickableTableRow
                  key={company.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${company.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{company.code}</span>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    <span className="tag">{company.assetTagCode || company.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-48 text-foreground">{company.nameTh}</DataTableCell>
                  <DataTableCell className="min-w-48 text-muted-foreground">{orNil(company.nameEn)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    {company.taxId ? <span className="tag">{company.taxId}</span> : <Nil />}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {company._count.branches > 0 ? (
                      <Link
                        href={drilldown.branches}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(company._count.branches)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(company._count.employees)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {company._count.assets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(company._count.assets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
                      code={company.code}
                      name={company.nameTh}
                      menuLabel={tCommon("moreActionsFor", { code: company.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[]}
                      deleteAction={{ endpoint: `/api/companies/${company.id}` }}
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
