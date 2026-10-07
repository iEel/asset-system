"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
import type { AssetCrossScopeFilter } from "@/lib/asset-cross-scope-filter"
import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"
import { assetOwnershipTypes } from "@/lib/asset-ownership"
import { buildSheetClearOverrides, getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export type AssetRegisterFilterOptions = {
  companies: { id: string; code: string; nameTh: string }[]
  branches: { id: string; code: string; name: string; companyId: string; company: { code: string } }[]
  categories: { id: string; code: string; name: string }[]
  statuses: { id: string; name: string; nameTh: string }[]
  conditions: { id: string; nameTh: string }[]
}

const dataQualityOptions = [
  ["serial", "dataQualitySerial"],
  ["photo", "dataQualityPhoto"],
  ["purchase", "dataQualityPurchase"],
  ["warranty", "dataQualityWarranty"],
  ["responsibility", "dataQualityResponsibility"],
  ["department", "dataQualityDepartment"],
] as const satisfies ReadonlyArray<readonly [AssetDataQualityFilter, string]>

const crossScopeOptions = [
  ["all", "quickFilterCrossScopeAll"],
  ["custodian_company", "quickFilterCustodianCrossCompany"],
  ["custodian_branch", "quickFilterCustodianCrossBranch"],
  ["location_branch", "quickFilterLocationCrossBranch"],
] as const satisfies ReadonlyArray<readonly [AssetCrossScopeFilter, string]>

export function AssetRegisterFilterSheet({
  trigger,
  options,
  tabStatusIds,
  total,
}: {
  trigger: React.ReactNode
  options: AssetRegisterFilterOptions
  tabStatusIds: string[]
  total: number
}) {
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const { filters, isPending, navigate } = useAssetRegisterNavigation()
  const isDesktop = useMediaQuery("(min-width: 48rem)")
  const [open, setOpen] = useState(false)
  const scope = { includeScope: !isDesktop, tabStatusIds }
  const activeCount = getActiveSheetFilterKeys(filters, scope).length
  const branches = filters.companyId
    ? options.branches.filter((branch) => branch.companyId === filters.companyId)
    : options.branches
  const statusHelp = {
    title: t("statusHelpTitle"),
    description: t("statusHelpDescription"),
    items: [
      t("statusHelpReady"),
      t("statusHelpPendingRepair"),
      t("statusHelpUnderMaintenance"),
      t("statusHelpPendingDisposal"),
      t("statusHelpLostMissing"),
      t("statusHelpUnderInspection"),
    ],
  }
  const conditionHelp = {
    title: t("conditionHelpTitle"),
    description: t("conditionHelpDescription"),
    items: [t("conditionHelpGood"), t("conditionHelpDamaged"), t("conditionHelpNeedsReview"), t("conditionHelpMissing")],
  }
  const resultLabel = isPending
    ? t("filterSheetLoading")
    : total === 0
      ? t("filterSheetNoResults")
      : t("filterSheetShowResults", { count: total.toLocaleString(locale === "th" ? "th-TH" : "en-US") })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        closeLabel={tCommon("close")}
        data-asset-filter-sheet
        className={isDesktop ? "w-full gap-0 sm:max-w-md" : "max-h-[85dvh] gap-0 rounded-t-xl"}
      >
        <SheetHeader className="border-b border-border pr-14">
          <SheetTitle>{t("filterSheetTitle")}</SheetTitle>
          <SheetDescription>{t("advancedFiltersHelp")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {isDesktop ? null : (
            <FilterSection title={t("filterSheetScope")}>
              <LabeledSelect
                label={t("company")}
                value={filters.companyId}
                onChange={(value) => navigate(getCompanyChangeOverrides(value, filters.branchId, options.branches))}
              >
                <option value="">{tCommon("all")}</option>
                {options.companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.code} - {company.nameTh}</option>
                ))}
              </LabeledSelect>
              <LabeledSelect label={t("branch")} value={filters.branchId} onChange={(value) => navigate({ branchId: value })}>
                <option value="">{tCommon("all")}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.company.code} / {branch.code} - {branch.name}</option>
                ))}
              </LabeledSelect>
              <LabeledSelect label={t("category")} value={filters.categoryId} onChange={(value) => navigate({ categoryId: value })}>
                <option value="">{tCommon("all")}</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.code} - {category.name}</option>
                ))}
              </LabeledSelect>
            </FilterSection>
          )}
          <FilterSection title={t("filterSheetState")}>
            <LabeledSelect label={t("status")} help={statusHelp} value={filters.statusId} onChange={(value) => navigate({ statusId: value })}>
              <option value="">{tCommon("all")}</option>
              {options.statuses.map((status) => (
                <option key={status.id} value={status.id}>{status.nameTh}</option>
              ))}
            </LabeledSelect>
            <LabeledSelect label={t("condition")} help={conditionHelp} value={filters.conditionId} onChange={(value) => navigate({ conditionId: value })}>
              <option value="">{tCommon("all")}</option>
              {options.conditions.map((condition) => (
                <option key={condition.id} value={condition.id}>{condition.nameTh}</option>
              ))}
            </LabeledSelect>
            <LabeledSelect label={t("ownershipType")} value={filters.ownershipType} onChange={(value) => navigate({ ownershipType: value })}>
              <option value="">{tCommon("all")}</option>
              {assetOwnershipTypes.map((type) => (
                <option key={type} value={type}>{t(`ownershipType_${type}`)}</option>
              ))}
            </LabeledSelect>
          </FilterSection>
          <FilterSection title={t("quickFilterGroupDataQuality")}>
            <ChipGroup
              label={t("quickFilterGroupDataQuality")}
              options={dataQualityOptions.map(([value, key]) => ({ value, label: t(key) }))}
              value={filters.dataQuality}
              onChange={(value) => navigate({ dataQuality: value })}
            />
          </FilterSection>
          <FilterSection title={t("quickFilterGroupCrossScope")}>
            <ChipGroup
              label={t("quickFilterGroupCrossScope")}
              options={crossScopeOptions.map(([value, key]) => ({ value, label: t(key) }))}
              value={filters.crossScope}
              onChange={(value) => navigate({ crossScope: value })}
            />
          </FilterSection>
          <FilterSection title={t("filterSheetDisplay")}>
            <LabeledSelect label={t("pageSizeLabel")} value={String(filters.pageSize)} onChange={(value) => navigate({ pageSize: Number(value) })}>
              {[10, 25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>{pageSize}</option>
              ))}
            </LabeledSelect>
          </FilterSection>
        </div>
        <SheetFooter className="grid grid-cols-2 gap-2 border-t border-border">
          <Button variant="outline" disabled={activeCount === 0} onClick={() => navigate(buildSheetClearOverrides(filters, scope))}>
            {t("filterSheetClear")}
          </Button>
          <Button onClick={() => setOpen(false)} aria-live="polite">
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {resultLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function LabeledSelect({
  label,
  value,
  onChange,
  help,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  help?: { title: string; description: string; items: string[] }
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {help ? <AssetStateHelpPopover {...help} size="compact" /> : null}
      </div>
      {/* Uncontrolled + key: remounts on the optimistic value, so it never bounces back. */}
      <select
        key={value}
        aria-label={label}
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
        className={getFieldControlClasses()}
      >
        {children}
      </select>
    </div>
  )
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T | ""
  onChange: (value: T | "") => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : option.value)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9",
              active
                ? "border-info-border bg-primary-soft text-primary"
                : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
