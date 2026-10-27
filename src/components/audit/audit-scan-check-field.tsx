"use client"

import { useTranslations } from "next-intl"
import { fieldLabelClasses } from "@/components/ui/field-variants"
import { Segmented } from "@/components/ui/segmented"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
import type { AuditCheckFieldMode, AuditCheckFieldState } from "@/lib/audit-check-record-rules"
import type { AuditCheckField } from "@/lib/audit-scan-session"
import { cn } from "@/lib/utils"

// One row of the record sheet (group 2 spec §12): the field's name and the value the system expects, ตรง / ไม่ตรง, and
// under ไม่ตรง the "ที่พบ" picker. The state is the form's (P3-R8); what a save means stays the chosen value.
export function AuditScanCheckField({
  id,
  field,
  label,
  state,
  value,
  options,
  expectedValue,
  latestValue,
  followsCustodian,
  disabled,
  labelFor,
  error,
  onModeChange,
  onChange,
}: {
  // The "ที่พบ" picker's trigger id, so the check form's focusFirst can reach it; the error shows under the picker.
  id?: string
  field: AuditCheckField
  label: string
  state: AuditCheckFieldState
  // The picker's value: "" while nothing is chosen, the none option's id for "ไม่มี / ไม่ระบุ".
  value: string
  options: SearchableSelectOption[]
  expectedValue: string
  latestValue?: string
  followsCustodian?: boolean
  disabled?: boolean
  labelFor: (id: string) => string
  error?: React.ReactNode
  onModeChange: (mode: AuditCheckFieldMode) => void
  onChange: (value: string) => void
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const mismatch = state.mode === "mismatch"

  return (
    <div
      data-audit-check-field={field}
      data-mismatch={mismatch ? "true" : undefined}
      // A matching field is a plain row, so four of them fit a phone sheet; only a mismatch gets the soft warning box.
      className={mismatch ? "rounded-md border border-warning-border bg-warning-soft p-2.5" : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={fieldLabelClasses}>{label}</p>
          {/* The value the system expects, struck through once the person says it differs. */}
          <p className={cn("break-words text-sm", mismatch ? "text-muted-foreground line-through" : "text-foreground")}>{labelFor(expectedValue)}</p>
        </div>
        <Segmented
          aria-label={label}
          value={state.mode}
          options={[
            { value: "match", label: t("fieldMatch") },
            { value: "mismatch", label: t("fieldMismatch") },
          ]}
          onValueChange={onModeChange}
          size="md"
          showCheck
          disabled={disabled}
          className="shrink-0"
        />
      </div>
      {mismatch ? (
        <div className="mt-2">
          <SearchableSelect
            id={id}
            label={t("foundValue")}
            value={value}
            options={options}
            required
            disabled={disabled}
            placeholder={t("foundPlaceholder")}
            searchPlaceholder={tCommon("search")}
            emptyLabel={t("noOptionMatch")}
            error={error}
            onChange={onChange}
          />
        </div>
      ) : null}
      {followsCustodian ? <p className="mt-1 text-meta text-muted-foreground">{t("departmentFollowsCustodian")}</p> : null}
      {latestValue !== undefined ? (
        <p className="mt-0.5 text-meta text-muted-foreground">{t("latestValue", { value: labelFor(latestValue) })}</p>
      ) : null}
    </div>
  )
}
