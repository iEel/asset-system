import Link from "next/link"
import { redirect } from "next/navigation"
import { Pencil, Plus } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { UserListCards } from "@/components/admin/users/user-list-cards"
import { UserReviewWarning } from "@/components/admin/users/user-review-warning"
import { UserRoleFilterChip } from "@/components/admin/users/user-role-filter-chip"
import { UserRolesCell } from "@/components/admin/users/user-roles-cell"
import { UserStatusChips } from "@/components/admin/users/user-status-chips"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { buildUserListQuery, parseUserListFilters, type UserStatusFilter } from "@/lib/admin-users-list"
import { loadUsersPageData, userSorts, type UserSort } from "@/lib/admin-users-page-data"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { cn, formatDateTime } from "@/lib/utils"
import { paginationRange, parseMasterDataListParams, type MasterDataListState } from "@/lib/master-data-query"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type UsersPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string; sort?: string; direction?: string; status?: string; role?: string }>
}

// Page group 11 plan 1 (spec §4, board US-Users): the warning, the status chips with counts, the role chip and the
// search, then ผู้ใช้ / พนักงานที่ผูก / บทบาท / สถานะ / เข้าสู่ระบบล่าสุด. Every older feature is kept (spec §9).
export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  // Named currentUser: the rows below call each listed account `row`.
  const currentUser = await requirePagePermission(locale, "user", "view")
  const canCreate = hasPermission(currentUser, "user", "create")
  const canViewAssets = hasPermission(currentUser, "asset", "view")

  const t = await getTranslations("adminUsersPage")
  const tCommon = await getTranslations("common")
  const listState = parseMasterDataListParams<UserSort>({
    input: rawSearchParams,
    allowedSorts: userSorts,
    defaultSort: "createdAt",
  })
  const { rows, total, grandTotal, statusCounts, reviewTotal, roleOptions, filters } = await loadUsersPageData({
    listState,
    filters: parseUserListFilters(rawSearchParams),
    viewerId: currentUser.id,
  })
  const basePath = `/${locale}/admin/users`
  const listHref = (next: Partial<MasterDataListState<UserSort>> & { status?: UserStatusFilter } = {}) =>
    `${basePath}?${buildUserListQuery(listState, filters, next)}`
  // A page past the last one (an old link, or a search that now finds fewer users) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (rows.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)

  const sortBy = (field: UserSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  // One Pagination for the table's footer and under the phone cards.
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
          range: t("listRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
          pageSizeGroup: tCommon("pageSizeLabel"),
          rowsPerPage: tCommon("rowsPerPage"),
        }}
      />
    ) : undefined
  const searchForm = (
    <MasterDataSearch
      action={basePath}
      defaultValue={listState.search}
      placeholder={t("searchPlaceholder")}
      submitLabel={tCommon("search")}
      hiddenInputs={{
        pageSize: listState.pageSize,
        sort: listState.sort,
        direction: listState.direction,
        ...(filters.status !== "all" ? { status: filters.status } : {}),
        ...(filters.roleId ? { role: filters.roleId } : {}),
      }}
    />
  )
  const statusChips = (className?: string) => (
    <UserStatusChips value={filters.status} counts={statusCounts} hrefFor={(status) => listHref({ status, page: 1 })} className={className} />
  )
  const roleChip = (className?: string) => (
    <UserRoleFilterChip
      basePath={basePath}
      state={listState}
      filters={filters}
      options={roleOptions}
      labels={{ label: t("roleFilter"), all: t("roleFilterAll"), search: t("roleFilterSearch"), empty: t("roleFilterEmpty") }}
      className={className}
    />
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canCreate ? (
            <Link href={`${basePath}/new`} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("createTitle")}
            </Link>
          ) : undefined
        }
      />

      <UserReviewWarning count={reviewTotal} basePath={basePath} state={listState} filters={filters} className="hidden md:grid" />

      {/* Board US-Users-Phone, below md: the search (44px, 16px text), one sideways-scrolling row with the role chip
          and the status chips (44px each), the warning as one tappable line, พบ n จาก N บัญชี, the cards and the
          pagination. The row scrolls inside itself, so the page never scrolls sideways at 390. */}
      <div data-slot="user-list-phone" className="min-w-0 space-y-3 md:hidden">
        <div className="[&>form]:mb-0">{searchForm}</div>
        <div role="group" aria-label={t("filtersLabel")} className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]">
          {roleChip("shrink-0")}
          {statusChips("shrink-0 [&>ul]:flex-nowrap")}
        </div>
        <UserReviewWarning count={reviewTotal} basePath={basePath} state={listState} filters={filters} variant="short" />
        <p className="num text-meta text-muted-foreground">{t("foundCount", { shown: total, total: formatCount(grandTotal) })}</p>
        <UserListCards rows={rows} basePath={basePath} />
        {pagination}
      </div>

      {/* Desktop: the toolbar and the table (board US-Users). */}
      <div className="hidden space-y-4 md:block">
        {/* Board US-Users: the status chips and the role chip on the left, the search on the right. The form's own
            bottom margin is dropped here: the row's gap spaces it. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {statusChips()}
          {roleChip()}
          <div className="min-w-72 flex-1 lg:ml-auto lg:max-w-md [&>form]:mb-0">{searchForm}</div>
        </div>

        <DataTable
          caption={t("title")}
          scrollHint={tCommon("tableScrollHint")}
          footer={pagination}
        >
          <DataTableHeader>
            <tr>
              {/* Only ผู้ใช้ and เข้าสู่ระบบล่าสุด have header sorts; the other sort values stay valid in the URL. */}
              <DataTableHead sort={sortBy("displayName")}>{t("columnUser")}</DataTableHead>
              <DataTableHead>{t("columnEmployee")}</DataTableHead>
              <DataTableHead>{t("roles")}</DataTableHead>
              <DataTableHead>{tCommon("status")}</DataTableHead>
              <DataTableHead sort={sortBy("lastLoginAt")}>{t("lastLoginAt")}</DataTableHead>
              <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {rows.length === 0 ? (
              <TableEmptyRow colSpan={6}>{tCommon("noData")}</TableEmptyRow>
            ) : (
              rows.map((row) => {
                const editHref = `${basePath}/${row.id}/edit`
                const heldText = row.employee ? t("heldAssets", { count: row.employee.heldAssetCount }) : ""
                return (
                  <ClickableTableRow
                    key={row.id}
                    href={editHref}
                    label={t("editUserLabel", { name: row.displayName })}
                  >
                    <DataTableCell className="min-w-56 max-w-80">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="min-w-0 break-words font-medium text-foreground">{row.displayName}</span>
                        {row.isSelf ? (
                          <span className="inline-flex h-5.5 shrink-0 items-center rounded-control border border-primary-border bg-primary-soft px-1.5 text-meta font-medium text-primary-hover">
                            {t("you")}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 min-w-0 break-words text-meta text-muted-foreground">
                        <span className="tag">{row.username}</span>
                        {row.email ? <> · {row.email}</> : null}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="min-w-48 max-w-72">
                      {row.employee ? (
                        <>
                          <div className="break-words text-foreground">{row.employee.fullNameTh}</div>
                          <div className="mt-0.5 break-words text-meta text-muted-foreground">
                            {[row.employee.code, row.employee.departmentName, row.employee.branchName].join(" · ")}
                          </div>
                          {/* Spec §4.1: a left employee gets the badge and, while they still hold assets, the count. */}
                          {row.employee.hasLeft ? (
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <StatusBadge label={t("employeeLeft")} tone="warning" />
                              {row.employee.heldAssetCount > 0 ? (
                                canViewAssets ? (
                                  <Link href={`/${locale}/assets?custodianId=${row.employee.id}`} className={cn(linkVariants(), "text-meta")}>
                                    {heldText}
                                  </Link>
                                ) : (
                                  <span className="text-meta text-muted-foreground">{heldText}</span>
                                )
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">{t("noEmployeeLinked")}</span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="min-w-44">
                      <UserRolesCell roles={row.roles} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <StatusBadge label={row.isActive ? tCommon("active") : tCommon("inactive")} tone={row.isActive ? "success" : "muted"} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : <span className="text-warning">{t("neverLoggedIn")}</span>}
                    </DataTableCell>
                    <DataTableCell align="right">
                      <RowActions
                        code={row.username}
                        name={row.displayName}
                        menuLabel={tCommon("moreActionsFor", { code: row.username })}
                        next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                        groups={[]}
                      />
                    </DataTableCell>
                  </ClickableTableRow>
                )
              })
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  )
}
