import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowDown, ArrowUp, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { EmployeeDeleteButton } from "@/components/master-data/employee-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
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
  const filteredBranches = listState.companyId
    ? branches.filter((branch) => branch.companyId === listState.companyId)
    : branches
  const filteredDepartments = listState.companyId
    ? departments.filter((department) => !department.companyId || department.companyId === listState.companyId)
    : departments

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={appendMasterDataReturnTo(`/${locale}/master-data/employees/new`, employeeReturnHref)}
        createLabel={tCommon("create")}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label={t("summaryTotal")}
          value={summary.total}
          detail={t("summaryActive", { count: summary.active })}
          href={basePath}
        />
        <SummaryTile
          label={t("summaryWithAssets")}
          value={summary.withAssets}
          detail={t("summaryWithAssetsHelp")}
          href={`${basePath}?${buildEmployeeQueryString(listState, { custodyUsage: "withAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryWithoutAssets")}
          value={summary.withoutAssets}
          detail={t("summaryWithoutAssetsHelp")}
          href={`${basePath}?${buildEmployeeQueryString(listState, { custodyUsage: "withoutAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryFormerWithAssets")}
          value={summary.formerWithAssets}
          detail={t("summaryFormerWithAssetsHelp")}
          href={`${basePath}?${buildEmployeeQueryString(listState, { employmentStatus: "resigned", custodyUsage: "withAssets", page: 1 })}`}
          tone={summary.formerWithAssets > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]" action={basePath}>
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
                <EmployeeSortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</EmployeeSortableColumnHeader>
                <EmployeeSortableColumnHeader field="fullNameTh" current={listState} basePath={basePath}>{t("fullNameTh")}</EmployeeSortableColumnHeader>
                <EmployeeSortableColumnHeader field="company" current={listState} basePath={basePath}>{t("company")}</EmployeeSortableColumnHeader>
                <EmployeeSortableColumnHeader field="branch" current={listState} basePath={basePath}>{t("branch")}</EmployeeSortableColumnHeader>
                <EmployeeSortableColumnHeader field="department" current={listState} basePath={basePath}>{t("department")}</EmployeeSortableColumnHeader>
                <ColumnHeader>{t("manager")}</ColumnHeader>
                <EmployeeSortableColumnHeader field="employmentStatus" current={listState} basePath={basePath}>{t("employmentStatus")}</EmployeeSortableColumnHeader>
                <EmployeeSortableColumnHeader field="assets" current={listState} basePath={basePath}>{t("assets")}</EmployeeSortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
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
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{employee.code}</td>
                      <td className="min-w-56 px-4 py-3 text-foreground">
                        <div className="font-medium">{employee.fullNameTh}</div>
                        <div className="text-xs text-muted-foreground">
                          {[employee.position, employee.email].filter(Boolean).join(" / ") || "-"}
                        </div>
                      </td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        {employee.company.code} - {employee.company.nameTh}
                      </td>
                      <td className="min-w-44 px-4 py-3 text-muted-foreground">
                        {employee.branch.code} - {employee.branch.name}
                      </td>
                      <td className="min-w-44 px-4 py-3 text-muted-foreground">
                        {employee.department.code} - {employee.department.name}
                      </td>
                      <td className="min-w-44 px-4 py-3 text-muted-foreground">
                        {employee.manager ? `${employee.manager.code} - ${employee.manager.fullNameTh}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {t(`status_${employee.employmentStatus}`)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {employee._count.custodianAssets > 0 ? (
                          <Link
                            href={drilldown.assets}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            {employee._count.custodianAssets.toLocaleString()}
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
                          <EmployeeDeleteButton id={employee.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <EmployeePagination
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

function FilterSelect({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string
  name: string
  defaultValue: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {children}
      </select>
    </label>
  )
}

function EmployeeSortableColumnHeader({
  children,
  field,
  current,
  basePath,
}: {
  children: React.ReactNode
  field: EmployeeSort
  current: EmployeeListState
  basePath: string
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildEmployeeQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

  return (
    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      <Link href={href} className="inline-flex items-center gap-1 hover:text-primary">
        {children}
        {active ? (
          current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : null}
      </Link>
    </th>
  )
}

function EmployeePagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: EmployeeListState
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
  const previousPage = Math.max(1, current.page - 1)
  const nextPage = Math.min(totalPages, current.page + 1)

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
            href={`${basePath}?${buildEmployeeQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {current.page} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildEmployeeQueryString(current, { page: previousPage })}`}
          aria-disabled={current.page <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            current.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildEmployeeQueryString(current, { page: nextPage })}`}
          aria-disabled={current.page >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            current.page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}
