"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"

export type SearchableSelectOption = {
  id: string
  label: string
  disabled?: boolean
}

export function SearchableSelect({
  label,
  value,
  options,
  required,
  disabled,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  clearLabel,
  onChange,
}: {
  label: string
  value: string
  options: SearchableSelectOption[]
  required?: boolean
  disabled?: boolean
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  clearLabel?: string
  onChange: (value: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selectedOption = options.find((option) => option.id === value)
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query)
    if (!normalizedQuery) return options
    return options.filter((option) => normalize(option.label).includes(normalizedQuery))
  }, [options, query])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function selectValue(nextValue: string) {
    onChange(nextValue)
    setQuery("")
    setOpen(false)
  }

  return (
    <div className="block min-w-0 max-w-full" ref={containerRef}>
      {label ? (
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </span>
      ) : null}
      <div className="relative min-w-0 max-w-full">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 text-left text-sm outline-none transition-colors hover:bg-accent focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:h-10 sm:min-h-0"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={selectedOption ? "min-w-0 truncate text-foreground" : "min-w-0 truncate text-muted-foreground"}>
            {selectedOption?.label ?? placeholder}
          </span>
          <span className="flex items-center gap-1">
            {value && !required && !disabled ? (
              <span
                role="button"
                tabIndex={-1}
                onClick={(event) => {
                  event.stopPropagation()
                  selectValue("")
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">{clearLabel ?? placeholder}</span>
              </span>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </span>
        </button>
        {open && !disabled && (
          <div className="absolute z-50 mt-1 w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border bg-surface shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOpen(false)
                  if (event.key === "Enter") {
                    const firstEnabled = filteredOptions.find((option) => !option.disabled)
                    if (firstEnabled) selectValue(firstEnabled.id)
                  }
                }}
                placeholder={searchPlaceholder}
                className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div role="listbox" className="max-h-64 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    disabled={option.disabled}
                    role="option"
                    aria-selected={option.id === value}
                    onClick={() => selectValue(option.id)}
                    className="flex min-h-11 w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className={option.id === value ? "h-4 w-4 text-primary" : "h-4 w-4 text-transparent"} />
                    <span className="min-w-0 truncate">{option.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, "")
}
