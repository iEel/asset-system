import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { CategoryDeleteButton } from "@/components/master-data/category-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataPagination,
  MasterDataSearch,
  SortableColumnHeader,
} from "@/components/master-data/master-data-layout"
import { buildCategoryOrderBy, parseCategoryListParams } from "@/lib/category-list-query"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type CategoriesPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string; sort?: string; direction?: string }>
}

export default async function CategoriesPage({ params, searchParams }: CategoriesPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "category", "view")

  const t = await getTranslations("category")
  const tCommon = await getTranslations("common")
  const listState = parseCategoryListParams(rawSearchParams)
  const searchText = listState.search
  const where: Prisma.AssetCategoryWhereInput = {
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
  }

  const [categories, total] = await Promise.all([
    prisma.assetCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            models: true,
            assets: true,
            customFieldDefs: true,
          },
        },
      },
      orderBy: buildCategoryOrderBy(listState),
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.assetCategory.count({ where }),
  ])
  const basePath = `/${locale}/master-data/categories`

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/master-data/categories/new`}
        createLabel={tCommon("create")}
      />

      <MasterDataSearch
        action={basePath}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{
          pageSize: listState.pageSize,
          sort: listState.sort,
          direction: listState.direction,
        }}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <SortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</SortableColumnHeader>
                <SortableColumnHeader field="name" current={listState} basePath={basePath}>{t("name")}</SortableColumnHeader>
                <ColumnHeader>{t("description")}</ColumnHeader>
                <SortableColumnHeader field="models" current={listState} basePath={basePath}>{t("models")}</SortableColumnHeader>
                <SortableColumnHeader field="assets" current={listState} basePath={basePath}>{t("assets")}</SortableColumnHeader>
                <SortableColumnHeader field="customFields" current={listState} basePath={basePath}>{t("customFieldsShort")}</SortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <ClickableTableRow
                    key={category.id}
                    href={`/${locale}/master-data/categories/${category.id}/edit`}
                    label={`${tCommon("edit")}: ${category.code}`}
                  >
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
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {category._count.customFieldDefs}
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
