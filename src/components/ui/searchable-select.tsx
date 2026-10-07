"use client"

import { useId, useMemo, useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { filterSearchableOptions, type SearchableSelectOption } from "@/lib/searchable-select-filter"

export type { SearchableSelectOption } from "@/lib/searchable-select-filter"

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
  const labelId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selectedOption = options.find((option) => option.id === value)
  const filteredOptions = useMemo(() => filterSearchableOptions(options, query), [options, query])
  const showClear = Boolean(value) && !required && !disabled

  function setOpenState(next: boolean) {
    setOpen(next)
    if (!next) setQuery("")
  }

  function updateQuery(next: string) {
    setQuery(next)
    onSearchChange?.(next)
  }

  function selectValue(nextValue: string) {
    onChange(nextValue)
    setOpenState(false)
  }

  return (
    <div className="block min-w-0 max-w-full">
      {label ? (
        <span id={labelId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </span>
      ) : null}
      <div className="relative min-w-0 max-w-full">
        <Popover modal open={open && !disabled} onOpenChange={setOpenState}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 text-left text-sm outline-none transition-colors hover:bg-accent focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:h-10 sm:min-h-0 ${showClear ? "pr-24 sm:pr-20" : "pr-10"}`}
              aria-labelledby={label ? labelId : undefined}
              aria-label={label ? undefined : placeholder}
            >
              <span className={selectedOption ? "min-w-0 truncate text-foreground" : "min-w-0 truncate text-muted-foreground"}>
                {selectedOption?.label ?? placeholder}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0">
            <Command shouldFilter={false} loop defaultValue={value || undefined}>
              <CommandInput value={query} onValueChange={updateQuery} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
              <CommandList className="max-h-64">
                <CommandEmpty>{emptyLabel}</CommandEmpty>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    disabled={option.disabled}
                    onSelect={() => selectValue(option.id)}
                  >
                    <Check className={option.id === value ? "size-4 text-primary" : "size-4 text-transparent"} aria-hidden="true" />
                    <span className="min-w-0 truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {showClear ? (
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
      </div>
    </div>
  )
}
