import Link from "next/link"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  ActiveBadge,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"

type DepartmentsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string | string[]; pageSize?: string | string[] }>
}

export default async function DepartmentsPage({ params, searchParams }: DepartmentsPageProps) {
  const { locale } = await params
  const { search = "", page, pageSize } = await searchParams
  await requirePagePermission(locale, "department", "view")

  const t = await getTranslations("department")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()
  const listPage = parseListPage({ page, pageSize })
  const basePath = `/${locale}/master-data/departments`
  // The list URL with its search, page and page size; the default page and page size stay out of it (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = appendListPage(new URLSearchParams(searchText ? { search: searchText } : {}), next).toString()
    return query ? `${basePath}?${query}` : basePath
  }
  const departmentReturnHref = listHref(listPage)

  const where: Prisma.DepartmentWhereInput = {
    isActive: true,
    ...(searchText
      ? {
          OR: [
            { code: { contains: searchText } },
            { name: { contains: searchText } },
            { company: { code: { contains: searchText } } },
            { company: { nameTh: { contains: searchText } } },
          ],
        }
      : {}),
  }
  const { skip, take } = listPageWindow(listPage)
  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where,
      include: {
        company: {
          select: {
            code: true,
            nameTh: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.department.count({ where }),
  ])
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (departments.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/departments/new`, departmentReturnHref)} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
      />

      <MasterDataSearch
        action={basePath}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize }))}
      />

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <Pagination
              page={listPage.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listPage.page - 1, pageSize: listPage.pageSize })}
              nextHref={listHref({ page: listPage.page + 1, pageSize: listPage.pageSize })}
              pageSize={listPage.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listPage.page, total: totalPages }),
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
            <DataTableHead>{t("code")}</DataTableHead>
            <DataTableHead>{t("name")}</DataTableHead>
            <DataTableHead>{t("company")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {departments.length === 0 ? (
            <TableEmptyRow colSpan={5}>{tCommon("noData")}</TableEmptyRow>
          ) : (
            departments.map((department) => {
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/departments/${department.id}/edit`, departmentReturnHref)
              return (
                <ClickableTableRow
                  key={department.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${department.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{department.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-48 text-foreground">{department.name}</DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    {department.company ? (
                      <>
                        <span className="tag">{department.company.code}</span> - {department.company.nameTh}
                      </>
                    ) : (
                      t("sharedDepartment")
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <RowActions
                      code={department.code}
                      name={department.name}
                      menuLabel={tCommon("moreActionsFor", { code: department.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[]}
                      deleteAction={{ endpoint: `/api/departments/${department.id}` }}
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
