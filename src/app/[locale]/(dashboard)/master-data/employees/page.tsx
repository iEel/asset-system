import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus, SlidersHorizontal } from "lucide-react"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { isLdapSyncEnabled } from "@/lib/ldap-sync-enabled"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterChipList } from "@/components/ui/filter-chips"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RecordStatusSegmented } from "@/components/ui/record-status-segmented"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { EmployeeRowActions } from "@/components/master-data/employee-row-actions"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { isFormerEmployee } from "@/lib/employee-detail"
import {
  buildEmployeeDrilldownHrefs,
  buildEmployeeOrderBy,
  buildEmployeeQueryString,
  buildEmployeeSummary,
  buildEmployeeWhere,
  employeeHeldAssetsWhere,
  employeeListHasFieldFilters,
  employeeRecordStatusCountWheres,
  employeeSorts,
  employeeSummaryWheres,
  getEmployeeDeleteBlockReason,
  parseEmployeeListParams,
  readEmployeeDeactivateCounts,
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
  const user = await requirePagePermission(locale, "employee", "view")
  // G7F-R2: "ปิดใช้งาน" in ⋯ needs employee:delete (DELETE /api/employees/[id] only deactivates).
  const canDeactivate = hasPermission(user, "employee", "delete")
  // While LDAP sync is on, the sync owns "ใช้งาน" (Y4): ปิดใช้งาน shows unavailable with the edit form's hint, and the
  // DELETE route refuses it too (final review fix 1).
  const activeLockedBySync = canDeactivate ? await isLdapSyncEnabled() : false
  // The held-assets link opens the asset register, so it needs asset:view (final review fix 2).
  const canViewAssets = hasPermission(user, "asset", "view")

  const t = await getTranslations("employee")
  const tCommon = await getTranslations("common")
  const listState = parseEmployeeListParams(rawSearchParams)
  const where = buildEmployeeWhere(listState)

  const summaryWheres = employeeSummaryWheres()
  const statusCountWheres = employeeRecordStatusCountWheres(listState)

  const [employees, total, heldTotal, activeCount, inactiveCount, summaryTotal, summaryWithAssets, summaryFormerWithAssets, summaryStatusCounts, companies, branches, departments] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        company: { select: { id: true, code: true, nameTh: true } },
        branch: { select: { id: true, code: true, name: true, companyId: true } },
        department: { select: { id: true, code: true, name: true, companyId: true } },
        manager: { select: { code: true, fullNameTh: true } },
        // subordinates and auditRounds with the DELETE route's wheres, for the ปิดใช้งาน reason (G7F-R2).
        _count: {
          select: {
            custodianAssets: { where: { isActive: true } },
            subordinates: { where: { isActive: true } },
            auditRounds: { where: { isActive: true } },
          },
        },
      },
      orderBy: buildEmployeeOrderBy(listState),
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.employee.count({ where }),
    // "{n} คน · ถือครองรวม {a} รายการ" over the filtered set (board MD-Employees).
    prisma.asset.count({ where: employeeHeldAssetsWhere(where) }),
    // The record-status segmented control's counts, the list's other filters kept (G7F-R1).
    prisma.employee.count({ where: statusCountWheres.active }),
    prisma.employee.count({ where: statusCountWheres.inactive }),
    // The cards are counts, not rows. The former card counts with the ?former=withAssets list's where, every record
    // (the ones AD sync deactivated included, G7P2-R1); the others count active records only.
    prisma.employee.count({ where: summaryWheres.records }),
    prisma.employee.count({ where: summaryWheres.withAssets }),
    prisma.employee.count({ where: summaryWheres.formerWithAssets }),
    prisma.employee.groupBy({ by: ["employmentStatus"], where: summaryWheres.records, _count: { _all: true } }),
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
  // The two blockers the rows' _count cannot read, for the active rows only (an inactive one has no ปิดใช้งาน): one
  // grouped query per kind over the page's ids, chunked by 2,000.
  const activeIds = canDeactivate ? employees.filter((employee) => employee.isActive).map((employee) => employee.id) : []
  const deactivateCounts = await readEmployeeDeactivateCounts(prisma, activeIds)
  const recordStatusCounts = { active: activeCount, inactive: inactiveCount, all: activeCount + inactiveCount }
  const basePath = `/${locale}/master-data/employees`
  const employeeReturnHref = `${basePath}?${buildEmployeeQueryString(listState, {})}`
  const summary = buildEmployeeSummary({
    total: summaryTotal,
    withAssets: summaryWithAssets,
    formerWithAssets: summaryFormerWithAssets,
    statusCounts: summaryStatusCounts,
  })
  const totalBreakdown = t("summaryTotalBreakdown", {
    active: formatCount(summary.active),
    resigned: formatCount(summary.resigned),
    suspended: formatCount(summary.suspended),
  })
  const listHref = (next: Partial<EmployeeListState>) => `${basePath}?${buildEmployeeQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (employees.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const formerList = listState.former === "withAssets"
  // The phone disclosure opens for a set form field only; the former filter is the chip below (final review fix 4).
  const hasFieldFilters = employeeListHasFieldFilters(listState)
  // The record status is the segmented control above the list now, not a form field; the clear link still resets it.
  const hasActiveFilters = formerList || hasFieldFilters || listState.status !== "active"
  // G7F-R1: the record-status column shows only under ทั้งหมด; ?former=withAssets shows both kinds, so it keeps it.
  const showRecordStatus = formerList || listState.status === "all"
  const columnCount = showRecordStatus ? 7 : 6
  const sortBy = (field: EmployeeSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })
  const sortLabel = (sort: EmployeeSort) => (sort === "createdAt" ? t("sortCreatedAt") : t(sort))
  const filteredBranches = listState.companyId
    ? branches.filter((branch) => branch.companyId === listState.companyId)
    : branches
  const filteredDepartments = listState.companyId
    ? departments.filter((department) => !department.companyId || department.companyId === listState.companyId)
    : departments
  // One row model for the table (md and up) and the phone cards (spec 2B §5.1: one list, two layouts).
  const rows = employees.map((employee) => {
    // G7P2-R1, spec §5.1: a former employee (or an AD-deactivated record) still holding assets.
    const formerHolder = isFormerEmployee(employee) && employee._count.custodianAssets > 0
    const assetsHref = buildEmployeeDrilldownHrefs({ locale, employeeId: employee.id }).assets
    const extraCounts = deactivateCounts.get(employee.id)
    return {
      employee,
      formerHolder,
      // Row ⋯ (board MD-Employees): the held assets in the register, and ปิดใช้งาน for an active employee.
      heldAssets:
        canViewAssets && employee._count.custodianAssets > 0
          ? { label: t("viewHeldAssets", { n: formatCount(employee._count.custodianAssets) }), href: assetsHref }
          : null,
      deactivate:
        canDeactivate && employee.isActive
          ? {
              endpoint: `/api/employees/${employee.id}`,
              blocked: activeLockedBySync
                ? t("activeLockedBySyncHint")
                : getEmployeeDeleteBlockReason({
                    custodianAssets: employee._count.custodianAssets,
                    subordinates: employee._count.subordinates,
                    userAccounts: extraCounts?.userAccounts ?? 0,
                    openCheckouts: extraCounts?.openCheckouts ?? 0,
                    auditRounds: employee._count.auditRounds,
                  }),
            }
          : null,
      assetsHref,
      detailHref: appendMasterDataReturnTo(`/${locale}/master-data/employees/${employee.id}`, employeeReturnHref),
      editHref: appendMasterDataReturnTo(`/${locale}/master-data/employees/${employee.id}/edit`, employeeReturnHref),
    }
  })
  // Shown once, under both the table and the phone cards.
  const pagination =
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
    ) : null
  // Rendered twice: in the phone disclosure and in the desktop panel (the suppliers list's pattern). Field gives each
  // copy its own ids (useId), and the copy that is display: none leaves the accessibility tree, so the page keeps one
  // search landmark (spec 2B §6.2 6-ช).
  // Keyed on the list's query: a header sort, a card or the segmented control changes the URL without this form, and the
  // uncontrolled selects would otherwise send the old sort and filters with the next search (group 8 plan 1 final review).
  const filterForm = (className: string) => (
    <form key={employeeReturnHref} role="search" action={basePath} className={className}>
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={listState.pageSize} />
      {formerList ? <input type="hidden" name="former" value="withAssets" /> : null}
      {/* The record status is the segmented control above the list (G7F-R1); a search keeps it. */}
      {listState.status !== "active" ? <input type="hidden" name="status" value={listState.status} /> : null}
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
      {/* The merged name and department columns sort by name and department; the code, company and branch sorts
          (and every other) stay here, on phones too. */}
      <FilterSelect label={t("sortLabel")} name="sort" defaultValue={listState.sort}>
        {employeeSorts.map((sort) => (
          <option key={sort} value={sort}>
            {sortLabel(sort)}
          </option>
        ))}
      </FilterSelect>
      {/* The direction beside the sort, so phones (no header links) can choose it too; a header click still flips it
          (final review fix 3). */}
      <FilterSelect label={t("sortDirection")} name="direction" defaultValue={listState.direction}>
        <option value="asc">{t("sortAsc")}</option>
        <option value="desc">{t("sortDesc")}</option>
      </FilterSelect>
      <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
    </form>
  )

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
            foot: totalBreakdown,
            footTitle: totalBreakdown,
            href: basePath,
          },
          {
            key: "withAssets",
            label: t("summaryWithAssets"),
            value: formatCount(summary.withAssets),
            foot: t("summaryWithAssetsHelp"),
            footTitle: t("summaryWithAssetsHelp"),
            href: listHref({ custodyUsage: "withAssets", former: "all", page: 1 }),
            current: !formerList && listState.custodyUsage === "withAssets",
          },
          {
            key: "withoutAssets",
            label: t("summaryWithoutAssets"),
            value: formatCount(summary.withoutAssets),
            foot: t("summaryWithoutAssetsHelp"),
            footTitle: t("summaryWithoutAssetsHelp"),
            href: listHref({ custodyUsage: "withoutAssets", former: "all", page: 1 }),
            current: !formerList && listState.custodyUsage === "withoutAssets",
          },
          {
            // G7P2-R1: every not-active (employment status or record) employee still holding an active asset, whatever
            // the record-status filter. The link is the bare filter, so the list shows exactly the people counted.
            key: "formerWithAssets",
            label: t("summaryFormerWithAssets"),
            value: formatCount(summary.formerWithAssets),
            foot: t("summaryFormerWithAssetsHelp"),
            footTitle: t("summaryFormerWithAssetsHelp"),
            href: `${basePath}?former=withAssets`,
            current: listState.former === "withAssets",
            attention: summary.formerWithAssets > 0,
          },
        ]}
      />

      {/* Phones: the filters fold into a disclosure, closed by default and open while a form field is set (the suppliers
          list's pattern). A <details> cannot be ContentPanel: the panel classes (2D-2 R4). */}
      <details className={cn(getPanelClasses(), "md:hidden")} open={hasFieldFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t("filtersTitle")}
        </summary>
        {filterForm("grid gap-3 border-t border-border p-4")}
      </details>

      {/* Search, seven selects and the buttons do not fit one row at 1440 or 1024: the row wraps (the brands page's fix). */}
      <FilterPanel className="hidden md:block">
        {filterForm("grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3")}
      </FilterPanel>

      {/* G7F-R1: ใช้งาน / ไม่ใช้งาน / ทั้งหมด with counts, in place of the status select. ?former=withAssets ignores the
          record status (G7P2-R1), so its chip stands there instead. Then the people and held totals of the filtered set. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {formerList ? (
          <FilterChipList
            chips={[{ key: "former", label: t("formerFilterChip"), href: listHref({ former: "all", page: 1 }) }]}
            label={t("activeFilters")}
            removeLabel={t("clearFilter")}
          />
        ) : (
          <RecordStatusSegmented
            value={listState.status}
            counts={recordStatusCounts}
            hrefFor={(status) => listHref({ status, page: 1 })}
          />
        )}
        <p className="num text-meta text-muted-foreground md:ml-auto">
          {t("listTotals", { people: total, assets: heldTotal })}
        </p>
      </div>

      <div className={cn(getPanelClasses(), "overflow-hidden")}>
        <DataTable data-employee-desktop-table framed={false} className="hidden md:block" caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              {/* Board MD-Employees: the name with the code and position under it, and the department with the branch
                  and company under it. Their other sorts are in the filter form's sort select. */}
              <DataTableHead sort={sortBy("fullNameTh")}>{t("fullNameTh")}</DataTableHead>
              {/* The held count right after the name: the key column of the former-holder view (final review fix 3b). */}
              <DataTableHead align="right" sort={sortBy("assets")}>{t("assets")}</DataTableHead>
              <DataTableHead sort={sortBy("department")}>{t("departmentBranch")}</DataTableHead>
              <DataTableHead>{t("manager")}</DataTableHead>
              <DataTableHead sort={sortBy("employmentStatus")}>{t("employmentStatus")}</DataTableHead>
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
              rows.map(({ employee, formerHolder, assetsHref, detailHref, editHref, heldAssets, deactivate }) => (
                <ClickableTableRow
                  key={employee.id}
                  href={detailHref}
                  label={`${tCommon("view")}: ${employee.code}`}
                >
                  <DataTableCell className="min-w-56 text-foreground">
                    <div className="font-semibold">{employee.fullNameTh}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="tag">{employee.code}</span>
                      {employee.position ? ` · ${employee.position}` : null}
                    </div>
                    {employee.email ? <div className="text-xs text-muted-foreground">{employee.email}</div> : null}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {employee._count.custodianAssets > 0 ? (
                      <Link
                        href={assetsHref}
                        className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0", formerHolder && "font-semibold text-warning")}
                      >
                        {formatCount(employee._count.custodianAssets)}
                      </Link>
                    ) : (
                      formatCount(0)
                    )}
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-foreground">
                    <div>{employee.department.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {employee.branch.name} · {employee.company.nameTh}
                    </div>
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
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={t(`status_${employee.employmentStatus}`)} tone={employmentStatusTone(employee.employmentStatus)} />
                    {formerHolder ? <span className="block text-meta text-warning">{t("formerHolderNote")}</span> : null}
                  </DataTableCell>
                  {showRecordStatus ? (
                    <DataTableCell className="whitespace-nowrap">
                      <StatusBadge label={employee.isActive ? tCommon("active") : tCommon("inactive")} tone={employee.isActive ? "success" : "muted"} />
                    </DataTableCell>
                  ) : null}
                  <DataTableCell align="right" sticky="right">
                    <EmployeeRowActions
                      code={employee.code}
                      name={employee.fullNameTh}
                      menuLabel={tCommon("moreActionsFor", { code: employee.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      heldAssets={heldAssets}
                      deactivate={deactivate}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>

        {/* Phones (MD-Employees-Phone board): one card per employee. The name link stretches over the card (after:inset-0),
            so the whole card opens the employee page; the held count and ⋯ sit above it (relative z-10). */}
        <div data-employee-mobile-list className="md:hidden">
          {rows.length === 0 ? (
            <ActionEmptyState
              title={tCommon("noData")}
              actionHref={hasActiveFilters ? basePath : undefined}
              actionLabel={hasActiveFilters ? t("clearFilters") : undefined}
              actionVariant="secondary"
            />
          ) : (
            <div className="grid gap-3 p-3">
              {rows.map(({ employee, formerHolder, assetsHref, detailHref, editHref, heldAssets, deactivate }) => (
                <article
                  key={employee.id}
                  className={cn("relative min-w-0 rounded-md border bg-background p-3", formerHolder ? "border-warning-border" : "border-border")}
                >
                  <h2 className="break-words text-base font-semibold text-primary">
                    <Link
                      href={detailHref}
                      className="rounded-md after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                    >
                      {employee.fullNameTh}
                    </Link>
                  </h2>
                  <p className="text-meta text-muted-foreground">
                    <span className="tag">{employee.code}</span>
                    {employee.position ? ` · ${employee.position}` : null}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {employee.department.name} · {employee.branch.name}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-1">
                    <StatusBadge label={t(`status_${employee.employmentStatus}`)} tone={employmentStatusTone(employee.employmentStatus)} />
                    {showRecordStatus ? (
                      <StatusBadge label={employee.isActive ? tCommon("active") : tCommon("inactive")} tone={employee.isActive ? "success" : "muted"} />
                    ) : null}
                    {formerHolder ? <span className="text-meta text-warning">{t("formerHolderNote")}</span> : null}
                    <span className="ml-auto flex items-center">
                      {employee._count.custodianAssets > 0 ? (
                        <Link
                          href={assetsHref}
                          className={cn(linkVariants({ size: "inherit" }), "num relative z-10 inline-flex min-h-11 items-center text-sm font-medium", formerHolder && "font-semibold text-warning")}
                        >
                          {t("heldCount", { count: formatCount(employee._count.custodianAssets) })}
                        </Link>
                      ) : (
                        <span className="inline-flex min-h-11 items-center text-sm text-muted-foreground">{t("withoutAssets")}</span>
                      )}
                      <EmployeeRowActions
                        className="relative z-10"
                        code={employee.code}
                        name={employee.fullNameTh}
                        menuLabel={tCommon("moreActionsFor", { code: employee.code })}
                        next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                        heldAssets={heldAssets}
                        deactivate={deactivate}
                      />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {pagination ? <DataTableFoot>{pagination}</DataTableFoot> : null}
      </div>
    </div>
  )
}

// The board's badges: ทำงานอยู่ success, ลาออก muted, พักงาน warning.
function employmentStatusTone(status: string): StatusTone {
  if (status === "active") return "success"
  if (status === "suspended") return "warning"
  return "muted"
}
