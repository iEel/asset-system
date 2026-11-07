import { ChevronDown } from "lucide-react"
import { Field } from "@/components/ui/field"
import { FilterFormActions } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { SearchField } from "@/components/ui/search-field"
import { parseAssetListParams } from "@/lib/asset-list-query"
import { getPanelClasses } from "@/lib/design-system"
import { buildReportHref, type ReportView } from "@/lib/report-view"
import { cn } from "@/lib/utils"

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
  hide: string
  show: string
  more: string
  // "เพิ่มเติม: หมวดหมู่ · สภาพ · ประเภทการถือครอง · แก้ค่าแล้วกด "ใช้ตัวกรอง" ตัวเลขและไฟล์จึงเปลี่ยน"
  moreLine: string
}

export type ReportFilterPanelProps = {
  locale: string
  activeView: ReportView
  filters: ReturnType<typeof parseAssetListParams>
  options: ReportFilterOptions
  labels: ReportFilterLabels
  // Any report filter is on, the URL-only scopes included (the page's chip list): "clear filters" shows only then.
  hasActiveFilters: boolean
  // The overview's own params (breakdown, bq, group), carried while on the overview so applying a filter keeps them.
  viewParams?: ReadonlyArray<readonly [string, string]>
}

export const REPORT_FILTER_BAR_ID = "report-filters"
export const REPORT_FILTER_BAR_PHONE_ID = "report-filters-phone"

// The report filter bar (group 10 spec §3, boards RP-Overview and RP-Phone): a <details> "ตัวกรองรายงาน", in two copies
// as the other rebuilt lists do. From md it is open on the first visit (no filter at all) and while any field filter is
// set; below md it starts closed, hidden while closed, so the page's "ตัวกรอง (n)" button (ReportFilterToggle) is the
// way in, and opens by itself only while a field filter is set (look step). "ซ่อนตัวกรอง" folds it for this page view
// only (ruling G10P1-R1, no memory). ค้นหา, บริษัท, สาขา and สถานะ show; หมวดหมู่, สภาพ and ประเภทการถือครอง sit in the
// nested "ตัวกรองเพิ่มเติม", open while one of them is set. A GET form: the view and the URL-only scopes ride along as
// hidden inputs, as before. Fields in a closed <details> still submit, so a folded value is never lost. Each copy is its
// own form; the field ids come from Field's useId, so the two copies never share one. Server-safe: no script.
export function ReportFilterPanel({ locale, activeView, filters, options, labels, hasActiveFilters, viewParams = [] }: ReportFilterPanelProps) {
  const moreFilterSet = Boolean(filters.categoryId || filters.conditionId || filters.ownershipType)
  const fieldFilterSet = Boolean(filters.search || filters.companyId || filters.branchId || filters.statusId || moreFilterSet)
  const barProps = { locale, activeView, filters, options, labels, hasActiveFilters, viewParams, moreFilterSet }

  return (
    <>
      <ReportFilterBar
        {...barProps}
        id={REPORT_FILTER_BAR_PHONE_ID}
        copy="phone"
        open={fieldFilterSet}
        className="md:hidden [&:not([open])]:hidden"
      />
      <ReportFilterBar
        {...barProps}
        id={REPORT_FILTER_BAR_ID}
        copy="wide"
        open={!hasActiveFilters || fieldFilterSet}
        className="max-md:hidden"
      />
    </>
  )
}

type ReportFilterBarProps = Omit<ReportFilterPanelProps, "viewParams"> & {
  viewParams: ReadonlyArray<readonly [string, string]>
  moreFilterSet: boolean
  id: string
  copy: "phone" | "wide"
  open: boolean
  className: string
}

function ReportFilterBar({ locale, activeView, filters, options, labels, hasActiveFilters, viewParams, moreFilterSet, id, copy, open, className }: ReportFilterBarProps) {
  return (
    <details
      id={id}
      data-report-filter-bar={copy}
      open={open}
      className={cn(getPanelClasses(), "group/filters scroll-mt-4", className)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 p-4 md:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block break-words text-base font-semibold text-foreground">{labels.title}</span>
          <span className="mt-1 block break-words text-sm text-muted-foreground">{labels.help}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
          <span className="group-open/filters:hidden">{labels.show}</span>
          <span className="hidden group-open/filters:inline">{labels.hide}</span>
          <ChevronDown aria-hidden="true" className="size-4 transition-transform motion-reduce:transition-none group-open/filters:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-border-soft p-4 md:px-5">
        <form role="search" action={`/${locale}/reports`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input type="hidden" name="view" value={activeView} />
          {filters.brandId ? <input type="hidden" name="brandId" value={filters.brandId} /> : null}
          {filters.modelId ? <input type="hidden" name="modelId" value={filters.modelId} /> : null}
          {filters.custodianId ? <input type="hidden" name="custodianId" value={filters.custodianId} /> : null}
          {filters.supplierId ? <input type="hidden" name="supplierId" value={filters.supplierId} /> : null}
          {filters.dataQuality ? <input type="hidden" name="dataQuality" value={filters.dataQuality} /> : null}
          {filters.crossScope ? <input type="hidden" name="crossScope" value={filters.crossScope} /> : null}
          {filters.activity ? <input type="hidden" name="activity" value={filters.activity} /> : null}
          {viewParams.map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <Field label={labels.search}>
            <SearchField name="search" defaultValue={filters.search} placeholder={labels.searchPlaceholder} />
          </Field>
          <FilterSelect label={labels.company} name="companyId" defaultValue={filters.companyId} allLabel={labels.all} options={options.companies} />
          <FilterSelect label={labels.branch} name="branchId" defaultValue={filters.branchId} allLabel={labels.all} options={options.branches} />
          <FilterSelect label={labels.status} name="statusId" defaultValue={filters.statusId} allLabel={labels.all} options={options.statuses} />
          <details data-report-more-filters open={moreFilterSet} className="group/more md:col-span-2 xl:col-span-4">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-medium text-primary md:min-h-9 [&::-webkit-details-marker]:hidden">
              {labels.more}
              <ChevronDown aria-hidden="true" className="size-4 transition-transform motion-reduce:transition-none group-open/more:rotate-180" />
            </summary>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <FilterSelect label={labels.category} name="categoryId" defaultValue={filters.categoryId} allLabel={labels.all} options={options.categories} />
              <FilterSelect label={labels.condition} name="conditionId" defaultValue={filters.conditionId} allLabel={labels.all} options={options.conditions} />
              <FilterSelect label={labels.ownershipType} name="ownershipType" defaultValue={filters.ownershipType} allLabel={labels.all} options={options.ownershipTypes} />
            </div>
          </details>
          <FilterFormActions
            className="md:col-span-2 xl:col-span-4"
            submitLabel={labels.apply}
            clear={hasActiveFilters ? { href: buildReportHref(locale, activeView, parseAssetListParams({})), label: labels.clear } : undefined}
          />
        </form>
        <p data-report-filter-note className="mt-3 text-meta text-muted-foreground">{labels.moreLine}</p>
      </div>
    </details>
  )
}
