"use client"

import { useTranslations } from "next-intl"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"

export function AuditScanCheckField({
  label,
  value,
  options,
  required,
  expectedValue,
  latestValue,
  mismatch,
  disabled,
  labelFor,
  onChange,
}: {
  label: string
  value: string
  options: SearchableSelectOption[]
  required?: boolean
  expectedValue: string
  latestValue?: string
  mismatch: boolean
  disabled?: boolean
  labelFor: (id: string) => string
  onChange: (value: string) => void
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")

  return (
    <div
      data-audit-check-field
      data-mismatch={mismatch ? "true" : undefined}
      // A matching field is a plain label and control, so four of them fit a phone sheet; only a mismatch gets a box.
      className={mismatch ? "rounded-md border border-warning-border bg-warning-soft p-2.5" : undefined}
    >
      <SearchableSelect
        label={label}
        value={value}
        options={options}
        required={required}
        disabled={disabled}
        placeholder={t("none")}
        searchPlaceholder={tCommon("search")}
        emptyLabel={t("noOptionMatch")}
        clearLabel={t("clearValue")}
        onChange={onChange}
      />
      {mismatch ? <p className="mt-1 text-xs font-medium text-warning">{t("inSystem", { value: labelFor(expectedValue) })}</p> : null}
      {latestValue !== undefined ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{t("latestValue", { value: labelFor(latestValue) })}</p>
      ) : null}
    </div>
  )
}
