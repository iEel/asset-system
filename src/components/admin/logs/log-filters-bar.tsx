import { LogUserFilter, type LogUserFilterLabels } from "@/components/admin/logs/log-user-filter"
import { RepairDateRangeChip, type RepairDateRangeChipLabels } from "@/components/maintenance/repair-date-range-chip"
import { Field } from "@/components/ui/field"
import { FilterFormActions } from "@/components/ui/filter-panel"
import { FilterSelect, type FilterSelectOption } from "@/components/ui/filter-select"
import { SearchField } from "@/components/ui/search-field"
import { LIST_PAGE_SIZES } from "@/lib/list-pagination"
import type { SystemLogFilters } from "@/lib/system-log-filters"

export type LogFiltersBarLabels = {
  form: string
  tag: string
  tagPlaceholder: string
  module: string
  moduleAll: string
  action: string
  actionAll: string
  submit: string
  clear: string
  user: LogUserFilterLabels
  date: RepairDateRangeChipLabels
}

type LogFiltersBarProps = {
  formId: string
  action: string
  filters: SystemLogFilters
  pageSize: number
  recordId: string
  userOptions: readonly { value: string; label: string }[]
  moduleOptions: readonly FilterSelectOption[]
  actionOptions: readonly FilterSelectOption[]
  presets: { key: string; label: string; href: string; active: boolean }[]
  dateClearHref: string
  // The clear link (the list without filters) shows only while a filter is set.
  hasActiveFilters: boolean
  clearHref: string
  labels: LogFiltersBarLabels
}

// Spec §4 (board AD-Logs): the system log's one GET form. ค้นหารหัสทรัพย์สิน (tag), ผู้ใช้ (a searchable chip), ช่วงวันที่ (the
// repair list's chip with วันนี้ · 7 วัน · 30 วัน), and Thai โมดูล / การกระทำ selects whose values stay the codes other
// pages link with. The page size and the record filter ride along in hidden inputs. Server-safe: the two chips are
// the client leaves.
export function LogFiltersBar({
  formId,
  action,
  filters,
  pageSize,
  recordId,
  userOptions,
  moduleOptions,
  actionOptions,
  presets,
  dateClearHref,
  hasActiveFilters,
  clearHref,
  labels,
}: LogFiltersBarProps) {
  return (
    <form id={formId} role="search" aria-label={labels.form} action={action} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {pageSize !== LIST_PAGE_SIZES[0] ? <input type="hidden" name="pageSize" value={pageSize} /> : null}
      {recordId ? <input type="hidden" name="recordId" value={recordId} /> : null}
      <Field label={labels.tag} className="md:col-span-2">
        <SearchField name="tag" defaultValue={filters.tag} placeholder={labels.tagPlaceholder} autoComplete="off" />
      </Field>
      <FilterSelect
        label={labels.module}
        name="module"
        defaultValue={filters.module}
        allLabel={labels.moduleAll}
        options={moduleOptions}
      />
      <FilterSelect
        label={labels.action}
        name="action"
        defaultValue={filters.action}
        allLabel={labels.actionAll}
        options={actionOptions}
      />
      <div className="flex min-w-0 flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4">
        <LogUserFilter value={filters.userId ?? ""} options={userOptions} labels={labels.user} />
        <RepairDateRangeChip
          key={`${filters.dateFrom ?? ""}|${filters.dateTo ?? ""}`}
          formId={formId}
          dateFrom={filters.dateFrom ?? ""}
          dateTo={filters.dateTo ?? ""}
          labels={labels.date}
          clearHref={dateClearHref}
          presets={presets}
        />
        <FilterFormActions
          submitLabel={labels.submit}
          clear={hasActiveFilters ? { href: clearHref, label: labels.clear } : undefined}
          className="w-full md:ms-auto md:w-auto"
        />
      </div>
    </form>
  )
}
