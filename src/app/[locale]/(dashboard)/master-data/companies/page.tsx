import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { CompanyDeleteButton } from "@/components/master-data/company-delete-button"
import { requirePagePermission } from "@/lib/page-auth"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"

type CompaniesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string }>
}

export default async function CompaniesPage({ params, searchParams }: CompaniesPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "company", "view")

  const t = await getTranslations("company")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()

  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      ...(searchText
        ? {
            OR: [
              { code: { contains: searchText } },
              { assetTagCode: { contains: searchText } },
              { nameTh: { contains: searchText } },
              { nameEn: { contains: searchText } },
              { taxId: { contains: searchText } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/master-data/companies/new`}
        createLabel={tCommon("create")}
      />

      <MasterDataSearch
        action={`/${locale}/master-data/companies`}
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
                <ColumnHeader>{t("assetTagCode")}</ColumnHeader>
                <ColumnHeader>{t("nameTh")}</ColumnHeader>
                <ColumnHeader>{t("nameEn")}</ColumnHeader>
                <ColumnHeader>{t("taxId")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{company.code}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{company.assetTagCode || company.code}</td>
                    <td className="min-w-48 px-4 py-3 text-foreground">{company.nameTh}</td>
                    <td className="min-w-48 px-4 py-3 text-muted-foreground">{company.nameEn || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{company.taxId || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActiveBadge label={tCommon("active")} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/${locale}/master-data/companies/${company.id}/edit`}
                          title={tCommon("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <CompanyDeleteButton id={company.id} />
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
