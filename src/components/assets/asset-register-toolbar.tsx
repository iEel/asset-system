"use client"

import { SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { AssetRegisterFilterSheet, type AssetRegisterFilterOptions } from "@/components/assets/asset-register-filter-sheet"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { AssetRegisterSearchField } from "@/components/assets/asset-register-search-field"
import { getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function AssetRegisterToolbar({
  locale,
  options,
  tabStatusIds,
  total,
}: {
  locale: string
  options: AssetRegisterFilterOptions
  tabStatusIds: string[]
  total: number
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const { filters, navigate } = useAssetRegisterNavigation()
  const desktopCount = getActiveSheetFilterKeys(filters, { includeScope: false, tabStatusIds }).length
  const mobileCount = getActiveSheetFilterKeys(filters, { includeScope: true, tabStatusIds }).length
  const branches = filters.companyId
    ? options.branches.filter((branch) => branch.companyId === filters.companyId)
    : options.branches
  const selectClassName = cn(getFieldControlClasses(), "w-44 shrink-0 truncate lg:w-48")

  return (
    <div
      data-asset-register-toolbar
      className="sticky top-0 z-20 -mx-4 mb-3 bg-background px-4 py-2 sm:-mx-6 sm:px-6 md:static md:mx-0 md:rounded-lg md:border md:border-border md:bg-surface md:p-3 md:shadow-sm"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <AssetRegisterSearchField locale={locale} className="min-w-0 flex-1 basis-56" />
        <div className="hidden md:contents">
          <select
            key={`company-${filters.companyId}`}
            aria-label={t("company")}
            defaultValue={filters.companyId}
            onChange={(event) => navigate(getCompanyChangeOverrides(event.target.value, filters.branchId, options.branches))}
            className={selectClassName}
          >
            <option value="">{t("company")}: {tCommon("all")}</option>
            {options.companies.map((company) => (
              <option key={company.id} value={company.id}>{company.code} - {company.nameTh}</option>
            ))}
          </select>
          <select
            key={`branch-${filters.companyId}-${filters.branchId}`}
            aria-label={t("branch")}
            defaultValue={filters.branchId}
            onChange={(event) => navigate({ branchId: event.target.value })}
            className={selectClassName}
          >
            <option value="">{t("branch")}: {tCommon("all")}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.company.code} / {branch.code} - {branch.name}</option>
            ))}
          </select>
          <select
            key={`category-${filters.categoryId}`}
            aria-label={t("category")}
            defaultValue={filters.categoryId}
            onChange={(event) => navigate({ categoryId: event.target.value })}
            className={selectClassName}
          >
            <option value="">{t("category")}: {tCommon("all")}</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.code} - {category.name}</option>
            ))}
          </select>
        </div>
        <AssetRegisterFilterSheet
          options={options}
          tabStatusIds={tabStatusIds}
          total={total}
          trigger={
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:min-h-0"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{t("advancedFilters")}</span>
              <FilterCount count={mobileCount} className="md:hidden" />
              <FilterCount count={desktopCount} className="hidden md:inline-flex" />
            </button>
          }
        />
      </div>
    </div>
  )
}

function FilterCount({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null
  return (
    <span className={cn("inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground", className)}>
      {count}
    </span>
  )
}
