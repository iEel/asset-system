"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { Button } from "@/components/ui/button"
import { ChoiceChip } from "@/components/ui/choice-card"
import { FilterSelect } from "@/components/ui/filter-select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
import type { AssetCrossScopeFilter } from "@/lib/asset-cross-scope-filter"
import type { AssetDataQualityFilter } from "@/lib/asset-data-quality-filter"
import { assetOwnershipTypes } from "@/lib/asset-ownership"
import { buildSheetClearOverrides, getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { formatCount } from "@/lib/display-format"

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
      : t("filterSheetShowResults", { count: formatCount(total) })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        data-asset-filter-sheet
        className={isDesktop ? "w-full gap-0 sm:max-w-md" : "max-h-[85dvh] gap-0 rounded-t-xl"}
      >
        <SheetHeader>
          <SheetTitle>{t("filterSheetTitle")}</SheetTitle>
          <SheetDescription>{t("advancedFiltersHelp")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {/* Uncontrolled + key: each FilterSelect remounts on the optimistic value, so it never bounces back. The key
              carries the filter name too, because an unset filter is the same empty value in every sibling select. */}
          {isDesktop ? null : (
            <FilterSection title={t("filterSheetScope")}>
              <FilterSelect
                label={t("company")}
                key={`company-${filters.companyId}`}
                defaultValue={filters.companyId}
                onChange={(event) => navigate(getCompanyChangeOverrides(event.target.value, filters.branchId, options.branches))}
              >
                <option value="">{tCommon("all")}</option>
                {options.companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.code} - {company.nameTh}</option>
                ))}
              </FilterSelect>
              <FilterSelect
                label={t("branch")}
                key={`branch-${filters.branchId}`}
                defaultValue={filters.branchId}
                onChange={(event) => navigate({ branchId: event.target.value })}
              >
                <option value="">{tCommon("all")}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.company.code} / {branch.code} - {branch.name}</option>
                ))}
              </FilterSelect>
              <FilterSelect
                label={t("category")}
                key={`category-${filters.categoryId}`}
                defaultValue={filters.categoryId}
                onChange={(event) => navigate({ categoryId: event.target.value })}
              >
                <option value="">{tCommon("all")}</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.code} - {category.name}</option>
                ))}
              </FilterSelect>
            </FilterSection>
          )}
          <FilterSection title={t("filterSheetState")}>
            <FilterSelect
              label={t("status")}
              labelAction={<AssetStateHelpPopover {...statusHelp} />}
              key={`status-${filters.statusId}`}
              defaultValue={filters.statusId}
              onChange={(event) => navigate({ statusId: event.target.value })}
            >
              <option value="">{tCommon("all")}</option>
              {options.statuses.map((status) => (
                <option key={status.id} value={status.id}>{status.nameTh}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label={t("condition")}
              labelAction={<AssetStateHelpPopover {...conditionHelp} />}
              key={`condition-${filters.conditionId}`}
              defaultValue={filters.conditionId}
              onChange={(event) => navigate({ conditionId: event.target.value })}
            >
              <option value="">{tCommon("all")}</option>
              {options.conditions.map((condition) => (
                <option key={condition.id} value={condition.id}>{condition.nameTh}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label={t("ownershipType")}
              key={`ownershipType-${filters.ownershipType}`}
              defaultValue={filters.ownershipType}
              onChange={(event) => navigate({ ownershipType: event.target.value })}
            >
              <option value="">{tCommon("all")}</option>
              {assetOwnershipTypes.map((type) => (
                <option key={type} value={type}>{t(`ownershipType_${type}`)}</option>
              ))}
            </FilterSelect>
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
            <FilterSelect
              label={t("pageSizeLabel")}
              key={`pageSize-${filters.pageSize}`}
              defaultValue={String(filters.pageSize)}
              onChange={(event) => navigate({ pageSize: Number(event.target.value) })}
            >
              {[10, 25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>{pageSize}</option>
              ))}
            </FilterSelect>
          </FilterSection>
        </div>
        {/* Spec 2D D19: the sheet footer takes the dialog-footer look of the room picker (audit-scan-room-picker.tsx). */}
        <SheetFooter className="grid grid-cols-2 gap-2 border-t border-border-soft bg-background px-4 py-3">
          <Button variant="outline" disabled={activeCount === 0} onClick={() => navigate(buildSheetClearOverrides(filters, scope))}>
            {t("filterSheetClear")}
          </Button>
          <Button onClick={() => setOpen(false)} aria-live="polite" busy={isPending}>
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
    // At most one option is on and a second click clears it, as before; the shared ChoiceChip shows the state with its
    // own checkbox, so it does not rely on color (spec 2D M22; the batch form's optional columns use the same chip).
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <ChoiceChip
            key={option.value}
            type="checkbox"
            checked={active}
            onChange={() => onChange(active ? "" : option.value)}
            label={option.label}
          />
        )
      })}
    </div>
  )
}
