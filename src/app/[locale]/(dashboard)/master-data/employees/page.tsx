import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { EmployeeDeleteButton } from "@/components/master-data/employee-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataPagination,
  MasterDataSearch,
  SortableColumnHeader,
} from "@/components/master-data/master-data-layout"
import { parseMasterDataListParams } from "@/lib/master-data-query"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type EmployeesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string; sort?: string; direction?: string }>
}

const employeeSorts = ["createdAt", "code", "fullNameTh", "company", "branch", "department", "employmentStatus"] as const
type EmployeeSort = (typeof employeeSorts)[number]

export default async function EmployeesPage({ params, searchParams }: EmployeesPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "employee", "view")

  const t = await getTranslations("employee")
  const tCommon = await getTranslations("common")
  const listState = parseMasterDataListParams<EmployeeSort>({
    input: rawSearchParams,
    allowedSorts: employeeSorts,
    defaultSort: "createdAt",
  })
  const searchText = listState.search
  const where: Prisma.EmployeeWhereInput = {
    isActive: true,
    ...(searchText
      ? {
          OR: [
            { code: { contains: searchText } },
            { fullNameTh: { contains: searchText } },
            { fullNameEn: { contains: searchText } },
            { email: { contains: searchText } },
            { position: { contains: searchText } },
            { company: { code: { contains: searchText } } },
            { branch: { code: { contains: searchText } } },
            { department: { name: { contains: searchText } } },
          ],
        }
      : {}),
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        company: { select: { code: true, nameTh: true } },
        branch: { select: { code: true, name: true } },
        department: { select: { code: true, name: true } },
        manager: { select: { code: true, fullNameTh: true } },
      },
      orderBy: buildEmployeeOrderBy(listState.sort, listState.direction),
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.employee.count({ where }),
  ])
  const basePath = `/${locale}/master-data/employees`

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/master-data/employees/new`}
        createLabel={tCommon("create")}
      />

      <MasterDataSearch
        action={`/${locale}/master-data/employees`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ pageSize: listState.pageSize, sort: listState.sort, direction: listState.direction }}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <SortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</SortableColumnHeader>
                <SortableColumnHeader field="fullNameTh" current={listState} basePath={basePath}>{t("fullNameTh")}</SortableColumnHeader>
                <SortableColumnHeader field="company" current={listState} basePath={basePath}>{t("company")}</SortableColumnHeader>
                <SortableColumnHeader field="branch" current={listState} basePath={basePath}>{t("branch")}</SortableColumnHeader>
                <SortableColumnHeader field="department" current={listState} basePath={basePath}>{t("department")}</SortableColumnHeader>
                <SortableColumnHeader field="employmentStatus" current={listState} basePath={basePath}>{t("employmentStatus")}</SortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <ClickableTableRow
                    key={employee.id}
                    href={`/${locale}/master-data/employees/${employee.id}/edit`}
                    label={`${tCommon("edit")}: ${employee.code}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{employee.code}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">
                      <div className="font-medium">{employee.fullNameTh}</div>
                      {employee.email && <div className="text-xs text-muted-foreground">{employee.email}</div>}
                    </td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {employee.company.code} - {employee.company.nameTh}
                    </td>
                    <td className="min-w-40 px-4 py-3 text-muted-foreground">
                      {employee.branch.code} - {employee.branch.name}
                    </td>
                    <td className="min-w-40 px-4 py-3 text-muted-foreground">
                      {employee.department.code} - {employee.department.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {t(`status_${employee.employmentStatus}`)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActiveBadge label={tCommon("active")} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/${locale}/master-data/employees/${employee.id}/edit`}
                          title={tCommon("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <EmployeeDeleteButton id={employee.id} />
                      </div>
                    </td>
                  </ClickableTableRow>
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
      </div>
    </div>
  )
}

function buildEmployeeOrderBy(sort: EmployeeSort, direction: "asc" | "desc"): Prisma.EmployeeOrderByWithRelationInput {
  if (sort === "company") return { company: { code: direction } }
  if (sort === "branch") return { branch: { code: direction } }
  if (sort === "department") return { department: { code: direction } }
  return { [sort]: direction }
}
