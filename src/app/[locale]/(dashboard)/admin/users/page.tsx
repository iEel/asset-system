import { getTranslations } from "next-intl/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataPagination,
  MasterDataSearch,
  SortableColumnHeader,
} from "@/components/master-data/master-data-layout"
import { formatDateTime } from "@/lib/utils"
import { parseMasterDataListParams } from "@/lib/master-data-query"

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <MasterDataSearch
        action={basePath}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ pageSize: listState.pageSize, sort: listState.sort, direction: listState.direction }}
      />

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <SortableColumnHeader field="username" current={listState} basePath={basePath}>{t("username")}</SortableColumnHeader>
                <SortableColumnHeader field="displayName" current={listState} basePath={basePath}>{t("displayName")}</SortableColumnHeader>
                <SortableColumnHeader field="email" current={listState} basePath={basePath}>{t("email")}</SortableColumnHeader>
                <ColumnHeader>{t("employee")}</ColumnHeader>
                <ColumnHeader>{t("roles")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <SortableColumnHeader field="lastLoginAt" current={listState} basePath={basePath}>{t("lastLoginAt")}</SortableColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{user.username}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{user.displayName}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">{user.email ?? "-"}</td>
                    <td className="min-w-52 px-4 py-3 text-muted-foreground">
                      {user.employee ? `${user.employee.code} - ${user.employee.fullNameTh}` : "-"}
                    </td>
                    <td className="min-w-72 px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {user.userRoles.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          user.userRoles.map((userRole) => (
                            <span key={userRole.role.name} className="inline-flex rounded-full bg-info/10 px-2 py-1 text-xs font-medium text-info">
                              {userRole.role.displayNameTh || userRole.role.displayName}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {user.isActive ? (
                        <ActiveBadge label={tCommon("active")} />
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {tCommon("inactive")}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(user.lastLoginAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <MasterDataPagination
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
      </section>
    </div>
  )
}
