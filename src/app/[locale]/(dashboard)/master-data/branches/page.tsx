import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BranchDeleteButton } from "@/components/master-data/branch-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"

type BranchesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string }>
}

export default async function BranchesPage({ params, searchParams }: BranchesPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "branch", "view")

  const t = await getTranslations("branch")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()

  const branches = await prisma.branch.findMany({
    where: {
      isActive: true,
      ...(searchText
        ? {
            OR: [
              { code: { contains: searchText } },
              { name: { contains: searchText } },
              { contactPerson: { contains: searchText } },
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
    orderBy: [{ company: { code: "asc" } }, { code: "asc" }],
  })

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/master-data/branches/new`}
        createLabel={tCommon("create")}
      />

      <MasterDataSearch
        action={`/${locale}/master-data/branches`}
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
                <ColumnHeader>{t("contactPerson")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{branch.code}</td>
                    <td className="min-w-48 px-4 py-3 text-foreground">{branch.name}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {branch.company.code} - {branch.company.nameTh}
                    </td>
                    <td className="min-w-40 px-4 py-3 text-muted-foreground">{branch.contactPerson || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActiveBadge label={tCommon("active")} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/${locale}/master-data/branches/${branch.id}/edit`}
                          title={tCommon("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <BranchDeleteButton id={branch.id} />
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
