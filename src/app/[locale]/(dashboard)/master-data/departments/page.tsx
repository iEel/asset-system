import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterChipList } from "@/components/ui/filter-chips"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RecordStatusSegmented } from "@/components/ui/record-status-segmented"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { MasterDataReactivateButton, MasterDataRowActions, type MasterDataReactivate } from "@/components/master-data/master-data-row-actions"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { LIST_PAGE_SIZES, lastListPage, listPageWindow } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { formatDeactivatedAt, readDeactivatedAt, readRecordStatusCounts, recordStatusCountWheres } from "@/lib/master-data-list-ui"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import { getDepartmentDeleteBlockReason, getReactivateBlockedByCompanyReason } from "@/lib/organization-master-query"
import {
  buildDepartmentDrilldownHrefs,
  buildDepartmentFilterChips,
  buildDepartmentOrderBy,
  buildDepartmentSummary,
  buildDepartmentWhere,
  departmentListHasFilters,
  departmentListHref,
  departmentSharedCompanyValue,
  departmentSorts,
  departmentSummaryLineWheres,
  parseDepartmentListParams,
  readDepartmentOpenAuditRoundCounts,
  type DepartmentListParams,
  type DepartmentListState,
  type DepartmentSort,
} from "@/lib/department-list-query"

type DepartmentsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<DepartmentListParams>
}

// Board MD-Departments (group 8 plan 1 Task 4, spec §3, §5): the shared list pattern of the companies and branches lists.
// Name first with the code under it, the company by name (or แผนกกลาง), the employee and asset counts linking to the
// lists filtered by the department, "โอนย้ายก่อนปิดใช้งาน" on a row that still holds assets, the filter chips and the
// summary line, the record-status segmented control with counts, the row opens the edit page and ⋯ holds แก้ไข and
// ปิดใช้งาน / เปิดใช้งาน.
export default async function DepartmentsPage({ params, searchParams }: DepartmentsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "department", "view")
  // Spec §3: ปิดใช้งาน needs department:delete (DELETE only deactivates), เปิดใช้งาน department:edit (PATCH isActive true).
  const canDeactivate = hasPermission(user, "department", "delete")
  // Final review: without department:edit no แก้ไข in ⋯ and the row is a plain row (it opens nothing); no เพิ่มแผนก
  // without department:create; the asset count links to the register only with asset:view, else a plain number.
  const canEdit = hasPermission(user, "department", "edit")
  const canCreate = hasPermission(user, "department", "create")
  const canViewAssets = hasPermission(user, "asset", "view")
  // The employee count opens the employee list (employee:view).
  const canViewEmployees = hasPermission(user, "employee", "view")

  const t = await getTranslations("department")
  const tCommon = await getTranslations("common")
  const listState = parseDepartmentListParams(rawSearchParams)
  const where = buildDepartmentWhere(listState)
  const summaryLineWheres = departmentSummaryLineWheres(where)
  const { skip, take } = listPageWindow(listState)

  const [departments, total, summaryDepartments, companies, recordStatusCounts, departmentsWithAssets, assetTotal] = await Promise.all([
    prisma.department.findMany({
      where,
      include: {
        // isActive: an inactive company makes เปิดใช้งาน unavailable (getReactivateBlockedByCompanyReason).
        company: { select: { id: true, nameTh: true, isActive: true } },
        // The DELETE route's employee and asset counts, for the ปิดใช้งาน reason; open rounds are read below.
        _count: {
          select: {
            employees: { where: { isActive: true } },
            assets: { where: { isActive: true } },
          },
        },
      },
      orderBy: buildDepartmentOrderBy(listState),
      skip,
      take,
    }),
    prisma.department.count({ where }),
    prisma.department.findMany({
      where: { isActive: true },
      select: {
        company: { select: { id: true, nameTh: true } },
        _count: { select: { employees: { where: { isActive: true } } } },
      },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, nameTh: true },
      orderBy: { nameTh: "asc" },
    }),
    // ใช้งาน {n} / ไม่ใช้งาน {n} / ทั้งหมด {n}, the list's other filters kept.
    readRecordStatusCounts(prisma.department, recordStatusCountWheres(listState, buildDepartmentWhere)),
    prisma.department.count({ where: summaryLineWheres.withAssets }),
    prisma.asset.count({ where: summaryLineWheres.assets }),
  ])
  const pageIds = departments.map((department) => department.id)
  const [openAuditRounds, deactivatedAt] = await Promise.all([
    // G8P1-R3: the open audit rounds scoped to each row, as the route counts them.
    readDepartmentOpenAuditRoundCounts(prisma, pageIds),
    // "· ปิดใช้งานเมื่อ {date}" on the inactive rows (G8P1-R2).
    readDeactivatedAt(
      prisma,
      "department",
      departments.filter((department) => !department.isActive).map((department) => department.id)
    ),
  ])
  const basePath = `/${locale}/master-data/departments`
  const listHref = (next: Partial<DepartmentListState>) => departmentListHref(basePath, listState, next)
  const departmentReturnHref = listHref({})
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (departments.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const summary = buildDepartmentSummary(summaryDepartments)
  // The record status is the segmented control, not a form field; the clear link still resets it. The sort is not a
  // filter (as on the companies and branches lists).
  const hasActiveFilters = listState.status !== "active" || departmentListHasFilters(listState)
  // Spec §3: the status column shows only under ทั้งหมด.
  const showRecordStatus = listState.status === "all"
  const columnCount = showRecordStatus ? 6 : 5
  const sortBy = (field: DepartmentSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })
  const sortLabel = (sort: DepartmentSort) => {
    if (sort === "createdAt") return t("list.sortCreatedAt")
    return t(sort)
  }
  const filterChips = buildDepartmentFilterChips({
    basePath,
    state: listState,
    companyName: companies.find((company) => company.id === listState.companyId)?.nameTh,
    labels: {
      company: t("company"),
      sharedCompany: t("sharedDepartment"),
      employees: t("employeeUsageFilter"),
      assets: t("assetUsageFilter"),
      employeeUsage: { withEmployees: t("withEmployees"), withoutEmployees: t("withoutEmployees") },
      assetUsage: { withAssets: t("withAssets"), withoutAssets: t("withoutAssets") },
    },
  })
  const companyBreakdown = [
    ...summary.byCompany.map((item) => t("summaryCompanyCount", { name: item.name, count: item.count })),
    ...(summary.shared > 0 ? [t("summarySharedCount", { count: summary.shared })] : []),
  ].join(" · ")
  const withoutEmployeesFoot = t("summaryWithoutEmployeesFoot", { withEmployees: summary.withEmployees, withoutEmployees: summary.withoutEmployees, total: summary.total })
  const deactivateClearItems = (["employees", "assets", "auditRounds"] as const).map((key) => t(`deactivate.clear.${key}`))

  const rows = departments.map((department) => {
    const drilldown = buildDepartmentDrilldownHrefs({ locale, departmentId: department.id })
    const editHref = appendMasterDataReturnTo(`/${locale}/master-data/departments/${department.id}/edit`, departmentReturnHref)
    const endpoint = `/api/departments/${department.id}`
    const at = department.isActive ? null : deactivatedAt.get(department.id)
    const counts = {
      employees: department._count.employees,
      assets: department._count.assets,
      openAuditRounds: openAuditRounds.get(department.id) ?? 0,
    }
    // PATCH /api/departments/[id] with { isActive: true } only (final review: no snapshot of the record goes back);
    // refused while the company is inactive (แผนกกลาง never), so ⋯ shows it unavailable with the server's reason.
    const reactivate: MasterDataReactivate | null =
      canEdit && !department.isActive
        ? {
            endpoint,
            blocked: getReactivateBlockedByCompanyReason("department", department.company),
            labels: {
              action: t("reactivate.action"),
              confirmTitle: t("reactivate.confirmTitle", { name: department.name }),
              confirmBody: t("reactivate.confirmBody"),
              success: t("reactivate.success"),
            },
          }
        : null
    return {
      department,
      drilldown,
      editHref,
      reactivate,
      deactivatedLine: department.isActive ? null : tCommon("recordStatus.deactivatedAt", { date: at ? formatDeactivatedAt(at, locale) : "–" }),
      links: canEdit ? [{ key: "edit", label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }] : [],
      deactivate:
        canDeactivate && department.isActive
          ? {
              endpoint,
              blocked: getDepartmentDeleteBlockReason(counts),
              labels: {
                action: t("deactivate.action"),
                hint: t("deactivate.hint"),
                confirmTitle: t("deactivate.confirmTitle", { name: department.name }),
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
            <Link href={appendMasterDataReturnTo(`/${locale}/master-data/departments/new`, departmentReturnHref)} className={buttonVariants({ size: "md" })}>
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
            key: "withEmployees",
            label: t("summaryWithEmployees"),
            value: formatCount(summary.withEmployees),
            foot: t("summaryWithEmployeesFoot", { employees: summary.employeeTotal }),
            footTitle: t("summaryWithEmployeesFoot", { employees: summary.employeeTotal }),
            href: listHref({ employeeUsage: "withEmployees", page: 1 }),
            current: listState.employeeUsage === "withEmployees",
          },
          {
            key: "withoutEmployees",
            label: t("summaryWithoutEmployees"),
            value: formatCount(summary.withoutEmployees),
            foot: withoutEmployeesFoot,
            footTitle: withoutEmployeesFoot,
            href: listHref({ employeeUsage: "withoutEmployees", page: 1 }),
            current: listState.employeeUsage === "withoutEmployees",
            attention: summary.withoutEmployees > 0,
          },
        ]}
      />

      <FilterPanel>
        {/* Search, three filters, the sort and its order: every sort stays reachable here (code, company and date added
            too), on phones as well. */}
        {/* Keyed on the list's query: a header sort, a card, a chip or the segmented control changes the URL without this
            form, and the uncontrolled selects would otherwise send the old sort and filters with the next search (final
            review). */}
        <form key={departmentReturnHref} role="search" action={basePath} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">
          {listState.pageSize !== 25 ? <input type="hidden" name="pageSize" value={listState.pageSize} /> : null}
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
              // Spec §3: reference filters show names only; แผนกกลาง is the departments with no company.
              ...companies.map((company) => ({ value: company.id, label: company.nameTh })),
              { value: departmentSharedCompanyValue, label: t("sharedDepartment") },
            ]}
          />
          <FilterSelect
            label={t("employeeUsageFilter")}
            name="employeeUsage"
            defaultValue={listState.employeeUsage}
            options={[
              { value: "all", label: tCommon("all") },
              { value: "withEmployees", label: t("withEmployees") },
              { value: "withoutEmployees", label: t("withoutEmployees") },
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
            label={t("list.sortLabel")}
            name="sort"
            defaultValue={listState.sort}
            options={departmentSorts.map((sort) => ({ value: sort, label: sortLabel(sort) }))}
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

      {/* Board MD-Departments: the chips of the filters in use with ล้างตัวกรอง, then the summary line over the whole
          filtered set. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterChipList
          chips={filterChips}
          label={t("activeFilters")}
          removeLabel={t("clearFilter")}
          clearAll={{ href: basePath, label: t("clearFilters") }}
        />
        <p className="num text-meta text-muted-foreground md:ml-auto">
          {t("list.summaryLine", { departments: total, withAssets: departmentsWithAssets, assets: assetTotal, sort: sortLabel(listState.sort) })}
        </p>
      </div>

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
                  range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
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
            <DataTableHead sort={sortBy("company")}>{t("company")}</DataTableHead>
            {/* No count sorts here: Prisma _count counts inactive rows, the columns show active ones (final review). */}
            <DataTableHead align="right">{t("employees")}</DataTableHead>
            <DataTableHead align="right">{t("assets")}</DataTableHead>
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
            rows.map(({ department, drilldown, editHref, reactivate, deactivatedLine, links, deactivate }) => {
              const cells = (
                <>
                <DataTableCell className="min-w-56">
                  <div className={cn("font-semibold", department.isActive ? "text-foreground" : "text-muted-foreground")}>{department.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="tag">{department.code}</span>
                    {deactivatedLine ? ` · ${deactivatedLine}` : null}
                  </div>
                </DataTableCell>
                <DataTableCell className="min-w-48 text-muted-foreground">
                  {department.company ? department.company.nameTh : t("sharedDepartment")}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {canViewEmployees && department._count.employees > 0 ? (
                    <Link
                      href={drilldown.employees}
                      className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                    >
                      {formatCount(department._count.employees)}
                    </Link>
                  ) : (
                    formatCount(department._count.employees)
                  )}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {department._count.assets > 0 ? (
                    <div className="flex flex-col items-end gap-1">
                      {canViewAssets ? (
                        <Link
                          href={drilldown.assets}
                          className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                        >
                          {formatCount(department._count.assets)}
                        </Link>
                      ) : (
                        formatCount(department._count.assets)
                      )}
                      {/* Board: a row that still holds assets says they move first (the guard refuses until then). */}
                      {department.isActive ? <span className="text-xs text-warning">{t("list.moveBeforeDeactivate")}</span> : null}
                    </div>
                  ) : (
                    formatCount(0)
                  )}
                </DataTableCell>
                {showRecordStatus ? (
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={department.isActive ? tCommon("active") : tCommon("inactive")} tone={department.isActive ? "success" : "muted"} />
                    {reactivate ? <MasterDataReactivateButton reactivate={reactivate} /> : null}
                  </DataTableCell>
                ) : null}
                <DataTableCell align="right" sticky="right">
                  <MasterDataRowActions
                    code={department.code}
                    name={department.name}
                    menuLabel={tCommon("moreActionsFor", { code: department.code })}
                    links={links}
                    deactivate={deactivate}
                    reactivate={reactivate}
                  />
                </DataTableCell>
                </>
              )
              // Without department:edit the row is plain: it opens nothing (⋯ has no แก้ไข either).
              return canEdit ? (
                <ClickableTableRow key={department.id} href={editHref} label={`${tCommon("edit")}: ${department.code}`}>
                  {cells}
                </ClickableTableRow>
              ) : (
                <DataTableRow key={department.id}>{cells}</DataTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
