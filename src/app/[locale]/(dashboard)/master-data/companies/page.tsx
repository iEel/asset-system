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
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { formatDeactivatedAt, readDeactivatedAt, readRecordStatusCounts, recordStatusCountWheres } from "@/lib/master-data-list-ui"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  buildCompanyDrilldownHrefs,
  buildCompanyOrderBy,
  buildCompanyQueryString,
  buildCompanySummary,
  buildCompanyWhere,
  companySorts,
  getCompanyDeleteBlockReason,
  parseCompanyListParams,
  type CompanyListParams,
  type CompanyListState,
  type CompanySort,
} from "@/lib/organization-master-query"

type CompaniesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<CompanyListParams>
}

// Board MD-Companies (group 8 plan 1 Task 2, spec §3–§4): the shared list pattern. Name first with the code and English
// name under it, the record-status segmented control with counts, the status column only under ทั้งหมด, the row opens
// the edit page and ⋯ holds แก้ไข, เพิ่มสาขาให้บริษัทนี้ and ปิดใช้งาน / เปิดใช้งาน.
export default async function CompaniesPage({ params, searchParams }: CompaniesPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "company", "view")
  // Spec §3: ปิดใช้งาน needs company:delete (DELETE only deactivates), เปิดใช้งาน company:edit (PATCH isActive true).
  const canDeactivate = hasPermission(user, "company", "delete")
  // Final review: without company:edit no แก้ไข in ⋯ and the row is a plain row (it opens nothing); no เพิ่มบริษัท
  // without company:create; a count links to its list only with that module's view permission, else a plain number.
  const canEdit = hasPermission(user, "company", "edit")
  const canCreate = hasPermission(user, "company", "create")
  const canViewBranches = hasPermission(user, "branch", "view")
  const canViewAssets = hasPermission(user, "asset", "view")
  // เพิ่มสาขาให้บริษัทนี้ opens the branch form, which needs branch:create.
  const canCreateBranch = hasPermission(user, "branch", "create")

  const t = await getTranslations("company")
  const tCommon = await getTranslations("common")
  const listState = parseCompanyListParams(rawSearchParams)
  const where = buildCompanyWhere(listState)

  const [companies, total, summaryCompanies, recordStatusCounts] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        // The counts the DELETE route reads, for the ปิดใช้งาน reason (getCompanyDeleteBlockReason).
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
            employees: { where: { isActive: true } },
            assets: { where: { isActive: true } },
          },
        },
      },
    }),
    // ใช้งาน {n} / ไม่ใช้งาน {n} / ทั้งหมด {n}, the list's other filters kept.
    readRecordStatusCounts(prisma.company, recordStatusCountWheres(listState, buildCompanyWhere)),
  ])
  // "· ปิดใช้งานเมื่อ {date}" on the inactive rows (G8P1-R2).
  const deactivatedAt = await readDeactivatedAt(
    prisma,
    "company",
    companies.filter((company) => !company.isActive).map((company) => company.id)
  )
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
  // The record status is the segmented control now, not a form field; the clear link still resets it. The sort is not a
  // filter (as on the employee list).
  const hasActiveFilters = listState.status !== "active" || Boolean(listState.search || listState.assetUsage !== "all" || listState.branchUsage !== "all")
  // Spec §3: the status column shows only under ทั้งหมด.
  const showRecordStatus = listState.status === "all"
  const columnCount = showRecordStatus ? 8 : 7
  const sortBy = (field: CompanySort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })
  const sortLabel = (sort: CompanySort) => {
    if (sort === "createdAt") return t("list.sortCreatedAt")
    if (sort === "nameTh") return t("list.name")
    if (sort === "assetTagCode") return t("list.assetTagCode")
    return t(sort)
  }
  const deactivateClearItems = (["branches", "departments", "employees", "assets", "auditRounds"] as const).map((key) => t(`deactivate.clear.${key}`))

  const rows = companies.map((company) => {
    const drilldown = buildCompanyDrilldownHrefs({ locale, companyId: company.id })
    const editHref = appendMasterDataReturnTo(`/${locale}/master-data/companies/${company.id}/edit`, companyReturnHref)
    const endpoint = `/api/companies/${company.id}`
    const at = company.isActive ? null : deactivatedAt.get(company.id)
    // PATCH /api/companies/[id] with { isActive: true } only (final review: no snapshot of the record goes back).
    const reactivate: MasterDataReactivate | null =
      canEdit && !company.isActive
        ? {
            endpoint,
            labels: {
              action: t("reactivate.action"),
              confirmTitle: t("reactivate.confirmTitle", { name: company.nameTh }),
              confirmBody: t("reactivate.confirmBody"),
              success: t("reactivate.success"),
            },
          }
        : null
    return {
      company,
      drilldown,
      editHref,
      reactivate,
      deactivatedLine: company.isActive ? null : tCommon("recordStatus.deactivatedAt", { date: at ? formatDeactivatedAt(at, locale) : "–" }),
      links: [
        ...(canEdit ? [{ key: "edit", label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }] : []),
        ...(canCreateBranch && company.isActive
          ? [
              {
                key: "add-branch",
                label: t("list.addBranch"),
                href: appendMasterDataReturnTo(`/${locale}/master-data/branches/new?companyId=${encodeURIComponent(company.id)}`, companyReturnHref),
                icon: <Plus aria-hidden="true" />,
              },
            ]
          : []),
      ],
      deactivate:
        canDeactivate && company.isActive
          ? {
              endpoint,
              blocked: getCompanyDeleteBlockReason(company._count),
              labels: {
                action: t("deactivate.action"),
                hint: t("deactivate.hint"),
                confirmTitle: t("deactivate.confirmTitle", { name: company.nameTh }),
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
            <Link href={appendMasterDataReturnTo(`/${locale}/master-data/companies/new`, companyReturnHref)} className={buttonVariants({ size: "md" })}>
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
            foot: t("summaryTotalFoot", { branches: summary.branchTotal, employees: summary.employeeTotal, assets: summary.assetTotal }),
            footTitle: t("summaryTotalFoot", { branches: summary.branchTotal, employees: summary.employeeTotal, assets: summary.assetTotal }),
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
        {/* Search, two filters, the sort and its order: every sort stays reachable here (code and date added too, which
            no header carries any more), on phones as well. */}
        {/* Keyed on the list's query: a header sort, a card or the segmented control changes the URL without this form, and
            the uncontrolled selects would otherwise send the old sort and filters with the next search (final review). */}
        <form key={companyReturnHref} role="search" action={basePath} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          {/* The record status is the segmented control below (spec §3); a search keeps it. */}
          {listState.status !== "active" ? <input type="hidden" name="status" value={listState.status} /> : null}
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
          <FilterSelect
            label={t("list.sortLabel")}
            name="sort"
            defaultValue={listState.sort}
            options={companySorts.map((sort) => ({ value: sort, label: sortLabel(sort) }))}
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
                  range: `${tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) })} · ${tCommon("recordStatus.footerCounts", { active: recordStatusCounts.active, inactive: recordStatusCounts.inactive })}`,
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
            <DataTableHead sort={sortBy("nameTh")}>{t("list.name")}</DataTableHead>
            <DataTableHead sort={sortBy("assetTagCode")}>{t("list.assetTagCode")}</DataTableHead>
            <DataTableHead>{t("taxId")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("branches")}>{t("branches")}</DataTableHead>
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
            rows.map(({ company, drilldown, editHref, reactivate, deactivatedLine, links, deactivate }) => {
              const cells = (
                <>
                <DataTableCell className="min-w-56">
                  <div className={cn("font-semibold", company.isActive ? "text-foreground" : "text-muted-foreground")}>{company.nameTh}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="tag">{company.code}</span>
                    {" · "}
                    {deactivatedLine ?? company.nameEn ?? t("list.noNameEn")}
                  </div>
                </DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">
                  <span className="tag">{company.assetTagCode || company.code}</span>
                  {company.assetTagCode ? null : <span className="block text-xs">{t("list.assetTagCodeFallback")}</span>}
                </DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">
                  {company.taxId ? <span className="tag">{company.taxId}</span> : <span className="text-faint-foreground">{t("list.taxIdMissing")}</span>}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {canViewBranches && company._count.branches > 0 ? (
                    <Link
                      href={drilldown.branches}
                      className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                    >
                      {formatCount(company._count.branches)}
                    </Link>
                  ) : company._count.branches === 0 && company.isActive ? (
                    <StatusBadge label={t("withoutBranches")} tone="warning" />
                  ) : (
                    formatCount(company._count.branches)
                  )}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatCount(company._count.employees)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {canViewAssets && company._count.assets > 0 ? (
                    <Link
                      href={drilldown.assets}
                      className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}
                    >
                      {formatCount(company._count.assets)}
                    </Link>
                  ) : (
                    formatCount(company._count.assets)
                  )}
                </DataTableCell>
                {showRecordStatus ? (
                  <DataTableCell className="whitespace-nowrap">
                    <StatusBadge label={company.isActive ? tCommon("active") : tCommon("inactive")} tone={company.isActive ? "success" : "muted"} />
                    {reactivate ? <MasterDataReactivateButton reactivate={reactivate} /> : null}
                  </DataTableCell>
                ) : null}
                <DataTableCell align="right" sticky="right">
                  <MasterDataRowActions
                    code={company.code}
                    name={company.nameTh}
                    menuLabel={tCommon("moreActionsFor", { code: company.code })}
                    links={links}
                    deactivate={deactivate}
                    reactivate={reactivate}
                  />
                </DataTableCell>
                </>
              )
              // Without company:edit the row is plain: it opens nothing (⋯ has no แก้ไข either).
              return canEdit ? (
                <ClickableTableRow key={company.id} href={editHref} label={`${tCommon("edit")}: ${company.code}`}>
                  {cells}
                </ClickableTableRow>
              ) : (
                <DataTableRow key={company.id}>{cells}</DataTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
