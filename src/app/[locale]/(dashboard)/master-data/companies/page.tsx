import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowDown, ArrowUp, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { CompanyDeleteButton } from "@/components/master-data/company-delete-button"
import { requirePagePermission } from "@/lib/page-auth"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
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
  const tWorkspace = await getTranslations("masterData")
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

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={appendMasterDataReturnTo(`/${locale}/master-data/companies/new`, companyReturnHref)}
        createLabel={tCommon("create")}
        workspace={{
          locale,
          activeId: "companies",
          labels: {
            companies: tWorkspace("companies"),
            branches: tWorkspace("branches"),
            locations: tWorkspace("locations"),
            employees: tWorkspace("employees"),
            suppliers: tWorkspace("suppliers"),
          },
          navigationLabel: tWorkspace("workspaceNavigation"),
        }}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label={t("summaryTotal")}
          value={summary.total}
          detail={t("summaryWithBranches", { count: summary.withBranches })}
          href={basePath}
        />
        <SummaryTile
          label={t("summaryWithAssets")}
          value={summary.withAssets}
          detail={t("summaryWithAssetsHelp")}
          href={`${basePath}?${buildCompanyQueryString(listState, { assetUsage: "withAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryWithoutAssets")}
          value={summary.withoutAssets}
          detail={t("summaryWithoutAssetsHelp")}
          href={`${basePath}?${buildCompanyQueryString(listState, { assetUsage: "withoutAssets", page: 1 })}`}
          tone={summary.withoutAssets > 0 ? "warning" : "neutral"}
        />
        <SummaryTile
          label={t("summaryWithoutBranches")}
          value={summary.withoutBranches}
          detail={t("summaryWithoutBranchesHelp")}
          href={`${basePath}?${buildCompanyQueryString(listState, { branchUsage: "withoutBranches", page: 1 })}`}
          tone={summary.withoutBranches > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,1fr))_auto]" action={basePath}>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={listState.search}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
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
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              {tCommon("filter")}
            </button>
            <Link
              href={basePath}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <CompanySortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</CompanySortableColumnHeader>
                <CompanySortableColumnHeader field="assetTagCode" current={listState} basePath={basePath}>{t("assetTagCode")}</CompanySortableColumnHeader>
                <CompanySortableColumnHeader field="nameTh" current={listState} basePath={basePath}>{t("nameTh")}</CompanySortableColumnHeader>
                <ColumnHeader>{t("nameEn")}</ColumnHeader>
                <ColumnHeader>{t("taxId")}</ColumnHeader>
                <CompanySortableColumnHeader field="branches" current={listState} basePath={basePath}>{t("branches")}</CompanySortableColumnHeader>
                <CompanySortableColumnHeader field="employees" current={listState} basePath={basePath}>{t("employees")}</CompanySortableColumnHeader>
                <CompanySortableColumnHeader field="assets" current={listState} basePath={basePath}>{t("assets")}</CompanySortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
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
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{company.code}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{company.assetTagCode || company.code}</td>
                      <td className="min-w-48 px-4 py-3 text-foreground">{company.nameTh}</td>
                      <td className="min-w-48 px-4 py-3 text-muted-foreground">{company.nameEn || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{company.taxId || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {company._count.branches > 0 ? (
                          <Link
                            href={drilldown.branches}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {company._count.branches.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {company._count.employees.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {company._count.assets > 0 ? (
                          <Link
                            href={drilldown.assets}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {company._count.assets.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActiveBadge label={tCommon("active")} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={editHref}
                            title={tCommon("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <CompanyDeleteButton id={company.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <CompanyPagination
          current={listState}
          total={total}
          basePath={basePath}
          labels={{
            rowsPerPage: tCommon("rowsPerPage"),
            page: tCommon("page"),
            of: tCommon("of"),
            previous: tCommon("previous"),
            next: tCommon("next"),
          }}
        />
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  label: string
  value: number
  detail: string
  href: string
  tone?: "neutral" | "warning"
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 ${
        tone === "warning" ? "border-warning/40" : "border-border"
      }`}
    >
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </Link>
  )
}

function CompanySortableColumnHeader({
  children,
  field,
  current,
  basePath,
  align = "left",
}: {
  children: React.ReactNode
  field: CompanySort
  current: CompanyListState
  basePath: string
  align?: "left" | "right"
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildCompanyQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

  return (
    <th scope="col" className={`px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}>
      <Link href={href} className={`inline-flex items-center gap-1 hover:text-primary ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {active ? (
          current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : null}
      </Link>
    </th>
  )
}

function CompanyPagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: CompanyListState
  total: number
  basePath: string
  labels: {
    rowsPerPage: string
    page: string
    of: string
    previous: string
    next: string
  }
}) {
  const { start, end, totalPages } = paginationRange(current.page, current.pageSize, total)
  const safePage = Math.min(current.page, totalPages)
  const previousPage = Math.max(1, safePage - 1)
  const nextPage = Math.min(totalPages, safePage + 1)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {start}-{end} {labels.of} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((pageSize) => (
          <Link
            key={pageSize}
            href={`${basePath}?${buildCompanyQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {safePage} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildCompanyQueryString(current, { page: previousPage })}`}
          aria-disabled={safePage <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildCompanyQueryString(current, { page: nextPage })}`}
          aria-disabled={safePage >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
