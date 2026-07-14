"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import {
  getFirstEnabledOptionIndex,
  getLastEnabledOptionIndex,
  getNextEnabledOptionIndex,
} from "@/lib/searchable-select-navigation"

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
  onSearchChange,
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
  onSearchChange?: (query: string) => void
  onChange: (value: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const labelId = useId()
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1)
  const selectedOption = options.find((option) => option.id === value)
  const filteredOptions = useMemo(() => filterOptions(options, query), [options, query])
  const activeOption = activeOptionIndex >= 0 ? filteredOptions[activeOptionIndex] : undefined

  const closeSelect = useCallback((restoreFocus = false) => {
    setOpen(false)
    setQuery("")
    setActiveOptionIndex(-1)
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) closeSelect()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [closeSelect])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open || !activeOption) return
    document.getElementById(getOptionId(listboxId, activeOption.id))?.scrollIntoView({ block: "nearest" })
  }, [activeOption, listboxId, open])

  function openSelect() {
    const selectedIndex = filteredOptions.findIndex((option) => option.id === value && !option.disabled)
    setActiveOptionIndex(selectedIndex >= 0 ? selectedIndex : getFirstEnabledOptionIndex(filteredOptions))
    setOpen(true)
  }

  function updateQuery(nextQuery: string) {
    const nextOptions = filterOptions(options, nextQuery)
    const selectedIndex = nextOptions.findIndex((option) => option.id === value && !option.disabled)
    setQuery(nextQuery)
    onSearchChange?.(nextQuery)
    setActiveOptionIndex(selectedIndex >= 0 ? selectedIndex : getFirstEnabledOptionIndex(nextOptions))
  }

  function selectValue(nextValue: string) {
    onChange(nextValue)
    closeSelect(true)
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      closeSelect(true)
      return
    }
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveOptionIndex((current) => getNextEnabledOptionIndex(filteredOptions, current, 1))
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveOptionIndex((current) => getNextEnabledOptionIndex(filteredOptions, current, -1))
      return
    }
    if (event.key === "Home") {
      event.preventDefault()
      setActiveOptionIndex(getFirstEnabledOptionIndex(filteredOptions))
      return
    }
    if (event.key === "End") {
      event.preventDefault()
      setActiveOptionIndex(getLastEnabledOptionIndex(filteredOptions))
      return
    }
    if (event.key === "Enter" && activeOption && !activeOption.disabled) {
      event.preventDefault()
      selectValue(activeOption.id)
    }
  }

  return (
    <div className="block min-w-0 max-w-full" ref={containerRef}>
      {label ? (
        <span id={labelId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </span>
      ) : null}
      <div className="relative min-w-0 max-w-full">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => (open ? closeSelect() : openSelect())}
          className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 text-left text-sm outline-none transition-colors hover:bg-accent focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:h-10 sm:min-h-0 ${value && !required && !disabled ? "pr-24 sm:pr-20" : "pr-10"}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : placeholder}
        >
          <span className={selectedOption ? "min-w-0 truncate text-foreground" : "min-w-0 truncate text-muted-foreground"}>
            {selectedOption?.label ?? placeholder}
          </span>
        </button>
        {value && !required && !disabled ? (
          <button
            type="button"
            onClick={() => selectValue("")}
            className="absolute inset-y-0 right-8 inline-flex min-h-11 w-11 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-0 sm:w-10"
            aria-label={clearLabel ?? placeholder}
            title={clearLabel ?? placeholder}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-muted-foreground" aria-hidden="true" />
        {open && !disabled ? (
          <div className="absolute z-50 mt-1 w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border bg-surface shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={searchPlaceholder}
                role="combobox"
                aria-label={searchPlaceholder}
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-activedescendant={activeOption ? getOptionId(listboxId, activeOption.id) : undefined}
                className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div id={listboxId} role="listbox" aria-labelledby={label ? labelId : undefined} className="max-h-64 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
              ) : (
                filteredOptions.map((option, index) => (
                  <button
                    id={getOptionId(listboxId, option.id)}
                    type="button"
                    key={option.id}
                    disabled={option.disabled}
                    role="option"
                    aria-selected={option.id === value}
                    aria-disabled={option.disabled || undefined}
                    onMouseMove={() => setActiveOptionIndex(index)}
                    onClick={() => selectValue(option.id)}
                    className={`flex min-h-11 w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 ${activeOptionIndex === index ? "bg-accent" : ""}`}
                  >
                    <Check className={option.id === value ? "h-4 w-4 text-primary" : "h-4 w-4 text-transparent"} aria-hidden="true" />
                    <span className="min-w-0 truncate">{option.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function getOptionId(listboxId: string, optionId: string) {
  return `${listboxId}-option-${optionId}`
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, "")
}

function filterOptions(options: SearchableSelectOption[], query: string) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return options
  return options.filter((option) => normalize(option.label).includes(normalizedQuery))
}
