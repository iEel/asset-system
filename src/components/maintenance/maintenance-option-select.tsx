"use client"

import { useEffect, useMemo, useState } from "react"
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"
import type { MaintenanceOptionType } from "@/lib/maintenance-options"

type MaintenanceOption = SearchableSelectOption & { reason?: string }

export function MaintenanceOptionSelect({
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
  onChange,
}: {
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
  onChange: (value: string) => void
}) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<MaintenanceOption[]>(initialOption ? [initialOption] : [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2 && !value) return

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
  }, [initialOption, query, type, value])

  const displayOptions = useMemo(() => {
    const visibleOptions = query.trim().length < 2 && !value
      ? initialOption ? [initialOption] : []
      : options
    return visibleOptions.map((option) => ({
      ...option,
      label: option.reason ? `${option.label} — ${option.reason}` : option.label,
    }))
  }, [initialOption, options, query, value])

  return (
    <div>
      <SearchableSelect
        label={label}
        value={value}
        options={displayOptions}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyLabel={loading ? loadingLabel ?? emptyLabel : emptyLabel}
        onSearchChange={setQuery}
        onChange={onChange}
      />
      <span className="sr-only" aria-live="polite">
        {loading ? loadingLabel ?? "Loading" : `${displayOptions.length} results`}
      </span>
    </div>
  )
}
