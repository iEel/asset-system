"use client"

import { useId, useMemo, useState } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field"
import { fieldControlVariants, triggerInvalidClasses, type FieldSize } from "@/components/ui/field-variants"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { filterSearchableOptions, type SearchableSelectOption } from "@/lib/searchable-select-filter"
import { cn } from "@/lib/utils"

export type { SearchableSelectOption } from "@/lib/searchable-select-filter"

// The popover is not modal, so inside a modal dialog or sheet it is portalled outside the dialog's scroll lock
// (react-remove-scroll), which cancels a wheel or touch scroll it sees from outside. Stopping the event at the popover
// keeps the list's own scroll; the page behind stays locked by the dialog.
function stopScrollLock(event: Event) {
  event.stopPropagation()
}

function keepOwnScroll(node: HTMLDivElement | null) {
  if (!node) return
  node.addEventListener("wheel", stopScrollLock, { passive: true })
  node.addEventListener("touchmove", stopScrollLock, { passive: true })
  return () => {
    node.removeEventListener("wheel", stopScrollLock)
    node.removeEventListener("touchmove", stopScrollLock)
  }
}

export function SearchableSelect({
  id,
  label,
  value,
  options,
  required,
  disabled,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  clearLabel,
  hint,
  error,
  fieldSize,
  onSearchChange,
  onChange,
}: {
  id?: string
  label: string
  value: string
  options: SearchableSelectOption[]
  required?: boolean
  disabled?: boolean
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  clearLabel?: string
  hint?: React.ReactNode
  error?: React.ReactNode
  fieldSize?: FieldSize
  onSearchChange?: (query: string) => void
  onChange: (value: string) => void
}) {
  const generatedId = useId()
  const triggerId = id ?? `${generatedId}-trigger`
  const labelId = `${triggerId}-label`
  const valueId = `${triggerId}-value`
  const hintId = hint ? `${triggerId}-hint` : undefined
  const errorId = error ? `${triggerId}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined
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
    <div className="grid min-w-0 max-w-full content-start gap-1.5">
      {label ? (
        <FieldLabel id={labelId} htmlFor={triggerId} required={required}>
          {label}
        </FieldLabel>
      ) : null}
      <div className="relative min-w-0 max-w-full">
        {/* Not modal (the WAI-ARIA combobox): nothing outside is hidden from a screen reader while it stays focusable.
            Escape or a choice closes it and Radix returns focus to the trigger. */}
        <Popover modal={false} open={open && !disabled} onOpenChange={setOpenState}>
          <PopoverTrigger asChild>
            <button
              id={triggerId}
              type="button"
              disabled={disabled}
              data-invalid={error ? true : undefined}
              className={cn(
                fieldControlVariants({ fieldSize }),
                "flex cursor-pointer items-center justify-between gap-2 text-left aria-expanded:border-ring aria-expanded:ring-1 aria-expanded:ring-ring aria-expanded:shadow-field-focus",
                triggerInvalidClasses,
                showClear ? "pr-24 md:pr-20" : "pr-9",
              )}
              aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
              aria-label={label ? undefined : placeholder}
              aria-describedby={describedBy}
            >
              <span id={valueId} className={selectedOption ? "min-w-0 truncate" : "min-w-0 truncate text-faint-foreground"}>
                {selectedOption?.label ?? placeholder}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent ref={keepOwnScroll} align="start" className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0">
            <Command shouldFilter={false} loop defaultValue={value || undefined}>
              <CommandInput value={query} onValueChange={updateQuery} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
              {/* cmdk's list is always role="listbox": with no option it is hidden (its id stays for the input's
                  aria-controls) and the empty line sits outside it, so no listbox is ever empty. */}
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandList className="max-h-64" hidden={filteredOptions.length === 0}>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    disabled={option.disabled}
                    onSelect={() => selectValue(option.id)}
                    className={option.id === value ? "font-medium" : undefined}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {option.id === value ? <Check className="ml-auto size-4 text-primary" aria-hidden="true" /> : null}
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
            className="absolute inset-y-0 right-8 inline-flex min-h-11 w-11 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0 md:w-10"
            aria-label={clearLabel ?? placeholder}
            title={clearLabel ?? placeholder}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden="true" />
      </div>
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
