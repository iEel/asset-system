import Link from "next/link"
import { ActionButton } from "@/components/ui/action-button"
import { FilterPanel } from "@/components/ui/filter-panel"
import { getActionButtonClasses, getFieldControlClasses } from "@/lib/design-system"
import { parseAssetListParams } from "@/lib/asset-list-query"
import { buildReportHref, type ReportView } from "@/lib/report-view"

export type ReportFilterOption = {
  value: string
  label: string
}

export type ReportFilterOptions = {
  companies: ReportFilterOption[]
  branches: ReportFilterOption[]
  categories: ReportFilterOption[]
  statuses: ReportFilterOption[]
  conditions: ReportFilterOption[]
  ownershipTypes: ReportFilterOption[]
}

export type ReportFilterLabels = {
  title: string
  help: string
  search: string
  searchPlaceholder: string
  company: string
  branch: string
  category: string
  status: string
  condition: string
  ownershipType: string
  all: string
  apply: string
  clear: string
}

export type ReportFilterPanelProps = {
  locale: string
  activeView: ReportView
  filters: ReturnType<typeof parseAssetListParams>
  options: ReportFilterOptions
  labels: ReportFilterLabels
}

export function ReportFilterPanel({ locale, activeView, filters, options, labels }: ReportFilterPanelProps) {
  return (
    <FilterPanel title={labels.title} description={labels.help} className="p-5">
      <form action={`/${locale}/reports`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input type="hidden" name="view" value={activeView} />
        {filters.brandId ? <input type="hidden" name="brandId" value={filters.brandId} /> : null}
        {filters.modelId ? <input type="hidden" name="modelId" value={filters.modelId} /> : null}
        {filters.custodianId ? <input type="hidden" name="custodianId" value={filters.custodianId} /> : null}
        {filters.supplierId ? <input type="hidden" name="supplierId" value={filters.supplierId} /> : null}
        {filters.dataQuality ? <input type="hidden" name="dataQuality" value={filters.dataQuality} /> : null}
        {filters.crossScope ? <input type="hidden" name="crossScope" value={filters.crossScope} /> : null}
        {filters.activity ? <input type="hidden" name="activity" value={filters.activity} /> : null}
        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{labels.search}</span>
          <input
            type="search"
            name="search"
            defaultValue={filters.search}
            placeholder={labels.searchPlaceholder}
            className={getFieldControlClasses()}
          />
        </label>
        <ReportSelect name="companyId" label={labels.company} value={filters.companyId} options={options.companies} allLabel={labels.all} />
        <ReportSelect name="branchId" label={labels.branch} value={filters.branchId} options={options.branches} allLabel={labels.all} />
        <ReportSelect name="categoryId" label={labels.category} value={filters.categoryId} options={options.categories} allLabel={labels.all} />
        <ReportSelect name="statusId" label={labels.status} value={filters.statusId} options={options.statuses} allLabel={labels.all} />
        <ReportSelect name="conditionId" label={labels.condition} value={filters.conditionId} options={options.conditions} allLabel={labels.all} />
        <ReportSelect name="ownershipType" label={labels.ownershipType} value={filters.ownershipType} options={options.ownershipTypes} allLabel={labels.all} />
        <div className="flex min-w-0 flex-col gap-2 self-end md:col-span-2 md:flex-row md:flex-wrap xl:col-span-3">
          <ActionButton type="submit" variant="primary" className="min-h-11 w-full md:h-10 md:min-h-0 md:w-auto">
            {labels.apply}
          </ActionButton>
          <Link
            href={buildReportHref(locale, activeView, parseAssetListParams({}))}
            className={`${getActionButtonClasses("secondary")} min-h-11 w-full md:h-10 md:min-h-0 md:w-auto`}
          >
            {labels.clear}
          </Link>
        </div>
      </form>
    </FilterPanel>
  )
}

function ReportSelect({
  name,
  label,
  value,
  options,
  allLabel,
}: {
  name: string
  label: string
  value: string
  options: ReportFilterOption[]
  allLabel: string
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select name={name} defaultValue={value} className={getFieldControlClasses()}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
