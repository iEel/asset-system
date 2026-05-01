import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit, Eye } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency } from "@/lib/utils"
import {
  buildAssetOrderBy,
  buildAssetQueryString,
  buildAssetWhere,
  parseAssetListParams,
  type AssetListParams,
} from "@/lib/asset-list-query"
import { AssetDeleteButton } from "@/components/master-data/asset-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"

type AssetsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<AssetListParams>
}

export default async function AssetsPage({ params, searchParams }: AssetsPageProps) {
  const { locale } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("asset")
  const tCommon = await getTranslations("common")
  const filters = parseAssetListParams(rawSearchParams)
  const where = buildAssetWhere(filters)
  const [assets, total, companies, branches, categories, statuses, conditions] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        category: { select: { code: true, name: true } },
        company: { select: { code: true, nameTh: true } },
        branch: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        currentLocation: { select: { code: true, name: true } },
        status: { select: { nameTh: true, colorCode: true } },
        condition: { select: { nameTh: true, colorCode: true } },
      },
      orderBy: buildAssetOrderBy(filters),
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.asset.count({ where }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true },
      orderBy: { code: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, companyId: true },
      orderBy: { code: "asc" },
    }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.assetStatus.findMany({
      where: { isActive: true },
      select: { id: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.assetCondition.findMany({
      where: { isActive: true },
      select: { id: true, nameTh: true },
      orderBy: { sortOrder: "asc" },
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))
  const fromRow = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1
  const toRow = Math.min(total, filters.page * filters.pageSize)

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/assets/new`}
        createLabel={tCommon("create")}
      />

      <AssetFilters
        locale={locale}
        filters={filters}
        companies={companies}
        branches={branches}
        categories={categories}
        statuses={statuses}
        conditions={conditions}
        labels={{
          search: tCommon("search"),
          filter: tCommon("filter"),
          all: tCommon("all"),
          company: t("company"),
          branch: t("branch"),
          category: t("category"),
          status: t("status"),
          condition: t("condition"),
          rowsPerPage: tCommon("rowsPerPage"),
        }}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <SortableHeader locale={locale} filters={filters} field="assetTag" label={t("assetTag")} />
                <SortableHeader locale={locale} filters={filters} field="name" label={t("assetName")} />
                <ColumnHeader>{t("category")}</ColumnHeader>
                <ColumnHeader>{t("company")}</ColumnHeader>
                <ColumnHeader>{t("currentLocation")}</ColumnHeader>
                <ColumnHeader>{t("custodian")}</ColumnHeader>
                <ColumnHeader>{t("status")}</ColumnHeader>
                <ColumnHeader>{t("condition")}</ColumnHeader>
                <SortableHeader locale={locale} filters={filters} field="purchasePrice" label={t("purchasePrice")} />
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{asset.assetTag}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">
                      <div className="font-medium">{asset.name}</div>
                      {asset.serialNumber && <div className="text-xs text-muted-foreground">{asset.serialNumber}</div>}
                    </td>
                    <td className="min-w-40 px-4 py-3 text-muted-foreground">
                      {asset.category.code} - {asset.category.name}
                    </td>
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">
                      {asset.company.code} / {asset.branch.code}
                    </td>
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">
                      {asset.currentLocation.code} - {asset.currentLocation.name}
                    </td>
                    <td className="min-w-44 px-4 py-3 text-muted-foreground">
                      {asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusPill label={asset.status.nameTh} color={asset.status.colorCode} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusPill label={asset.condition.nameTh} color={asset.condition.colorCode} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatCurrency(asset.purchasePrice ? Number(asset.purchasePrice) : null)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/${locale}/assets/${asset.id}`}
                          title={t("detailTitle")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/${locale}/assets/${asset.id}/edit`}
                          title={tCommon("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <AssetDeleteButton id={asset.id} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>
            {fromRow}-{toRow} {tCommon("of")} {total}
          </div>
          <div className="flex items-center gap-2">
            <PaginationLink
              href={`/${locale}/assets?${buildAssetQueryString(filters, { page: Math.max(1, filters.page - 1) })}`}
              disabled={filters.page <= 1}
            >
              {tCommon("previous")}
            </PaginationLink>
            <span className="px-2">
              {tCommon("page")} {filters.page} / {totalPages}
            </span>
            <PaginationLink
              href={`/${locale}/assets?${buildAssetQueryString(filters, { page: Math.min(totalPages, filters.page + 1) })}`}
              disabled={filters.page >= totalPages}
            >
              {tCommon("next")}
            </PaginationLink>
          </div>
        </div>
      </div>
    </div>
  )
}

function AssetFilters({
  locale,
  filters,
  companies,
  branches,
  categories,
  statuses,
  conditions,
  labels,
}: {
  locale: string
  filters: ReturnType<typeof parseAssetListParams>
  companies: { id: string; code: string; nameTh: string }[]
  branches: { id: string; code: string; name: string; companyId: string }[]
  categories: { id: string; code: string; name: string }[]
  statuses: { id: string; nameTh: string }[]
  conditions: { id: string; nameTh: string }[]
  labels: Record<string, string>
}) {
  const filteredBranches = filters.companyId
    ? branches.filter((branch) => branch.companyId === filters.companyId)
    : branches

  return (
    <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <form className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6" action={`/${locale}/assets`}>
        <label className="md:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{labels.search}</span>
          <input
            type="search"
            name="search"
            defaultValue={filters.search}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <FilterSelect name="companyId" label={labels.company} defaultValue={filters.companyId}>
          <option value="">{labels.all}</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.code} - {company.nameTh}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="branchId" label={labels.branch} defaultValue={filters.branchId}>
          <option value="">{labels.all}</option>
          {filteredBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.code} - {branch.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="categoryId" label={labels.category} defaultValue={filters.categoryId}>
          <option value="">{labels.all}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.code} - {category.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="statusId" label={labels.status} defaultValue={filters.statusId}>
          <option value="">{labels.all}</option>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.nameTh}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="conditionId" label={labels.condition} defaultValue={filters.conditionId}>
          <option value="">{labels.all}</option>
          {conditions.map((condition) => (
            <option key={condition.id} value={condition.id}>
              {condition.nameTh}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="pageSize" label={labels.rowsPerPage} defaultValue={String(filters.pageSize)}>
          {[10, 25, 50, 100].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize}
            </option>
          ))}
        </FilterSelect>
        <input type="hidden" name="sort" value={filters.sort} />
        <input type="hidden" name="direction" value={filters.direction} />
        <button
          type="submit"
          className="h-10 self-end rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          {labels.filter}
        </button>
      </form>
    </div>
  )
}

function FilterSelect({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string
  label: string
  defaultValue: string
  children: React.ReactNode
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {children}
      </select>
    </label>
  )
}

function SortableHeader({
  locale,
  filters,
  field,
  label,
}: {
  locale: string
  filters: ReturnType<typeof parseAssetListParams>
  field: string
  label: string
}) {
  const direction = filters.sort === field && filters.direction === "asc" ? "desc" : "asc"
  const suffix = filters.sort === field ? (filters.direction === "asc" ? " ↑" : " ↓") : ""
  return (
    <ColumnHeader>
      <Link
        href={`/${locale}/assets?${buildAssetQueryString(filters, { sort: field, direction, page: 1 })}`}
        className="hover:text-primary"
      >
        {label}
        {suffix}
      </Link>
    </ColumnHeader>
  )
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center rounded-md border border-border px-3 text-muted-foreground opacity-50">
        {children}
      </span>
    )
  }

  return (
    <Link href={href} className="inline-flex h-9 items-center rounded-md border border-border px-3 hover:bg-accent">
      {children}
    </Link>
  )
}

function StatusPill({ label, color }: { label: string; color?: string | null }) {
  if (!color) return <ActiveBadge label={label} />

  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {label}
    </span>
  )
}
