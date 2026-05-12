import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { DepartmentDeleteButton } from "@/components/master-data/department-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type DepartmentsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string }>
}

export default async function DepartmentsPage({ params, searchParams }: DepartmentsPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "department", "view")

  const t = await getTranslations("department")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()

  const departments = await prisma.department.findMany({
    where: {
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
    },
    include: {
      company: {
        select: {
          code: true,
          nameTh: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/master-data/departments/new`}
        createLabel={tCommon("create")}
      />

      <MasterDataSearch
        action={`/${locale}/master-data/departments`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("code")}</ColumnHeader>
                <ColumnHeader>{t("name")}</ColumnHeader>
                <ColumnHeader>{t("company")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <ClickableTableRow
                    key={department.id}
                    href={`/${locale}/master-data/departments/${department.id}/edit`}
                    label={`${tCommon("edit")}: ${department.code}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{department.code}</td>
                    <td className="min-w-48 px-4 py-3 text-foreground">{department.name}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {department.company
                        ? `${department.company.code} - ${department.company.nameTh}`
                        : t("sharedDepartment")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActiveBadge label={tCommon("active")} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/${locale}/master-data/departments/${department.id}/edit`}
                          title={tCommon("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <DepartmentDeleteButton id={department.id} />
                      </div>
                    </td>
                  </ClickableTableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
