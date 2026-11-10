import Link from "next/link"
import { redirect } from "next/navigation"
import { Download, Pencil, Plus } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount } from "@/lib/display-format"
import { barPercent } from "@/lib/data-bars"
import { buildRoleListQuery, isHighRiskRole, parseRoleListFilters, type RoleListFilters } from "@/lib/admin-roles-list"
import { loadRolesPageData } from "@/lib/admin-roles-page-data"
import { buildUserListQuery, parseUserListFilters } from "@/lib/admin-users-list"
import { userSorts } from "@/lib/admin-users-page-data"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange, parseMasterDataListParams } from "@/lib/master-data-query"
import { cn } from "@/lib/utils"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { RoleInactiveWarning } from "@/components/admin/roles/role-inactive-warning"
import { RoleListCards } from "@/components/admin/roles/role-list-cards"
import { RoleListChips } from "@/components/admin/roles/role-list-chips"
import { statusFillVariants } from "@/components/ui/badge-variants"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"

type RolesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const permissionActions = ["view", "create", "edit", "delete", "export", "approve"] as const
const permissionModules = [
  "dashboard",
  "asset",
  "checkout",
  "checkin",
  "transfer",
  "audit",
  "maintenance",
  "disposal",
  "report",
  "consumable",
  "company",
  "branch",
  "department",
  "employee",
  "location",
  "category",
  "brand",
  "supplier",
  "status",
  "condition",
  "user",
  "role",
  "setting",
  "import",
  "export",
  "log",
] as const

// The user list with its defaults, so a role's link opens exactly /admin/users?role=<id>.
const USER_LIST_DEFAULT_STATE = parseMasterDataListParams({ input: {}, allowedSorts: userSorts, defaultSort: "createdAt" })
const USER_LIST_DEFAULT_FILTERS = parseUserListFilters({})

// Page group 11 plan 3 task 3 (spec §6, board US-Roles): the tabs บทบาท and ตารางสิทธิ์ตามโมดูล; on the roles tab the
// warning, the type and check chips with counts, the search, the table (cards below md), paging and the footnote; on
// the matrix tab today's module × action table and nothing else. The old StatStrip's facts live in the chips and the
// warning. Every older feature is kept (spec §9).
export default async function RolesPage({ params, searchParams }: RolesPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "role", "view")
  const canCreate = hasPermission(user, "role", "create")
  const canExport = hasPermission(user, "role", "export")
  const canViewUsers = hasPermission(user, "user", "view")

  const t = await getTranslations("adminRolesPage")
  const tCommon = await getTranslations("common")

  const filters = parseRoleListFilters(await searchParams)
  const { items, total, counts, inactiveWithUsers, permissionTotal, matrixRoles } = await loadRolesPageData(filters)

  const basePath = `/${locale}/admin/roles`
  const listHref = (next: Partial<RoleListFilters> = {}) => {
    const query = buildRoleListQuery(filters, next)
    return query ? `${basePath}?${query}` : basePath
  }
  const usersHref = (roleId: string) => `/${locale}/admin/users?${buildUserListQuery(USER_LIST_DEFAULT_STATE, USER_LIST_DEFAULT_FILTERS, { roleId })}`

  // A page past the last one (an old link, or a search that now finds fewer roles) shows the last page.
  const lastPage = lastListPage(total, filters.pageSize)
  if (items.length === 0 && total > 0 && filters.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(filters.page, filters.pageSize, total)

  // One Pagination for the table's footer and under the phone cards.
  const pagination =
    total > 0 ? (
      <Pagination
        page={filters.page}
        totalPages={totalPages}
        previousHref={listHref({ page: filters.page - 1 })}
        nextHref={listHref({ page: filters.page + 1 })}
        pageSize={filters.pageSize}
        pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
        labels={{
          navigation: tCommon("pagination"),
          previous: tCommon("previous"),
          next: tCommon("next"),
          pageOf: tCommon("pageOf", { page: filters.page, total: totalPages }),
          range: t("listRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
          pageSizeGroup: tCommon("pageSizeLabel"),
          rowsPerPage: tCommon("rowsPerPage"),
        }}
      />
    ) : undefined
  const searchForm = (
    <MasterDataSearch
      action={basePath}
      defaultValue={filters.search}
      placeholder={t("searchPlaceholder")}
      submitLabel={tCommon("search")}
      hiddenInputs={{
        ...(filters.type !== "all" ? { type: filters.type } : {}),
        ...(filters.check ? { check: filters.check } : {}),
        ...(filters.pageSize !== LIST_PAGE_SIZES[0] ? { pageSize: filters.pageSize } : {}),
      }}
    />
  )
  const matrixPermissions = new Map((matrixRoles ?? []).map((role) => [role.id, new Set(role.permissionKeys)]))

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canExport || canCreate ? (
            <>
              {canExport ? (
                <a href="/api/admin/roles/export" download className={buttonVariants({ variant: "outline", size: "md" })}>
                  <Download aria-hidden="true" />
                  {t("exportAudit")}
                </a>
              ) : null}
              {canCreate ? (
                <Link href={`/${locale}/admin/roles/new`} className={buttonVariants({ size: "md" })}>
                  <Plus aria-hidden="true" />
                  {t("createTitle")}
                </Link>
              ) : null}
            </>
          ) : undefined
        }
      />

      <TabNav
        aria-label={t("viewLabel")}
        current={filters.view}
        items={[
          { key: "roles", label: t("tabRoles"), count: formatCount(counts.all), href: listHref({ view: "roles", page: 1 }) },
          { key: "matrix", label: t("tabMatrix"), href: `${basePath}?${buildRoleListQuery(filters, { view: "matrix", page: 1 })}` },
        ]}
      />

      {filters.view === "matrix" ? (
        <ContentPanel divided flush className="overflow-hidden" title={t("permissionMatrix")} description={t("permissionMatrixSubtitle")}>
          <DataTable framed={false} caption={t("permissionMatrix")} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("module")}</DataTableHead>
                {permissionActions.map((action) => (
                  <DataTableHead key={action}>{t(`actions.${action}`)}</DataTableHead>
                ))}
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {permissionModules.map((moduleName) => (
                <DataTableRow key={moduleName}>
                  <DataTableCell className="whitespace-nowrap">
                    <div className="font-medium text-foreground">{t(`modules.${moduleName}`)}</div>
                    <div className="mt-1 text-xs text-muted-foreground"><span className="tag">{moduleName}</span></div>
                  </DataTableCell>
                  {permissionActions.map((action) => {
                    const permissionKey = `${moduleName}:${action}`
                    const assignedRoles = (matrixRoles ?? []).filter((role) => matrixPermissions.get(role.id)?.has(permissionKey))

                    return (
                      <DataTableCell key={permissionKey} className="min-w-44">
                        {assignedRoles.length === 0 ? (
                          <Nil />
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {assignedRoles.map((role) => (
                              <Chip key={role.id} title={role.displayName}>
                                {role.label}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </DataTableCell>
                    )
                  })}
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </ContentPanel>
      ) : (
        <>
          <RoleInactiveWarning roles={inactiveWithUsers} usersHref={usersHref} canViewUsers={canViewUsers} />

          {/* Phone (spec §6, my call; the user list's phone pattern): the search, one sideways-scrolling row with the
              chips (44px each), the cards and the pagination. The row scrolls inside itself, so the page never scrolls
              sideways at 390. */}
          <div data-slot="role-list-phone" className="min-w-0 space-y-3 md:hidden">
            <div className="[&>form]:mb-0">{searchForm}</div>
            <RoleListChips
              type={filters.type}
              check={filters.check}
              counts={counts}
              hrefFor={listHref}
              className="flex-nowrap overflow-x-auto py-1 [scrollbar-width:none] [&_ul]:flex-nowrap [&>nav]:flex-nowrap [&>*]:shrink-0"
            />
            <RoleListCards roles={items} basePath={basePath} permissionTotal={permissionTotal} />
            {pagination}
          </div>

          <div className="hidden space-y-3 md:block">
            {/* Board US-Roles: the type chips and the check chips on the left, the search on the right. The form never
                wraps from md, so its button stays beside the input; when the chips leave no room, the whole search
                group moves to its own line, right. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <RoleListChips type={filters.type} check={filters.check} counts={counts} hrefFor={listHref} />
              <div className="ml-auto w-full max-w-md md:[&>form]:flex-nowrap [&>form]:mb-0">{searchForm}</div>
            </div>

            <DataTable caption={t("roleSummary")} scrollHint={tCommon("tableScrollHint")} footer={pagination}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("role")}</DataTableHead>
                  {/* Below xl รายละเอียด hides and moves under the key, so 1024 needs no sideways scroll. */}
                  <DataTableHead className="hidden xl:table-cell">{t("description")}</DataTableHead>
                  <DataTableHead align="right">{t("users")}</DataTableHead>
                  <DataTableHead>{t("permissions")}</DataTableHead>
                  <DataTableHead>{t("type")}</DataTableHead>
                  <DataTableHead>{tCommon("status")}</DataTableHead>
                  <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {items.length === 0 ? (
                  <TableEmptyRow colSpan={7}>{tCommon("noData")}</TableEmptyRow>
                ) : (
                  items.map((role) => {
                    const editHref = `${basePath}/${role.id}/edit`
                    const permissionCount = role.permissionKeys.length
                    return (
                      <ClickableTableRow key={role.id} href={editHref} label={`${tCommon("edit")}: ${role.label}`}>
                        {/* Below xl the table must fit 718px (1024 with the sidebar, and 768–1023): a small minimum here, the
                            key may break, the สิทธิ์สูง badge wraps under the count, สถานะ may wrap, and แก้ไข is pinned. */}
                        <DataTableCell className="min-w-32 max-w-80">
                          <div className="break-words font-medium text-foreground">{role.label}</div>
                          <div className="mt-0.5 text-meta text-muted-foreground"><span className="tag max-xl:whitespace-normal max-xl:break-all">{role.name}</span></div>
                          {role.description ? (
                            <div className="mt-1 line-clamp-2 break-words text-meta text-muted-foreground xl:hidden">{role.description}</div>
                          ) : null}
                        </DataTableCell>
                        <DataTableCell className="hidden min-w-56 max-w-96 text-muted-foreground xl:table-cell">{orNil(role.description)}</DataTableCell>
                        <DataTableCell numeric className="whitespace-nowrap">
                          {role.userCount === 0 ? (
                            <span className="text-muted-foreground">{t("noUsers")}</span>
                          ) : canViewUsers ? (
                            <Link href={usersHref(role.id)} className={cn(linkVariants(), "font-semibold")}>
                              {formatCount(role.userCount)}
                            </Link>
                          ) : (
                            <span className="font-semibold text-foreground">{formatCount(role.userCount)}</span>
                          )}
                        </DataTableCell>
                        <DataTableCell>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="num font-semibold whitespace-nowrap text-foreground">{t("permissionsOf", { count: permissionCount, total: permissionTotal })}</span>
                            {isHighRiskRole(role.permissionKeys) ? <StatusBadge label={t("highRiskBadge")} tone="warning" /> : null}
                          </span>
                          {/* A thin data bar; the words beside it carry the numbers. */}
                          <span aria-hidden="true" className="mt-1 block h-1 w-18 rounded-xs bg-muted forced-colors:border forced-colors:border-[CanvasText]">
                            <span
                              className={cn("block h-full rounded-xs", statusFillVariants({ tone: "primary" }))}
                              style={{ width: `${barPercent(permissionTotal > 0 ? permissionCount / permissionTotal : 0)}%` }}
                            />
                          </span>
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          {/* The kind of role is a name, not a state (R2): the shared Chip, neutral. */}
                          <div className="flex flex-wrap gap-1.5">
                            <Chip>{role.isSystem ? t("systemRole") : t("customRole")}</Chip>
                            {role.name === "system_admin" ? <Chip>{t("protectedRole")}</Chip> : null}
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <StatusBadge label={role.isActive ? tCommon("active") : tCommon("inactive")} tone={role.isActive ? "success" : "muted"} />
                          {!role.isActive && role.userCount > 0 ? (
                            <div className="mt-1 text-meta text-warning">{t("stillHasUsers", { count: role.userCount })}</div>
                          ) : null}
                        </DataTableCell>
                        <DataTableCell align="right" sticky="right">
                          <RowActions
                            code={role.name}
                            name={role.label}
                            menuLabel={tCommon("moreActionsFor", { code: role.name })}
                            next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                            nextWidth="auto"
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

          <p className="text-meta text-muted-foreground">{t("footnote")}</p>
        </>
      )}
    </div>
  )
}
