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
  buildEmployeeDrilldownHrefs,
  buildEmployeeOrderBy,
  buildEmployeeQueryString,
  buildEmployeeSummary,
  buildEmployeeWhere,
  parseEmployeeListParams,
  type EmployeeListParams,
  type EmployeeListState,
  type EmployeeSort,
} from "@/lib/organization-master-query"

type EmployeesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<EmployeeListParams>
}

export default async function EmployeesPage({ params, searchParams }: EmployeesPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "employee", "view")

  const t = await getTranslations("employee")
  const tCommon = await getTranslations("common")
  const listState = parseEmployeeListParams(rawSearchParams)
  const where = buildEmployeeWhere(listState)

  const [employees, total, summaryEmployees, companies, branches, departments] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        company: { select: { id: true, code: true, nameTh: true } },
        branch: { select: { id: true, code: true, name: true, companyId: true } },
        department: { select: { id: true, code: true, name: true, companyId: true } },
        manager: { select: { code: true, fullNameTh: true } },
        _count: {
          select: {
            custodianAssets: { where: { isActive: true } },
          },
        },
      },
      orderBy: buildEmployeeOrderBy(listState),
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: {
        employmentStatus: true,
        _count: {
          select: {
            custodianAssets: { where: { isActive: true } },
          },
        },
      },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true, company: { select: { code: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true },
      orderBy: { code: "asc" },
    }),
  ])
  const basePath = `/${locale}/master-data/employees`
  const employeeReturnHref = `${basePath}?${buildEmployeeQueryString(listState, {})}`
  const summary = buildEmployeeSummary(summaryEmployees)
  const listHref = (next: Partial<EmployeeListState>) => `${basePath}?${buildEmployeeQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (employees.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = Boolean(listState.search || listState.companyId || listState.branchId || listState.departmentId || listState.employmentStatus !== "all" || listState.custodyUsage !== "all")
  const sortBy = (field: EmployeeSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })
  const filteredBranches = listState.companyId
    ? branches.filter((branch) => branch.companyId === listState.companyId)
    : branches
  const filteredDepartments = listState.companyId
    ? departments.filter((department) => !department.companyId || department.companyId === listState.companyId)
    : departments

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/employees/new`, employeeReturnHref)} className={buttonVariants({ size: "md" })}>
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
            foot: t("summaryActive", { count: summary.active }),
            footTitle: t("summaryActive", { count: summary.active }),
            href: basePath,
          },
          {
            key: "withAssets",
            label: t("summaryWithAssets"),
            value: formatCount(summary.withAssets),
            foot: t("summaryWithAssetsHelp"),
            footTitle: t("summaryWithAssetsHelp"),
            href: listHref({ custodyUsage: "withAssets", page: 1 }),
            current: listState.custodyUsage === "withAssets",
          },
          {
            key: "withoutAssets",
            label: t("summaryWithoutAssets"),
            value: formatCount(summary.withoutAssets),
            foot: t("summaryWithoutAssetsHelp"),
            footTitle: t("summaryWithoutAssetsHelp"),
            href: listHref({ custodyUsage: "withoutAssets", page: 1 }),
            current: listState.custodyUsage === "withoutAssets",
          },
          {
            key: "formerWithAssets",
            label: t("summaryFormerWithAssets"),
            value: formatCount(summary.formerWithAssets),
            foot: t("summaryFormerWithAssetsHelp"),
            footTitle: t("summaryFormerWithAssetsHelp"),
            href: listHref({ employmentStatus: "resigned", custodyUsage: "withAssets", page: 1 }),
            current: listState.employmentStatus === "resigned" && listState.custodyUsage === "withAssets",
            attention: summary.formerWithAssets > 0,
          },
        ]}
      />

      <FilterPanel>
        <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={listState.search} placeholder={t("searchPlaceholder")} />
          </Field>
          <FilterSelect label={t("company")} name="companyId" defaultValue={listState.companyId}>
            <option value="">{t("allCompanies")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.code} - {company.nameTh}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t("branch")} name="branchId" defaultValue={listState.branchId}>
            <option value="">{t("allBranches")}</option>
            {filteredBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.company.code} / {branch.code} - {branch.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t("department")} name="departmentId" defaultValue={listState.departmentId}>
            <option value="">{t("allDepartments")}</option>
            {filteredDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code} - {department.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t("employmentStatus")} name="employmentStatus" defaultValue={listState.employmentStatus}>
            <option value="all">{tCommon("all")}</option>
            <option value="active">{t("status_active")}</option>
            <option value="resigned">{t("status_resigned")}</option>
            <option value="suspended">{t("status_suspended")}</option>
          </FilterSelect>
          <FilterSelect label={t("custodyUsageFilter")} name="custodyUsage" defaultValue={listState.custodyUsage}>
            <option value="all">{tCommon("all")}</option>
            <option value="withAssets">{t("withAssets")}</option>
            <option value="withoutAssets">{t("withoutAssets")}</option>
          </FilterSelect>
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
            <DataTableHead sort={sortBy("fullNameTh")}>{t("fullNameTh")}</DataTableHead>
            <DataTableHead sort={sortBy("company")}>{t("company")}</DataTableHead>
            <DataTableHead sort={sortBy("branch")}>{t("branch")}</DataTableHead>
            <DataTableHead sort={sortBy("department")}>{t("department")}</DataTableHead>
            <DataTableHead>{t("manager")}</DataTableHead>
            <DataTableHead sort={sortBy("employmentStatus")}>{t("employmentStatus")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{t("assets")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {employees.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={10} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={10}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            employees.map((employee) => {
              const drilldown = buildEmployeeDrilldownHrefs({ locale, employeeId: employee.id })
              const detailHref = appendMasterDataReturnTo(`/${locale}/master-data/employees/${employee.id}`, employeeReturnHref)
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/employees/${employee.id}/edit`, employeeReturnHref)
              return (
                <ClickableTableRow
                  key={employee.id}
                  href={detailHref}
                  label={`${tCommon("view")}: ${employee.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{employee.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-foreground">
                    <div className="font-medium">{employee.fullNameTh}</div>
                    <div className="text-xs text-muted-foreground">
                      {orNil([employee.position, employee.email].filter(Boolean).join(" / "))}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    <span className="tag">{employee.company.code}</span> - {employee.company.nameTh}
                  </DataTableCell>
                  <DataTableCell className="min-w-44 text-muted-foreground">
                    <span className="tag">{employee.branch.code}</span> - {employee.branch.name}
                  </DataTableCell>
                  <DataTableCell className="min-w-44 text-muted-foreground">
                    <span className="tag">{employee.department.code}</span> - {employee.department.name}
                  </DataTableCell>
                  <DataTableCell className="min-w-44 text-muted-foreground">
                    {employee.manager ? (
                      <>
                        <span className="tag">{employee.manager.code}</span> - {employee.manager.fullNameTh}
                      </>
                    ) : (
                      <Nil />
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    {t(`status_${employee.employmentStatus}`)}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {employee._count.custodianAssets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(employee._count.custodianAssets)}
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
                      code={employee.code}
                      name={employee.fullNameTh}
                      menuLabel={tCommon("moreActionsFor", { code: employee.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[]}
                      deleteAction={{ endpoint: `/api/employees/${employee.id}` }}
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
