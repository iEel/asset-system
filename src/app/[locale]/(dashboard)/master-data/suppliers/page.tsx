import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { SupplierDeleteButton } from "@/components/master-data/supplier-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"

type SuppliersPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string }>
}

export default async function SuppliersPage({ params, searchParams }: SuppliersPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "supplier", "view")

  const t = await getTranslations("supplier")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()

  const suppliers = await prisma.supplier.findMany({
    where: {
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
    },
    include: {
      _count: {
        select: {
          assets: true,
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
        createHref={`/${locale}/master-data/suppliers/new`}
        createLabel={tCommon("create")}
      />

      <MasterDataSearch
        action={`/${locale}/master-data/suppliers`}
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
                <ColumnHeader>{t("contactPerson")}</ColumnHeader>
                <ColumnHeader>{t("phone")}</ColumnHeader>
                <ColumnHeader>{t("email")}</ColumnHeader>
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
                  <tr key={supplier.id} className="hover:bg-accent/50">
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
