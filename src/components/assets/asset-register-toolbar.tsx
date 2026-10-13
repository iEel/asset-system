"use client"

import { SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { AssetRegisterFilterSheet, type AssetRegisterFilterOptions } from "@/components/assets/asset-register-filter-sheet"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { AssetRegisterSearchField } from "@/components/assets/asset-register-search-field"
import { Button } from "@/components/ui/button"
import { FilterSelect } from "@/components/ui/filter-select"
import { getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
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

  return (
    <div
      data-asset-register-toolbar
      className="sticky top-0 z-20 -mx-4 mb-3 bg-canvas px-4 py-2 sm:-mx-6 sm:px-6 md:static md:mx-0 md:px-0 md:py-0"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <AssetRegisterSearchField locale={locale} className="min-w-0 flex-1 basis-56" />
        <div className="hidden md:contents">
          {/* Uncontrolled + key: each select remounts on the optimistic value, so it never bounces back. The label is
              sr-only (a field without a visible label uses hideLabel); the first option names the filter. */}
          <FilterSelect
            label={t("company")}
            hideLabel
            fieldSize="md"
            className="w-44 shrink-0 lg:w-48"
            key={`company-${filters.companyId}`}
            defaultValue={filters.companyId}
            onChange={(event) => navigate(getCompanyChangeOverrides(event.target.value, filters.branchId, options.branches))}
          >
            <option value="">{t("company")}: {tCommon("all")}</option>
            {options.companies.map((company) => (
              <option key={company.id} value={company.id}>{company.code} - {company.nameTh}</option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={t("branch")}
            hideLabel
            fieldSize="md"
            className="w-44 shrink-0 lg:w-48"
            key={`branch-${filters.companyId}-${filters.branchId}`}
            defaultValue={filters.branchId}
            onChange={(event) => navigate({ branchId: event.target.value })}
          >
            <option value="">{t("branch")}: {tCommon("all")}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.company.code} / {branch.code} - {branch.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={t("category")}
            hideLabel
            fieldSize="md"
            className="w-44 shrink-0 lg:w-48"
            key={`category-${filters.categoryId}`}
            defaultValue={filters.categoryId}
            onChange={(event) => navigate({ categoryId: event.target.value })}
          >
            <option value="">{t("category")}: {tCommon("all")}</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.code} - {category.name}</option>
            ))}
          </FilterSelect>
        </div>
        <AssetRegisterFilterSheet
          options={options}
          tabStatusIds={tabStatusIds}
          total={total}
          trigger={
            <Button variant="outline" size="md">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{t("advancedFilters")}</span>
              <FilterCount count={mobileCount} className="md:hidden" />
              <FilterCount count={desktopCount} className="hidden md:inline-flex" />
            </Button>
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
