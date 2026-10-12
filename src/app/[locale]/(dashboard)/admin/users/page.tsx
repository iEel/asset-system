import Link from "next/link"
import { redirect } from "next/navigation"
import { Pencil, Plus } from "lucide-react"
import { getTranslations } from "next-intl/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  ActiveBadge,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { formatDateTime } from "@/lib/utils"
import { buildMasterDataQueryString, paginationRange, parseMasterDataListParams, type MasterDataListState } from "@/lib/master-data-query"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type UsersPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string; sort?: string; direction?: string }>
}

const userSorts = ["createdAt", "username", "displayName", "email", "lastLoginAt"] as const
type UserSort = (typeof userSorts)[number]

export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "user", "view")

  const t = await getTranslations("adminUsersPage")
  const tCommon = await getTranslations("common")
  const listState = parseMasterDataListParams<UserSort>({
    input: rawSearchParams,
    allowedSorts: userSorts,
    defaultSort: "createdAt",
  })
  const searchText = listState.search
  const where: Prisma.UserWhereInput = {
    ...(searchText
      ? {
          OR: [
            { username: { contains: searchText } },
            { displayName: { contains: searchText } },
            { email: { contains: searchText } },
            { userRoles: { some: { role: { displayName: { contains: searchText } } } } },
            { userRoles: { some: { role: { displayNameTh: { contains: searchText } } } } },
            { userRoles: { some: { role: { name: { contains: searchText } } } } },
          ],
        }
      : {}),
  }
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        employee: { select: { code: true, fullNameTh: true } },
        userRoles: {
          include: {
            role: { select: { name: true, displayName: true, displayNameTh: true } },
          },
          orderBy: { role: { name: "asc" } },
        },
      },
      orderBy: { [listState.sort]: listState.direction },
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.user.count({ where }),
  ])
  const basePath = `/${locale}/admin/users`
  const listHref = (next: Partial<MasterDataListState<UserSort>>) => `${basePath}?${buildMasterDataQueryString(listState, next)}`
  // A page past the last one (an old link, or a search that now finds fewer users) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (users.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)

  const sortBy = (field: UserSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <MasterDataSearch
        action={basePath}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ pageSize: listState.pageSize, sort: listState.sort, direction: listState.direction }}
      />

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
            <DataTableHead sort={sortBy("username")}>{t("username")}</DataTableHead>
            <DataTableHead sort={sortBy("displayName")}>{t("displayName")}</DataTableHead>
            <DataTableHead sort={sortBy("email")}>{t("email")}</DataTableHead>
            <DataTableHead>{t("employee")}</DataTableHead>
            <DataTableHead>{t("roles")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead sort={sortBy("lastLoginAt")}>{t("lastLoginAt")}</DataTableHead>
            <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {users.length === 0 ? (
            <TableEmptyRow colSpan={8}>{tCommon("noData")}</TableEmptyRow>
          ) : (
            users.map((user) => {
              const editHref = `${basePath}/${user.id}/edit`
              return (
                <ClickableTableRow
                  key={user.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${user.username}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{user.username}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-foreground">{user.displayName}</DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">{orNil(user.email)}</DataTableCell>
                  <DataTableCell className="min-w-52 text-muted-foreground">
                    {user.employee ? (
                      <>
                        <span className="tag">{user.employee.code}</span> - {user.employee.fullNameTh}
                      </>
                    ) : (
                      <Nil />
                    )}
                  </DataTableCell>
                  <DataTableCell className="min-w-72">
                    <div className="flex flex-wrap gap-1.5">
                      {user.userRoles.length === 0 ? (
                        <Nil />
                      ) : (
                        user.userRoles.map((userRole) => (
                          <span key={userRole.role.name} className="inline-flex rounded-full bg-info-soft px-2 py-1 text-xs font-medium text-info">
                            {userRole.role.displayNameTh || userRole.role.displayName}
                          </span>
                        ))
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    {user.isActive ? (
                      <ActiveBadge label={tCommon("active")} />
                    ) : (
                      <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        {tCommon("inactive")}
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : <Nil />}
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
                      code={user.username}
                      name={user.displayName}
                      menuLabel={tCommon("moreActionsFor", { code: user.username })}
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

      <Link
        href={`${basePath}/new`}
        className="fixed bottom-6 right-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-primary-hover"
      >
        <Plus className="h-4 w-4" />
        {t("createTitle")}
      </Link>
    </div>
  )
}
