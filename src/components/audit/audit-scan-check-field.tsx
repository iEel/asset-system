"use client"

import { useTranslations } from "next-intl"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
import { cn } from "@/lib/utils"

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
      className={cn("rounded-md border p-2.5", mismatch ? "border-warning-border bg-warning-soft" : "border-border bg-surface")}
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
