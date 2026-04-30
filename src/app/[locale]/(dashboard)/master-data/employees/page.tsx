import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { EmployeeDeleteButton } from "@/components/master-data/employee-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"

type EmployeesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string }>
}

export default async function EmployeesPage({ params, searchParams }: EmployeesPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "employee", "view")

  const t = await getTranslations("employee")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()

  const employees = await prisma.employee.findMany({
    where: {
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
    },
    include: {
      company: { select: { code: true, nameTh: true } },
      branch: { select: { code: true, name: true } },
      department: { select: { code: true, name: true } },
      manager: { select: { code: true, fullNameTh: true } },
    },
    orderBy: { createdAt: "desc" },
  })

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
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("code")}</ColumnHeader>
                <ColumnHeader>{t("fullNameTh")}</ColumnHeader>
                <ColumnHeader>{t("company")}</ColumnHeader>
                <ColumnHeader>{t("branch")}</ColumnHeader>
                <ColumnHeader>{t("department")}</ColumnHeader>
                <ColumnHeader>{t("employmentStatus")}</ColumnHeader>
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
                  <tr key={employee.id} className="hover:bg-accent/50">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
