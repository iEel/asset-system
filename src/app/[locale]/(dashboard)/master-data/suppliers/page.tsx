import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { SupplierDeleteButton } from "@/components/master-data/supplier-delete-button"
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

type SuppliersPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string; sort?: string; direction?: string }>
}

const supplierSorts = ["createdAt", "code", "name", "contactPerson", "phone", "email"] as const
type SupplierSort = (typeof supplierSorts)[number]

export default async function SuppliersPage({ params, searchParams }: SuppliersPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "supplier", "view")

  const t = await getTranslations("supplier")
  const tCommon = await getTranslations("common")
  const listState = parseMasterDataListParams<SupplierSort>({
    input: rawSearchParams,
    allowedSorts: supplierSorts,
    defaultSort: "createdAt",
  })
  const searchText = listState.search
  const where: Prisma.SupplierWhereInput = {
    isActive: true,
    ...(searchText
      ? {
          OR: [
            { code: { contains: searchText } },
            { name: { contains: searchText } },
            { contactPerson: { contains: searchText } },
            { phone: { contains: searchText } },
            { email: { contains: searchText } },
          ],
        }
      : {}),
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
      },
      orderBy: { [listState.sort]: listState.direction },
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.supplier.count({ where }),
  ])
  const basePath = `/${locale}/master-data/suppliers`

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/master-data/suppliers/new`}
        createLabel={tCommon("create")}
      />

      <MasterDataSearch
        action={`/${locale}/master-data/suppliers`}
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
                <SortableColumnHeader field="name" current={listState} basePath={basePath}>{t("name")}</SortableColumnHeader>
                <SortableColumnHeader field="contactPerson" current={listState} basePath={basePath}>{t("contactPerson")}</SortableColumnHeader>
                <SortableColumnHeader field="phone" current={listState} basePath={basePath}>{t("phone")}</SortableColumnHeader>
                <SortableColumnHeader field="email" current={listState} basePath={basePath}>{t("email")}</SortableColumnHeader>
                <ColumnHeader>{t("assets")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <ClickableTableRow
                    key={supplier.id}
                    href={`/${locale}/master-data/suppliers/${supplier.id}/edit`}
                    label={`${tCommon("edit")}: ${supplier.code}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{supplier.code}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{supplier.name}</td>
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">
                      {supplier.contactPerson || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier.phone || "-"}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">{supplier.email || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier._count.assets}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActiveBadge label={tCommon("active")} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/${locale}/master-data/suppliers/${supplier.id}/edit`}
                          title={tCommon("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <SupplierDeleteButton id={supplier.id} />
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
