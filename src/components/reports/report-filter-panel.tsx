import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { SearchField } from "@/components/ui/search-field"
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
  // Any report filter is on, the URL-only scopes included (the page's chip list): "clear filters" shows only then.
  hasActiveFilters: boolean
}

// The report filters on the shared parts (spec 2B §6.5 row 12): Field + SearchField, six FilterSelect at 40px with the
// "all" option first, and FilterFormActions. A GET form: the view and the URL-only scopes ride along as hidden inputs.
export function ReportFilterPanel({ locale, activeView, filters, options, labels, hasActiveFilters }: ReportFilterPanelProps) {
  return (
    <FilterPanel title={labels.title} description={labels.help} className="p-5">
      <form role="search" action={`/${locale}/reports`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input type="hidden" name="view" value={activeView} />
        {filters.brandId ? <input type="hidden" name="brandId" value={filters.brandId} /> : null}
        {filters.modelId ? <input type="hidden" name="modelId" value={filters.modelId} /> : null}
        {filters.custodianId ? <input type="hidden" name="custodianId" value={filters.custodianId} /> : null}
        {filters.supplierId ? <input type="hidden" name="supplierId" value={filters.supplierId} /> : null}
        {filters.dataQuality ? <input type="hidden" name="dataQuality" value={filters.dataQuality} /> : null}
        {filters.crossScope ? <input type="hidden" name="crossScope" value={filters.crossScope} /> : null}
        {filters.activity ? <input type="hidden" name="activity" value={filters.activity} /> : null}
        <Field label={labels.search}>
          <SearchField name="search" defaultValue={filters.search} placeholder={labels.searchPlaceholder} />
        </Field>
        <FilterSelect label={labels.company} name="companyId" defaultValue={filters.companyId} allLabel={labels.all} options={options.companies} />
        <FilterSelect label={labels.branch} name="branchId" defaultValue={filters.branchId} allLabel={labels.all} options={options.branches} />
        <FilterSelect label={labels.category} name="categoryId" defaultValue={filters.categoryId} allLabel={labels.all} options={options.categories} />
        <FilterSelect label={labels.status} name="statusId" defaultValue={filters.statusId} allLabel={labels.all} options={options.statuses} />
        <FilterSelect label={labels.condition} name="conditionId" defaultValue={filters.conditionId} allLabel={labels.all} options={options.conditions} />
        <FilterSelect label={labels.ownershipType} name="ownershipType" defaultValue={filters.ownershipType} allLabel={labels.all} options={options.ownershipTypes} />
        <FilterFormActions
          className="md:col-span-2 xl:col-span-3"
          submitLabel={labels.apply}
          clear={hasActiveFilters ? { href: buildReportHref(locale, activeView, parseAssetListParams({})), label: labels.clear } : undefined}
        />
      </form>
    </FilterPanel>
  )
}
