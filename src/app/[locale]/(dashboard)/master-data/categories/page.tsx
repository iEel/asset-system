import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { CategoryDeleteButton } from "@/components/master-data/category-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"

type CategoriesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string }>
}

export default async function CategoriesPage({ params, searchParams }: CategoriesPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "category", "view")

  const t = await getTranslations("category")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()

  const categories = await prisma.assetCategory.findMany({
    where: {
      isActive: true,
      ...(searchText
        ? {
            OR: [
              { code: { contains: searchText } },
              { name: { contains: searchText } },
              { description: { contains: searchText } },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: {
          models: true,
          assets: true,
          customFieldDefs: true,
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
        createHref={`/${locale}/master-data/categories/new`}
        createLabel={tCommon("create")}
      />

      <MasterDataSearch
        action={`/${locale}/master-data/categories`}
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
                <ColumnHeader>{t("description")}</ColumnHeader>
                <ColumnHeader>{t("models")}</ColumnHeader>
                <ColumnHeader>{t("assets")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{category.code}</td>
                    <td className="min-w-48 px-4 py-3 text-foreground">{category.name}</td>
                    <td className="min-w-64 px-4 py-3 text-muted-foreground">
                      {category.description || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {category._count.models}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {category._count.assets}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActiveBadge label={tCommon("active")} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/${locale}/master-data/categories/${category.id}/edit`}
                          title={tCommon("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <CategoryDeleteButton id={category.id} />
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
