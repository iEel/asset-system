"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
import type { MaintenanceOptionType } from "@/lib/maintenance-options"

// An asset option carries its condition (final review M1); the caller reads it from onChange's second argument.
type MaintenanceOption = SearchableSelectOption & { reason?: string; conditionId?: string }

export function MaintenanceOptionSelect({
  id,
  type,
  label,
  value,
  required,
  disabled,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  loadingLabel,
  initialOption,
  formatReason,
  hint,
  error,
  onChange,
}: {
  // The trigger's id, so the form's focusFirst can reach it; the error shows under the select.
  id?: string
  type: MaintenanceOptionType
  label: string
  value: string
  required?: boolean
  disabled?: boolean
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  loadingLabel?: string
  initialOption?: MaintenanceOption
  formatReason?: (reason: string) => string
  hint?: React.ReactNode
  error?: React.ReactNode
  onChange: (value: string, option?: MaintenanceOption) => void
}) {
  // The live line under the select reads in the page's language (plan 2D-4 open issue 10 c).
  const tCommon = useTranslations("common")
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<MaintenanceOption[]>(initialOption ? [initialOption] : [])
  const [loading, setLoading] = useState(false)
  // A picked or passed-in option is already known: no read by id after a pick (G5P2-R1, group 5 spec call 7).
  const knownValue = Boolean(value) && (initialOption?.id === value || options.some((option) => option.id === value))

  useEffect(() => {
    if (query.trim().length < 2 && (!value || knownValue)) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ type })
        if (query.trim().length >= 2) params.set("q", query.trim())
        else if (value) params.set("id", value)
        const response = await fetch(`/api/maintenance-options?${params.toString()}`, { signal: controller.signal })
        if (!response.ok) throw new Error("Unable to load maintenance options")
        const payload = await response.json() as { data?: MaintenanceOption[] }
        setOptions(payload.data ?? [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setOptions([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [initialOption, knownValue, query, type, value])

  const displayOptions = useMemo(() => {
    const visibleOptions = query.trim().length < 2 && !value
      ? initialOption ? [initialOption] : []
      : options
    return visibleOptions.map((option) => ({
      ...option,
      label: option.reason ? `${option.label} — ${formatReason ? formatReason(option.reason) : option.reason}` : option.label,
    }))
  }, [formatReason, initialOption, options, query, value])

  return (
    <div>
      <SearchableSelect
        id={id}
        label={label}
        value={value}
        options={displayOptions}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyLabel={loading ? loadingLabel ?? emptyLabel : emptyLabel}
        hint={hint}
        error={error}
        onSearchChange={setQuery}
        onChange={(next) => {
          // A choice ends the search: with the query empty and the chosen option known, the effect reads nothing after
          // it, no re-search with the old q and no read by id (group 5 plan 2, spec call 7). The chosen option stays
          // in options, so it still shows; the picker reopens with an empty search.
          setQuery("")
          onChange(next, options.find((option) => option.id === next) ?? (initialOption?.id === next ? initialOption : undefined))
        }}
      />
      <span className="sr-only" aria-live="polite">
        {loading ? loadingLabel ?? tCommon("loading") : tCommon("searchSelectResultCount", { count: displayOptions.length })}
      </span>
    </div>
  )
}
